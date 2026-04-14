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
    const aktif = (data||[]).filter(s=>{
      const tK = s.tanggal_kadaluarsa;
      if (tK) {
        const p = String(tK).split('/');
        if (p.length===3) {
          const d = new Date(parseInt(p[2]),parseInt(p[1])-1,parseInt(p[0]));
          return d >= new Date();
        }
      }
      return String(s.status_aktif).toLowerCase()==='true';
    });
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

    const tglHariIni = tanggalHariIni();
    document.getElementById('admin-stats-container').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;
        margin-bottom:10px;flex-wrap:wrap;gap:8px">
        <div style="font-size:12px;color:#64748B">
          📅 <strong>Statistik Hari Ini:</strong> ${tglHariIni}
          <span style="font-size:11px;color:#94A3B8;margin-left:6px">
            (Alfa = karyawan yang sudah ditandai alfa hari ini)</span>
        </div>
        <button onclick="jalankanAutoAlfa()" class="btn btn--ghost"
          style="font-size:11px;padding:4px 12px;height:30px">
          ⚡ Hitung Alfa Sekarang
        </button>
      </div>
      <div class="stat-grid-admin">
        ${_sc('👥','Karyawan Aktif',  s.karyawan_aktif,  '#2D6CDF')}
        ${_sc('✅','Hadir Hari Ini',  s.hadir_hari_ini,  '#1A9E74')}
        ${_sc('⏰','Terlambat',        s.terlambat,       '#D97706')}
        ${_sc('❌','Alfa Hari Ini',    s.alfa,            '#E53E3E')}
        ${_sc('🚗','Dinas Luar',       s.dinas_luar||0,   '#EA580C')}
        ${_sc('🏥','Izin/Sakit',       s.izin_sakit,      '#6C63FF')}
        ${_sc('📋','Pending',          s.pending,         '#0891B2')}
        ${_sc('⚠️','SP Aktif',         s.sp_aktif,        '#C53030')}
      </div>
      <div id="admin-rekap-bulan" style="margin-top:14px;background:#fff;border-radius:12px;
        padding:14px;border:1px solid #E2E8F0"></div>`;

    // Rekap bulan ini
    try {
      const rb = s.rekap_bulan || {};
      const bln = s.nama_bulan || '';
      const rekapEl = document.getElementById('admin-rekap-bulan');
      if (rekapEl) {
        rekapEl.innerHTML = `
          <div style="margin-bottom:8px;font-size:13px;font-weight:700;color:#1E293B">
            📊 Rekap Bulan ${bln}</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">
            ${_scKecil('✅','Hadir',    (rb.hadir||0)+(rb.terlambat||0), '#1A9E74')}
            ${_scKecil('⏰','Terlambat', rb.terlambat||0,               '#D97706')}
            ${_scKecil('❌','Alfa',      rb.alfa||0,                    '#E53E3E')}
            ${_scKecil('🚗','Dinas Luar',rb.dinas||0,                   '#EA580C')}
            ${_scKecil('📝','Izin',      rb.izin||0,                    '#2D6CDF')}
            ${_scKecil('🏥','Sakit',     rb.sakit||0,                   '#6C63FF')}
            ${_scKecil('🏖️','Cuti',      rb.cuti||0,                    '#0891B2')}
          </div>`;
      }
    } catch(e) {}
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

// ─── Hitung Alfa Sekarang (manual trigger) ─────────────────────
async function jalankanAutoAlfa() {
  const btn = document.querySelector('[onclick="jalankanAutoAlfa()"]');
  if (btn) { btn.disabled=true; btn.textContent='⏳ Menghitung...'; }
  try {
    showToast('Menghitung alfa untuk hari ini...', 'info', 3000);
    const result = await callAPI('autoAlfaHariIni', {});
    const msg = result?.pesan || 'Selesai';
    const jml = result?.jumlah_alfa || 0;
    showToast(`✅ ${msg} — ${jml} karyawan ditandai alfa`, 'success', 5000);
    // Reload stats
    setTimeout(() => loadDashboardAdminV3(), 1500);
  } catch(e) {
    showToast('Gagal: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled=false; btn.textContent='⚡ Hitung Alfa Sekarang'; }
  }
}
