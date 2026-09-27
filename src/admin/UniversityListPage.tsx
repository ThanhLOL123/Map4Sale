import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteUniversity, fetchUniversities } from '../lib/api';
import { COUNTRIES, COUNTRY_CODES, type CountryCode } from '../lib/countries';
import type { University } from '../lib/types';

export default function UniversityListPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [q, setQ] = useState('');
  const [country, setCountry] = useState<CountryCode | ''>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUniversities().then(setUniversities).catch((e) => setError(String(e)));
  }, []);

  async function onDelete(u: University) {
    if (!window.confirm(`Xóa "${u.name_vi}"? Ảnh đã tải lên cũng sẽ bị xóa.`)) return;
    try {
      await deleteUniversity(u);
      setUniversities((list) => list.filter((x) => x.id !== u.id));
    } catch (e) {
      setError(String(e));
    }
  }

  const inCountry = country ? universities.filter((u) => u.country === country) : universities;
  const shown = inCountry.filter((u) =>
    `${u.name_vi} ${u.name_en} ${u.name_kr} ${u.city}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <div className="admin-toolbar">
        <h1>Trường đại học ({inCountry.length})</h1>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value as CountryCode | '')}
          aria-label="Quốc gia"
        >
          <option value="">Tất cả quốc gia</option>
          {COUNTRY_CODES.map((c) => (
            <option key={c} value={c}>{COUNTRIES[c].label}</option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Tìm kiếm…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {/* Carries the chosen country so a new school starts on the right map. */}
        <Link
          to={`/admin/universities/new${country ? `?country=${country}` : ''}`}
          className="btn btn-primary"
        >
          + Thêm trường
        </Link>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Tên trường</th>
            <th>Thành phố</th>
            <th>Loại</th>
            <th>Hạng</th>
            <th>Ảnh</th>
            <th>Cập nhật</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {shown.map((u) => (
            <tr key={u.id}>
              <td>
                <strong>{u.name_vi}</strong>
                {u.is_featured && (
                  <span className="badge badge-featured" title="Nổi bật">★</span>
                )}
                <br />
                <span className="muted">{u.name_en}</span>
              </td>
              <td>
                {u.city}
                <br />
                <span className="muted">{COUNTRIES[u.country].label}</span>
              </td>
              <td>{u.type === 'public' ? 'Công lập' : 'Tư thục'}</td>
              <td>{u.ranking ?? '—'}</td>
              <td>{(u.logo_url ? 1 : 0) + u.image_urls.length}</td>
              <td>{new Date(u.updated_at).toLocaleDateString('vi-VN')}</td>
              <td className="row-actions">
                <Link to={`/admin/universities/${u.id}/edit`} className="btn btn-ghost">Sửa</Link>
                <button type="button" className="btn btn-danger" onClick={() => void onDelete(u)}>
                  Xóa
                </button>
              </td>
            </tr>
          ))}
          {shown.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">Không có trường nào.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
