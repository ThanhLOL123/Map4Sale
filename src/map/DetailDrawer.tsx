import RichText from '../components/RichText';
import type { University } from '../lib/types';

interface Props {
  university: University;
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="drawer-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

/** Turn a YouTube/Vimeo watch URL into its embeddable form, else null. */
function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function VideoEmbed({ url }: { url: string }) {
  const embed = toEmbedUrl(url);
  if (embed) {
    return (
      <div className="video-embed">
        <iframe
          src={embed}
          title="Video giới thiệu"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  // Uploaded file (Storage URL / blob:) or a direct video link.
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || url.startsWith('blob:') || url.includes('/storage/')) {
    return (
      <div className="video-embed">
        <video src={url} controls preload="metadata" />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="video-link">
      ▶︎ Xem video
    </a>
  );
}

export default function DetailDrawer({ university: u, onClose }: Props) {
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden />
      <aside className="detail-drawer" aria-label={`Thông tin ${u.name_vi}`}>
        <div className="drawer-handle" aria-hidden />
        <button type="button" className="drawer-close" onClick={onClose} aria-label="Đóng">
          ✕
        </button>

        <header className="drawer-header">
        {u.logo_url ? (
          <img src={u.logo_url} alt={`Logo ${u.name_en}`} className="school-logo" />
        ) : (
          <div className="school-logo school-logo-placeholder" aria-hidden>
            {u.name_en.slice(0, 1)}
          </div>
        )}
        <div>
          <h2>{u.name_vi}</h2>
          <p className="drawer-subnames">
            {u.name_en} · {u.name_kr}
          </p>
          <p className="drawer-badges">
            <span className="badge">{u.city}, {u.region}</span>
            <span className={`badge badge-${u.type}`}>
              {u.type === 'public' ? 'Công lập' : 'Tư thục'}
            </span>
            {u.ranking != null && <span className="badge badge-rank">Hạng #{u.ranking}</span>}
          </p>
        </div>
      </header>

      {u.important_notes && (
        <div className="important-notes" role="note">
          <span className="important-notes-title">⚠️ Thông tin lưu ý quan trọng</span>
          <RichText value={u.important_notes} />
        </div>
      )}

      {u.image_urls.length > 0 && (
        <div className="gallery">
          {u.image_urls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt={`${u.name_en} campus`} loading="lazy" />
            </a>
          ))}
        </div>
      )}

      {u.video_urls.length > 0 && (
        <Section title="🎥 Video">
          <div className="video-list-view">
            {u.video_urls.map((url) => (
              <VideoEmbed key={url} url={url} />
            ))}
          </div>
        </Section>
      )}

      <Section title="🎓 Ngành đào tạo">
        <div className="chips">
          {u.majors.map((m) => (
            <span key={m} className="chip">{m}</span>
          ))}
        </div>
      </Section>

      {u.majors_detail && (
        <Section title="🏛️ Giới thiệu khoa – chuyên ngành">
          <RichText
            value={u.majors_detail}
            expandable
            title="Giới thiệu khoa – chuyên ngành"
          />
        </Section>
      )}

      <Section title="💰 Học phí">
        <RichText value={u.tuition} />
      </Section>

      <Section title="🏅 Học bổng">
        <RichText value={u.scholarship} />
      </Section>

      <Section title="📋 Điều kiện đầu vào">
        <ul className="req-list">
          <li><strong>TOPIK:</strong> {u.topik_req || '—'}</li>
          <li><strong>IELTS:</strong> {u.ielts_req || '—'}</li>
          <li><strong>GPA:</strong> {u.gpa_req || '—'}</li>
        </ul>
      </Section>

      <Section title="🏠 Ký túc xá">
        <RichText value={u.dorm_info} />
      </Section>

      <Section title="🍜 Chi phí sinh hoạt">
        <RichText value={u.living_cost} />
      </Section>

      {u.sale_notes && (
        <Section title="📝 Ghi chú">
          <RichText value={u.sale_notes} className="sale-notes" />
        </Section>
      )}

        <footer className="drawer-footer">
          Cập nhật: {new Date(u.updated_at).toLocaleDateString('vi-VN')}
        </footer>
      </aside>
    </>
  );
}
