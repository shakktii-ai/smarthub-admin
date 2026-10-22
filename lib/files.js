export const FILE_RULES = { photo: { max: 2 * 1024 * 1024, types: ['image/jpeg', 'image/png'], label: 'JPG or PNG up to 2 MB' }, doc: { max: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'application/pdf'], label: 'JPG, PNG or PDF up to 5 MB' } };
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };

// Detects the real type from the first bytes, so a renamed file cannot pass.
export function sniff(buf) {
  const b = new Uint8Array(buf.slice(0, 5));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
  return null;
}
// Server-side check. Returns { error } or { buffer, mime, ext }.
export async function checkFile(file, kind) {
  const rule = FILE_RULES[kind];
  if (!file || typeof file === 'string' || file.size === 0) return { empty: true };
  if (file.size > rule.max) return { error: `File is too large (${rule.label})` };
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buffer);
  if (!mime || !rule.types.includes(mime)) return { error: `Unsupported file (${rule.label})` };
  return { buffer, mime, ext: EXT[mime] };
}
// Client-side pre-check (UX only; the server repeats it).
export function clientFileError(file, kind) {
  const rule = FILE_RULES[kind];
  if (!file) return '';
  if (!rule.types.includes(file.type)) return `Unsupported file (${rule.label})`;
  return file.size > rule.max ? `File is too large (${rule.label})` : '';
}
