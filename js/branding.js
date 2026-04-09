// ============================================================
// branding.js — Load branding dinamis dari pengaturan GAS
// ============================================================

let _brandingLoaded = false;

async function loadBranding(role = 'karyawan') {
  if (_brandingLoaded) return;
  try {
    let s;
    const token = localStorage.getItem('session_token');
    if (token) {
      // Sudah login: ambil via callAPI normal
      const keys = [
        'nama_instansi','singkatan_instansi','logo_url','warna_primer',
        'warna_sekunder','footer_text','ucapan_ulang_tahun_template',
        `bg_dashboard_${role}_url`,'favicon_url','login_subtitle','icon_512_url'
      ];
      s = await callAPI('getMultipleSetting', { keys: keys.join(',') });
    } else {
      // Belum login: ambil via endpoint publik (getBranding tidak butuh token)
      s = await _loadBrandingPublic();
    }
    if (!s) return;

    // Nama instansi
    const namaInstansi = s.nama_instansi || 'Sistem Absensi';
    document.querySelectorAll('.nama-instansi').forEach(el => el.textContent = namaInstansi);

    // Update halaman login secara spesifik
    const loginNama = document.getElementById('login-nama-instansi');
    if (loginNama) loginNama.textContent = namaInstansi;

    const loginSub = document.getElementById('login-subtitle');
    if (loginSub && s.login_subtitle) loginSub.textContent = s.login_subtitle;

    const loginLogoWrap = document.getElementById('login-logo-wrap');
    if (loginLogoWrap) {
      const logoUrl2 = typeof normalizeDriveUrlFrontend === 'function'
        ? normalizeDriveUrlFrontend(s.logo_url || '') : (s.logo_url || '');
      if (logoUrl2 && logoUrl2.startsWith('http')) {
        loginLogoWrap.innerHTML = `<img src="${logoUrl2}" style="width:70px;height:70px;
          object-fit:contain;border-radius:12px"
          onerror="this.parentElement.innerHTML='📋'">`;
      }
    }
    document.querySelectorAll('.singkatan-instansi').forEach(el => el.textContent = s.singkatan_instansi || '');

    // Logo — normalisasi URL Drive agar bisa tampil sebagai <img>
    const logoUrl = typeof normalizeDriveUrlFrontend === 'function'
      ? normalizeDriveUrlFrontend(s.logo_url || '')
      : (s.logo_url || '');
    document.querySelectorAll('.logo-instansi').forEach(el => {
      if (logoUrl && logoUrl.startsWith('http')) {
        el.src = logoUrl;
        el.style.display = 'block';
        el.onerror = () => el.style.display = 'none';
      }
    });

    // CSS Variables warna
    const primer = s.warna_primer || '#2D6CDF';
    const sekund  = s.warna_sekunder || '#1A9E74';
    document.documentElement.style.setProperty('--color-primer', primer);
    document.documentElement.style.setProperty('--color-sekunder', sekund);

    // Theme color meta tag
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', primer);

    // Background dashboard
    const bgKey = `bg_dashboard_${role}_url`;
    const rawBg = s[bgKey] || '';
    const bgUrl = typeof normalizeDriveUrlFrontend === 'function'
      ? normalizeDriveUrlFrontend(rawBg) : rawBg;
    const appBg = document.getElementById('app-bg');
    if (appBg && bgUrl && bgUrl.startsWith('http')) {
      appBg.style.backgroundImage = `url('${bgUrl}')`;
      appBg.style.backgroundSize     = 'cover';
      appBg.style.backgroundPosition = 'center';
      appBg.style.backgroundAttachment = 'fixed';
      const overlay = document.getElementById('app-overlay');
      if (overlay) overlay.style.background = 'rgba(255,255,255,0.88)';
    }

    // Footer
    const footer = document.getElementById('footer-text');
    if (footer) footer.textContent = s.footer_text || '';

    // Simpan template ucapan ultah di localStorage untuk utils.js
    if (s.ucapan_ulang_tahun_template) {
      localStorage.setItem('ucapan_tmpl', s.ucapan_ulang_tahun_template);
    }

    // Title browser
    if (s.nama_instansi) document.title = 'Absensi — ' + s.nama_instansi;

    _brandingLoaded = true;
  } catch(e) {
    console.warn('loadBranding error:', e.message);
  }
}

// Reset cache branding (dipanggil setelah simpan pengaturan)
function resetBrandingCache() {
  _brandingLoaded = false;
}

// Ambil branding tanpa token (untuk halaman login)
async function _loadBrandingPublic() {
  try {
    const gasUrl = (typeof CONFIG !== 'undefined') ? CONFIG.GAS_URL : '';
    if (!gasUrl || gasUrl.includes('GANTI')) return null;
    const body = JSON.stringify({ action: 'getBranding', token: '', device_id: '' });
    const res  = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && data.success) ? data.data : null;
  } catch(e) {
    console.warn('loadBrandingPublic error:', e.message);
    return null;
  }
}

// [DUPLIKAT DIHAPUS: resetBrandingCache]
