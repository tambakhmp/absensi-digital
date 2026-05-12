// auth.js — Login, Logout, Session, Device Fingerprint

async function generateDeviceId() {
  try {
    // Normalisasi orientasi: selalu min x max agar portrait & landscape hasilnya sama
    const sw = Math.min(screen.width, screen.height);
    const sh = Math.max(screen.width, screen.height);

    // Stabilkan userAgent: hapus versi browser yang sering berubah saat update
    // Contoh: "Chrome/124.0.0.0" → "Chrome"
    const ua = navigator.userAgent
      .replace(/\/[\d\.]+/g, '')   // hapus semua /versi
      .replace(/\s+/g, ' ')          // normalisasi spasi
      .trim();

    const components = [
      ua,
      sw + 'x' + sh + 'x' + screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
      String(navigator.hardwareConcurrency || 'u'),
      String(navigator.deviceMemory || 'u')
    ].join('||');

    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(components));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  } catch(e) {
    return 'dev-' + Math.random().toString(36).substr(2, 16);
  }
}
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let d = /Android/i.test(ua)?'Android':/iPhone|iPad/i.test(ua)?'iOS':'Desktop';
  const b = /Chrome/i.test(ua)?'Chrome':/Firefox/i.test(ua)?'Firefox':/Safari/i.test(ua)?'Safari':'Browser';
  return b+' — '+d;
}
async function doLogin(username, password) {
  // Gunakan device_id yang sudah tersimpan jika ada — jangan recalculate
  // agar browser update / rotasi layar tidak dianggap device baru
  let deviceId = localStorage.getItem('absensi_device');
  if (!deviceId) {
    deviceId = await generateDeviceId();
    localStorage.setItem('absensi_device', deviceId);
  }
  const deviceInfo = getDeviceInfo();
  const pwHash     = await sha256(password);
  const result = await callAPI('login', { username, password_hash:pwHash, device_id:deviceId, device_info:deviceInfo });
  if (result) {
    localStorage.setItem('absensi_token', result.token);
    localStorage.setItem('absensi_user',  JSON.stringify(result));
  }
  return result;
}
async function doLogout() {
  // Clear token DULU supaya kalau reload race API call, isLoggedIn() = false
  // (mencegah kedipan dashboard admin saat logout)
  localStorage.removeItem('absensi_token');
  localStorage.removeItem('absensi_user');
  // Notify server (best-effort, fire-and-forget, tidak perlu di-await)
  try { callAPI('logout', {}); } catch(e) {}
  window.location.reload();
}
function getSession() {
  try { return JSON.parse(localStorage.getItem('absensi_user')||'null'); } catch(e){ return null; }
}
function isLoggedIn() {
  return !!(localStorage.getItem('absensi_token') && getSession());
}
