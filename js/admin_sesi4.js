// ============================================================
// admin_sesi4.js — Sesi 4: Harga Lembur, SP, Ranking, Shift
// ============================================================

// ─────────────────────────────────────────────────────────────
// HARGA LEMBUR ADMIN — CRUD lengkap
// ─────────────────────────────────────────────────────────────
async function renderHargaLemburAdmin(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">💰 Harga Lembur per Jabatan</h2>
      <button class="btn btn--primary" style="font-size:13px"
        onclick="tampilFormHargaLembur(null)">+ Tambah</button>
    </div>
    <div class="card" style="padding:12px;background:#EFF6FF;margin-bottom:14px">
      <p style="font-size:13px;color:#2D6CDF;margin:0">
        💡 Harga lembur digunakan otomatis saat karyawan mengajukan lembur,
        berdasarkan jabatan karyawan.
      </p>
    </div>
    <div id="harga-lembur-list">${skeletonCard(3)}</div>`;

  await loadHargaLemburList();
}

async function loadHargaLemburList() {
  const el = document.getElementById('harga-lembur-list');
  if (!el) return;
  try {
    const data = await callAPI('getSemuaHargaLembur', {});
    if (!data || data.length === 0) {
      el.innerHTML = `<div class="card" style="text-align:center;padding:32px;color:#94A3B8">
        <div style="font-size:40px;margin-bottom:8px">💰</div>
        Belum ada data harga lembur.
        <button class="btn btn--primary" style="margin-top:12px"
          onclick="tampilFormHargaLembur(null)">+ Tambah Pertama</button>
      </div>`;
      return;
    }
    el.innerHTML = `<div class="card" style="padding:0;overflow-x:auto">
      <table class="simple-table">
        <thead>
          <tr>
            <th>Jabatan</th>
            <th>Harga per Jam</th>
            <th>Berlaku Mulai</th>
            <th style="text-align:center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(h => `<tr>
            <td style="font-weight:600">${h.jabatan}</td>
            <td style="color:#1A9E74;font-weight:700">${formatRupiah(h.harga_per_jam)}</td>
            <td style="font-size:12px;color:#64748B">${formatTanggal(h.berlaku_mulai)}</td>
            <td style="text-align:center">
              <div style="display:flex;gap:6px;justify-content:center">
                <button class="btn btn--ghost" style="padding:5px 10px;font-size:12px"
                  onclick='tampilFormHargaLembur(${JSON.stringify(h)})'>✏️ Edit</button>
                <button class="btn" style="padding:5px 10px;font-size:12px;
                  background:#FFF5F5;color:#E53E3E;border:1px solid #FC8181"
                  onclick="hapusHargaLembur('${h.id}','${h.jabatan}')">🗑️</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  } catch(e) { showError('harga-lembur-list', e.message); }
}

function tampilFormHargaLembur(data) {
  const isEdit = !!data?.jabatan;
  showModal(
    isEdit ? '✏️ Edit Harga Lembur' : '+ Tambah Harga Lembur',
    `<div style="margin-top:8px">
      <div class="form-group">
        <label class="form-label">Jabatan *</label>
        <input type="text" class="form-control" id="hl-jabatan"
          value="${data?.jabatan||''}" placeholder="Contoh: Staff, Supervisor, Manager">
      </div>
      <div class="form-group">
        <label class="form-label">Harga per Jam (Rp) *</label>
        <input type="number" class="form-control" id="hl-harga"
          value="${data?.harga_per_jam||''}" placeholder="Contoh: 25000" min="0" step="1000">
        <p class="form-hint" id="hl-preview">
          ${data?.harga_per_jam ? formatRupiah(data.harga_per_jam) + ' per jam' : ''}
        </p>
      </div>
    </div>`,
    async () => {
      const jabatan = document.getElementById('hl-jabatan')?.value?.trim();
      const harga   = document.getElementById('hl-harga')?.value;
      if (!jabatan) throw new Error('Jabatan wajib diisi');
      if (!harga || parseInt(harga) < 0) throw new Error('Harga tidak valid');
      const r = await callAPI('setHargaLembur', {
        jabatan,
        harga_per_jam: parseInt(harga)
      });
      showToast(r.message || 'Harga lembur disimpan ✅', 'success');
      await loadHargaLemburList();
    },
    '💾 Simpan'
  );

  // Preview real-time
  setTimeout(() => {
    const inp = document.getElementById('hl-harga');
    if (inp) inp.addEventListener('input', function() {
      const prev = document.getElementById('hl-preview');
      if (prev) prev.textContent = this.value ? formatRupiah(this.value) + ' per jam' : '';
    });
  }, 100);
}

function hapusHargaLembur(id, jabatan) {
  showModal('🗑️ Hapus Harga Lembur?',
    `Hapus harga lembur untuk jabatan <strong>${jabatan}</strong>?`,
    async () => {
      const r = await callAPI('hapusHargaLembur', { id });
      showToast(r.message, 'success');
      await loadHargaLemburList();
    }, '🗑️ Hapus'
  );
}

// ─────────────────────────────────────────────────────────────
// RANKING ADMIN — Full view dengan foto dan predikat
// ─────────────────────────────────────────────────────────────
async function renderRankingAdminFull(container) {
  const now = new Date();
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">🏆 Ranking Karyawan</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <select class="form-control" id="rank-bulan" style="width:130px">
          ${Array.from({length:12},(_,i)=>`<option value="${i+1}"
            ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
        </select>
        <input type="number" class="form-control" id="rank-tahun"
          value="${now.getFullYear()}" style="width:90px">
        <button class="btn btn--secondary" onclick="loadRankingAdmin()">🔄 Refresh</button>
        <button class="btn btn--primary" onclick="hitungRankingSekarang()">⚡ Hitung Ulang</button>
      </div>
    </div>
    <div id="ranking-admin-content">${skeletonCard(4)}</div>`;

  await loadRankingAdmin();
}

async function loadRankingAdmin() {
  const el    = document.getElementById('ranking-admin-content');
  const bulan = document.getElementById('rank-bulan')?.value;
  const tahun = document.getElementById('rank-tahun')?.value;
  if (!el) return;
  el.innerHTML = skeletonCard(4);

  try {
    const data = await callAPI('getRankingSnapshot', { bulan, tahun });

    if (!data || data.length === 0) {
      el.innerHTML = `
        <div class="card" style="text-align:center;padding:32px;color:#94A3B8">
          <div style="font-size:40px;margin-bottom:8px">🏆</div>
          <div>Belum ada data ranking untuk periode ini.</div>
          <button class="btn btn--primary" style="margin-top:12px"
            onclick="hitungRankingSekarang()">⚡ Hitung Ranking Sekarang</button>
        </div>`;
      return;
    }

    const top3  = data.slice(0, 3);
    const mid   = data.slice(3, data.length - 3).filter(r => r.id_karyawan);
    const bot3  = data.slice(Math.max(3, data.length - 3));
    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
                   'Juli','Agustus','September','Oktober','November','Desember'];
    const label = BULAN[parseInt(bulan)-1] + ' ' + tahun;

    el.innerHTML = `
      <!-- TOP 3 TERBAIK -->
      <div style="margin-bottom:20px">
        <h3 style="font-size:14px;font-weight:700;color:#D97706;
          text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px">
          ⭐ Terbaik ${label}
        </h3>
        ${top3.map(r => _rankCard(r, 'top')).join('')}
      </div>

      <!-- SEMUA RANKING (tabel) -->
      ${mid.length > 0 ? `
      <div class="card" style="margin-bottom:16px;padding:0;overflow-x:auto">
        <table class="simple-table">
          <thead><tr>
            <th>#</th><th>Karyawan</th><th>Dept</th>
            <th style="text-align:center">Hadir</th>
            <th style="text-align:center">Terlambat</th>
            <th style="text-align:center">Alfa</th>
            <th style="text-align:center">Skor</th>
          </tr></thead>
          <tbody>
            ${mid.map(r => `<tr>
              <td style="font-weight:700;color:#64748B">#${r.peringkat}</td>
              <td style="font-weight:600">${r.nama_karyawan}</td>
              <td style="font-size:12px;color:#64748B">${r.departemen||'-'}</td>
              <td style="text-align:center;color:#1A9E74;font-weight:600">${r.total_hadir||0}</td>
              <td style="text-align:center;color:#D97706">${r.total_terlambat||0}</td>
              <td style="text-align:center;color:#E53E3E;font-weight:600">${r.total_alfa||0}</td>
              <td style="text-align:center;font-weight:700">${r.skor_kehadiran||0}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

      <!-- BOTTOM 3 PERLU PERHATIAN -->
      ${bot3.length > 0 ? `
      <div>
        <h3 style="font-size:14px;font-weight:700;color:#E53E3E;
          text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px">
          ⚠️ Perlu Perhatian
        </h3>
        ${bot3.map(r => _rankCard(r, 'bot')).join('')}
      </div>` : ''}

      <!-- Keterangan skor -->
      <div class="card" style="background:#F8FAFC;margin-top:16px">
        <p style="font-size:12px;color:#64748B;margin:0;line-height:1.8">
          <strong>Formula Skor:</strong><br>
          Hadir ×100 + Terlambat ×60 + Izin ×80 + Sakit ×90 + Cuti ×85 + Dinas Luar ×95 − Alfa ×150
        </p>
      </div>`;
  } catch(e) { showError('ranking-admin-content', e.message); }
}

function _rankCard(r, tipe) {
  const PREDIKAT_MAP = {
    'Bintang Emas'      : { icon:'🥇', cls:'rank-badge--gold',    border:'rank-1' },
    'Bintang Perak'     : { icon:'🥈', cls:'rank-badge--silver',  border:'rank-2' },
    'Bintang Perunggu'  : { icon:'🥉', cls:'rank-badge--bronze',  border:'rank-3' },
    'Perlu Pembinaan'   : { icon:'⚠️', cls:'rank-badge--danger',  border:'rank-worst-1' },
    'Butuh Perhatian'   : { icon:'⚠️', cls:'rank-badge--warning', border:'rank-worst-2' },
    'Tingkatkan Kinerja': { icon:'⚠️', cls:'rank-badge--caution', border:'rank-worst-3' }
  };
  const meta = PREDIKAT_MAP[r.predikat] || { icon:'', cls:'', border:'' };
  const foto = getPhotoSrc(r.foto||'', r.nama_karyawan, 52);

  return `
    <div class="card" style="margin-bottom:8px;
      border-left:4px solid ${tipe==='top'?'#D97706':'#E53E3E'}">
      <div style="display:flex;align-items:center;gap:14px">
        <div style="position:relative;flex-shrink:0">
          <div class="${meta.border}" style="width:52px;height:52px;border-radius:50%;overflow:hidden">
            <img src="${foto}" style="width:100%;height:100%;object-fit:cover"
              onerror="this.src='${avatarInisial(r.nama_karyawan,52)}'">
          </div>
          <span style="position:absolute;bottom:-4px;right:-6px;font-size:18px">
            ${meta.icon}
          </span>
        </div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:15px">#${r.peringkat} ${r.nama_karyawan}</div>
          <div style="font-size:12px;color:#64748B">${r.departemen||''}</div>
          ${r.predikat ? `<span class="rank-badge ${meta.cls}" style="margin-top:4px">${r.predikat}</span>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:18px;font-weight:800;color:var(--color-primer)">${r.skor_kehadiran||0}</div>
          <div style="font-size:10px;color:#94A3B8">skor</div>
          <div style="font-size:12px;margin-top:4px">
            <span style="color:#1A9E74">✅ ${r.total_hadir||0}</span>
            <span style="color:#E53E3E;margin-left:6px">❌ ${r.total_alfa||0}</span>
          </div>
        </div>
      </div>
    </div>`;
}

async function hitungRankingSekarang() {
  showToast('Menghitung ranking...', 'info', 3000);
  try {
    const r = await callAPI('hitungRanking', {});
    showToast(r.message || 'Ranking berhasil dihitung ✅', 'success');
    await loadRankingAdmin();
  } catch(e) { showToast(e.message, 'error'); }
}

// ─────────────────────────────────────────────────────────────
// PENGAJUAN ADMIN — Tabs + Detail + Range Tanggal
// ─────────────────────────────────────────────────────────────
async function renderPengajuanAdminFull(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">📁 Manajemen Pengajuan</h2>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <select class="form-control" id="filter-jenis-pjn" style="width:130px"
          onchange="loadPengajuanAdminFull()">
          <option value="">Semua Jenis</option>
          <option value="izin">Izin</option>
          <option value="sakit">Sakit</option>
          <option value="cuti">Cuti</option>
          <option value="dinas_luar">Dinas Luar</option>
          <option value="lembur">Lembur</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      ${_tabBtn('pjn-tab-pending',   'Pending',   "loadPengajuanAdminFull('pending')",   true)}
      ${_tabBtn('pjn-tab-disetujui', 'Disetujui', "loadPengajuanAdminFull('disetujui')", false)}
      ${_tabBtn('pjn-tab-ditolak',   'Ditolak',   "loadPengajuanAdminFull('ditolak')",   false)}
      ${_tabBtn('pjn-tab-semua',     'Semua',     "loadPengajuanAdminFull('')",           false)}
    </div>
    <div id="pengajuan-admin-full-list">${skeletonCard(4)}</div>`;

  await loadPengajuanAdminFull('pending');
}

function _tabBtn(id, label, onclick, active) {
  return `<button id="${id}" class="btn ${active ? 'btn--primary' : 'btn--ghost'}"
    style="font-size:13px;padding:8px 14px"
    onclick="document.querySelectorAll('[id^=pjn-tab]').forEach(b=>{b.className='btn btn--ghost';b.style.padding='8px 14px';b.style.fontSize='13px'});this.className='btn btn--primary';this.style.padding='8px 14px';${onclick}">
    ${label}
  </button>`;
}

async function loadPengajuanAdminFull(status = 'pending') {
  const el    = document.getElementById('pengajuan-admin-full-list');
  const jenis = document.getElementById('filter-jenis-pjn')?.value || '';
  if (!el) return;
  el.innerHTML = skeletonCard(3);

  try {
    const payload = {};
    if (status) payload.status = status;
    if (jenis)  payload.jenis  = jenis;
    const data = await callAPI('getPengajuanSemua', payload);

    if (!data || data.length === 0) {
      showEmpty('pengajuan-admin-full-list',
        'Tidak ada pengajuan' + (status ? ' berstatus ' + status : '') + (jenis ? ' jenis ' + jenis : ''));
      return;
    }

    el.innerHTML = data.map(p => {
      const isIzin = ['izin','sakit','cuti','dinas_luar'].includes(p.jenis);
      return `
        <div class="card" style="margin-bottom:10px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;
            flex-wrap:wrap;gap:10px">
            <div style="flex:1;min-width:200px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
                <span style="font-weight:700;font-size:15px">${p.nama_karyawan}</span>
                <span style="font-size:12px;font-weight:700;padding:2px 10px;border-radius:20px;
                  background:#EFF6FF;color:#2D6CDF">${_labelJenisPjn(p.jenis)}</span>
                ${badgeStatus(p.status)}
              </div>
              ${isIzin ? `
                <div style="font-size:13px;color:#475569;margin-bottom:4px">
                  📅 <strong>${formatTanggal(p.tanggal_mulai)}</strong>
                  ${p.tanggal_selesai !== p.tanggal_mulai
                    ? ' — <strong>' + formatTanggal(p.tanggal_selesai) + '</strong>'
                    : ''}
                  &nbsp;·&nbsp; <strong>${p.total_hari} hari</strong>
                </div>` : ''}
              <div style="font-size:13px;color:#64748B;margin-bottom:4px">${p.keterangan||''}</div>
              ${p.file_pendukung_url ? `<a href="${p.file_pendukung_url}" target="_blank"
                style="font-size:12px;color:#2D6CDF">📎 Lihat lampiran</a>` : ''}
              ${p.catatan_admin ? `<div style="font-size:12px;color:#D97706;margin-top:4px;
                background:#FFFAF0;border-radius:6px;padding:6px 10px">
                💬 Admin: ${p.catatan_admin}</div>` : ''}
              <div style="font-size:11px;color:#94A3B8;margin-top:4px">
                Diajukan: ${formatTanggal(p.tanggal_pengajuan)}
              </div>
            </div>

            ${p.status === 'pending' ? `
              <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
                <button class="btn btn--secondary" style="padding:8px 16px;font-size:13px"
                  onclick="approvePengajuanFull('${p.id_pengajuan}')">✅ Setujui</button>
                <button class="btn btn--danger" style="padding:8px 16px;font-size:13px"
                  onclick="tolakPengajuanFull('${p.id_pengajuan}')">❌ Tolak</button>
              </div>` : ''}
          </div>
        </div>`;
    }).join('');
  } catch(e) { showError('pengajuan-admin-full-list', e.message); }
}

function _labelJenisPjn(j) {
  return {izin:'📝 Izin',sakit:'🏥 Sakit',cuti:'🏖️ Cuti',
          dinas_luar:'🚗 Dinas Luar',lembur:'⏰ Lembur'}[j] || j;
}

function approvePengajuanFull(id) {
  showModal('✅ Setujui Pengajuan?',
    'Absensi karyawan akan diperbarui otomatis untuk semua tanggal dalam periode pengajuan.',
    async () => {
      try {
        const r = await callAPI('approvePengajuan', { id_pengajuan: id, catatan_admin: 'Disetujui' });
        showToast(r.message, 'success');
        await loadPengajuanAdminFull('pending');
      } catch(e) { showToast(e.message, 'error'); }
    }, '✅ Setujui'
  );
}

function tolakPengajuanFull(id) {
  showModal('❌ Tolak Pengajuan?',
    `<textarea id="catatan-tolak-full" class="form-control" rows="2"
      placeholder="Alasan penolakan (opsional)" style="margin-top:8px"></textarea>`,
    async () => {
      const catatan = document.getElementById('catatan-tolak-full')?.value || 'Ditolak';
      try {
        const r = await callAPI('tolakPengajuan', { id_pengajuan: id, catatan_admin: catatan });
        showToast(r.message, 'success');
        await loadPengajuanAdminFull('pending');
      } catch(e) { showToast(e.message, 'error'); }
    }, '❌ Tolak'
  );
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD ADMIN v3 — loadDashboardAdminV3 export helper
// ─────────────────────────────────────────────────────────────
// Sudah ada di admin_pages_v3.js, tambahkan alias:
if (typeof renderUltahSection === 'undefined') {
  function renderUltahSection(ultah) {
    const el = document.getElementById('ultah-section');
    if (!el || !ultah || ultah.length === 0) return;
    el.style.display = 'block';
    el.innerHTML = `<div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">
        🎂 Ulang Tahun Hari Ini</h3>
      ${ultah.map(k => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;
          border-bottom:1px solid #F1F5F9">
          <img src="${getPhotoSrc(k.foto||'', k.nama)}"
            style="width:36px;height:36px;border-radius:50%;object-fit:cover"
            onerror="this.src='${avatarInisial(k.nama,36)}'">
          <div>
            <div style="font-weight:600;font-size:14px">${k.nama} 🎂</div>
            <div style="font-size:12px;color:#64748B">${k.jabatan||''} · Umur ${k.umur} thn</div>
          </div>
        </div>`).join('')}
    </div>`;
  }
}
