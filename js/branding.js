// ============================================================
// branding.js — Load branding dinamis dari pengaturan GAS
// ============================================================

let _brandingLoaded = false;

async function loadBranding(role = 'karyawan') {
  // Selalu load ulang karena bg mungkin beda per role
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
    // Update semua elemen nama instansi
    document.querySelectorAll('.nama-instansi').forEach(el => el.textContent = namaInstansi);
    const mobileNama = document.getElementById('mobile-nama-instansi');
    if (mobileNama) mobileNama.textContent = namaInstansi;
    const loginNama = document.getElementById('login-nama-instansi');
    if (loginNama) loginNama.textContent = namaInstansi;

    // Sidebar: nama lengkap + alamat
    const sbNama = document.getElementById('sb-nama-instansi');
    if (sbNama) sbNama.textContent = namaInstansi;
    const sbAlamat = document.getElementById('sb-alamat-instansi');
    if (sbAlamat && s.alamat_instansi) sbAlamat.textContent = s.alamat_instansi;

    // Update logo sidebar
    const sbImg  = document.getElementById('sb-logo-img');
    const sbIcon = document.getElementById('sb-logo-icon');
    const loginSub = document.getElementById('login-subtitle');
    if (loginSub && s.login_subtitle) loginSub.textContent = s.login_subtitle;
    document.title = namaInstansi + ' — Absensi';

    // Update logo di SEMUA tempat — tanpa background, hanya gambar saja
    const logoUrl = typeof normalizeDriveUrlFrontend === 'function'
      ? normalizeDriveUrlFrontend(s.logo_url || '') : (s.logo_url || '');

    if (logoUrl && logoUrl.startsWith('http')) {
      // Login page logo
      const loginWrap = document.getElementById('login-logo-wrap');
      if (loginWrap) {
        loginWrap.innerHTML = `<img src="${logoUrl}"
          style="max-width:88px;max-height:88px;object-fit:contain;border-radius:0;background:none"
          onerror="this.style.display='none';document.getElementById('login-logo-placeholder').style.display='block'">`;
      }
      // Mobile header logo
      const mobileImg  = document.getElementById('mobile-logo-img');
      const mobileIcon = document.getElementById('mobile-logo-icon');
      if (mobileImg) {
        mobileImg.src = logoUrl;
        mobileImg.style.display = 'block';
        mobileImg.onerror = () => { mobileImg.style.display='none'; if(mobileIcon) mobileIcon.style.display='block'; };
        if (mobileIcon) mobileIcon.style.display = 'none';
      }
      // Sidebar logo
      if (sbImg) {
        sbImg.src = logoUrl; sbImg.style.display = 'block';
        sbImg.onerror = () => { sbImg.style.display='none'; if(sbIcon) sbIcon.style.display='block'; };
        if (sbIcon) sbIcon.style.display = 'none';
      }
      // Admin topbar logo
      const adminImg  = document.getElementById('admin-logo-img');
      const adminIcon = document.getElementById('admin-logo-icon');
      if (adminImg) {
        adminImg.src = logoUrl;
        adminImg.style.display = 'block';
        adminImg.onerror = () => { adminImg.style.display='none'; if(adminIcon) adminIcon.style.display='block'; };
        if (adminIcon) adminIcon.style.display = 'none';
      }
      // Sidebar logo
      document.querySelectorAll('.logo-instansi').forEach(el => {
        el.src = logoUrl;
        el.style.display = 'block';
        el.style.background = 'none';
        el.style.objectFit = 'contain';
        el.style.borderRadius = '0';
        el.onerror = () => { el.style.display = 'none'; };
      });
    }
    document.querySelectorAll('.singkatan-instansi').forEach(el => el.textContent = s.singkatan_instansi || '');

    // logo-instansi selector sudah dihandle di blok logo di atas

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
