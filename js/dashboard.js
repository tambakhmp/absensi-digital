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

  // Phase 2: tidak kritis — ranking, SP, jadwal, QR (tidak block fase 1)
  Promise.allSettled([
    renderRankingSection('ranking-section'),
    _loadSPSaya(),
    loadJadwalMingguSaya(),
    _loadQRAbsensiSaya(),
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
    // Cache untuk modal
    window._spSayaCache = aktif;
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
              Klik kartu untuk melihat surat lengkap
            </div>
          </div>
        </div>
        ${aktif.map((s, idx)=>`
          <div onclick="bukaSuratSP(${idx})" role="button" tabindex="0"
            onkeypress="if(event.key==='Enter'||event.key===' ')bukaSuratSP(${idx})"
            style="background:rgba(255,255,255,.15);border-radius:10px;padding:10px 12px;margin-top:8px;
              cursor:pointer;transition:all .2s;border:1px solid transparent"
            onmouseover="this.style.background='rgba(255,255,255,.25)';this.style.borderColor='rgba(255,255,255,.3)'"
            onmouseout="this.style.background='rgba(255,255,255,.15)';this.style.borderColor='transparent'">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <div style="font-size:15px;font-weight:800;color:#fff">
                ⚠️ ${s.jenis_sp} — ${s.jenis_sp==='SP1'?'Peringatan Pertama':s.jenis_sp==='SP2'?'Peringatan Kedua':'Peringatan Ketiga'}
              </div>
              <span style="font-size:11px;color:rgba(255,255,255,.9);background:rgba(255,255,255,.2);
                padding:3px 8px;border-radius:10px;white-space:nowrap">
                👁️ Lihat Surat
              </span>
            </div>
            <div style="font-size:12px;color:rgba(255,255,255,.85);margin-top:5px">
              📅 Berlaku: ${formatTanggal(s.tanggal_berlaku)} s/d ${formatTanggal(s.tanggal_kadaluarsa)}
            </div>
            <div style="font-size:12px;color:rgba(255,255,255,.85);margin-top:3px">
              📌 ${(s.alasan||'Pelanggaran disiplin').substring(0,80)}${(s.alasan||'').length>80?'...':''}
            </div>
          </div>`).join('')}
      </div>`;
  } catch(e) { el.style.display = 'none'; }
}

// ============================================================
// MODAL: Lihat Surat Peringatan (view-only, tidak bisa cetak)
// v6.6.2 — ambil profil lengkap dari API (session tidak lengkap)
//   - HILANG: kop instansi, garis pembatas, tanda tangan HRD
//   - HARUS ADA: nomor surat, nama lengkap, NIK, jabatan, departemen
// ============================================================
async function bukaSuratSP(idx) {
  const sp = (window._spSayaCache || [])[idx];
  if (!sp) return;

  // Loading modal dulu sementara fetch profil
  const modal = document.createElement('div');
  modal.id = 'modal-surat-sp';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;' +
    'display:flex;align-items:center;justify-content:center;padding:12px;overflow-y:auto;' +
    'animation:fadeInScale .25s ease';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:40px;text-align:center;color:#64748B;font-size:14px">
      <div class="spinner-btn" style="display:inline-block;margin-bottom:8px"></div><br>
      Memuat surat peringatan...
    </div>`;
  document.body.appendChild(modal);

  // Ambil profil karyawan lengkap dari API (session tidak selalu ada semua field)
  let user = {};
  try {
    user = await callAPI('getProfilSaya', {}) || {};
  } catch(e) {
    // Fallback ke session kalau API error
    user = (typeof getSession === 'function' ? getSession() : {}) || {};
  }
  // Fallback lagi ke data di cache SP (ada nama_karyawan + id_karyawan)
  if (!user.nama_lengkap && sp.nama_karyawan) {
    user.nama_lengkap = sp.nama_karyawan;
  }

  const spNama = { SP1: 'PERTAMA', SP2: 'KEDUA', SP3: 'KETIGA' };
  const spLabel = sp.jenis_sp === 'SP1' ? 'Peringatan Pertama'
                : sp.jenis_sp === 'SP2' ? 'Peringatan Kedua'
                : 'Peringatan Ketiga';
  const tglBerlaku    = formatTanggal(sp.tanggal_berlaku);
  const tglKadaluarsa = formatTanggal(sp.tanggal_kadaluarsa);
  const noSurat       = sp.no_surat || sp.id_sp || '-';
  const totalAlfa     = sp.total_hari_alfa_pemicu || 0;

  // Data karyawan — prioritaskan dari API, fallback ke session
  const nama       = user.nama_lengkap || sp.nama_karyawan || '-';
  const nik        = user.nik || '-';
  const jabatan    = user.jabatan || '-';
  const departemen = user.departemen || '-';

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:600px;
      max-height:92vh;overflow-y:auto;animation:fadeInScale .25s ease;display:flex;flex-direction:column"
      onclick="event.stopPropagation()">

      <!-- Header modal (sticky) -->
      <div style="position:sticky;top:0;background:linear-gradient(135deg,#991B1B,#DC2626);
        color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;
        border-radius:16px 16px 0 0;z-index:2">
        <div>
          <div style="font-size:11px;opacity:.85;letter-spacing:.5px;font-weight:600">
            🚨 SURAT PERINGATAN AKTIF
          </div>
          <div style="font-size:16px;font-weight:800;margin-top:2px">${sp.jenis_sp} — ${spLabel}</div>
        </div>
        <button onclick="document.getElementById('modal-surat-sp').remove()"
          style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;
            border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">✕</button>
      </div>

      <!-- Body surat formal -->
      <div style="padding:24px;font-family:'Times New Roman',serif;color:#1E293B;line-height:1.7">

        <!-- Detail nomor surat -->
        <table style="width:100%;font-size:13px;margin-bottom:14px;border-collapse:collapse">
          <tr><td style="width:90px;padding:2px 0">Nomor</td><td style="padding:2px 0">: ${noSurat}</td></tr>
          <tr><td style="padding:2px 0">Lampiran</td><td style="padding:2px 0">: -</td></tr>
          <tr><td style="padding:2px 0">Hal</td><td style="padding:2px 0;font-weight:700">: Surat Peringatan ${sp.jenis_sp}</td></tr>
        </table>

        <!-- Penerima -->
        <div style="font-size:13px;margin-bottom:12px">
          <div>Kepada Yth.</div>
          <div style="font-weight:700">Sdr/i. ${nama}</div>
          <div>${jabatan} - ${departemen}</div>
          <div>Di Tempat</div>
        </div>

        <!-- Pembuka -->
        <div style="font-size:13px;margin-bottom:12px">Dengan hormat,</div>
        <div style="font-size:13px;margin-bottom:14px;text-align:justify">
          Sehubungan dengan evaluasi kehadiran dan kedisiplinan kerja, bersama ini kami sampaikan bahwa Saudara/i:
        </div>

        <!-- Kotak identitas (data WAJIB ada) -->
        <div style="background:#EFF6FF;border:1px solid #2D6CDF;border-radius:6px;
          padding:14px 18px;margin-bottom:14px">
          <table style="width:100%;font-size:13px">
            <tr><td style="width:140px;font-weight:700;padding:3px 0">Nama Lengkap</td>
                <td style="padding:3px 0">: ${nama}</td></tr>
            <tr><td style="font-weight:700;padding:3px 0">NIK</td>
                <td style="padding:3px 0">: ${nik}</td></tr>
            <tr><td style="font-weight:700;padding:3px 0">Jabatan</td>
                <td style="padding:3px 0">: ${jabatan}</td></tr>
            <tr><td style="font-weight:700;padding:3px 0">Departemen</td>
                <td style="padding:3px 0">: ${departemen}</td></tr>
          </table>
        </div>

        <!-- Alasan / pelanggaran -->
        <div style="font-size:13px;margin-bottom:14px;text-align:justify">
          Telah melakukan pelanggaran disiplin berupa:
          <strong style="color:#991B1B">${sp.alasan || '-'}</strong>.
          ${totalAlfa > 0 ? `Total ketidakhadiran tanpa keterangan (alfa): <strong>${totalAlfa} hari</strong>.` : ''}
        </div>

        <!-- Pernyataan SP -->
        <div style="text-align:center;font-weight:800;font-size:14px;margin:18px 0 8px">
          OLEH KARENA ITU
        </div>
        <div style="font-size:13px;margin-bottom:14px;text-align:justify">
          Kami memberikan <strong style="color:#991B1B">SURAT PERINGATAN ${spNama[sp.jenis_sp] || ''}</strong>
          kepada yang bersangkutan. Surat ini berlaku mulai tanggal
          <strong>${tglBerlaku}</strong> sampai dengan <strong>${tglKadaluarsa}</strong>.
        </div>

        <!-- Konsekuensi -->
        <div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:4px;
          padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:#78350F;text-align:justify">
          <strong>⚠️ Konsekuensi:</strong>
          ${sp.jenis_sp === 'SP1' ? 'Apabila pelanggaran berulang, akan diberikan Surat Peringatan Kedua (SP2).' :
            sp.jenis_sp === 'SP2' ? 'Apabila pelanggaran berulang, akan diberikan Surat Peringatan Ketiga (SP3).' :
            'Apabila pelanggaran berulang, dapat dikenakan sanksi sesuai ketentuan yang berlaku, termasuk pemutusan hubungan kerja.'}
          Kami berharap Saudara/i dapat memperbaiki kedisiplinan kerja kedepannya.
        </div>

        <!-- Penutup -->
        <div style="font-size:13px;margin-bottom:8px;text-align:justify">
          Demikian surat peringatan ini dibuat agar yang bersangkutan dapat memahami, menerima, dan memperbaiki perilaku kerjanya. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.
        </div>

        <!-- Footer info status (bukan tanda tangan) -->
        <div style="margin-top:22px;padding:10px 12px;background:#F1F5F9;border-radius:6px;
          font-size:11px;color:#64748B;font-family:'Inter',sans-serif;text-align:center">
          📅 Status: <strong style="color:#991B1B">AKTIF</strong> ·
          Berakhir pada ${tglKadaluarsa}<br>
          <span style="font-size:10px">Dokumen ini hanya untuk dilihat</span>
        </div>
      </div>

      <!-- Footer modal -->
      <div style="padding:12px 18px;background:#F8FAFC;border-top:1px solid #E2E8F0;
        text-align:center;border-radius:0 0 16px 16px">
        <button onclick="document.getElementById('modal-surat-sp').remove()"
          class="btn btn--ghost" style="min-width:140px;font-size:13px">Tutup</button>
      </div>
    </div>`;
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

// ============================================================
// QR ABSENSI SAYA (v6.7) — Widget di dashboard karyawan
// QR dinamis, refresh setiap 30 detik
// ============================================================
let _qrRefreshTimer = null;
let _qrCountdownTimer = null;

async function _loadQRAbsensiSaya() {
  // Inject container kalau belum ada
  let el = document.getElementById('qr-absensi-section');
  if (!el) {
    el = document.createElement('div');
    el.id = 'qr-absensi-section';
    el.style.display = 'none';
    // Sisipkan setelah sp-saya-section, sebelum ranking
    const spSection = document.getElementById('sp-saya-section');
    const rankingSection = document.getElementById('ranking-section');
    if (rankingSection && rankingSection.parentElement) {
      rankingSection.parentElement.insertBefore(el, rankingSection);
    } else if (spSection && spSection.parentElement) {
      spSection.parentElement.appendChild(el);
    } else {
      document.body.appendChild(el);
    }
  }

  // Cek library QRCode tersedia
  if (typeof QRCode === 'undefined') {
    console.warn('[QR] Library QRCode belum ter-load');
    el.style.display = 'none';
    return;
  }

  try {
    await _refreshQRToken();
    el.style.display = 'block';
    // Auto-refresh setiap 30 detik
    _startQRTimers();
  } catch(e) {
    console.warn('[QR] Gagal load:', e.message);
    el.style.display = 'none';
  }
}

async function _refreshQRToken() {
  const el = document.getElementById('qr-absensi-section');
  if (!el) return;

  try {
    const data = await callAPI('generateTokenQRKaryawan', {});
    if (!data || !data.token) {
      throw new Error('Token QR tidak valid');
    }

    // Render widget
    el.innerHTML = `
      <div class="card" style="padding:16px;margin-bottom:4px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <h3 style="font-size:15px;font-weight:700;margin:0 0 2px;color:#1E293B">
              🆔 QR Absensi Cadangan
            </h3>
            <p style="font-size:11px;color:#64748B;margin:0">
              Untuk dipakai admin jika GPS Anda bermasalah
            </p>
          </div>
          <div style="text-align:right;font-size:11px;color:#64748B">
            <div>⏱️ Refresh otomatis</div>
            <div style="font-weight:700;color:#2D6CDF;font-size:14px" id="qr-countdown">
              ${data.expires_in || 30}s
            </div>
          </div>
        </div>

        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px;
          display:flex;flex-direction:column;align-items:center">
          <div id="qr-canvas-container"
            style="background:#fff;padding:8px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.08)">
          </div>
          <div style="margin-top:10px;text-align:center">
            <div style="font-weight:700;font-size:14px;color:#1E293B">${data.nama || '-'}</div>
            <div style="font-size:12px;color:#64748B">NIK: ${data.nik || '-'}</div>
          </div>
        </div>

        <div style="background:#FEF3C7;border-left:3px solid #F59E0B;border-radius:6px;
          padding:10px 12px;margin-top:10px;font-size:11.5px;color:#78350F;line-height:1.5">
          ℹ️ <strong>Cara pakai:</strong> Tunjukkan QR ini ke admin.
          Admin akan scan & foto Anda untuk mencatat absensi.
          QR akan otomatis berubah tiap 30 detik untuk keamanan.
        </div>
      </div>`;

    // Generate QR code
    const payload = JSON.stringify({
      v: 1,
      id: data.id_karyawan,
      ts: data.timestamp,
      t: data.token
    });

    const container = document.getElementById('qr-canvas-container');
    if (container) {
      container.innerHTML = '';
      new QRCode(container, {
        text: payload,
        width: 180,
        height: 180,
        colorDark: '#1E293B',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  } catch(e) {
    // Silent fail — widget sembunyi
    const el = document.getElementById('qr-absensi-section');
    if (el) el.style.display = 'none';
    console.warn('[QR refresh]', e.message);
  }
}

function _startQRTimers() {
  // Clear timers lama dulu
  _stopQRTimers();

  let sisaDetik = 30;

  // Countdown visual setiap 1 detik
  _qrCountdownTimer = setInterval(() => {
    sisaDetik--;
    const el = document.getElementById('qr-countdown');
    if (el) el.textContent = sisaDetik + 's';
    if (sisaDetik <= 0) {
      sisaDetik = 30;
      _refreshQRToken().catch(() => {});
    }
  }, 1000);
}

function _stopQRTimers() {
  if (_qrRefreshTimer) { clearInterval(_qrRefreshTimer); _qrRefreshTimer = null; }
  if (_qrCountdownTimer) { clearInterval(_qrCountdownTimer); _qrCountdownTimer = null; }
}

// Stop timers saat pindah halaman / logout
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', _stopQRTimers);
}
