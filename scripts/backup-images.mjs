#!/usr/bin/env node
/**
 * Mirror the `university-images` Storage bucket (logos, photos, videos) to a
 * folder on this computer:
 *
 *   npm run backup:images                 → ./backups/images
 *   npm run backup:images -- --out D:\Map4Sale-anh
 *
 * Why this exists: no database backup covers Storage — not the weekly GitHub
 * workflow, and not Supabase's own backups on paid plans either. Without this,
 * losing the bucket means re-uploading every image by hand.
 *
 * - Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from the app's .env (or the
 *   environment). Only the public anon key: the bucket is public-read, so no
 *   service-role key ever needs to sit on a PC.
 * - Incremental: a file already present with the same size is skipped, so the
 *   second run only downloads what is new.
 * - Never deletes. An image deleted in Quản trị stays here — guarding against
 *   exactly that mistake is the point of a backup.
 * - Writes _manifest-YYYY-MM-DD.json and exits non-zero if anything failed, so
 *   a partial backup cannot pass for a complete one.
 */
import { createClient } from '@supabase/supabase-js';
import { createWriteStream, existsSync, readFileSync } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const BUCKET = 'university-images';
const PAGE = 1000;
const PARALLEL = 4;

/** Minimal .env reader — KEY=value lines, optional quotes, # comments. */
function loadDotEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const env = { ...loadDotEnv(resolve('.env')), ...process.env };
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const outDir = resolve(argValue('--out') ?? join('backups', 'images'));

if (!url || !anonKey) {
  console.error(
    'Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Chạy lệnh trong thư mục dự án có file .env ' +
      '(giống file dùng cho ứng dụng).',
  );
  process.exit(1);
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

/** Every file in the bucket, walking folders. Folders come back with id null. */
async function listAll(prefix = '') {
  const files = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`Không liệt kê được "${prefix || '/'}": ${error.message}`);
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) files.push(...(await listAll(path)));
      else files.push({ path, size: item.metadata?.size ?? null, updated_at: item.updated_at ?? null });
    }
    if (data.length < PAGE) return files;
  }
}

function publicUrl(path) {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${url.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${encoded}`;
}

/** 'new' | 'same' — throws on failure. Writes to a temp file, then renames, so
 *  an interrupted download never leaves a half file that looks finished. */
async function backupOne(file) {
  const target = join(outDir, ...file.path.split('/'));
  if (file.size != null) {
    const existing = await stat(target).catch(() => null);
    if (existing && existing.size === file.size) return 'same';
  }
  await mkdir(dirname(target), { recursive: true });
  const res = await fetch(publicUrl(file.path));
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const tmp = `${target}.part`;
  try {
    await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
    const got = (await stat(tmp)).size;
    if (file.size != null && got !== file.size) {
      throw new Error(`tải về ${got} byte, Storage báo ${file.size} byte`);
    }
    await rename(tmp, target);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
  return 'new';
}

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  console.log(`Sao lưu ảnh/video từ "${BUCKET}" → ${outDir}`);
  const files = await listAll();
  console.log(`Tìm thấy ${files.length} file trên Supabase Storage.`);

  const result = { new: 0, same: 0, failed: [] };
  let next = 0;
  async function worker() {
    while (next < files.length) {
      const file = files[next++];
      try {
        const outcome = await backupOne(file);
        result[outcome]++;
        if (outcome === 'new') console.log(`  + ${file.path}`);
      } catch (err) {
        result.failed.push({ path: file.path, error: String(err.message ?? err) });
        console.error(`  ✗ ${file.path}: ${err.message ?? err}`);
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));

  const totalBytes = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
  const day = new Date().toISOString().slice(0, 10);
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, `_manifest-${day}.json`),
    JSON.stringify(
      {
        bucket: BUCKET,
        backed_up_at: new Date().toISOString(),
        files: files.length,
        bytes: totalBytes,
        new: result.new,
        unchanged: result.same,
        failed: result.failed,
        items: files,
      },
      null,
      2,
    ),
  );

  console.log('');
  console.log(`Mới tải: ${result.new} · Đã có sẵn: ${result.same} · Lỗi: ${result.failed.length}`);
  console.log(`Tổng dung lượng trên Storage: ${mb(totalBytes)}`);
  if (result.failed.length) {
    console.error('Bản sao lưu CHƯA ĐẦY ĐỦ — chạy lại lệnh để thử tải lại các file lỗi.');
    process.exit(1);
  }
  console.log('Hoàn tất. Các file đã xoá trên Storage vẫn được giữ lại trong thư mục này.');
}

main().catch((err) => {
  console.error(`Sao lưu thất bại: ${err.message ?? err}`);
  process.exit(1);
});
