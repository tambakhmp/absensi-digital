// dashboard.js — Dashboard karyawan & admin

// ─── DASHBOARD KARYAWAN ──────────────────────────────────────
async function loadDashboardKaryawan() {
  const user = getSession();
  if (!user) return;

  _setEl('dash-greeting', greetingWaktu());
  _setEl('dash-nama',     user.nama||'-');
  _setEl('dash-nik',      'NIK: '+(user.nik||'-'));
  _setEl('dash-jabatan',  (user.jabatan||'')+(user.departemen?' · '+user.departemen:''));
  _setEl('dash-tanggal',  tanggalHariIni());

  await Promise.allSettled([
    _loadProfilFoto(user),
    loadStatusAbsenHariIni(),
    loadStatsKaryawan(),
    _loadPengumuman(),
    renderRankingSection('ranking-section'),
    _loadSPSaya()
  ]);
}

function _setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

async function _loadProfilFoto(user) {
  try {
    const profil = await callAPI('getProfilSaya', {});
    if (!profil) return;
    try {
      const ucapan = cekUlangTahunSaya(profil.tanggal_lahir, profil.nama_lengkap);
      if (ucapan) {
        const b = document.getElementById('ultah-banner');
        const t = document.getElementById('ultah-text');
        if (b) b.style.display = 'block';
        if (t) t.textContent = ucapan;
        showConfetti();
      }
    } catch(e) {}
    try {
      const rank  = await getPredikatSaya(user.id_karyawan);
      const wrap  = document.getElementById('dash-foto-wrap');
      if (wrap) wrap.innerHTML = renderFotoProfil(profil.foto_profil_url, user.nama, rank?.predikat||'', 80);
    } catch(e) {}
  } catch(e) {}
}

async function loadStatusAbsenHariIni() {
  try {
    const data = await callAPI('getStatusAbsenHariIni', {});
    if (!data) return;
    const sudahMasuk  = data.sudah_absen_masuk  === true || String(data.sudah_absen_masuk)  === 'true';
    const sudahKeluar = data.sudah_absen_keluar === true || String(data.sudah_absen_keluar) === 'true';

    _kunciTombolAbsen(sudahMasuk, sudahKeluar);

    const elStatus = document.getElementById('status-absen-info');
    if (sudahMasuk && elStatus) {
      const isTelat = data.status === 'terlambat';
      const isDinas = data.status === 'dinas_luar';
      const warna   = isTelat?'#D97706':isDinas?'#EA580C':'#1A9E74';
      const bg      = isTelat?'#FFFAF0':isDinas?'#FFF3E0':'#EBF8EE';
      const icon    = isTelat?'⚠️':isDinas?'🚗':'✅';
      elStatus.innerHTML = `<div style="background:${bg};border-radius:10px;padding:12px;
        text-align:center;font-size:14px;color:${warna};font-weight:600;margin-bottom:12px">
        ${icon} Sudah absen masuk pukul <strong>${data.jam_masuk||'-'}</strong>
        ${sudahKeluar?' &nbsp;·&nbsp; 🔴 Keluar: <strong>'+(data.jam_keluar||'-')+'</strong>':
        '<br><span style="font-size:12px;font-weight:400;color:#94A3B8">Jangan lupa absen keluar!</span>'}
      </div>`;
    }

    const elShift = document.getElementById('info-shift');
    if (elShift && data.shift) elShift.textContent = data.shift.nama_shift+' · '+data.shift.jam_masuk+' – '+data.shift.jam_keluar;

    const elDinas = document.getElementById('info-dinas-luar');
    if (elDinas) {
      if (data.is_dinas_luar && data.dinas_luar_info) {
        const dl = data.dinas_luar_info;
        elDinas.style.display = 'block';
        elDinas.innerHTML = `<div style="background:#FFF3E0;border:1px solid #F6AD55;border-radius:10px;
          padding:10px 14px;font-size:13px;color:#C05621;margin-bottom:8px">
          🚗 <strong>Dinas Luar Aktif</strong> — ${formatTanggal(dl.tanggal_mulai)} s/d ${formatTanggal(dl.tanggal_selesai)}</div>`;
      } else { elDinas.style.display = 'none'; }
    }

    const elWarn = document.getElementById('lokasi-warn');
    if (elWarn) {
      if (!data.lokasi_aktif && !data.is_dinas_luar) {
        elWarn.style.display = 'block';
        elWarn.innerHTML = `<div style="background:#FFF8DC;border:1px solid #D97706;border-radius:10px;
          padding:10px 14px;font-size:13px;color:#92400E;margin-bottom:8px">
          ⚠️ Lokasi kantor belum dikonfigurasi. Hubungi Super Admin.</div>`;
      } else { elWarn.style.display = 'none'; }
    }
  } catch(e) { console.warn('loadStatusAbsen:', e.message); }
}

async function loadStatsKaryawan() {
  try {
    const now  = new Date();
    const user = getSession();
    const data = await callAPI('getStatsKaryawan', {
      id_karyawan: user ? user.id_karyawan : undefined,
      bulan: now.getMonth()+1, tahun: now.getFullYear()
    });
    if (!data) return;
    const h=parseInt(data.hadir||0), t=parseInt(data.terlambat||0),
          a=parseInt(data.alfa||0), i=parseInt(data.izin||0),
          s=parseInt(data.sakit||0), c=parseInt(data.cuti||0),
          d=parseInt(data.dinas_luar||0);
    _setEl('stat-hadir',     h+t+d);
    _setEl('stat-terlambat', t);
    _setEl('stat-alfa',      a);
    _setEl('stat-izin',      i);
    _setEl('stat-sakit',     s);
    _setEl('stat-cuti',      c);
  } catch(e) { console.warn('loadStats:', e.message); }
}

async function _loadPengumuman() {
  const el = document.getElementById('pengumuman-list');
  if (!el) return;
  try {
    const data = await callAPI('getPengumuman', {});
    if (!data||!data.length) {
      el.innerHTML = '<p style="color:#94A3B8;font-size:13px;text-align:center;padding:12px">Tidak ada pengumuman</p>';
      return;
    }
    el.innerHTML = data.slice(0,3).map(p=>`
      <div class="pengumuman-card pengumuman-card--${p.prioritas||'normal'}">
        <span class="pengumuman-card__badge badge--${p.prioritas||'normal'}">${p.prioritas||'normal'}</span>
        <div style="font-weight:600;font-size:14px;margin-bottom:4px">${p.judul||''}</div>
        <div style="font-size:12px;color:#64748B">${(p.isi||'').substring(0,120)}</div>
        <div style="font-size:11px;color:#94A3B8;margin-top:6px">📅 s/d ${formatTanggal(p.tanggal_selesai)}</div>
      </div>`).join('');
  } catch(e) { el.innerHTML = '<p style="color:#94A3B8;font-size:12px;padding:12px">Gagal memuat</p>'; }
}

async function _loadSPSaya() {
  const el = document.getElementById('sp-saya-section');
  if (!el) return;
  try {
    const data  = await callAPI('getSPSaya', {});
    const aktif = (data||[]).filter(s=>String(s.status_aktif).toLowerCase()==='true');
    if (!aktif.length) { el.style.display='none'; return; }
    el.style.display = 'block';
    el.innerHTML = aktif.map(s=>`<div style="background:#FFF5F5;border:1px solid #FC8181;
      border-radius:10px;padding:12px 14px;margin-bottom:8px">
      <div style="font-weight:700;color:#C53030">⚠️ ${s.jenis_sp} Aktif</div>
      <div style="font-size:12px;color:#64748B">Berlaku: ${formatTanggal(s.tanggal_berlaku)} – ${formatTanggal(s.tanggal_kadaluarsa)}</div>
      <div style="font-size:12px;color:#64748B">${s.alasan||''}</div>
    </div>`).join('');
  } catch(e) { el.style.display = 'none'; }
}

// ─── DASHBOARD ADMIN ─────────────────────────────────────────
async function loadDashboardAdminV3() {
  try {
    showLoading('admin-stats-container', 'Memuat statistik...');
    const s = await callAPI('getStatsDashboard', {});
    if (!s) return;

    document.getElementById('admin-stats-container').innerHTML = `
      <div class="stat-grid-admin">
        ${_sc('👥','Karyawan Aktif',  s.karyawan_aktif,  '#2D6CDF')}
        ${_sc('✅','Hadir Hari Ini',  s.hadir_hari_ini,  '#1A9E74')}
        ${_sc('⏰','Terlambat',        s.terlambat,       '#D97706')}
        ${_sc('❌','Alfa',             s.alfa,            '#E53E3E')}
        ${_sc('🚗','Dinas Luar',       s.dinas_luar||0,   '#EA580C')}
        ${_sc('🏥','Izin/Sakit',       s.izin_sakit,      '#6C63FF')}
        ${_sc('📋','Pending',          s.pending,         '#0891B2')}
        ${_sc('⚠️','SP Aktif',         s.sp_aktif,        '#C53030')}
      </div>`;

    try { if (s.chart_6_bulan) renderChart6Bulan(s.chart_6_bulan); } catch(e) {}
    try { if (s.ultah_hari_ini?.length > 0) _renderUltahAdmin(s.ultah_hari_ini); } catch(e) {}
    try { await renderRankingSection('admin-ranking-section'); } catch(e) {}

  } catch(e) {
    const el = document.getElementById('admin-stats-container');
    if (el) el.innerHTML = `<div style="background:#FFF5F5;border:1px solid #FC8181;
      border-radius:12px;padding:20px;color:#C53030;text-align:center">
      ⚠️ Gagal: ${e.message}
      <br><button class="btn btn--primary" style="margin-top:12px"
        onclick="loadDashboardAdminV3()">🔄 Coba Lagi</button></div>`;
  }
}

// _sc ada di admin_pages.js
function _renderUltahAdmin(ultah) {
  const el = document.getElementById('ultah-section');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = `<div class="card"><h3 style="font-size:15px;margin-bottom:12px">🎂 Ulang Tahun Hari Ini (${ultah.length})</h3>
    ${ultah.map(k=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F1F5F9">
      <img src="${getPhotoSrc(k.foto||'',k.nama)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover"
        onerror="this.src='${avatarInisial(k.nama||'U',36)}'">
      <div><div style="font-weight:600;font-size:14px">${k.nama} 🎂</div>
      <div style="font-size:12px;color:#64748B">${k.jabatan} · ${k.departemen}</div></div>
      <span style="margin-left:auto;font-size:12px;color:#D97706;font-weight:600">${k.umur} thn</span>
    </div>`).join('')}</div>`;
}

function renderChart6Bulan(chartData) {
  const canvas = document.getElementById('chart-6bulan');
  if (!canvas || typeof Chart === 'undefined') return;
  if (canvas._chart) { try { canvas._chart.destroy(); } catch(e) {} }
  canvas._chart = new Chart(canvas, {
    type:'bar',
    data:{ labels:chartData.map(d=>d.label),
      datasets:[
        {label:'Hadir',     data:chartData.map(d=>d.hadir),      backgroundColor:'#1A9E74'},
        {label:'Terlambat', data:chartData.map(d=>d.terlambat),  backgroundColor:'#D97706'},
        {label:'Alfa',      data:chartData.map(d=>d.alfa),       backgroundColor:'#E53E3E'},
        {label:'DL',        data:chartData.map(d=>d.dinas_luar||0), backgroundColor:'#EA580C'}
      ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{font:{size:11}}}},
      scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{stepSize:1}}}}
  });
}
