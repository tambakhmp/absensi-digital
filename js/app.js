// ============================================================
// app.js — SPA Router, Inisialisasi, Login Form, Navigasi
// ============================================================

// ─── Inisialisasi App ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(r => console.log('SW registered:', r.scope))
      .catch(e => console.warn('SW failed:', e));
  }

  // Cek auth & route
  const hash = window.location.hash || '#login';
  if (!isLoggedIn()) {
    renderLoginPage();
    return;
  }

  // Load branding dulu
  const user = getSession();
  await loadBranding(user?.role || 'karyawan');

  // Route ke halaman yang sesuai
  const role = user?.role || 'karyawan';
  if (role === 'superadmin' || role === 'admin') {
    renderAdminLayout();
  } else {
    renderKaryawanLayout();
  }
});

window.addEventListener('hashchange', () => {
  const user = getSession();
  if (!user) return;
  const hash = window.location.hash;
  if (user.role === 'karyawan') {
    routeKaryawan(hash);
  } else {
    routeAdmin(hash);
  }
});

// ─────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────
function renderLoginPage() {
  document.getElementById('app').innerHTML = `
    <div id="app-bg"></div>
    <div id="app-overlay"></div>
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <div style="width:72px;height:72px;border-radius:16px;background:linear-gradient(135deg,#2D6CDF,#1A9E74);
            margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:34px">📋</div>
          <h1 class="nama-instansi">Sistem Absensi</h1>
          <p>Masuk dengan akun karyawan Anda</p>
        </div>

        <div id="login-error" style="display:none;background:#FFF5F5;border:1px solid #FC8181;
          border-radius:8px;padding:12px;color:#C53030;font-size:13px;margin-bottom:16px"></div>

        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" class="form-control" id="login-username"
            placeholder="Masukkan username" autocomplete="username"
            onkeypress="if(event.key==='Enter')doLoginForm()">
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <div style="position:relative">
            <input type="password" class="form-control" id="login-password"
              placeholder="Masukkan password" autocomplete="current-password"
              style="padding-right:44px" onkeypress="if(event.key==='Enter')doLoginForm()">
            <button onclick="togglePwVisibility()" style="position:absolute;right:12px;top:50%;
              transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px">👁</button>
          </div>
        </div>

        <button id="btn-login" class="btn btn--primary btn--full btn--lg" onclick="doLoginForm()">
          <div class="spinner-btn"></div>
          <span class="btn-text">🔐 Masuk</span>
        </button>

        <p style="text-align:center;font-size:12px;color:#94A3B8;margin-top:20px">
          Lupa password? Hubungi administrator.
        </p>

        <p style="text-align:center;font-size:11px;color:#CBD5E0;margin-top:8px" id="footer-text"></p>
      </div>
    </div>`;

  // Load branding login page
  loadBranding('karyawan');
}

function togglePwVisibility() {
  const inp = document.getElementById('login-password');
  inp.type  = inp.type === 'password' ? 'text' : 'password';
}

async function doLoginForm() {
  const btn = document.getElementById('btn-login');
  const err = document.getElementById('login-error');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  if (err) err.style.display = 'none';

  const username = document.getElementById('login-username')?.value?.trim();
  const password = document.getElementById('login-password')?.value;

  if (!username || !password) {
    if (err) { err.style.display='block'; err.textContent='Username dan password wajib diisi'; }
    if (btn) { btn.disabled=false; btn.classList.remove('loading'); }
    return;
  }

  try {
    const result = await doLogin(username, password);
    if (result) {
      await loadBranding(result.role);
      if (result.role === 'superadmin' || result.role === 'admin') {
        renderAdminLayout();
      } else {
        renderKaryawanLayout();
      }
    }
  } catch(e) {
    if (err) { err.style.display='block'; err.textContent='⚠️ ' + e.message; }
    if (btn) { btn.disabled=false; btn.classList.remove('loading'); }
  }
}

// ─────────────────────────────────────────────────────────────
// LAYOUT KARYAWAN (PWA Mobile)
// ─────────────────────────────────────────────────────────────
function renderKaryawanLayout() {
  const user = getSession();
  document.getElementById('app').innerHTML = `
    <div id="app-bg"></div>
    <div id="app-overlay"></div>

    <!-- HEADER -->
    <header class="mobile-header">
      <div class="mobile-header__left">
        <img class="logo-instansi mobile-header__logo"
          src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Logo">
        <span class="mobile-header__title nama-instansi">Absensi</span>
      </div>
      <div class="mobile-header__right">
        <button class="icon-btn" id="btn-notif" title="Pengumuman">
          🔔
          <span class="notif-badge" id="notif-count" style="display:none">0</span>
        </button>
      </div>
    </header>

    <!-- HALAMAN UTAMA (SPA) -->
    <main id="main-content" style="min-height:calc(100vh - 56px - 64px);overflow-y:auto"></main>

    <!-- BOTTOM NAVIGATION -->
    <nav class="bottom-nav">
      <button class="bottom-nav__item active" id="nav-dashboard" onclick="switchTab('dashboard')">
        <span class="nav-icon">🏠</span><span>Dashboard</span>
      </button>
      <button class="bottom-nav__item" id="nav-absensi" onclick="switchTab('absensi')">
        <span class="nav-icon">📋</span><span>Absensi</span>
      </button>
      <button class="bottom-nav__item" id="nav-pengajuan" onclick="switchTab('pengajuan')">
        <span class="nav-icon">📁</span><span>Pengajuan</span>
      </button>
      <button class="bottom-nav__item" id="nav-lembur" onclick="switchTab('lembur')">
        <span class="nav-icon">🕒</span><span>Lembur</span>
      </button>
      <button class="bottom-nav__item" id="nav-profil" onclick="switchTab('profil')">
        <span class="nav-icon">👤</span><span>Profil</span>
      </button>
    </nav>`;

  switchTab('dashboard');
}

function switchTab(tab) {
  // Update nav aktif
  document.querySelectorAll('.bottom-nav__item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById('nav-' + tab);
  if (navEl) navEl.classList.add('active');

  const main = document.getElementById('main-content');
  if (!main) return;

  if (tab === 'dashboard')  renderPageDashboardKaryawan(main);
  else if (tab === 'absensi')   renderPageAbsensi(main);
  else if (tab === 'pengajuan') renderPagePengajuan(main);
  else if (tab === 'lembur')    renderPageLembur(main);
  else if (tab === 'profil')    renderPageProfil(main);
}

// ─────────────────────────────────────────────────────────────
// HALAMAN DASHBOARD KARYAWAN
// ─────────────────────────────────────────────────────────────
function renderPageDashboardKaryawan(container) {
  const user = getSession();
  container.innerHTML = `
    <div class="page-content">
      <!-- Banner Ultah -->
      <div id="ultah-banner" class="ultah-banner" style="display:none">
        <div class="ultah-banner__title">🎂 Selamat Ulang Tahun!</div>
        <div class="ultah-banner__sub" id="ultah-text"></div>
      </div>

      <!-- Profil Header -->
      <div class="profile-header" style="position:relative">
        <div style="display:flex;flex-direction:column;align-items:center;min-width:96px">
          <div id="dash-foto-wrap" style="width:80px;height:80px">
            <div style="width:80px;height:80px;border-radius:50%;background:#E2E8F0"></div>
          </div>
        </div>
        <div class="profile-header__info">
          <div style="font-size:13px;opacity:.8" id="dash-greeting">${greetingWaktu()}</div>
          <div class="profile-header__name" id="dash-nama">${user?.nama||'...'}</div>
          <div class="profile-header__sub" id="dash-nik">NIK: -</div>
          <div class="profile-header__sub" id="dash-jabatan"></div>
          <div style="font-size:12px;opacity:.75;margin-top:2px" id="dash-tanggal">${tanggalHariIni()}</div>
          <div style="font-size:12px;opacity:.75" id="info-shift"></div>
        </div>
      </div>

      <!-- Status Absen -->
      <div id="status-absen-info"></div>

      <!-- Tombol Absensi -->
      <div class="absen-btn-grid">
        <button class="absen-btn absen-btn--masuk" id="btn-absen-masuk" onclick="mulaiAbsenMasuk()">
          <span class="absen-btn__icon">📷</span>
          <span class="absen-btn__label">Absen Masuk</span>
          <span class="absen-btn__info">GPS + Foto Selfie</span>
        </button>
        <button class="absen-btn absen-btn--keluar" id="btn-absen-keluar" onclick="mulaiAbsenKeluar()">
          <span class="absen-btn__icon">🏁</span>
          <span class="absen-btn__label">Absen Keluar</span>
          <span class="absen-btn__info">Foto Selfie</span>
        </button>
      </div>

      <!-- Statistik Bulan Ini -->
      <div class="card" style="margin-bottom:12px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;color:#64748B">
          📊 Statistik Bulan Ini
        </h3>
        <div class="stat-grid">
          ${miniStat('✅','Hadir','stat-hadir','#1A9E74')}
          ${miniStat('⏰','Terlambat','stat-terlambat','#D97706')}
          ${miniStat('❌','Alfa','stat-alfa','#E53E3E')}
          ${miniStat('📝','Izin','stat-izin','#2D6CDF')}
          ${miniStat('🏥','Sakit','stat-sakit','#6B7280')}
          ${miniStat('🏖️','Cuti','stat-cuti','#6C63FF')}
        </div>
      </div>

      <!-- Pengumuman -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3 style="font-size:14px;font-weight:700;margin:0">📢 Pengumuman</h3>
        </div>
        <div id="pengumuman-list">${skeletonCard(2)}</div>
      </div>

      <!-- Ranking -->
      <div id="ranking-section">${skeletonCard(3)}</div>

      <!-- SP Aktif -->
      <div id="sp-saya-section" style="display:none"></div>

      <div style="height:8px"></div>
    </div>`;

  // Load data
  loadDashboardKaryawan();
}

function miniStat(icon, label, id, color) {
  return `<div class="stat-card">
    <div style="font-size:20px">${icon}</div>
    <div class="stat-card__num" id="${id}" style="color:${color}">-</div>
    <div class="stat-card__label">${label}</div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────
// HALAMAN ABSENSI
// ─────────────────────────────────────────────────────────────
function renderPageAbsensi(container) {
  const now = new Date();
  container.innerHTML = `
    <div class="page-content">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h2 style="font-size:17px;font-weight:700;margin:0">📋 Riwayat Absensi</h2>
        <span style="font-size:13px;color:#64748B">${bulanNama(now.getMonth()+1)} ${now.getFullYear()}</span>
      </div>
      <div id="absensi-list">${skeletonCard(5)}</div>
    </div>`;
  loadHalamanAbsensi();
}

// ─────────────────────────────────────────────────────────────
// HALAMAN PENGAJUAN
// ─────────────────────────────────────────────────────────────
function renderPagePengajuan(container) {
  container.innerHTML = `
    <div class="page-content">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h2 style="font-size:17px;font-weight:700;margin:0">📁 Pengajuan</h2>
        <button class="btn btn--primary" style="padding:8px 14px;font-size:13px"
          onclick="tampilFormPengajuan('izin')">+ Buat</button>
      </div>

      <!-- Tombol jenis pengajuan -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
        ${btnJenis('📝','Izin','izin','#2D6CDF')}
        ${btnJenis('🏥','Sakit','sakit','#6B7280')}
        ${btnJenis('🏖️','Cuti','cuti','#6C63FF')}
        ${btnJenis('🚗','Dinas Luar','dinas_luar','#EA580C')}
      </div>

      <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">Riwayat Pengajuan</h3>
      <div id="pengajuan-list">${skeletonCard(3)}</div>
    </div>`;
  loadPengajuanSaya();
}

function btnJenis(icon, label, jenis, color) {
  return `<button onclick="tampilFormPengajuan('${jenis}')"
    style="background:${color}15;border:1.5px solid ${color}30;border-radius:10px;
    padding:12px;display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;
    font-weight:600;color:${color}">
    <span style="font-size:22px">${icon}</span>${label}
  </button>`;
}

// ─────────────────────────────────────────────────────────────
// HALAMAN LEMBUR
// ─────────────────────────────────────────────────────────────
function renderPageLembur(container) {
  container.innerHTML = `
    <div class="page-content">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h2 style="font-size:17px;font-weight:700;margin:0">🕒 Lembur</h2>
        <button class="btn btn--primary" style="padding:8px 14px;font-size:13px"
          onclick="tampilFormLembur()">+ Ajukan</button>
      </div>
      <div id="lembur-list">${skeletonCard(3)}</div>
    </div>`;
  loadLemburSaya();
}

async function loadLemburSaya() {
  const el = document.getElementById('lembur-list');
  if (!el) return;
  try {
    const data = await callAPI('getLemburSaya', {});
    if (!data || data.length === 0) { showEmpty('lembur-list','Belum ada pengajuan lembur'); return; }
    el.innerHTML = data.map(l => `
      <div class="pengajuan-item">
        <div class="pengajuan-item__header">
          <span style="font-weight:700">⏰ Lembur ${formatTanggal(l.tanggal)}</span>
          ${badgeStatus(l.status_bayar||'pending')}
        </div>
        <div style="font-size:13px;color:#64748B">
          🕐 ${l.jam_mulai} – ${l.jam_selesai} · <strong>${l.total_jam} jam</strong>
        </div>
        <div style="font-size:13px;color:#1A9E74;font-weight:600;margin-top:4px">
          ${formatRupiah(l.total_bayar)}
        </div>
        ${l.catatan ? `<div style="font-size:12px;color:#94A3B8;margin-top:4px">${l.catatan}</div>` : ''}
      </div>`).join('');
  } catch(e) { showError('lembur-list', e.message); }
}

function tampilFormLembur() {
  const today = new Date().toISOString().split('T')[0];
  const modal = document.createElement('div');
  modal.id = 'modal-lembur';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;animation:slideUp 0.3s ease">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:16px">⏰ Ajukan Lembur</h3>
        <button onclick="document.getElementById('modal-lembur').remove()"
          style="background:#F1F5F9;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>
      </div>
      <div id="lembur-error" style="display:none;background:#FFF5F5;border:1px solid #FC8181;border-radius:8px;padding:10px;color:#C53030;font-size:13px;margin-bottom:12px"></div>
      <div class="form-group">
        <label class="form-label">Tanggal Lembur <span class="required">*</span></label>
        <input type="date" class="form-control" id="lb-tanggal" value="${today}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label class="form-label">Jam Mulai <span class="required">*</span></label>
          <input type="time" class="form-control" id="lb-mulai" value="17:00" onchange="previewHargaLembur()">
        </div>
        <div class="form-group">
          <label class="form-label">Jam Selesai <span class="required">*</span></label>
          <input type="time" class="form-control" id="lb-selesai" value="20:00" onchange="previewHargaLembur()">
        </div>
      </div>
      <div id="preview-lembur" style="background:#EBF8EE;border-radius:8px;padding:10px;font-size:13px;color:#1A9E74;margin-bottom:12px;font-weight:600">⏳ Menghitung estimasi...</div>
      <div class="form-group">
        <label class="form-label">Keterangan / Alasan Lembur</label>
        <textarea class="form-control" id="lb-keterangan" rows="2" placeholder="Jelaskan pekerjaan lembur..."></textarea>
      </div>
      <button class="btn btn--primary btn--full btn--lg" onclick="submitLemburKaryawan()">
        <div class="spinner-btn"></div>
        <span class="btn-text">📤 Kirim Pengajuan Lembur</span>
      </button>
    </div>`;
  document.body.appendChild(modal);
  previewHargaLembur();
}

async function previewHargaLembur() {
  const mulai  = document.getElementById('lb-mulai')?.value;
  const selesai= document.getElementById('lb-selesai')?.value;
  const el     = document.getElementById('preview-lembur');
  if (!mulai || !selesai || !el) return;
  const m1 = parseInt(mulai.split(':')[0])*60 + parseInt(mulai.split(':')[1]);
  let m2   = parseInt(selesai.split(':')[0])*60 + parseInt(selesai.split(':')[1]);
  if (m2 < m1) m2 += 1440;
  const jam  = Math.round(((m2-m1)/60)*10)/10;
  const user = getSession();
  try {
    const harga    = await callAPI('getHargaLembur', { jabatan: user?.jabatan });
    const total    = jam * (parseFloat(harga)||25000);
    el.textContent = `⏰ ${jam} jam × ${formatRupiah(harga||25000)} = ${formatRupiah(total)}`;
  } catch(e) { el.textContent = `⏰ ${jam} jam`; }
}

async function submitLemburKaryawan() {
  const btn = document.querySelector('#modal-lembur .btn--primary');
  if (btn) { btn.disabled=true; btn.classList.add('loading'); }
  const errEl = document.getElementById('lembur-error');
  if (errEl) errEl.style.display = 'none';
  try {
    const tgl     = document.getElementById('lb-tanggal')?.value;
    const mulai   = document.getElementById('lb-mulai')?.value;
    const selesai = document.getElementById('lb-selesai')?.value;
    const ket     = document.getElementById('lb-keterangan')?.value;
    if (!tgl||!mulai||!selesai) throw new Error('Tanggal dan jam wajib diisi');
    const r = await callAPI('submitLembur', {
      tanggal: fromInputDate(tgl), jam_mulai: mulai, jam_selesai: selesai, keterangan: ket
    });
    document.getElementById('modal-lembur')?.remove();
    showToast(r.message, 'success', 4500);
    await loadLemburSaya();
  } catch(e) {
    if (errEl) { errEl.style.display='block'; errEl.textContent='⚠️ '+e.message; }
    else showToast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled=false; btn.classList.remove('loading'); }
  }
}

// ─────────────────────────────────────────────────────────────
// HALAMAN PROFIL
// ─────────────────────────────────────────────────────────────
function renderPageProfil(container) {
  container.innerHTML = `<div class="page-content"><div id="profil-container">${skeletonCard(5)}</div></div>`;
  loadHalamanProfil();
}

// ─────────────────────────────────────────────────────────────
// LAYOUT ADMIN / SUPERADMIN (Desktop Sidebar)
// ─────────────────────────────────────────────────────────────
function renderAdminLayout() {
  const user = getSession();
  const isSA = user?.role === 'superadmin';

  document.getElementById('app').innerHTML = `
    <div id="app-bg"></div>
    <div id="app-overlay"></div>
    <div class="admin-layout">
      <!-- SIDEBAR -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar__header">
          <img class="logo-instansi sidebar__logo"
            src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Logo"
            onerror="this.style.display='none'">
          <span class="sidebar__title nama-instansi">Absensi</span>
        </div>
        <nav class="sidebar__nav" id="sidebar-nav">
          ${sidebarItem('dashboard-admin','📊','Dashboard')}
          ${sidebarItem('absensi-semua','📋','Absensi')}
          ${sidebarItem('karyawan-list','👥','Karyawan')}
          ${sidebarItem('pengajuan-admin','📁','Pengajuan')}
          ${sidebarItem('lembur-admin','🕒','Lembur')}
          ${sidebarItem('ranking-admin','🏆','Ranking')}
          ${sidebarItem('sp-admin','⚠️','Surat Peringatan')}
          ${sidebarItem('laporan-admin','📊','Laporan & Rekap')}
          ${sidebarItem('pengumuman-admin','📢','Pengumuman')}
          ${sidebarItem('lokasi-admin','📍','Lokasi Kantor')}
          ${sidebarItem('shift-admin','🕐','Shift & Jadwal')}
          ${isSA ? sidebarItem('device-admin','📱','Reset Device') : ''}
          ${isSA ? sidebarItem('pengaturan-admin','⚙️','Pengaturan') : ''}
          <div style="margin-top:auto;padding:16px 0;border-top:1px solid rgba(255,255,255,.08)">
            ${sidebarItem('_logout','🚪','Logout')}
          </div>
        </nav>
        <div class="sidebar__toggle">
          <button onclick="toggleSidebar()"
            style="background:rgba(255,255,255,.1);border:none;color:#fff;border-radius:6px;
            padding:6px 12px;cursor:pointer;font-size:12px;width:100%">☰ Tutup</button>
        </div>
      </aside>

      <!-- MAIN -->
      <div class="admin-main" id="admin-main">
        <header class="admin-topbar">
          <div style="display:flex;align-items:center;gap:12px">
            <button onclick="toggleSidebar()"
              style="background:#F1F5F9;border:none;border-radius:8px;
              padding:8px 12px;cursor:pointer;font-size:16px">☰</button>
            <h2 id="admin-page-title" style="font-size:17px;font-weight:700;margin:0;color:#1E293B">
              Dashboard
            </h2>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:13px;color:#64748B">${user?.nama||'Admin'}</span>
            <div style="width:36px;height:36px;border-radius:50%;overflow:hidden;background:#E2E8F0">
              <img src="${avatarInisial(user?.nama||'A', 36)}" style="width:100%;height:100%">
            </div>
          </div>
        </header>
        <div class="admin-content" id="admin-content">
          <div id="admin-stats-container">${skeletonCard(4)}</div>
          <div id="ultah-section" style="display:none"></div>
          <canvas id="chart-6bulan" style="max-height:280px;margin-top:20px"></canvas>
          <div id="admin-ranking-section" style="margin-top:20px"></div>
        </div>
      </div>
    </div>`;

  // Event sidebar items
  document.getElementById('sidebar-nav').addEventListener('click', e => {
    const item = e.target.closest('.sidebar__item');
    if (!item) return;
    const page = item.dataset.page;
    if (page === '_logout') { confirmLogout(); return; }
    document.querySelectorAll('.sidebar__item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    routeAdmin(page);
  });

  loadDashboardAdmin();
}

function sidebarItem(page, icon, label) {
  return `<button class="sidebar__item" data-page="${page}">
    <span class="sidebar__icon">${icon}</span>
    <span class="sidebar__label">${label}</span>
  </button>`;
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('collapsed');
}

function routeAdmin(page) {
  const content = document.getElementById('admin-content');
  const title   = document.getElementById('admin-page-title');
  if (!content) return;

  const pages = {
    'dashboard-admin' : ['Dashboard', renderAdminDashboardContent],
    'absensi-semua'   : ['Absensi Karyawan',    renderAbsensiAdminFull],
    'karyawan-list'   : ['Manajemen Karyawan',  renderKaryawanAdminFull],
    'pengajuan-admin' : ['Pengajuan',            renderPengajuanAdminContent],
    'lembur-admin'    : ['Lembur',               renderLemburAdminFull],
    'ranking-admin'   : ['Ranking Karyawan',     renderRankingAdmin],
    'sp-admin'        : ['Surat Peringatan',     renderSPAdminFull],
    'pengumuman-admin': ['Pengumuman',           renderPengumumanAdminFull],
    'lokasi-admin'    : ['Lokasi Kantor',        renderLokasiAdminFull],
    'shift-admin'     : ['Shift & Jadwal',       renderShiftAdmin],
    'device-admin'    : ['Reset Device',         renderDeviceAdmin],
    'pengaturan-admin': ['Pengaturan Sistem',    renderPengaturanAdminFull],
    'laporan-admin'   : ['Laporan & Rekap',      renderLaporanAdmin]
  };

  const [label, fn] = pages[page] || ['Dashboard', renderAdminDashboardContent];
  if (title) title.textContent = label;
  fn(content);
}

function renderAdminDashboardContent(container) {
  container.innerHTML = `
    <div id="admin-stats-container">${skeletonCard(4)}</div>
    <div id="ultah-section" style="display:none;margin-top:16px"></div>
    <div class="card" style="margin-top:16px">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">📊 Kehadiran 6 Bulan Terakhir</h3>
      <canvas id="chart-6bulan" style="max-height:280px"></canvas>
    </div>
    <div id="admin-ranking-section" style="margin-top:16px"></div>`;
  loadDashboardAdmin();
}

// Placeholder untuk halaman admin (akan dikembangkan)
function renderAbsensiAdmin(c)      { c.innerHTML = '<div class="admin-content"><div id="absensi-admin-list"><p style="color:#64748B;padding:20px">Fitur absensi admin dalam pengembangan...</p></div></div>'; }
function renderKaryawanAdmin(c)     { c.innerHTML = '<div style="padding:20px;color:#64748B">Fitur manajemen karyawan dalam pengembangan. Gunakan Google Spreadsheet untuk menambah data.</div>'; }
function renderPengajuanAdminContent(c) {
  c.innerHTML = `<div>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn btn--primary" onclick="loadPengajuanAdmin('pending')">Pending</button>
      <button class="btn btn--ghost" onclick="loadPengajuanAdmin('disetujui')">Disetujui</button>
      <button class="btn btn--ghost" onclick="loadPengajuanAdmin('ditolak')">Ditolak</button>
    </div>
    <div id="pengajuan-admin-list">${skeletonCard(4)}</div>
  </div>`;
  loadPengajuanAdmin('pending');
}
function renderLemburAdmin(c)       { c.innerHTML = '<div style="padding:20px;color:#64748B">Fitur lembur admin dalam pengembangan.</div>'; }
function renderRankingAdmin(c)      { c.innerHTML = `<div id="ranking-section">${skeletonCard(3)}</div>`; renderRankingSection('ranking-section'); }
function renderSPAdmin(c)           { c.innerHTML = '<div style="padding:20px;color:#64748B">Fitur SP admin dalam pengembangan.</div>'; }
function renderPengumumanAdmin(c)   { c.innerHTML = '<div style="padding:20px;color:#64748B">Fitur pengumuman admin dalam pengembangan.</div>'; }
function renderLokasiAdmin(c)       { c.innerHTML = '<div style="padding:20px;color:#64748B">Fitur lokasi kantor dalam pengembangan.</div>'; }
function renderShiftAdmin(c)        { c.innerHTML = '<div style="padding:20px;color:#64748B">Fitur shift dalam pengembangan.</div>'; }
function renderDeviceAdmin(c)       {
  c.innerHTML = `<div><h3 style="margin-bottom:16px">📱 Reset Perangkat Karyawan</h3>
    <div id="device-list">${skeletonCard(3)}</div></div>`;
  loadDeviceList();
}
function renderPengaturanAdmin(c)   { c.innerHTML = '<div style="padding:20px;color:#64748B">Fitur pengaturan sistem dalam pengembangan.</div>'; }

async function loadDeviceList() {
  try {
    const data = await callAPI('getDeviceList', {});
    const el   = document.getElementById('device-list');
    if (!el) return;
    const aktif = (data||[]).filter(d => d.status === 'aktif');
    if (aktif.length === 0) { showEmpty('device-list', 'Tidak ada perangkat terdaftar'); return; }
    el.innerHTML = `<div class="card"><table class="simple-table"><thead><tr>
      <th>Karyawan</th><th>Perangkat</th><th>Tgl Daftar</th><th>Aksi</th>
    </tr></thead><tbody>
      ${aktif.map(d => `<tr>
        <td><strong>${d.nama_karyawan}</strong></td>
        <td style="font-size:12px">${d.device_info||'-'}</td>
        <td style="font-size:12px">${formatTanggal(String(d.tgl_daftar).split(' ')[0])}</td>
        <td><button class="btn btn--danger" style="padding:6px 12px;font-size:12px"
          onclick="resetDeviceKaryawanAdmin('${d.id_karyawan}','${d.nama_karyawan}')">🔄 Reset</button></td>
      </tr>`).join('')}
    </tbody></table></div>`;
  } catch(e) { showError('device-list', e.message); }
}

function resetDeviceKaryawanAdmin(idKaryawan, nama) {
  showModal('Reset Perangkat?',
    `Reset perangkat <strong>${nama}</strong>? Karyawan harus login ulang dari perangkat baru.`,
    async () => {
      try {
        const r = await callAPI('resetDevice', { id_karyawan: idKaryawan });
        showToast(r.message, 'success');
        await loadDeviceList();
      } catch(e) { showToast(e.message, 'error'); }
    }, '🔄 Reset Sekarang'
  );
}
