// ============================================================
// dashboard.js v5-FINAL — Dashboard Karyawan & Admin
// Semua section independen, String() safe, no race condition
// ============================================================

// ─── DASHBOARD KARYAWAN ──────────────────────────────────────
async function loadDashboardKaryawan() {
  const user = getSession();
  if (!user) return;

  // Header statis — tidak butuh API
  _setEl('dash-greeting', greetingWaktu());
  _setEl('dash-nama',    user.nama || '-');
  _setEl('dash-nik',     'NIK: ' + (user.nik || '-'));
  _setEl('dash-jabatan', (user.jabatan || '') + (user.departemen ? ' · ' + user.departemen : ''));
  _setEl('dash-tanggal', tanggalHariIni());

  // Jalankan semua section PARALEL & INDEPENDEN
  // Jika satu gagal, section lain tetap berjalan
  await Promise.allSettled([
    _loadProfilDanFoto(user),
    loadStatusAbsenHariIni(),
    loadStatsKaryawan(),
    loadPengumumanDashboard(),
    renderRankingSection('ranking-section'),
    loadSPSaya()
  ]);
}

function _setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

async function _loadProfilDanFoto(user) {
  try {
    const profil = await callAPI('getProfilSaya', {});
    if (!profil) return;

    // Cek ulang tahun
    try {
      const ucapan = cekUlangTahunSaya(profil.tanggal_lahir, profil.nama_lengkap);
      if (ucapan) {
        const banner = document.getElementById('ultah-banner');
        const txt    = document.getElementById('ultah-text');
        if (banner) banner.style.display = 'block';
        if (txt)    txt.textContent      = ucapan;
        showConfetti();
      }
    } catch(e) {}

    // Foto + ranking badge
    try {
      const rankData = await getPredikatSaya(user.id_karyawan);
      const predikat = rankData?.predikat || '';
      const wrap     = document.getElementById('dash-foto-wrap');
      if (wrap) wrap.innerHTML = renderFotoProfil(
        profil.foto_profil_url, user.nama, predikat, 80
      );
    } catch(e) {}

  } catch(e) { console.warn('loadProfil:', e.message); }
}

// ─── STATUS ABSEN HARI INI ────────────────────────────────────
async function loadStatusAbsenHariIni() {
  try {
    const data = await callAPI('getStatusAbsenHariIni', {});
    if (!data) return;

    const elStatus = document.getElementById('status-absen-info');

    // PENTING: String() conversion — GAS kadang return boolean true/false
    const sudahMasuk  = String(data.sudah_absen_masuk)  === 'true' || data.sudah_absen_masuk  === true;
    const sudahKeluar = String(data.sudah_absen_keluar) === 'true' || data.sudah_absen_keluar === true;

    // Kunci tombol sesuai status
    if (typeof _kunciTombolAbsen === 'function') {
      _kunciTombolAbsen(sudahMasuk, sudahKeluar);
    } else {
      const btnM = document.getElementById('btn-absen-masuk');
      const btnK = document.getElementById('btn-absen-keluar');
      if (btnM) { btnM.disabled = sudahMasuk; btnM.style.opacity = sudahMasuk ? '0.45' : '1'; }
      if (btnK) { btnK.disabled = sudahKeluar || !sudahMasuk;
                  btnK.style.opacity = (sudahKeluar || !sudahMasuk) ? '0.45' : '1'; }
    }

    // Tampilkan status
    if (sudahMasuk && elStatus) {
      const isTelat = data.status === 'terlambat';
      const isDinas = data.status === 'dinas_luar';
      const warna   = isTelat ? '#D97706' : isDinas ? '#EA580C' : '#1A9E74';
      const bg      = isTelat ? '#FFFAF0' : isDinas ? '#FFF3E0' : '#EBF8EE';
      const icon    = isTelat ? '⚠️' : isDinas ? '🚗' : '✅';
      elStatus.innerHTML = `<div style="background:${bg};border-radius:10px;padding:12px;
        text-align:center;font-size:14px;color:${warna};font-weight:600;margin-bottom:12px">
        ${icon} Sudah absen masuk pukul <strong>${data.jam_masuk || '-'}</strong>
        ${sudahKeluar
          ? ' &nbsp;·&nbsp; 🔴 Keluar: <strong>' + (data.jam_keluar || '-') + '</strong>'
          : '<br><span style="font-size:12px;font-weight:400;color:#94A3B8">Jangan lupa absen keluar!</span>'}
      </div>`;
    }

    // Info shift
    if (data.shift) {
      const elShift = document.getElementById('info-shift');
      if (elShift) {
        const sh = data.shift;
        elShift.textContent = `${sh.nama_shift} · ${sh.jam_masuk} – ${sh.jam_keluar}`;
      }
    }

    // Info Dinas Luar aktif
    const elDinas = document.getElementById('info-dinas-luar');
    if (elDinas) {
      if (data.is_dinas_luar && data.dinas_luar_info) {
        elDinas.style.display = 'block';
        const dl = data.dinas_luar_info;
        elDinas.innerHTML = `<div style="background:#FFF3E0;border:1px solid #F6AD55;
          border-radius:10px;padding:10px 14px;font-size:13px;color:#C05621;
          display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:18px">🚗</span>
          <div>
            <div style="font-weight:700">Dinas Luar Aktif</div>
            <div style="font-size:12px">
              ${formatTanggal(dl.tanggal_mulai)} – ${formatTanggal(dl.tanggal_selesai)}
              ${dl.keterangan ? '· ' + dl.keterangan : ''}
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

    // Warning lokasi belum dikonfigurasi
    const elLokasiWarn = document.getElementById('lokasi-warn');
    if (elLokasiWarn) {
      if (!data.lokasi_aktif && !data.is_dinas_luar) {
        elLokasiWarn.style.display = 'block';
        elLokasiWarn.innerHTML = `<div style="background:#FFF8DC;border:1px solid #D97706;
          border-radius:10px;padding:10px 14px;font-size:13px;color:#92400E;margin-bottom:8px">
          ⚠️ Lokasi kantor belum dikonfigurasi oleh admin.
          Hubungi Super Admin untuk mengisi koordinat kantor.
        </div>`;
      } else {
        elLokasiWarn.style.display = 'none';
      }
    }

  } catch(e) { console.warn('loadStatusAbsen:', e.message); }
}

// ─── STATISTIK BULANAN KARYAWAN ───────────────────────────────
async function loadStatsKaryawan() {
  try {
    const now  = new Date();
    const user = getSession();
    // Kirim id_karyawan eksplisit agar server tidak hanya andalkan session
    const data = await callAPI('getStatsKaryawan', {
      id_karyawan: user ? user.id_karyawan : undefined,
      bulan: now.getMonth() + 1,
      tahun: now.getFullYear()
    });
    if (!data) return;

    const hadir     = parseInt(data.hadir     || 0);
    const terlambat = parseInt(data.terlambat || 0);
    const alfa      = parseInt(data.alfa      || 0);
    const izin      = parseInt(data.izin      || 0);
    const sakit     = parseInt(data.sakit     || 0);
    const cuti      = parseInt(data.cuti      || 0);
    const dinas     = parseInt(data.dinas_luar|| 0);

    // Hadir = hadir + terlambat + dinas luar (semua yang fisik masuk)
    _setEl('stat-hadir',     hadir + terlambat + dinas);
    _setEl('stat-terlambat', terlambat);
    _setEl('stat-alfa',      alfa);
    _setEl('stat-izin',      izin);
    _setEl('stat-sakit',     sakit);
    _setEl('stat-cuti',      cuti);

    if (data.error) console.warn('getStatsKaryawan server error:', data.error);
  } catch(e) { console.warn('loadStatsKaryawan:', e.message); }
}

// ─── PENGUMUMAN ───────────────────────────────────────────────
async function loadPengumumanDashboard() {
  const el = document.getElementById('pengumuman-list');
  if (!el) return;
  try {
    const data = await callAPI('getPengumuman', {});
    if (!data || data.length === 0) {
      el.innerHTML = '<p style="color:#94A3B8;font-size:13px;text-align:center;padding:12px">Tidak ada pengumuman saat ini</p>';
      return;
    }
    el.innerHTML = data.slice(0, 3).map(p => `
      <div class="pengumuman-card pengumuman-card--${p.prioritas || 'normal'}">
        <span class="pengumuman-card__badge badge--${p.prioritas || 'normal'}">${p.prioritas || 'normal'}</span>
        <div style="font-weight:600;font-size:14px;margin-bottom:4px">${p.judul || ''}</div>
        <div style="font-size:12px;color:#64748B;line-height:1.5">
          ${(p.isi || '').substring(0, 120)}${(p.isi || '').length > 120 ? '...' : ''}
        </div>
        <div style="font-size:11px;color:#94A3B8;margin-top:6px">
          📅 s/d ${formatTanggal(p.tanggal_selesai)}
        </div>
      </div>`).join('');
  } catch(e) {
    if (el) el.innerHTML = '<p style="color:#94A3B8;font-size:13px;padding:12px">Gagal memuat pengumuman</p>';
    console.warn('loadPengumuman:', e.message);
  }
}

// ─── SP AKTIF ─────────────────────────────────────────────────
async function loadSPSaya() {
  const el = document.getElementById('sp-saya-section');
  if (!el) return;
  try {
    const data  = await callAPI('getSPSaya', {});
    const aktif = (data || []).filter(s =>
      String(s.status_aktif).toLowerCase() === 'true'
    );
    if (aktif.length === 0) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.innerHTML = aktif.map(s => `
      <div style="background:#FFF5F5;border:1px solid #FC8181;border-radius:10px;
        padding:12px 14px;margin-bottom:8px">
        <div style="font-weight:700;color:#C53030;font-size:14px">⚠️ ${s.jenis_sp} Aktif</div>
        <div style="font-size:12px;color:#64748B;margin-top:4px">
          Berlaku: ${formatTanggal(s.tanggal_berlaku)} – ${formatTanggal(s.tanggal_kadaluarsa)}
        </div>
        <div style="font-size:12px;color:#64748B">${s.alasan || ''}</div>
      </div>`).join('');
  } catch(e) {
    el.style.display = 'none';
    console.warn('loadSP:', e.message);
  }
}

// ─── DASHBOARD ADMIN ─────────────────────────────────────────
async function loadDashboardAdmin() {
  try {
    showLoading('admin-stats-container', 'Memuat statistik...');
    const s = await callAPI('getStatsDashboard', {});
    if (!s) return;

    document.getElementById('admin-stats-container').innerHTML = `
      <div class="stat-grid-admin">
        ${_sc('👥','Karyawan Aktif',  s.karyawan_aktif,   '#2D6CDF')}
        ${_sc('✅','Hadir Hari Ini',  s.hadir_hari_ini,   '#1A9E74')}
        ${_sc('⏰','Terlambat',        s.terlambat,        '#D97706')}
        ${_sc('❌','Alfa',             s.alfa,             '#E53E3E')}
        ${_sc('🚗','Dinas Luar',       s.dinas_luar || 0,  '#EA580C')}
        ${_sc('🏥','Izin/Sakit',       s.izin_sakit,       '#6C63FF')}
        ${_sc('📋','Pending',          s.pending,          '#0891B2')}
        ${_sc('⚠️','SP Aktif',         s.sp_aktif,         '#C53030')}
      </div>`;

    try { if (s.chart_6_bulan) renderChart6Bulan(s.chart_6_bulan); } catch(e) {}
    try { if (s.ultah_hari_ini?.length > 0) _renderUltahAdmin(s.ultah_hari_ini); } catch(e) {}
    try { await renderRankingSection('admin-ranking-section'); } catch(e) {}

  } catch(e) {
    const el = document.getElementById('admin-stats-container');
    if (el) el.innerHTML = `<div style="background:#FFF5F5;border:1px solid #FC8181;
      border-radius:12px;padding:20px;color:#C53030;text-align:center">
      ⚠️ Gagal memuat: ${e.message}
      <br><button class="btn btn--primary" style="margin-top:12px"
        onclick="loadDashboardAdmin()">🔄 Coba Lagi</button>
    </div>`;
  }
}

// loadDashboardAdminV3 didefinisikan di admin_pages.js

// _sc didefinisikan di admin_pages.js

function _renderUltahAdmin(ultah) {
  const el = document.getElementById('ultah-section');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = `<div class="card">
    <h3 style="font-size:15px;margin-bottom:12px">🎂 Ulang Tahun Hari Ini (${ultah.length})</h3>
    ${ultah.map(k => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F1F5F9">
        <img src="${getPhotoSrc(k.foto || '', k.nama)}"
          style="width:36px;height:36px;border-radius:50%;object-fit:cover"
          onerror="this.src='${avatarInisial(k.nama || 'U', 36)}'">
        <div>
          <div style="font-weight:600;font-size:14px">${k.nama} 🎂</div>
          <div style="font-size:12px;color:#64748B">${k.jabatan} · ${k.departemen}</div>
        </div>
        <span style="margin-left:auto;font-size:12px;color:#D97706;font-weight:600">
          ${k.umur} thn</span>
      </div>`).join('')}
  </div>`;
}

// ─── CHART 6 BULAN ────────────────────────────────────────────
function renderChart6Bulan(chartData) {
  const canvas = document.getElementById('chart-6bulan');
  if (!canvas || typeof Chart === 'undefined') return;
  if (canvas._chart) { try { canvas._chart.destroy(); } catch(e) {} }
  canvas._chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: chartData.map(d => d.label),
      datasets: [
        { label: 'Hadir',      data: chartData.map(d => d.hadir),      backgroundColor: '#1A9E74' },
        { label: 'Terlambat',  data: chartData.map(d => d.terlambat),  backgroundColor: '#D97706' },
        { label: 'Alfa',       data: chartData.map(d => d.alfa),       backgroundColor: '#E53E3E' },
        { label: 'Dinas Luar', data: chartData.map(d => d.dinas_luar || 0), backgroundColor: '#EA580C' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}
