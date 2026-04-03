// ============================================================
// dashboard.js — Dashboard Karyawan (PWA) & Admin
// ============================================================

// ─────────────────────────────────────────────────────────────
// DASHBOARD KARYAWAN
// ─────────────────────────────────────────────────────────────
async function loadDashboardKaryawan() {
  const user = getSession();
  if (!user) return;

  // Update header profil
  document.getElementById('dash-greeting').textContent  = greetingWaktu();
  document.getElementById('dash-nama').textContent      = user.nama || '-';
  document.getElementById('dash-nik').textContent       = 'NIK: ' + (user.nik || '-');
  document.getElementById('dash-jabatan').textContent   = user.jabatan || '';
  document.getElementById('dash-tanggal').textContent   = tanggalHariIni();

  // Cek ulang tahun
  const profil = await callAPI('getProfilSaya', {});
  if (profil) {
    const ucapan = cekUlangTahunSaya(profil.tanggal_lahir, profil.nama_lengkap);
    if (ucapan) {
      document.getElementById('ultah-banner').style.display = 'block';
      document.getElementById('ultah-text').textContent     = ucapan;
      showConfetti();
    }
  }

  // Foto profil + ranking
  const rankData = await getPredikatSaya(user.id_karyawan);
  const predikat = rankData ? rankData.predikat : '';
  document.getElementById('dash-foto-wrap').innerHTML = renderFotoProfil(
    profil?.foto_profil_url, user.nama, predikat, 80
  );

  // Status absen hari ini
  await loadStatusAbsenHariIni();

  // Statistik bulan ini
  await loadStatsKaryawan();

  // Pengumuman
  await loadPengumumanDashboard();

  // Ranking
  await renderRankingSection('ranking-section');

  // SP aktif
  await loadSPSaya();
}

async function loadStatusAbsenHariIni() {
  try {
    const data = await callAPI('getStatusAbsenHariIni', {});
    if (!data) return;

    const elMasuk  = document.getElementById('btn-absen-masuk');
    const elKeluar = document.getElementById('btn-absen-keluar');
    const elStatus = document.getElementById('status-absen-info');

    if (data.sudah_absen_masuk) {
      if (elMasuk) { elMasuk.disabled = true; elMasuk.style.opacity = '0.5'; }
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
  } catch(e) { console.warn('loadStatusAbsen:', e.message); }
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
      'stat-hadir'     : data.hadir,
      'stat-terlambat' : data.terlambat,
      'stat-alfa'      : data.alfa,
      'stat-izin'      : data.izin,
      'stat-sakit'     : data.sakit,
      'stat-cuti'      : data.cuti
    };
    Object.entries(mapping).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val || 0;
    });
  } catch(e) { console.warn('loadStats:', e.message); }
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
          ${(p.isi||'').substring(0,100)}${p.isi?.length>100?'...':''}
        </div>
        <div style="font-size:11px;color:#94A3B8;margin-top:6px">
          📅 ${formatTanggal(p.tanggal_mulai)} – ${formatTanggal(p.tanggal_selesai)}
        </div>
      </div>`).join('');
  } catch(e) { el.innerHTML = '<p style="color:#94A3B8;font-size:13px;padding:12px">Gagal memuat pengumuman</p>'; }
}

async function loadSPSaya() {
  const el = document.getElementById('sp-saya-section');
  if (!el) return;
  try {
    const data = await callAPI('getSPSaya', {});
    const aktif = (data || []).filter(s => s.status_aktif === 'true');
    if (aktif.length === 0) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.innerHTML = aktif.map(s => `
      <div style="background:#FFF5F5;border:1px solid #FC8181;border-radius:10px;
        padding:12px 14px;margin-bottom:8px">
        <div style="font-weight:700;color:#C53030;font-size:14px">
          ⚠️ ${s.jenis_sp} Aktif
        </div>
        <div style="font-size:12px;color:#64748B;margin-top:4px">
          Berlaku: ${formatTanggal(s.tanggal_berlaku)} – ${formatTanggal(s.tanggal_kadaluarsa)}
        </div>
        <div style="font-size:12px;color:#64748B">Alasan: ${s.alasan}</div>
      </div>`).join('');
  } catch(e) {}
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD ADMIN / SUPERADMIN
// ─────────────────────────────────────────────────────────────
async function loadDashboardAdmin() {
  try {
    showLoading('admin-stats-container', 'Memuat statistik...');
    const stats = await callAPI('getStatsDashboard', {});
    if (!stats) return;

    // Render kartu statistik
    document.getElementById('admin-stats-container').innerHTML = `
      <div class="stat-grid-admin">
        ${statCard('👥','Karyawan Aktif', stats.karyawan_aktif, '#2D6CDF')}
        ${statCard('✅','Hadir Hari Ini', stats.hadir_hari_ini, '#1A9E74')}
        ${statCard('⏰','Terlambat', stats.terlambat, '#D97706')}
        ${statCard('❌','Alfa', stats.alfa, '#E53E3E')}
        ${statCard('🏥','Izin/Sakit', stats.izin_sakit, '#6C63FF')}
        ${statCard('📋','Pending', stats.pending, '#0891B2')}
      </div>`;

    // Chart 6 bulan
    if (stats.chart_6_bulan) renderChart6Bulan(stats.chart_6_bulan);

    // Ulang tahun hari ini
    if (stats.ultah_hari_ini && stats.ultah_hari_ini.length > 0) {
      const el = document.getElementById('ultah-section');
      if (el) {
        el.style.display = 'block';
        el.innerHTML = `
          <div class="card">
            <h3 style="font-size:15px;margin-bottom:12px">🎂 Ulang Tahun Hari Ini</h3>
            ${stats.ultah_hari_ini.map(k => `
              <div style="display:flex;align-items:center;gap:10px;
                padding:8px 0;border-bottom:1px solid #F1F5F9">
                <img src="${getPhotoSrc(k.foto, k.nama)}" alt="${k.nama}"
                  style="width:36px;height:36px;border-radius:50%;object-fit:cover"
                  onerror="this.src='${avatarInisial(k.nama,36)}'">
                <div>
                  <div style="font-weight:600;font-size:14px">${k.nama}</div>
                  <div style="font-size:12px;color:#64748B">${k.jabatan} · ${k.departemen}</div>
                </div>
              </div>`).join('')}
          </div>`;
      }
    }

    // Ranking mini
    await renderRankingSection('admin-ranking-section');

  } catch(e) {
    document.getElementById('admin-stats-container').innerHTML =
      `<div style="color:#E53E3E;padding:20px;text-align:center">Gagal memuat data: ${e.message}</div>`;
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

  const labels = chartData.map(d => d.label);
  new Chart(canvas, {
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
        x: { stacked: false, grid: { display: false } },
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}
