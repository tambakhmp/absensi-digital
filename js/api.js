// api.js — Komunikasi ke Google Apps Script
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxcwtnmjG82arvC4uC8Uh_EjAR-rieUKoeqZKPt-mNvxMSBdMGMW_Aw3_Dijno7pVZrVg/exec'
};

// Daftar action yang TIDAK boleh auto-logout meskipun error mengandung "Sesi tidak valid"
// Ini untuk action yang kirim payload besar (foto base64) yang bisa trigger false-positive
const NO_AUTO_LOGOUT_ACTIONS = ['absenViaQR', 'absenMasuk', 'absenKeluar', 'uploadFotoProfil', 'uploadTTD'];

async function callAPI(action, payload = {}) {
  const token    = localStorage.getItem('absensi_token') || '';
  const deviceId = localStorage.getItem('absensi_device') || '';
  if (CONFIG.GAS_URL.includes('GANTI_URL')) {
    throw new Error('GAS_URL belum diisi di api.js');
  }
  const body = JSON.stringify({ action, token, device_id: deviceId, ...payload });
  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 60000); // 60 detik untuk upload foto
    const res  = await fetch(CONFIG.GAS_URL, {
      method:'POST', headers:{'Content-Type':'text/plain'}, body, signal:ctrl.signal
    });
    clearTimeout(tid);
    if (!res.ok) throw new Error('Server error: HTTP '+res.status);
    const data = await res.json();
    if (!data.success) {
      // HANYA auto-logout kalau:
      // 1. Error mengandung "Sesi tidak valid"
      // 2. DAN action ini bukan action yang kirim payload besar
      const isSessionError = data.error && data.error.includes('Sesi tidak valid');
      const skipAutoLogout = NO_AUTO_LOGOUT_ACTIONS.indexOf(action) !== -1;

      if (isSessionError && !skipAutoLogout) {
        localStorage.removeItem('absensi_token');
        localStorage.removeItem('absensi_user');
        window.location.reload(); return null;
      }
      // Kalau session error tapi action di-skip, throw normal error
      throw new Error(data.error || 'Terjadi kesalahan server');
    }
    return data.data;
  } catch(e) {
    if (e.name === 'AbortError') throw new Error('Request timeout setelah 60 detik. Koneksi lambat atau file terlalu besar.');
    throw e;
  }
}

async function compressImage(file, maxWidth=800, quality=0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio  = Math.min(maxWidth/img.width, 1);
      canvas.width  = img.width  * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob); }, 'image/jpeg', quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}
function fileToBase64(file) {
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(file);});
}
function blobToBase64(blob) {
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(blob);});
}
