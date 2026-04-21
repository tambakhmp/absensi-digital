// ============================================================
// app.js v5 — SPA Router Final, Bersih, Tidak Ada Duplikat
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('SW:', reg.scope);
        // Cek update setiap buka halaman
        reg.update();
        // Kalau ada SW baru yang nunggu, force activate
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              // SW baru siap — reload sekali biar user langsung dapat versi baru
              console.log('SW: versi baru terdeteksi, reloading...');
              window.location.reload();
            }
          });
        });
      })
      .catch(e => console.warn('SW:', e));
  }
  if (!isLoggedIn()) {
    // Tunggu branding selesai dulu (timeout 3s agar tidak hang kalau offline)
    // supaya login form langsung muncul dengan warna/logo yang benar — tidak ada kedipan
    try {
      await Promise.race([
        loadBranding('karyawan'),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);
    } catch(e) {}
    renderLoginPage();
    return;
  }
  const user = getSession();
  await loadBranding(user?.role || 'karyawan');
  if (user?.role === 'superadmin' || user?.role === 'admin') {
    renderAdminLayout();
  } else {
    renderKaryawanLayout();
  }
});

window.addEventListener('hashchange', () => {
  const user = getSession();
  if (!user) return;
  const hash = window.location.hash.replace('#','');
  if (user.role === 'karyawan') return;
  if (hash) routeAdmin(hash);
});

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
function renderLoginPage() {
  document.getElementById('app').innerHTML = `
    <div id="app-bg"></div><div id="app-overlay"></div>
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <div id="login-logo-wrap"
            style="width:88px;height:88px;margin:0 auto 14px;
            display:flex;align-items:center;justify-content:center">
            <img class="logo-instansi" id="login-logo-img"
              src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
              alt="" style="width:88px;height:88px;object-fit:contain;border-radius:14px;display:none"
              onload="this.style.display='block';document.getElementById('login-logo-placeholder').style.display='none'">
            <span id="login-logo-placeholder" style="font-size:52px">📋</span>
          </div>
          <h1 class="nama-instansi" id="login-nama-instansi">Sistem Absensi</h1>
          <p class="login-subtitle" id="login-subtitle">Masuk dengan akun karyawan Anda</p>
        </div>
        <div id="login-err" style="display:none;background:#FFF5F5;border:1px solid #FC8181;
          border-radius:8px;padding:12px;color:#C53030;font-size:13px;margin-bottom:16px"></div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" class="form-control" id="login-user" placeholder="Masukkan username"
            autocomplete="username" onkeypress="if(event.key==='Enter')doLoginForm()">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <div style="position:relative">
            <input type="password" class="form-control" id="login-pass"
              placeholder="Masukkan password" autocomplete="current-password"
              style="padding-right:44px" onkeypress="if(event.key==='Enter')doLoginForm()">
            <button onclick="togglePW()" style="position:absolute;right:12px;top:50%;
              transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px">👁</button>
          </div>
        </div>
        <button id="btn-login" class="btn btn--primary btn--full btn--lg" onclick="doLoginForm()">
          <div class="spinner-btn"></div><span class="btn-text">🔐 Masuk</span>
        </button>
        <p style="text-align:center;font-size:12px;color:#94A3B8;margin-top:20px">
          Lupa password? Hubungi administrator.</p>
        <p style="text-align:center;font-size:11px;color:#CBD5E0;margin-top:8px" id="footer-text"></p>
      </div>
    </div>`;
  // Tampilkan branding dari cache dulu (instant, tanpa tunggu API)
  try {
    var _bc = window.__brandCache || JSON.parse(localStorage.getItem('_brand') || '{}');
    // Warna CSS variables (paling penting utk hilangkan flash biru default)
    if (_bc.warna_primer)   document.documentElement.style.setProperty('--color-primer', _bc.warna_primer);
    if (_bc.warna_sekunder) document.documentElement.style.setProperty('--color-sekunder', _bc.warna_sekunder);
    // Logo
    if (_bc.logo_url) {
      var _img = document.getElementById('login-logo-img');
      var _ph  = document.getElementById('login-logo-placeholder');
      if (_img) { _img.src = _bc.logo_url; _img.style.display='block'; }
      if (_ph)  _ph.style.display = 'none';
    }
    // Nama instansi
    if (_bc.nama_instansi) {
      var _nm = document.getElementById('login-nama-instansi');
      if (_nm) _nm.textContent = _bc.nama_instansi;
    }
    // Subtitle
    if (_bc.login_subtitle) {
      var _sub = document.getElementById('login-subtitle');
      if (_sub) _sub.textContent = _bc.login_subtitle;
    }
    // Footer
    if (_bc.footer_text) {
      var _ft = document.getElementById('footer-text');
      if (_ft) _ft.textContent = _bc.footer_text;
    }
    // Background (dari bg_karyawan yg sudah di-cache setelah login pertama)
    if (_bc.bg_karyawan) {
      var _bg = document.getElementById('app-bg');
      if (_bg) {
        _bg.style.backgroundImage = "url('" + _bc.bg_karyawan + "')";
        _bg.style.backgroundSize = 'cover';
        _bg.style.backgroundPosition = 'center';
        _bg.style.backgroundAttachment = 'fixed';
      }
      var _ov = document.getElementById('app-overlay');
      if (_ov) _ov.style.background = 'rgba(255,255,255,0.88)';
    }
  } catch(e) {}
  // Tetap panggil loadBranding untuk update + simpan cache terbaru
  loadBranding('karyawan');
}

function togglePW(){
  const i=document.getElementById('login-pass');
  if(i)i.type=i.type==='password'?'text':'password';
}

async function doLoginForm() {
  const btn=document.getElementById('btn-login');
  const err=document.getElementById('login-err');
  if(btn){btn.disabled=true;btn.classList.add('loading');}
  if(err)err.style.display='none';
  const user=document.getElementById('login-user')?.value?.trim();
  const pass=document.getElementById('login-pass')?.value;
  if(!user||!pass){
    if(err){err.style.display='block';err.textContent='Username dan password wajib diisi';}
    if(btn){btn.disabled=false;btn.classList.remove('loading');}
    return;
  }
  try{
    const result=await doLogin(user,pass);
    if(result){
      // Simpan branding ke cache agar tampil langsung next open
      try {
        callAPI('getMultipleSetting',{keys:'nama_instansi,logo_url'}).then(function(d){
          if(d) localStorage.setItem('_brand', JSON.stringify(d));
          window.location.reload();
        }).catch(function(){ window.location.reload(); });
      } catch(e) { window.location.reload(); }
    }
  }catch(e){
    if(err){err.style.display='block';err.textContent='⚠️ '+e.message;}
    if(btn){btn.disabled=false;btn.classList.remove('loading');}
  }
}

// ─────────────────────────────────────────────────────────────
// LAYOUT KARYAWAN
// ─────────────────────────────────────────────────────────────
function renderKaryawanLayout() {
  document.getElementById('app').innerHTML = `
    <div id="app-bg"></div><div id="app-overlay"></div>
    <header class="mobile-header">
      <div class="mobile-header__left" style="display:flex;align-items:center;gap:8px">
        <div id="mobile-logo-wrap" style="width:32px;height:32px;flex-shrink:0;display:flex;align-items:center">
          <img class="logo-instansi" id="mobile-logo-img"
            src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
            alt="" style="width:32px;height:32px;object-fit:contain;border-radius:6px;display:none">
          <span id="mobile-logo-icon" style="font-size:22px">📋</span>
        </div>
        <span class="mobile-header__title nama-instansi" id="mobile-nama-instansi"
          style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;
          text-overflow:ellipsis;max-width:200px">Absensi</span>
      </div>
      <div class="mobile-header__right">
        <button class="icon-btn" onclick="switchTab('pengajuan')" title="Notifikasi">🔔</button>
      </div>
    </header>
    <main id="main-content" style="min-height:calc(100vh - 56px - 64px);overflow-y:auto"></main>
    <nav class="bottom-nav">
      <button class="bottom-nav__item active" id="nav-dashboard" onclick="switchTab('dashboard')">
        <span class="nav-icon">🏠</span><span>Dashboard</span></button>
      <button class="bottom-nav__item" id="nav-absensi" onclick="switchTab('absensi')">
        <span class="nav-icon">📋</span><span>Absensi</span></button>
      <button class="bottom-nav__item" id="nav-pengajuan" onclick="switchTab('pengajuan')">
        <span class="nav-icon">📁</span><span>Pengajuan</span></button>
      <button class="bottom-nav__item" id="nav-lembur" onclick="switchTab('lembur')">
        <span class="nav-icon">🕒</span><span>Lembur</span></button>
      <button class="bottom-nav__item" id="nav-profil" onclick="switchTab('profil')">
        <span class="nav-icon">👤</span><span>Profil</span></button>
    </nav>`;
  switchTab('dashboard');
  // Reload branding untuk update logo di mobile header
  const sess2 = getSession();
  if (sess2) loadBranding(sess2.role || 'karyawan');
}

function switchTab(tab) {
  document.querySelectorAll('.bottom-nav__item').forEach(el => el.classList.remove('active'));
  const nav=document.getElementById('nav-'+tab);
  if(nav)nav.classList.add('active');
  const main=document.getElementById('main-content');
  if(!main) return;
  if(tab==='dashboard')   renderPageDashboard(main);
  else if(tab==='absensi')    renderPageAbsensi(main);
  else if(tab==='pengajuan')  renderPagePengajuan(main);
  else if(tab==='lembur')     renderPageLembur(main);
  else if(tab==='profil')     renderPageProfil(main);
}

// ─── HALAMAN DASHBOARD ───────────────────────────────────────
function renderPageDashboard(c) {
  const user=getSession();
  c.innerHTML = `<div class="page-content">
    <!-- Ultah -->
    <div id="ultah-banner" class="ultah-banner" style="display:none">
      <div class="ultah-banner__title">🎂 Selamat Ulang Tahun!</div>
      <div class="ultah-banner__sub" id="ultah-text"></div>
    </div>
    <!-- Profil header -->
    <div class="profile-header">
      <div style="display:flex;flex-direction:column;align-items:center;min-width:90px">
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
      </div>
    </div>
    <!-- Peringatan lokasi -->
    <div id="lokasi-warn" style="display:none"></div>
    <!-- Info jam kerja (v6) -->
    <div id="info-jam-kerja" style="display:none"></div>
    <!-- Reminder absen keluar (v6.3) -->
    <div id="reminder-absen-keluar" style="display:none"></div>
    <!-- Dinas Luar aktif -->
    <div id="info-dinas-luar" style="display:none"></div>
    <!-- Status absen -->
    <div id="status-absen-info"></div>
    <!-- Tombol Absen -->
    <div class="absen-btn-grid">
      <button class="absen-btn absen-btn--masuk" id="btn-absen-masuk" onclick="mulaiAbsenMasuk()">
        <span class="absen-btn__icon">📷</span>
        <span class="absen-btn__label">Absen Masuk</span>
        <span class="absen-btn__info">GPS + Foto</span>
      </button>
      <button class="absen-btn absen-btn--keluar" id="btn-absen-keluar" onclick="mulaiAbsenKeluar()">
        <span class="absen-btn__icon">🏁</span>
        <span class="absen-btn__label">Absen Keluar</span>
        <span class="absen-btn__info">GPS + Foto</span>
      </button>
    </div>
    <!-- ⚠️ PERINGATAN SP — merah mencolok, tepat setelah tombol absen -->
    <div id="sp-saya-section" style="display:none"></div>

    <!-- Statistik bulan ini -->
    <div class="card">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;color:#64748B">📊 Bulan Ini</h3>
      <div class="stat-grid">
        ${_ms('✅','Hadir','stat-hadir','#1A9E74')}${_ms('⏰','Terlambat','stat-terlambat','#D97706')}
        ${_ms('❌','Alfa','stat-alfa','#E53E3E')}${_ms('📝','Izin','stat-izin','#2D6CDF')}
        ${_ms('🏥','Sakit','stat-sakit','#6B7280')}${_ms('🏖️','Cuti','stat-cuti','#6C63FF')}
      </div>
    </div>

    <!-- Ranking terbaik & terburuk -->
    <div id="ranking-section">${skeletonCard(3)}</div>

    <!-- Pengumuman -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="font-size:14px;font-weight:700;margin:0">📢 Pengumuman</h3>
      </div>
      <div id="pengumuman-list">${skeletonCard(2)}</div>
    </div>

    <!-- Jadwal Shift (hanya untuk karyawan shift) -->
    <div class="card" id="jadwal-minggu-card" style="display:none">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;color:#64748B">📅 Jadwal Shift Saya</h3>
      <div id="jadwal-minggu-list"></div>
    </div>

    <div style="height:8px"></div>
  </div>`;
  loadDashboardKaryawan();
  loadJadwalMingguSaya();
}
function _ms(icon,label,id,color){return `<div class="stat-card">
  <div style="font-size:20px">${icon}</div>
  <div class="stat-card__num" id="${id}" style="color:${color}">-</div>
  <div class="stat-card__label">${label}</div></div>`;}

// ─── HALAMAN ABSENSI ─────────────────────────────────────────
function renderPageAbsensi(c){
  c.innerHTML=`<div class="page-content">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <h2 style="font-size:17px;font-weight:700;margin:0">📋 Riwayat Absensi</h2>
    </div>
    <div id="absensi-list">${skeletonCard(5)}</div>
  </div>`;
  loadHalamanAbsensi();
}

// ─── HALAMAN PENGAJUAN ───────────────────────────────────────
function renderPagePengajuan(c){
  c.innerHTML=`<div class="page-content">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">📁 Pengajuan</h2>
      <button class="btn btn--primary" style="padding:8px 14px;font-size:13px"
        onclick="tampilFormPengajuan('izin')">+ Buat</button>
    </div>
    <div id="tombol-pengajuan-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${_bj('📝','Izin','izin','#2D6CDF')}${_bj('🏥','Sakit','sakit','#6B7280')}
      ${_bj('🏖️','Cuti','cuti','#6C63FF')}${_bj('🚗','Dinas Luar','dinas_luar','#EA580C')}
    </div>
    <!-- Tombol cuti 6 bulanan: hanya tampil jika karyawan terpilih -->
    <div id="cuti-khusus-btn-wrap" style="display:none;margin-bottom:16px"></div>
    <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">Riwayat Pengajuan</h3>
    <div id="pengajuan-list">${skeletonCard(3)}</div>
  </div>`;
  loadPengajuanSaya();
  _cekCutiKhususKaryawan(); // cek apakah dapat cuti 6 bulanan
}

// Cek apakah karyawan ini masuk sistem cuti 6 bulanan
async function _cekCutiKhususKaryawan() {
  try {
    const wrap = document.getElementById('cuti-khusus-btn-wrap');
    if (!wrap) return;
    const info = await callAPI('getSisaCutiKhusus', {});
    if (!info || !info.dapat) return; // bukan karyawan terpilih

    // Tampilkan tombol + info sisa cuti
    wrap.style.display = 'block';
    wrap.innerHTML = `
      <div style="background:linear-gradient(135deg,#1A9E74,#0D7A57);border-radius:12px;padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div>
            <div style="font-size:13px;font-weight:700;color:#fff">🎫 Cuti 6 Bulanan</div>
            <div style="font-size:11px;color:rgba(255,255,255,.8);margin-top:2px">
              Periode ${info.periode} · Sisa: <strong>${info.sisa}/${info.jatah} hari</strong>
              · Tunjangan: <strong>${formatRupiah(info.nominal_tunjangan)}</strong>
            </div>
          </div>
          <button onclick="tampilFormPengajuan('cuti_khusus')"
            style="background:#fff;color:#1A9E74;border:none;border-radius:8px;
            padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0">
            + Ajukan
          </button>
        </div>
        ${info.sisa===0 ? `<div style="font-size:11px;color:rgba(255,255,255,.7)">
          ⚠️ Jatah cuti 6 bulanan periode ini sudah habis</div>` : ''}
      </div>`;
  } catch(e) { /* karyawan tidak dapat cuti khusus */ }
}
function _bj(icon,label,jenis,color){return `<button onclick="tampilFormPengajuan('${jenis}')"
  style="background:${color}15;border:1.5px solid ${color}30;border-radius:10px;padding:12px;
  display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;color:${color}">
  <span style="font-size:22px">${icon}</span>${label}</button>`;}

// ─── HALAMAN LEMBUR ──────────────────────────────────────────
function renderPageLembur(c){
  c.innerHTML=`<div class="page-content">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">🕒 Lembur</h2>
      <button class="btn btn--primary" style="padding:8px 14px;font-size:13px"
        onclick="tampilFormLembur()">+ Ajukan</button>
    </div>
    <div id="lembur-list">${skeletonCard(3)}</div>
  </div>`;
  loadLemburSaya();
}

async function loadLemburSaya(){
  const el=document.getElementById('lembur-list');if(!el) return;
  try{
    const data=await callAPI('getLemburSaya',{});
    if(!data||data.length===0){showEmpty('lembur-list','Belum ada pengajuan lembur');return;}
    el.innerHTML=data.map(l=>`<div class="pengajuan-item">
      <div class="pengajuan-item__header">
        <span style="font-weight:700">⏰ Lembur ${formatTanggal(l.tanggal)}</span>
        ${badgeStatus(l.status_bayar||'pending')}
      </div>
      <div style="font-size:13px;color:#64748B">
        🕐 ${l.jam_mulai}–${l.jam_selesai} · <strong>${l.total_jam} jam</strong>
      </div>
      <div style="font-size:13px;color:#1A9E74;font-weight:600;margin-top:4px">
        ${formatRupiah(l.total_bayar)}
      </div>
    </div>`).join('');
  }catch(e){showError('lembur-list',e.message);}
}

function tampilFormLembur(){
  const today=new Date().toISOString().split('T')[0];
  const modal=document.createElement('div');
  modal.id='modal-lembur';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
  modal.innerHTML=`<div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-height:92vh;overflow-y:auto;padding-bottom:env(safe-area-inset-bottom,20px);animation:slideUp .3s ease">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0;font-size:16px">⏰ Ajukan Lembur</h3>
      <button onclick="document.getElementById('modal-lembur').remove()"
        style="background:#F1F5F9;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>
    </div>
    <div id="lb-err" style="display:none;background:#FFF5F5;border:1px solid #FC8181;border-radius:8px;padding:10px;color:#C53030;font-size:13px;margin-bottom:12px"></div>
    <div class="form-group"><label class="form-label">Tanggal *</label>
      <input type="date" class="form-control" id="lb-tgl" value="${today}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label class="form-label">Jam Mulai *</label>
        <input type="time" class="form-control" id="lb-mul" value="17:00" onchange="previewHargaLembur()"></div>
      <div class="form-group"><label class="form-label">Jam Selesai *</label>
        <input type="time" class="form-control" id="lb-sel" value="20:00" onchange="previewHargaLembur()"></div>
    </div>
    <div id="lb-preview" style="background:#EBF8EE;border-radius:8px;padding:10px;font-size:13px;color:#1A9E74;margin-bottom:12px;font-weight:600">
      ⏳ Menghitung...</div>
    <div class="form-group"><label class="form-label">Keterangan</label>
      <textarea class="form-control" id="lb-ket" rows="2" placeholder="Jelaskan pekerjaan lembur..."></textarea></div>
    <div class="form-group">
      <label class="form-label">📎 Foto Surat Perintah Lembur (SPL) <span style="color:#E53E3E">*</span></label>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button type="button" onclick="ambilFotoSPL('camera')"
          style="flex:1;padding:10px;background:#EFF6FF;border:2px dashed #2D6CDF;
          border-radius:10px;cursor:pointer;font-size:13px;color:#2D6CDF;font-weight:600">
          📷 Foto Sekarang</button>
        <button type="button" onclick="ambilFotoSPL('gallery')"
          style="flex:1;padding:10px;background:#F8FAFC;border:2px dashed #94A3B8;
          border-radius:10px;cursor:pointer;font-size:13px;color:#64748B;font-weight:600">
          🖼️ Dari Galeri</button>
      </div>
      <input type="file" id="lb-spl-camera" accept="image/*" capture="environment"
        style="display:none" onchange="onFotoSPLDipilih(this)">
      <input type="file" id="lb-spl-gallery" accept="image/*"
        style="display:none" onchange="onFotoSPLDipilih(this)">
      <div id="preview-spl" style="display:none;margin-top:6px;text-align:center">
        <img id="img-preview-spl" style="max-width:100%;max-height:160px;border-radius:8px;
          border:2px solid #E2E8F0;object-fit:contain" src="" alt="Preview SPL">
        <div style="display:flex;align-items:center;justify-content:space-between;
          margin-top:6px;background:#EBF8EE;border-radius:8px;padding:7px 12px">
          <span id="nama-spl" style="font-size:12px;color:#1A9E74;font-weight:600">✅ Foto terpilih</span>
          <button type="button" onclick="hapusFotoSPL()"
            style="background:#FFF5F5;border:1px solid #FC8181;border-radius:5px;
            padding:3px 8px;font-size:11px;color:#E53E3E;cursor:pointer">✕ Hapus</button>
        </div>
      </div>
    </div>
    <button class="btn btn--primary btn--full btn--lg" onclick="submitLemburKaryawan()">
      <div class="spinner-btn"></div><span class="btn-text">📤 Kirim Pengajuan</span></button>
  </div>`;
  document.body.appendChild(modal);
  previewHargaLembur();
}

async function previewHargaLembur(){
  const mul=document.getElementById('lb-mul')?.value;
  const sel=document.getElementById('lb-sel')?.value;
  const el=document.getElementById('lb-preview');
  if(!mul||!sel||!el) return;
  const m1=parseInt(mul.split(':')[0])*60+parseInt(mul.split(':')[1]);
  let m2=parseInt(sel.split(':')[0])*60+parseInt(sel.split(':')[1]);
  if(m2<m1)m2+=1440;
  const jam=Math.round(((m2-m1)/60)*10)/10;
  try{
    const user=getSession();
    const harga=await callAPI('getHargaLembur',{jabatan:user?.jabatan});
    el.textContent=`⏰ ${jam} jam × ${formatRupiah(harga||25000)} = ${formatRupiah(jam*(parseFloat(harga)||25000))}`;
  }catch(e){el.textContent=`⏰ ${jam} jam`;}
}

async function submitLemburKaryawan(){
  const btn=document.querySelector('#modal-lembur .btn--primary');
  if(btn){btn.disabled=true;btn.classList.add('loading');}
  const err=document.getElementById('lb-err');if(err)err.style.display='none';
  try{
    const tgl=document.getElementById('lb-tgl')?.value;
    const mul=document.getElementById('lb-mul')?.value;
    const sel=document.getElementById('lb-sel')?.value;
    if(!tgl||!mul||!sel) throw new Error('Tanggal dan jam wajib diisi');
    if(!window._splFile) throw new Error('Foto Surat Perintah Lembur (SPL) wajib dilampirkan');
    showToast('Mengunggah foto SPL...','info',5000);
    const compressed=await compressImage(window._splFile,1200,0.75);
    const b64=await blobToBase64(compressed);
    const uplSPL=await callAPI('simpanFilePendukung',{
      base64:b64, nama:'SPL_'+Date.now()+'.jpg', mime:'image/jpeg'
    });
    if(!uplSPL?.url) throw new Error('Gagal upload foto SPL');
    const r=await callAPI('submitLembur',{
      tanggal:fromInputDate(tgl),jam_mulai:mul,jam_selesai:sel,
      keterangan:document.getElementById('lb-ket')?.value,
      foto_spl_url: uplSPL.url
    });
    window._splFile=null;
    document.getElementById('modal-lembur')?.remove();
    showToast(r.message,'success',5000);
    loadLemburSaya();
  }catch(e){if(err){err.style.display='block';err.textContent='⚠️ '+e.message;}else showToast(e.message,'error');}
  finally{if(btn){btn.disabled=false;btn.classList.remove('loading');}}
}

// ─── HALAMAN PROFIL ──────────────────────────────────────────
function renderPageProfil(c){
  c.innerHTML=`<div class="page-content"><div id="profil-container">${skeletonCard(5)}</div></div>`;
  loadHalamanProfil();
}

// ─────────────────────────────────────────────────────────────
// LAYOUT ADMIN
// ─────────────────────────────────────────────────────────────
function renderAdminLayout() {
  const user=getSession();
  const isSA=user?.role==='superadmin';
  document.getElementById('app').innerHTML=`
    <div id="app-bg"></div><div id="app-overlay"></div>
    <div class="admin-layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar__header" style="padding:14px 12px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <div id="sb-logo-wrap" style="width:36px;height:36px;flex-shrink:0">
              <img class="logo-instansi" id="sb-logo-img"
                src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
                style="width:36px;height:36px;object-fit:contain;border-radius:6px;display:none" alt="">
              <span id="sb-logo-icon" style="font-size:24px">🏢</span>
            </div>
            <div style="flex:1;min-width:0">
              <div class="nama-instansi sidebar__title" id="sb-nama-instansi"
                style="font-size:12px;font-weight:700;line-height:1.3;
                white-space:normal;word-break:break-word">Instansi</div>
            </div>
          </div>
          <div class="alamat-instansi" id="sb-alamat-instansi"
            style="font-size:10px;opacity:0.65;line-height:1.4;
            padding-top:4px;border-top:1px solid rgba(255,255,255,0.15)"></div>
        </div>
        <nav class="sidebar__nav" id="sidebar-nav">
          ${_si2('dashboard-admin','📊','Dashboard')}
          ${_si2('absensi-semua','📋','Absensi')}
          ${_si2('karyawan-list','👥','Karyawan')}
          ${_si2('pengajuan-admin','📁','Pengajuan')}
          ${_si2('lembur-admin','🕒','Lembur')}
          ${_si2('ranking-admin','🏆','Ranking')}
          ${_si2('sp-admin','⚠️','Surat Peringatan')}
          ${_si2('pengumuman-admin','📢','Pengumuman')}
          ${_si2('lokasi-admin','📍','Lokasi Kantor')}
          ${_si2('shift-admin','🕐','Shift & Jadwal')}
          ${_si2('laporan-admin','📊','Laporan & Rekap')}
          ${isSA?_si2('device-admin','📱','Reset Device'):''}
          ${isSA?_si2('pengaturan-admin','⚙️','Pengaturan'):''}
          ${_si2('cuti-khusus-admin','🎫','Cuti 6 Bln')}
          <div style="margin-top:8px;padding:8px 0;border-top:1px solid rgba(255,255,255,.08)">
            ${_si2('_logout','🚪','Logout')}
          </div>
        </nav>
        <div class="sidebar__toggle">
          <button onclick="toggleSidebar()"
            style="background:rgba(255,255,255,.1);border:none;color:#fff;border-radius:6px;
            padding:6px 12px;cursor:pointer;font-size:12px;width:100%">☰</button>
        </div>
      </aside>
      <div class="admin-main" id="admin-main">
        <header class="admin-topbar">
          <div style="display:flex;align-items:center;gap:12px">
            <button onclick="toggleSidebar()"
              style="background:#F1F5F9;border:none;border-radius:8px;padding:8px 12px;
              cursor:pointer;font-size:16px">☰</button>
            <div id="admin-logo-wrap" style="width:28px;height:28px;flex-shrink:0;display:flex;align-items:center">
              <img class="logo-instansi" id="admin-logo-img"
                src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
                style="width:28px;height:28px;object-fit:contain;border-radius:4px;display:none" alt="">
              <span id="admin-logo-icon" style="font-size:18px">📋</span>
            </div>
            <h2 id="admin-title" style="font-size:15px;font-weight:700;margin:0;color:#1E293B;
              max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Dashboard</h2>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:13px;color:#64748B;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${user?.nama||'Admin'}</span>
            <img src="${avatarInisial(user?.nama||'A',36)}"
              style="width:36px;height:36px;border-radius:50%">
          </div>
        </header>
        <div class="admin-content" id="admin-content">
          <div id="admin-stats-container">${skeletonCard(4)}</div>
          <div id="ultah-section" style="display:none;margin-top:16px"></div>
          <div class="card" style="margin-top:16px">
            <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">📊 Kehadiran 6 Bulan</h3>
            <canvas id="chart-6bulan" style="max-height:280px"></canvas>
          </div>
          <div id="admin-ranking-section" style="margin-top:16px"></div>
        </div>
      </div>
    </div>
    <!-- Backdrop mobile sidebar -->
    <div id="sidebar-backdrop" class="sidebar-backdrop"
      onclick="toggleSidebar()"></div>`;

  document.getElementById('sidebar-nav').addEventListener('click', e => {
    const item=e.target.closest('.sidebar__item');
    if(!item) return;
    const page=item.dataset.page;
    if(page==='_logout'){confirmLogout();return;}
    document.querySelectorAll('.sidebar__item').forEach(el=>el.classList.remove('active'));
    item.classList.add('active');
    if(window.innerWidth<=768){
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebar-backdrop')?.classList.remove('show');
    }
    routeAdmin(page);
  });

  loadDashboardAdminV3();
  // Load branding untuk update logo dan nama di topbar
  const sess = getSession();
  if (sess) loadBranding(sess.role || 'admin');
}

function _si2(page,icon,label){
  return `<button class="sidebar__item" data-page="${page}">
    <span class="sidebar__icon">${icon}</span>
    <span class="sidebar__label">${label}</span></button>`;
}

function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const bd=document.getElementById('sidebar-backdrop');
  if(!sb) return;
  if(window.innerWidth<=768){
    sb.classList.toggle('open');
    bd?.classList.toggle('show',sb.classList.contains('open'));
  }else{
    sb.classList.toggle('collapsed');
  }
}

function routeAdmin(page) {
  const c=document.getElementById('admin-content');
  const title=document.getElementById('admin-title');
  if(!c) return;

  const pages={
    'dashboard-admin':   ['Dashboard',       ()=>{c.innerHTML=`<div id="admin-stats-container">${skeletonCard(4)}</div><div id="ultah-section" style="display:none;margin-top:16px"></div><div class="card" style="margin-top:16px"><h3 style="font-size:15px;font-weight:700;margin-bottom:16px">📊 Kehadiran 6 Bulan</h3><canvas id="chart-6bulan" style="max-height:280px"></canvas></div><div id="admin-ranking-section" style="margin-top:16px"></div>`;loadDashboardAdminV3();}],
    'absensi-semua':     ['Absensi',          ()=>renderAbsensiAdminFull(c)],
    'karyawan-list':     ['Karyawan',         ()=>renderKaryawanAdminFull(c)],
    'pengajuan-admin':   ['Pengajuan',        ()=>renderPengajuanAdminFull(c)],
    'lembur-admin':      ['Lembur',           ()=>renderLemburAdminFull(c)],
    'harga-lembur-admin':['Harga Lembur',     ()=>renderHargaLemburAdmin(c)],
    'ranking-admin':     ['Ranking',          ()=>renderRankingAdminFull(c)],
    'sp-admin':          ['Surat Peringatan', ()=>renderSPAdminFull(c)],
    'pengumuman-admin':  ['Pengumuman',       ()=>renderPengumumanAdminFull(c)],
    'lokasi-admin':      ['Lokasi Kantor',    ()=>renderLokasiAdminV3(c)],
    'shift-admin':       ['Shift & Jadwal',   ()=>renderShiftJadwalAdmin(c)],
    'laporan-admin':     ['Laporan & Rekap',  ()=>renderLaporanAdminV3(c)],
    'device-admin':      ['Reset Device',     ()=>renderDeviceAdmin(c)],
    'pengaturan-admin':  ['Pengaturan',       ()=>{c.innerHTML=`<h2 style="font-size:17px;font-weight:700;margin-bottom:16px">⚙️ Pengaturan Sistem</h2><div id="pengaturan-container">${skeletonCard(4)}</div>`;loadPengaturanAdminV3();}],
    'cuti-khusus-admin': ['Cuti 6 Bulanan',   ()=>renderCutiKhususAdmin(c)]
  };

  const entry=pages[page];
  if(entry){
    if(title)title.textContent=entry[0];
    entry[1]();
  }
}

function confirmLogout(){
  showModal('🚪 Logout?','Anda akan keluar dari aplikasi.',function(){
    doLogout(); // doLogout sudah handle clear token + reload sendiri
  },'Ya, Logout');
}

// ─── Chart 6 Bulan ───────────────────────────────────────────
// renderChart6Bulan ada di dashboard.js
// ─── FOTO SPL LEMBUR ──────────────────────────────────────────
function ambilFotoSPL(mode) {
  const el=document.getElementById(mode==='camera'?'lb-spl-camera':'lb-spl-gallery');
  if(el) el.click();
}
function onFotoSPLDipilih(input) {
  if(!input.files||!input.files[0]) return;
  window._splFile=input.files[0];
  const reader=new FileReader();
  reader.onload=e=>{
    const prev=document.getElementById('preview-spl');
    const img=document.getElementById('img-preview-spl');
    const nama=document.getElementById('nama-spl');
    if(img) img.src=e.target.result;
    if(prev) prev.style.display='block';
    if(nama){ const kb=(window._splFile.size/1024).toFixed(0); nama.textContent='✅ '+window._splFile.name+' ('+kb+' KB)'; }
  };
  reader.readAsDataURL(input.files[0]);
}
function hapusFotoSPL() {
  window._splFile=null;
  const prev=document.getElementById('preview-spl');
  const img=document.getElementById('img-preview-spl');
  if(prev) prev.style.display='none';
  if(img) img.src='';
  const c1=document.getElementById('lb-spl-camera');
  const c2=document.getElementById('lb-spl-gallery');
  if(c1) c1.value=''; if(c2) c2.value='';
}

// ─── JADWAL SHIFT MINGGU INI (Karyawan) ──────────────────────
async function loadJadwalMingguSaya() {
  try {
    const data = await callAPI('getJadwalSaya', {});
    const card = document.getElementById('jadwal-minggu-card');
    const list = document.getElementById('jadwal-minggu-list');
    if (!card || !list) return;
    if (!data || data.length === 0) { card.style.display='none'; return; }

    const now  = new Date(); now.setHours(0,0,0,0);
    const HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
    const BULAN= ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const KC   = {'P':'#1A9E74','S':'#D97706','M':'#6C63FF','L':'#94A3B8'};
    const KN   = {'P':'Pagi 07-15','S':'Sore 15-23','M':'Malam 23-07','L':'Libur'};

    // Cari index hari ini
    let todayIdx = data.findIndex(j => {
      const p = String(j.tanggal||'').split('/');
      return p.length===3 &&
        new Date(parseInt(p[2]),parseInt(p[1])-1,parseInt(p[0])).toDateString()===now.toDateString();
    });
    if (todayIdx < 0) todayIdx = 0;

    const makeRow = (j) => {
      const p = String(j.tanggal||'').split('/');
      const d = p.length===3 ? new Date(parseInt(p[2]),parseInt(p[1])-1,parseInt(p[0])) : new Date();
      const isToday = d.toDateString()===now.toDateString();
      const isPast  = d<now && !isToday;
      const isLibur = j.kode==='L';
      const warna   = KC[j.kode]||'#94A3B8';
      const jm = j.shift?.jam_masuk||'', jk = j.shift?.jam_keluar||'';
      return `<div style="display:flex;align-items:center;gap:8px;padding:7px 4px;
        border-bottom:1px solid #F1F5F9;opacity:${isPast?'0.4':'1'};
        ${isToday?'background:#EFF6FF;margin:0 -4px;padding:7px 8px;border-radius:8px;':''}">
        <div style="min-width:40px;text-align:center;flex-shrink:0">
          <div style="font-size:9px;font-weight:700;color:${isToday?'#2D6CDF':'#94A3B8'}">${HARI[d.getDay()]}</div>
          <div style="font-size:14px;font-weight:700;color:${isToday?'#2D6CDF':'#1E293B'};line-height:1.2">${String(d.getDate()).padStart(2,'0')}</div>
          <div style="font-size:9px;color:#94A3B8">${BULAN[d.getMonth()]}</div>
        </div>
        <div style="flex:1">
          <span style="background:${warna}22;color:${isLibur?'#94A3B8':warna};border:1px solid ${warna}33;
            padding:2px 8px;border-radius:6px;font-size:12px;font-weight:${isToday?'700':'600'}">
            ${isLibur?'🏖️ Libur':(KN[j.kode]||j.kode)+(jm&&jk?' · '+jm+'–'+jk:'')}
          </span>
        </div>
        ${isToday?'<span style="font-size:9px;background:#2D6CDF;color:#fff;padding:2px 6px;border-radius:8px;flex-shrink:0">Hari Ini</span>':''}
      </div>`;
    };

    // Tampil default: hanya hari ini ± 3 hari
    const preview = data.slice(Math.max(0, todayIdx-1), todayIdx+4);

    list.innerHTML = `
      <div id="jdw-preview">${preview.map(makeRow).join('')}</div>
      ${data.length > preview.length ? `
      <div id="jdw-all" style="display:none;max-height:320px;overflow-y:auto;
        border:1px solid #E2E8F0;border-radius:8px;padding:4px 8px;margin-top:4px">
        ${data.map(makeRow).join('')}
      </div>
      <button onclick="_toggleJadwalAll(this)"
        style="width:100%;margin-top:6px;padding:7px;background:#F8FAFC;
        border:1px solid #E2E8F0;border-radius:8px;font-size:12px;
        color:#2D6CDF;cursor:pointer;font-weight:600;text-align:center">
        📋 Lihat Semua (${data.length} hari) ▼
      </button>` : ''}`;

    card.style.display = 'block';

    // Auto scroll ke hari ini di panel semua
    setTimeout(()=>{
      const all = document.getElementById('jdw-all');
      if (all && todayIdx > 1) all.scrollTop = (todayIdx-1) * 41;
    }, 100);

  } catch(e) { console.error('loadJadwalMingguSaya:', e); }
}

function _toggleJadwalAll(btn) {
  const preview = document.getElementById('jdw-preview');
  const all     = document.getElementById('jdw-all');
  if (!all) return;
  const open = all.style.display !== 'none';
  all.style.display     = open ? 'none' : 'block';
  preview.style.display = open ? 'block' : 'none';
  btn.innerHTML = open ? '📋 Lihat Semua ▼' : '📅 Tutup ▲';
}

