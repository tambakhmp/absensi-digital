// ============================================================
// app.js v5 — SPA Router Final, Bersih, Tidak Ada Duplikat
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(r => console.log('SW:', r.scope))
      .catch(e => console.warn('SW:', e));
  }
  if (!isLoggedIn()) { renderLoginPage(); return; }
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
      await loadBranding(result.role);
      if(result.role==='superadmin'||result.role==='admin') renderAdminLayout();
      else renderKaryawanLayout();
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
        <div style="font-size:12px;opacity:.75" id="info-shift"></div>
      </div>
    </div>
    <!-- Peringatan lokasi -->
    <div id="lokasi-warn" style="display:none"></div>
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
    <!-- Statistik -->
    <div class="card">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;color:#64748B">📊 Bulan Ini</h3>
      <div class="stat-grid">
        ${_ms('✅','Hadir','stat-hadir','#1A9E74')}${_ms('⏰','Terlambat','stat-terlambat','#D97706')}
        ${_ms('❌','Alfa','stat-alfa','#E53E3E')}${_ms('📝','Izin','stat-izin','#2D6CDF')}
        ${_ms('🏥','Sakit','stat-sakit','#6B7280')}${_ms('🏖️','Cuti','stat-cuti','#6C63FF')}
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
    <!-- SP -->
    <div id="sp-saya-section" style="display:none"></div>
    <div style="height:8px"></div>
  </div>`;
  loadDashboardKaryawan();
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
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${_bj('📝','Izin','izin','#2D6CDF')}${_bj('🏥','Sakit','sakit','#6B7280')}
      ${_bj('🏖️','Cuti','cuti','#6C63FF')}${_bj('🚗','Dinas Luar','dinas_luar','#EA580C')}
    </div>
    <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">Riwayat Pengajuan</h3>
    <div id="pengajuan-list">${skeletonCard(3)}</div>
  </div>`;
  loadPengajuanSaya();
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
  modal.innerHTML=`<div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;animation:slideUp .3s ease">
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
    <button class="btn btn--primary btn--full btn--lg" onclick="submitLemburKaryawan()">
      <div class="spinner-btn"></div><span class="btn-text">📤 Kirim</span></button>
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
    const r=await callAPI('submitLembur',{
      tanggal:fromInputDate(tgl),jam_mulai:mul,jam_selesai:sel,
      keterangan:document.getElementById('lb-ket')?.value
    });
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
          ${_si2('harga-lembur-admin','💰','Harga Lembur')}
          ${_si2('ranking-admin','🏆','Ranking')}
          ${_si2('sp-admin','⚠️','Surat Peringatan')}
          ${_si2('pengumuman-admin','📢','Pengumuman')}
          ${_si2('lokasi-admin','📍','Lokasi Kantor')}
          ${_si2('shift-admin','🕐','Shift & Jadwal')}
          ${_si2('laporan-admin','📊','Laporan & Rekap')}
          ${isSA?_si2('device-admin','📱','Reset Device'):''}
          ${isSA?_si2('pengaturan-admin','⚙️','Pengaturan'):''}
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
    'pengaturan-admin':  ['Pengaturan',       ()=>{c.innerHTML=`<h2 style="font-size:17px;font-weight:700;margin-bottom:16px">⚙️ Pengaturan Sistem</h2><div id="pengaturan-container">${skeletonCard(4)}</div>`;loadPengaturanAdminV3();}]
  };

  const entry=pages[page];
  if(entry){
    if(title)title.textContent=entry[0];
    entry[1]();
  }
}

function confirmLogout(){
  showModal('🚪 Logout?','Anda akan keluar dari aplikasi.',()=>doLogout(),'Ya, Logout');
}

// ─── Chart 6 Bulan ───────────────────────────────────────────
// renderChart6Bulan ada di dashboard.js