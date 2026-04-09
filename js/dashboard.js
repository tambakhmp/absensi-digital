// ============================================================
// dashboard.js — Dashboard Karyawan (PWA) & Admin
// v3.1: Setiap seksi independen, error satu tidak blokir lainnya
// ============================================================

// ─────────────────────────────────────────────────────────────
// DASHBOARD KARYAWAN — Semua seksi async independen
// ─────────────────────────────────────────────────────────────
async function loadDashboardKaryawan() {
  const user = getSession();
  if (!user) return;

  // ── Update header statis (tidak butuh API) ──────────────────
  _setEl('dash-greeting', greetingWaktu());
  _setEl('dash-nama',     user.nama || '-');
  _setEl('dash-nik',      'NIK: ' + (user.nik || '-'));
  _setEl('dash-jabatan',  (user.jabatan || '') + (user.departemen ? ' · ' + user.departemen : ''));
  _setEl('dash-tanggal',  tanggalHariIni());

  // ── Jalankan semua seksi secara PARALEL & INDEPENDEN ────────
  // Jika satu gagal, yang lain tetap berjalan
  await Promise.allSettled([
    _loadProfilDanFoto(user),
    loadStatusAbsenHariIni(),
    loadStatsKaryawan(),
    loadPengumumanDashboard(),
    renderRankingSection('ranking-section'),
    loadSPSaya()
  ]);
}

// Helper set text elemen
function _setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// Load profil + foto + ulang tahun (seksi tersendiri agar tidak block)
async function _loadProfilDanFoto(user) {
  try {
    const profil = await callAPI('getProfilSaya', {});
    if (!profil) return;

    // Cek ulang tahun
    try {
      const ucapan = cekUlangTahunSaya(profil.tanggal_lahir, profil.nama_lengkap);
      if (ucapan) {
        const banner = document.getElementById('ultah-banner');
        const text   = document.getElementById('ultah-text');
        if (banner) banner.style.display = 'block';
        if (text)   text.textContent     = ucapan;
        showConfetti();
      }
    } catch(e) { console.warn('Ultah check error:', e.message); }

    // Foto profil + ranking
    try {
      const rankData = await getPredikatSaya(user.id_karyawan);
      const predikat = rankData ? rankData.predikat : '';
      const wrap     = document.getElementById('dash-foto-wrap');
      if (wrap) wrap.innerHTML = renderFotoProfil(profil.foto_profil_url, user.nama, predikat, 80);
    } catch(e) { console.warn('Foto/rank error:', e.message); }

  } catch(e) { console.warn('loadProfil error:', e.message); }
}

async function loadStatusAbsenHariIni() {
  try {
    const data = await callAPI('getStatusAbsenHariIni', {});
    if (!data) return;

    const elMasuk  = document.getElementById('btn-absen-masuk');
    const elKeluar = document.getElementById('btn-absen-keluar');
    const elStatus = document.getElementById('status-absen-info');

    if (data.sudah_absen_masuk) {
      if (elMasuk)  { elMasuk.disabled  = true; elMasuk.style.opacity  = '0.5'; }
      if (elStatus) {
        elStatus.innerHTML = `<div style="background:#EBF8EE;border-radius:10px;padding:12px;
          text-align:center;font-size:14px;color:#1A9E74;font-weight:600;margin-bottom:12px">
          ✅ Sudah absen masuk pukul ${data.jam_masuk}
          ${data.sudah_absen_keluar ? ' · Keluar: ' + data.jam_keluar : ''}
        </div>`;
      }
    }
    if (data.sudah_absen_keluar && elKeluar) {
      elKeluar.disabled = true;
      elKeluar.style.opacity = '0.5';
    }

    // Info shift
    if (data.shift) {
      const elShift = document.getElementById('info-shift');
      if (elShift) {
        elShift.textContent = data.shift.nama_shift + ' · ' +
          data.shift.jam_masuk + ' – ' + data.shift.jam_keluar;
      }
    }

    // Info Dinas Luar aktif
    const elDinas = document.getElementById('info-dinas-luar');
    if (elDinas) {
      if (data.is_dinas_luar && data.dinas_luar_info) {
        elDinas.style.display = 'block';
        elDinas.innerHTML = `<div style="background:#FFF3E0;border:1px solid #F6AD55;
          border-radius:10px;padding:10px 14px;font-size:13px;color:#C05621;
          display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:18px">🚗</span>
          <div>
            <div style="font-weight:700">Dinas Luar Aktif</div>
            <div style="font-size:12px">
              ${formatTanggal(data.dinas_luar_info.tanggal_mulai)} –
              ${formatTanggal(data.dinas_luar_info.tanggal_selesai)}
              · ${data.dinas_luar_info.keterangan || ''}
            </div>
            <div style="font-size:11px;color:#92400E;margin-top:2px">
              ✅ Radius GPS tidak berlaku selama periode ini
            </div>
          </div>
        </div>`;
      } else {
        elDinas.style.display = 'none';
      }
    }

    // Peringatan jika lokasi belum dikonfigurasi
    const elLokasiWarn = document.getElementById('lokasi-warn');
    if (elLokasiWarn) {
      if (!data.lokasi_aktif && !data.is_dinas_luar) {
        elLokasiWarn.style.display = 'block';
        elLokasiWarn.innerHTML = `<div style="background:#FFF8DC;border:1px solid #D97706;
          border-radius:10px;padding:10px 14px;font-size:13px;color:#92400E;margin-bottom:8px">
          ⚠️ Lokasi kantor belum dikonfigurasi admin. Hubungi Super Admin.
        </div>`;
      } else {
        elLokasiWarn.style.display = 'none';
      }
    }
  } catch(e) { console.warn('loadStatusAbsen error:', e.message); }
}

async function loadStatsKaryawan() {
  try {
    const now  = new Date();
    const data = await callAPI('getStatsKaryawan', {
      bulan: now.getMonth() + 1,
      tahun: now.getFullYear()
    });
    if (!data) return;

    const mapping = {
      'stat-hadir'     : data.hadir      || 0,
      'stat-terlambat' : data.terlambat  || 0,
      'stat-alfa'      : data.alfa       || 0,
      'stat-izin'      : data.izin       || 0,
      'stat-sakit'     : data.sakit      || 0,
      'stat-cuti'      : data.cuti       || 0
    };
    Object.entries(mapping).forEach(([id, val]) => _setEl(id, val));
  } catch(e) { console.warn('loadStats error:', e.message); }
}

async function loadPengumumanDashboard() {
  const el = document.getElementById('pengumuman-list');
  if (!el) return;
  try {
    const data = await callAPI('getPengumuman', {});
    if (!data || data.length === 0) {
      el.innerHTML = '<p style="color:#94A3B8;font-size:13px;text-align:center;padding:12px">Tidak ada pengumuman saat ini</p>';
      return;
    }
    el.innerHTML = data.slice(0,3).map(p => `
      <div class="pengumuman-card pengumuman-card--${p.prioritas}">
        <span class="pengumuman-card__badge badge--${p.prioritas}">${p.prioritas}</span>
        <div style="font-weight:600;font-size:14px;margin-bottom:4px">${p.judul}</div>
        <div style="font-size:12px;color:#64748B;line-height:1.5">
          ${(p.isi || '').substring(0,120)}${(p.isi || '').length > 120 ? '...' : ''}
        </div>
        <div style="font-size:11px;color:#94A3B8;margin-top:6px">
          📅 s/d ${formatTanggal(p.tanggal_selesai)}
        </div>
      </div>`).join('');
  } catch(e) {
    if (el) el.innerHTML = '<p style="color:#94A3B8;font-size:13px;padding:12px">Gagal memuat pengumuman</p>';
    console.warn('loadPengumuman error:', e.message);
  }
}

async function loadSPSaya() {
  const el = document.getElementById('sp-saya-section');
  if (!el) return;
  try {
    const data   = await callAPI('getSPSaya', {});
    const aktif  = (data || []).filter(s => String(s.status_aktif).toLowerCase() === 'true');
    if (aktif.length === 0) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.innerHTML = aktif.map(s => `
      <div style="background:#FFF5F5;border:1px solid #FC8181;border-radius:10px;
        padding:12px 14px;margin-bottom:8px">
        <div style="font-weight:700;color:#C53030;font-size:14px">⚠️ ${s.jenis_sp} Aktif</div>
        <div style="font-size:12px;color:#64748B;margin-top:4px">
          Berlaku: ${formatTanggal(s.tanggal_berlaku)} – ${formatTanggal(s.tanggal_kadaluarsa)}
        </div>
        <div style="font-size:12px;color:#64748B">Alasan: ${s.alasan}</div>
      </div>`).join('');
  } catch(e) {
    el.style.display = 'none';
    console.warn('loadSP error:', e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD ADMIN / SUPERADMIN
// ─────────────────────────────────────────────────────────────
async function loadDashboardAdmin() {
  try {
    showLoading('admin-stats-container', 'Memuat statistik...');
    const stats = await callAPI('getStatsDashboard', {});
    if (!stats) return;

    document.getElementById('admin-stats-container').innerHTML = `
      <div class="stat-grid-admin">
        ${statCard('👥','Karyawan Aktif',   stats.karyawan_aktif,  '#2D6CDF')}
        ${statCard('✅','Hadir Hari Ini',   stats.hadir_hari_ini,  '#1A9E74')}
        ${statCard('⏰','Terlambat',         stats.terlambat,       '#D97706')}
        ${statCard('❌','Alfa',              stats.alfa,            '#E53E3E')}
        ${statCard('🚗','Dinas Luar',        stats.dinas_luar || 0, '#EA580C')}
        ${statCard('🏥','Izin/Sakit',        stats.izin_sakit,      '#6C63FF')}
        ${statCard('📋','Pending',           stats.pending,         '#0891B2')}
        ${statCard('⚠️','SP Aktif',          stats.sp_aktif,        '#C53030')}
      </div>`;

    // Chart & ranking — juga independen
    if (stats.chart_6_bulan) {
      try { renderChart6Bulan(stats.chart_6_bulan); } catch(e) {}
    }
    if (stats.ultah_hari_ini?.length > 0) {
      try { renderUltahSection(stats.ultah_hari_ini); } catch(e) {}
    }
    try { await renderRankingSection('admin-ranking-section'); } catch(e) {}

  } catch(e) {
    const el = document.getElementById('admin-stats-container');
    if (el) el.innerHTML = `
      <div style="background:#FFF5F5;border:1px solid #FC8181;border-radius:12px;
        padding:20px;color:#C53030;text-align:center">
        <div style="font-size:32px;margin-bottom:8px">⚠️</div>
        <div style="font-weight:600;margin-bottom:4px">Gagal memuat data dashboard</div>
        <div style="font-size:13px;color:#64748B">${e.message}</div>
        <button class="btn btn--primary" style="margin-top:12px;font-size:13px"
          onclick="loadDashboardAdminV3()">🔄 Coba Lagi</button>
      </div>`;
  }
}

function statCard(icon, label, value, color) {
  return `
    <div class="stat-card-admin">
      <div class="stat-card-admin__icon" style="background:${color}22;color:${color}">${icon}</div>
      <div>
        <div class="stat-card-admin__num">${value ?? 0}</div>
        <div class="stat-card-admin__label">${label}</div>
      </div>
    </div>`;
}

function renderChart6Bulan(chartData) {
  const canvas = document.getElementById('chart-6bulan');
  if (!canvas || typeof Chart === 'undefined') return;
  // Hancurkan chart lama jika ada
  if (canvas._chartInstance) {
    try { canvas._chartInstance.destroy(); } catch(e) {}
  }
  const labels = chartData.map(d => d.label);
  canvas._chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Hadir',     data: chartData.map(d=>d.hadir),     backgroundColor:'#1A9E74' },
        { label: 'Terlambat', data: chartData.map(d=>d.terlambat), backgroundColor:'#D97706' },
        { label: 'Alfa',      data: chartData.map(d=>d.alfa),      backgroundColor:'#E53E3E' },
        { label: 'Izin',      data: chartData.map(d=>d.izin),      backgroundColor:'#2D6CDF' },
        { label: 'Sakit',     data: chartData.map(d=>d.sakit),     backgroundColor:'#6B7280' },
        { label: 'Cuti',      data: chartData.map(d=>d.cuti),      backgroundColor:'#6C63FF' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}
