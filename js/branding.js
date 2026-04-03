// ============================================================
// branding.js — Load branding dinamis dari pengaturan GAS
// ============================================================

let _brandingLoaded = false;

async function loadBranding(role = 'karyawan') {
  if (_brandingLoaded) return;
  try {
    const keys = [
      'nama_instansi','singkatan_instansi','logo_url','warna_primer',
      'warna_sekunder','footer_text','ucapan_ulang_tahun_template',
      `bg_dashboard_${role}_url`
    ];
    const s = await callAPI('getMultipleSetting', { keys: keys.join(',') });
    if (!s) return;

    // Nama instansi
    document.querySelectorAll('.nama-instansi').forEach(el => el.textContent = s.nama_instansi || 'Instansi');
    document.querySelectorAll('.singkatan-instansi').forEach(el => el.textContent = s.singkatan_instansi || '');

    // Logo
    document.querySelectorAll('.logo-instansi').forEach(el => {
      if (s.logo_url && s.logo_url.startsWith('http')) {
        el.src = s.logo_url;
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
    const bgUrl = s[bgKey];
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
