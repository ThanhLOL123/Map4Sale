import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { useNavigate, useParams } from 'react-router-dom';
import {
  deleteUniversityImage,
  fetchUniversity,
  geocode,
  saveUniversity,
  uploadUniversityImage,
} from '../lib/api';
import type { UniversityInput, UniversityType } from '../lib/types';
import '../map/leafletIcon';

const REGIONS = [
  'Seoul', 'Gyeonggi', 'Incheon', 'Busan', 'Daegu', 'Daejeon', 'Gwangju',
  'Ulsan', 'Sejong', 'Gangwon', 'Chungbuk', 'Chungnam', 'Jeonbuk', 'Jeonnam',
  'Gyeongbuk', 'Gyeongnam', 'Jeju',
];

function emptyForm(): UniversityInput {
  return {
    id: crypto.randomUUID(),
    name_kr: '',
    name_en: '',
    name_vi: '',
    logo_url: null,
    image_urls: [],
    video_urls: [],
    lat: 37.5665,
    lng: 126.978,
    city: '',
    region: 'Seoul',
    type: 'private',
    ranking: null,
    majors: [],
    tuition: '',
    scholarship: '',
    topik_req: '',
    ielts_req: '',
    gpa_req: '',
    dorm_info: '',
    living_cost: '',
    important_notes: '',
    sale_notes: '',
  };
}

/** Click on the mini-map moves the marker / fills lat-lng (spec §4.4). */
function CoordinatePicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

export default function UniversityFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState<UniversityInput>(emptyForm);
  const [majorsText, setMajorsText] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchUniversity(id)
      .then((u) => {
        if (!u) {
          setError('Không tìm thấy trường.');
          return;
        }
        const { updated_at: _updatedAt, ...input } = u;
        setForm(input);
        setMajorsText(u.majors.join('\n'));
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const set = <K extends keyof UniversityInput>(key: K, value: UniversityInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const markerPos = useMemo<[number, number]>(() => [form.lat, form.lng], [form.lat, form.lng]);

  async function onGeocode() {
    const query = form.name_en || form.name_kr || form.name_vi;
    if (!query) {
      setGeoStatus('Nhập tên trường (tiếng Anh) trước khi định vị.');
      return;
    }
    setGeoStatus('Đang tìm tọa độ…');
    try {
      const hit = await geocode(`${query} university`);
      if (!hit) {
        setGeoStatus('Không tìm thấy — hãy click vị trí trên bản đồ.');
        return;
      }
      setForm((f) => ({ ...f, lat: Number(hit.lat.toFixed(6)), lng: Number(hit.lng.toFixed(6)) }));
      setGeoStatus(`Đã định vị: ${hit.display_name}`);
    } catch (e) {
      setGeoStatus(`Lỗi định vị: ${String(e)}`);
    }
  }

  async function onUpload(files: FileList | null, target: 'logo' | 'photo' | 'video') {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      if (target === 'logo') {
        const url = await uploadUniversityImage(form.id, files[0], 'logo');
        setForm((f) => ({ ...f, logo_url: url }));
      } else {
        const urls: string[] = [];
        for (const file of Array.from(files)) {
          urls.push(await uploadUniversityImage(form.id, file, target));
        }
        setForm((f) =>
          target === 'video'
            ? { ...f, video_urls: [...f.video_urls, ...urls] }
            : { ...f, image_urls: [...f.image_urls, ...urls] },
        );
      }
    } catch (e) {
      setError(`Tải lên thất bại: ${String(e)}`);
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(url: string) {
    setForm((f) => ({ ...f, image_urls: f.image_urls.filter((x) => x !== url) }));
    void deleteUniversityImage(url); // best-effort Storage cleanup (spec §5.4)
  }

  function addVideoLink() {
    const url = videoLink.trim();
    if (!url) return;
    setForm((f) => (f.video_urls.includes(url) ? f : { ...f, video_urls: [...f.video_urls, url] }));
    setVideoLink('');
  }

  function removeVideo(url: string) {
    setForm((f) => ({ ...f, video_urls: f.video_urls.filter((x) => x !== url) }));
    void deleteUniversityImage(url); // no-op for external links; removes uploaded files
  }

  function removeLogo() {
    if (form.logo_url) void deleteUniversityImage(form.logo_url);
    setForm((f) => ({ ...f, logo_url: null }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const majors = majorsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      await saveUniversity({ ...form, majors });
      navigate('/admin/universities');
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="page-loading">Đang tải…</div>;

  return (
    <form className="uni-form" onSubmit={onSubmit}>
      <div className="admin-toolbar">
        <h1>{isNew ? 'Thêm trường mới' : `Sửa: ${form.name_vi}`}</h1>
        <button type="submit" className="btn btn-primary" disabled={busy || uploading}>
          {busy ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}

      <fieldset>
        <legend>Tên trường</legend>
        <div className="form-grid">
          <label>Tên tiếng Việt *
            <input required value={form.name_vi} onChange={(e) => set('name_vi', e.target.value)} />
          </label>
          <label>Tên tiếng Anh *
            <input required value={form.name_en} onChange={(e) => set('name_en', e.target.value)} />
          </label>
          <label>Tên tiếng Hàn
            <input value={form.name_kr} onChange={(e) => set('name_kr', e.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Vị trí</legend>
        <div className="form-grid">
          <label>Thành phố *
            <input required value={form.city} onChange={(e) => set('city', e.target.value)} />
          </label>
          <label>Khu vực *
            <select value={form.region} onChange={(e) => set('region', e.target.value)}>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label>Vĩ độ (lat) *
            <input
              type="number" step="any" required value={form.lat}
              onChange={(e) => set('lat', Number(e.target.value))}
            />
          </label>
          <label>Kinh độ (lng) *
            <input
              type="number" step="any" required value={form.lng}
              onChange={(e) => set('lng', Number(e.target.value))}
            />
          </label>
        </div>
        <div className="geocode-row">
          <button type="button" className="btn" onClick={() => void onGeocode()}>
            📍 Tự động định vị theo tên (Nominatim)
          </button>
          {geoStatus && <span className="muted">{geoStatus}</span>}
        </div>
        <p className="muted">Hoặc click trực tiếp lên bản đồ để đặt tọa độ:</p>
        <MapContainer center={markerPos} zoom={11} className="mini-map" key={form.id}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <CoordinatePicker onPick={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))} />
          <Marker position={markerPos} />
        </MapContainer>
      </fieldset>

      <fieldset>
        <legend>Hình ảnh & Video (tải file từ máy — lưu trên Supabase Storage)</legend>
        <div className="upload-block">
          <label className="upload-label">
            Logo (1 ảnh)
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => void onUpload(e.target.files, 'logo')}
            />
          </label>
          {form.logo_url && (
            <div className="thumb">
              <img src={form.logo_url} alt="Logo" />
              <button type="button" className="btn btn-danger" onClick={removeLogo}>Xóa logo</button>
            </div>
          )}
        </div>
        <div className="upload-block">
          <label className="upload-label">
            Ảnh khuôn viên (nhiều ảnh)
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={(e) => void onUpload(e.target.files, 'photo')}
            />
          </label>
          <div className="thumb-row">
            {form.image_urls.map((url) => (
              <div key={url} className="thumb">
                <img src={url} alt="Ảnh khuôn viên" />
                <button type="button" className="btn btn-danger" onClick={() => removePhoto(url)}>
                  Xóa
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="upload-block">
          <label className="upload-label">
            Video khuôn viên — tải file (nhiều video)
            <input
              type="file"
              accept="video/*"
              multiple
              disabled={uploading}
              onChange={(e) => void onUpload(e.target.files, 'video')}
            />
          </label>
          <div className="video-link-row">
            <input
              type="url"
              placeholder="…hoặc dán link video (YouTube, Vimeo, .mp4…)"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addVideoLink();
                }
              }}
            />
            <button type="button" className="btn" onClick={addVideoLink}>
              Thêm link video
            </button>
          </div>
          <ul className="video-list">
            {form.video_urls.map((url) => (
              <li key={url}>
                <span className="video-url">{url}</span>
                <button type="button" className="btn btn-danger" onClick={() => removeVideo(url)}>
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        </div>
        {uploading && <p className="muted">Đang tải lên…</p>}
      </fieldset>

      <fieldset>
        <legend>Thông tin tuyển sinh</legend>
        <div className="form-grid">
          <label>Loại trường
            <select value={form.type} onChange={(e) => set('type', e.target.value as UniversityType)}>
              <option value="public">Công lập</option>
              <option value="private">Tư thục</option>
            </select>
          </label>
          <label>Xếp hạng
            <input
              type="number" min="1" value={form.ranking ?? ''}
              onChange={(e) => set('ranking', e.target.value ? Number(e.target.value) : null)}
            />
          </label>
          <label>Yêu cầu TOPIK
            <input value={form.topik_req} onChange={(e) => set('topik_req', e.target.value)} />
          </label>
          <label>Yêu cầu IELTS
            <input value={form.ielts_req} onChange={(e) => set('ielts_req', e.target.value)} />
          </label>
          <label>Yêu cầu GPA
            <input value={form.gpa_req} onChange={(e) => set('gpa_req', e.target.value)} />
          </label>
        </div>
        <label>Ngành đào tạo (mỗi dòng một ngành)
          <textarea rows={5} value={majorsText} onChange={(e) => setMajorsText(e.target.value)} />
        </label>
        <label>Học phí (bắt đầu bằng số triệu KRW/kỳ để lọc được, ví dụ: “4.2 triệu KRW/kỳ …”)
          <textarea rows={2} value={form.tuition} onChange={(e) => set('tuition', e.target.value)} />
        </label>
        <label>Học bổng
          <textarea rows={2} value={form.scholarship} onChange={(e) => set('scholarship', e.target.value)} />
        </label>
        <label>Ký túc xá
          <textarea rows={2} value={form.dorm_info} onChange={(e) => set('dorm_info', e.target.value)} />
        </label>
        <label>Chi phí sinh hoạt
          <textarea rows={2} value={form.living_cost} onChange={(e) => set('living_cost', e.target.value)} />
        </label>
        <label>Thông tin lưu ý quan trọng (hiển thị cho Sale)
          <textarea rows={3} value={form.important_notes} onChange={(e) => set('important_notes', e.target.value)} />
        </label>
        <label>Ghi chú nội bộ cho Sale
          <textarea rows={3} value={form.sale_notes} onChange={(e) => set('sale_notes', e.target.value)} />
        </label>
      </fieldset>
    </form>
  );
}
