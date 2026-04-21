// dashboard.js — Dashboard karyawan & admin

// ─── DASHBOARD KARYAWAN ──────────────────────────────────────
// Auto refresh statistik setiap 5 menit
let _statsRefreshTimer = null;

async function loadDashboardKaryawan() {
  const user = getSession();
  if (!user) return;

  // Auto refresh setiap 5 menit
  if (_statsRefreshTimer) clearInterval(_statsRefreshTimer);
  _statsRefreshTimer = setInterval(async () => {
    try { await loadStatsKaryawan(); } catch(e) {}
  }, 5 * 60 * 1000);

  _setEl('dash-greeting', greetingWaktu());
  _setEl('dash-nama',     user.nama||'-');
  _setEl('dash-nik',      'NIK: '+(user.nik||'-'));
  _setEl('dash-jabatan',  (user.jabatan||'')+(user.departemen?' · '+user.departemen:''));
  _setEl('dash-tanggal',  tanggalHariIni());

  // Phase 1: kritis — profil, absen, statistik, pengumuman
  await Promise.allSettled([
    _loadProfilFoto(user),
    loadStatusAbsenHariIni(),
    loadStatsKaryawan(),
    _loadPengumuman(),
  ]);

  // Phase 2: tidak kritis — ranking, SP, jadwal (tidak block fase 1)
  Promise.allSettled([
    renderRankingSection('ranking-section'),
    _loadSPSaya(),
    loadJadwalMingguSaya(),
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

    // Tampilkan info jam kerja (jam_masuk_ref / jam_keluar_ref) — dipakai utk info ke user
    const elJam = document.getElementById('info-jam-kerja');
    if (elJam && data.jam_kerja) {
      const jk = data.jam_kerja;
      const isShift = !!(data.shift && data.shift.nama_shift);
      elJam.style.display = 'block';
      elJam.innerHTML = `<div style="background:#F0F9FF;border:1px solid #38BDF8;border-radius:10px;
        padding:10px 14px;font-size:12px;color:#075985;margin-bottom:8px;line-height:1.5">
        🕐 <strong>Jam Kerja ${isShift?data.shift.nama_shift:'Anda'}:</strong>
        Masuk <strong>${jk.jam_masuk_ref}</strong> · Keluar <strong>${jk.jam_keluar_ref}</strong>
        <br><span style="font-size:11px;color:#0369A1">
        Toleransi terlambat ${jk.toleransi_menit} menit · Batas absen masuk ${jk.batas_masuk_menit} menit setelah jam masuk
        </span>
      </div>`;
    }

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

    // ── REMINDER: Belum absen keluar (v6.3) ──────────────────
    // Tampil jika: sudah absen masuk + belum absen keluar + sudah mendekati/lewat jam keluar
    const elReminder = document.getElementById('reminder-absen-keluar');
    if (elReminder) {
      if (sudahMasuk && !sudahKeluar && data.jam_kerja?.jam_keluar_ref) {
        const jamKeluar = data.jam_kerja.jam_keluar_ref;  // "17:00"
        const pj = jamKeluar.split(':');
        const menitKeluar = parseInt(pj[0])*60 + parseInt(pj[1]||0);
        const now = new Date();
        const menitSekarang = now.getHours()*60 + now.getMinutes();
        // Reminder 30 menit sebelum s/d 3 jam setelah jam keluar
        const bolehReminder = (menitSekarang >= menitKeluar - 30) && (menitSekarang <= menitKeluar + 180);
        const sudahLewat = menitSekarang > menitKeluar;
        if (bolehReminder) {
          elReminder.style.display = 'block';
          const pesan = sudahLewat
            ? `⏰ <strong>Sudah lewat jam pulang!</strong> Jangan lupa absen keluar (jam pulang: ${jamKeluar})`
            : `🔔 <strong>Sebentar lagi jam pulang (${jamKeluar})</strong>. Siapkan untuk absen keluar.`;
          const bgColor = sudahLewat ? '#FEE2E2' : '#FEF3C7';
          const borderColor = sudahLewat ? '#F87171' : '#F59E0B';
          const textColor = sudahLewat ? '#991B1B' : '#92400E';
          elReminder.innerHTML = `<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:10px;
            padding:12px 14px;font-size:13px;color:${textColor};margin-bottom:8px;line-height:1.5;
            animation:fadeInScale .3s ease">${pesan}</div>`;
        } else {
          elReminder.style.display = 'none';
        }
      } else {
        elReminder.style.display = 'none';
      }
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
    el.innerHTML = `
      <div style="background:linear-gradient(135deg,#C53030,#E53E3E);border-radius:14px;
        padding:16px;margin-bottom:4px;box-shadow:0 4px 16px rgba(229,62,62,.35)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span style="font-size:28px">🚨</span>
          <div>
            <div style="font-size:16px;font-weight:800;color:#fff;letter-spacing:.3px">
              SURAT PERINGATAN AKTIF</div>
            <div style="font-size:12px;color:rgba(255,255,255,.8);margin-top:1px">
              Perhatikan dan perbaiki kedisiplinan Anda</div>
          </div>
        </div>
        ${aktif.map(s=>`
          <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:10px 12px;margin-top:8px">
            <div style="font-size:15px;font-weight:800;color:#fff">
              ⚠️ ${s.jenis_sp} — ${s.jenis_sp==='SP1'?'Peringatan Pertama':s.jenis_sp==='SP2'?'Peringatan Kedua':'Peringatan Ketiga'}
            </div>
            <div style="font-size:12px;color:rgba(255,255,255,.85);margin-top:5px">
              📅 Berlaku: ${formatTanggal(s.tanggal_berlaku)} s/d ${formatTanggal(s.tanggal_kadaluarsa)}
            </div>
            <div style="font-size:12px;color:rgba(255,255,255,.85);margin-top:3px">
              📌 ${s.alasan||'Pelanggaran disiplin'}
            </div>
          </div>`).join('')}
      </div>`;
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
    try { await loadInsightAdmin(); } catch(e) { console.warn('insight:', e.message); }

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

// ============================================================
// DASHBOARD INSIGHT WIDGET (v6.3)
// Hitung insight dari data absensi + pengajuan di minggu ini.
// Hanya baca data, tidak modifikasi apapun.
// ============================================================
async function loadInsightAdmin() {
  // Inject container kalau belum ada
  let el = document.getElementById('admin-insight-section');
  if (!el) {
    el = document.createElement('div');
    el.id = 'admin-insight-section';
    el.style.marginTop = '16px';
    const statsContainer = document.getElementById('admin-stats-container');
    if (statsContainer && statsContainer.parentElement) {
      // Sisipkan setelah admin-rekap-bulan (sebelum ranking section)
      const ranking = document.getElementById('admin-ranking-section');
      if (ranking) ranking.parentElement.insertBefore(el, ranking);
      else statsContainer.parentElement.appendChild(el);
    }
  }

  el.innerHTML = `<div class="card">
    <h3 style="font-size:15px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px">
      📊 Insight Minggu Ini
      <span style="font-size:11px;color:#94A3B8;font-weight:400;margin-left:auto">
        <span class="spinner-btn" style="display:inline-block"></span> Memuat...
      </span>
    </h3>
    <div id="insight-content" style="color:#94A3B8;font-size:13px">Menghitung insight...</div>
  </div>`;

  try {
    // Ambil data dari API yang sudah ada — tidak perlu endpoint baru
    const now = new Date();
    const senin = _getSeninMingguIni(now);
    const minggu = new Date(senin);
    minggu.setDate(senin.getDate() + 6);
    const tglDari = _fmtTglID(senin);
    const tglKe   = _fmtTglID(minggu);

    // Parallel fetch — kalau ada yang gagal, yang lain tetap jalan
    const [absData, pjnData, karyawanAktif] = await Promise.allSettled([
      callAPI('getAbsensiSemua', { bulan: now.getMonth()+1, tahun: now.getFullYear() }),
      callAPI('getPengajuanSemua', {}),
      callAPI('getKaryawanAktif', {})
    ]);

    const absensi  = absData.status === 'fulfilled' ? (absData.value || []) : [];
    const pengajuan = pjnData.status === 'fulfilled' ? (pjnData.value || []) : [];
    const karyawan = karyawanAktif.status === 'fulfilled' ? (karyawanAktif.value || []) : [];

    const insights = _hitungInsight(absensi, pengajuan, karyawan, senin, minggu);
    _renderInsight(insights);
  } catch(e) {
    const c = document.getElementById('insight-content');
    if (c) c.innerHTML = `<div style="color:#94A3B8;font-size:12px;padding:8px">Tidak dapat memuat insight: ${e.message}</div>`;
  }
}

function _getSeninMingguIni(now) {
  const d = new Date(now);
  const day = d.getDay(); // 0 Min, 1 Sen
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function _fmtTglID(d) {
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  return dd + '/' + mm + '/' + d.getFullYear();
}

function _tglDalamRange(tglStr, dari, ke) {
  try {
    const p = tglStr.split('/');
    if (p.length !== 3) return false;
    const t = new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
    return t >= dari && t <= ke;
  } catch(e) { return false; }
}

function _hitungInsight(absensi, pengajuan, karyawan, senin, minggu) {
  const insights = [];

  // Filter absensi minggu ini
  const absMingguIni = absensi.filter(a => _tglDalamRange(a.tanggal, senin, minggu));

  // 1. Karyawan yang sering terlambat (3+ kali minggu ini)
  const telatCount = {};
  absMingguIni.filter(a => a.status === 'terlambat').forEach(a => {
    telatCount[a.id_karyawan] = (telatCount[a.id_karyawan] || 0) + 1;
  });
  const seringTelat = Object.entries(telatCount)
    .filter(([id, n]) => n >= 3)
    .map(([id, n]) => {
      const k = karyawan.find(k => k.id_karyawan === id);
      return { nama: k?.nama_lengkap || id, jumlah: n };
    })
    .sort((a, b) => b.jumlah - a.jumlah);

  if (seringTelat.length > 0) {
    insights.push({
      icon: '⚠️',
      color: '#D97706',
      bg: '#FEF3C7',
      title: `${seringTelat.length} karyawan sering terlambat`,
      detail: seringTelat.slice(0, 3).map(s => `${s.nama} (${s.jumlah}×)`).join(', ') +
              (seringTelat.length > 3 ? ` +${seringTelat.length-3} lainnya` : '')
    });
  }

  // 2. Karyawan alfa minggu ini
  const alfaCount = {};
  absMingguIni.filter(a => a.status === 'alfa').forEach(a => {
    alfaCount[a.id_karyawan] = (alfaCount[a.id_karyawan] || 0) + 1;
  });
  const alfaList = Object.entries(alfaCount)
    .map(([id, n]) => {
      const k = karyawan.find(k => k.id_karyawan === id);
      return { nama: k?.nama_lengkap || id, jumlah: n };
    })
    .sort((a, b) => b.jumlah - a.jumlah);

  if (alfaList.length > 0) {
    insights.push({
      icon: '❌',
      color: '#991B1B',
      bg: '#FEE2E2',
      title: `${alfaList.length} karyawan alfa minggu ini (${alfaList.reduce((s,x)=>s+x.jumlah,0)} hari total)`,
      detail: alfaList.slice(0, 3).map(s => `${s.nama} (${s.jumlah} hari)`).join(', ') +
              (alfaList.length > 3 ? ` +${alfaList.length-3} lainnya` : '')
    });
  }

  // 3. Pengajuan pending > 3 hari
  const now = new Date();
  const pendingLama = pengajuan.filter(p => {
    if (p.status !== 'pending') return false;
    if (!p.tanggal_pengajuan) return false;
    const pt = p.tanggal_pengajuan.split('/');
    if (pt.length !== 3) return false;
    const tglPgj = new Date(parseInt(pt[2]), parseInt(pt[1])-1, parseInt(pt[0]));
    const diffHari = Math.floor((now - tglPgj) / (1000*60*60*24));
    return diffHari > 3;
  });
  if (pendingLama.length > 0) {
    insights.push({
      icon: '⏳',
      color: '#7C2D12',
      bg: '#FFEDD5',
      title: `${pendingLama.length} pengajuan pending > 3 hari`,
      detail: 'Segera review agar tidak menumpuk. Buka menu Pengajuan.'
    });
  }

  // 4. Performa kehadiran minggu ini (%)
  const totalAbsenMingguIni = absMingguIni.length;
  const hadirMinggu = absMingguIni.filter(a =>
    ['hadir','terlambat','dinas_luar'].includes(a.status)
  ).length;
  if (totalAbsenMingguIni > 0) {
    const pct = Math.round((hadirMinggu / totalAbsenMingguIni) * 100);
    let color, bg, label;
    if (pct >= 95)      { color = '#065F46'; bg = '#D1FAE5'; label = 'Sangat baik'; }
    else if (pct >= 85) { color = '#1E40AF'; bg = '#DBEAFE'; label = 'Baik'; }
    else if (pct >= 70) { color = '#92400E'; bg = '#FEF3C7'; label = 'Perlu perhatian'; }
    else                { color = '#991B1B'; bg = '#FEE2E2'; label = 'Kritis'; }
    insights.push({
      icon: pct >= 85 ? '✅' : pct >= 70 ? '⚠️' : '🚨',
      color, bg,
      title: `Tingkat kehadiran minggu ini: ${pct}% (${label})`,
      detail: `${hadirMinggu} dari ${totalAbsenMingguIni} total absensi tercatat hadir`
    });
  }

  // 5. Ulang tahun 7 hari ke depan
  const ultahDekat = karyawan.filter(k => {
    if (!k.tanggal_lahir) return false;
    try {
      const p = String(k.tanggal_lahir).split('/');
      if (p.length < 2) return false;
      const thnIni = now.getFullYear();
      const ultah = new Date(thnIni, parseInt(p[1])-1, parseInt(p[0]));
      const diffHari = Math.floor((ultah - now) / (1000*60*60*24));
      return diffHari >= 0 && diffHari <= 7;
    } catch(e) { return false; }
  });
  if (ultahDekat.length > 0) {
    insights.push({
      icon: '🎂',
      color: '#9D174D',
      bg: '#FCE7F3',
      title: `${ultahDekat.length} ulang tahun dalam 7 hari ke depan`,
      detail: ultahDekat.slice(0, 3).map(k => {
        const p = String(k.tanggal_lahir).split('/');
        return `${k.nama_lengkap} (${p[0]}/${p[1]})`;
      }).join(', ') + (ultahDekat.length > 3 ? ` +${ultahDekat.length-3} lainnya` : '')
    });
  }

  return insights;
}

function _renderInsight(insights) {
  const el = document.getElementById('admin-insight-section');
  if (!el) return;

  if (insights.length === 0) {
    el.innerHTML = `<div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">📊 Insight Minggu Ini</h3>
      <div style="background:#ECFDF5;border:1px solid #10B981;border-radius:10px;
        padding:14px;color:#065F46;font-size:13px;text-align:center">
        ✨ Semua baik! Tidak ada insight yang perlu perhatian minggu ini.
      </div>
    </div>`;
    return;
  }

  const html = insights.map(i => `
    <div style="background:${i.bg};border-left:4px solid ${i.color};border-radius:8px;
      padding:10px 14px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start">
      <span style="font-size:20px;flex-shrink:0">${i.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px;color:${i.color};line-height:1.4;margin-bottom:2px">
          ${i.title}
        </div>
        <div style="font-size:12px;color:#475569;line-height:1.5">${i.detail}</div>
      </div>
    </div>
  `).join('');

  el.innerHTML = `<div class="card">
    <h3 style="font-size:15px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px">
      📊 Insight Minggu Ini
      <span style="font-size:11px;color:#94A3B8;font-weight:400;margin-left:auto">
        ${insights.length} item
      </span>
    </h3>
    ${html}
  </div>`;
}
