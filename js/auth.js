// ============================================================
// auth.js — Device Fingerprint SHA-256, Login, Logout, Session
// ============================================================

async function generateDeviceId() {
  try {
    const canvasFP = await getCanvasFingerprint();
    const components = [
      navigator.userAgent,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
      navigator.platform || 'unknown',
      String(navigator.hardwareConcurrency || 'unknown'),
      canvasFP
    ].join('||');
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(components));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2,'0')).join('');
  } catch(e) {
    return 'device-' + Math.random().toString(36).substr(2,16);
  }
}

async function getCanvasFingerprint() {
  try {
    const c   = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Inter';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125,1,62,20);
    ctx.fillStyle = '#069';
    ctx.fillText('AbsensiApp', 2, 15);
    ctx.fillStyle = 'rgba(102,204,0,0.7)';
    ctx.fillText('AbsensiApp', 4, 17);
    return c.toDataURL().slice(-50);
  } catch(e) { return 'no-canvas'; }
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let device = 'Desktop';
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*?;\s*([^)]+)/);
    device = 'Android ' + (match ? match[1].trim() : '');
  } else if (/iPhone|iPad/i.test(ua)) {
    device = 'iOS ' + (ua.match(/OS ([\d_]+)/) || ['',''])[1].replace(/_/g,'.');
  }
  const browser = /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' :
                  /Safari/i.test(ua)  ? 'Safari' : /Edge/i.test(ua) ? 'Edge' : 'Browser';
  return browser + ' — ' + device;
}

async function doLogin(username, password) {
  const deviceId   = await generateDeviceId();
  const deviceInfo = getDeviceInfo();
  const pwHash     = await sha256(password);

  localStorage.setItem('device_id', deviceId);

  const result = await callAPI('login', {
    username, password_hash: pwHash, device_id: deviceId, device_info: deviceInfo
  });

  if (result) {
    localStorage.setItem('session_token', result.token);
    localStorage.setItem('user_data', JSON.stringify(result));
    return result;
  }
  return null;
}

async function doLogout() {
  try {
    await callAPI('logout', {});
  } catch(e) {}
  clearSession();
  window.location.hash = '#login';
  window.location.reload();
}

function getSession() {
  try {
    const raw = localStorage.getItem('user_data');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function isLoggedIn() {
  const token = localStorage.getItem('session_token');
  const user  = getSession();
  return !!(token && user);
}

function requireAuth(roles = []) {
  const user = getSession();
  if (!user) { window.location.hash = '#login'; return false; }
  if (roles.length > 0 && !roles.includes(user.role)) {
    showToast('Akses ditolak. Role: ' + user.role, 'error');
    return false;
  }
  return true;
}
