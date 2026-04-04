// ============================================================
// admin_pages.js — Halaman-Halaman Admin Lengkap (Sesi 2)
// ============================================================

// ─────────────────────────────────────────────────────────────
// ABSENSI SEMUA KARYAWAN
// ─────────────────────────────────────────────────────────────
async function renderAbsensiAdminFull(container) {
  const now = new Date();
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">📋 Absensi Karyawan</h2>
      <button class="btn btn--primary" style="font-size:13px" onclick="tampilFormAbsensiManual()">
        + Input Manual
      </button>
    </div>

    <!-- Filter -->
    <div class="card" style="padding:12px;margin-bottom:12px">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <input type="date" class="form-control" id="filter-tgl-absensi"
          value="${new Date().toISOString().split('T')[0]}" style="width:160px"
          onchange="loadAbsensiAdmin()">
        <select class="form-control" id="filter-dept-absensi" style="width:170px"
          onchange="loadAbsensiAdmin()">
          <option value="">Semua Departemen</option>
        </select>
        <button class="btn btn--secondary" style="font-size:13px" onclick="loadAbsensiAdmin()">
          🔍 Tampilkan
        </button>
        <button class="btn btn--ghost" style="font-size:13px" onclick="tampilExportAbsensi()">
          📊 Export Excel
        </button>
      </div>
    </div>

    <div class="card" style="padding:0;overflow-x:auto">
      <table class="simple-table" style="min-width:650px">
        <thead>
          <tr>
            <th>Karyawan</th><th>Jam Masuk</th><th>Jam Keluar</th>
            <th>Status</th><th>Jarak (m)</th><th>Keterangan</th><th>Aksi</th>
          </tr>
        </thead>
        <tbody id="tbody-absensi">
          <tr><td colspan="7" style="padding:32px;text-align:center;color:#94A3B8">
            Pilih tanggal untuk menampilkan data absensi
          </td></tr>
        </tbody>
      </table>
    </div>`;
}

async function loadAbsensiAdmin() {
  const tgl   = document.getElementById('filter-tgl-absensi')?.value;
  if (!tgl) return;
  const tbody = document.getElementById('tbody-absensi');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="padding:24px;text-align:center">${skeletonCard(1)}</td></tr>`;

  try {
    const tglFmt = fromInputDate(tgl);
    const data   = await callAPI('getAbsensiSemua', { tanggal: tglFmt });
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding:24px;text-align:center;color:#94A3B8">
        Tidak ada data absensi untuk ${tgl}</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(a => `
      <tr>
        <td style="padding:10px">
          <div style="font-weight:600;font-size:14px">${a.nama_karyawan||'-'}</div>
          <div style="font-size:11px;color:#64748B">${a.id_karyawan}</div>
        </td>
        <td>${a.jam_masuk||'-'}</td>
        <td>${a.jam_keluar||'-'}</td>
        <td>${badgeStatus(a.status)}</td>
        <td style="font-size:12px;color:#64748B">${a.jarak_meter_masuk||'-'}</td>
        <td style="font-size:12px;color:#64748B;max-width:120px;overflow:hidden;text-overflow:ellipsis">
          ${a.keterangan||'-'}
        </td>
        <td>
          <button class="btn btn--ghost" style="padding:5px 8px;font-size:12px"
            onclick="editAbsensiAdmin('${a.id_absensi}','${a.id_karyawan}','${a.status}')">
            ✏️
          </button>
        </td>
      </tr>`).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding:24px;text-align:center;color:#E53E3E">
      Gagal: ${e.message}</td></tr>`;
  }
}

function tampilFormAbsensiManual() {
  showModal('📝 Input Absensi Manual',
    `<div class="form-group" style="margin-top:8px">
      <label class="form-label">ID Karyawan <span class="required">*</span></label>
      <input type="text" class="form-control" id="manual-id-k" placeholder="contoh: KRY001">
    </div>
    <div class="form-group">
      <label class="form-label">Tanggal <span class="required">*</span></label>
      <input type="date" class="form-control" id="manual-tgl" value="${new Date().toISOString().split('T')[0]}">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group">
        <label class="form-label">Jam Masuk</label>
        <input type="time" class="form-control" id="manual-masuk" value="08:00">
      </div>
      <div class="form-group">
        <label class="form-label">Jam Keluar</label>
        <input type="time" class="form-control" id="manual-keluar" value="16:00">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Status <span class="required">*</span></label>
      <select class="form-control" id="manual-status">
        <option value="hadir">Hadir</option>
        <option value="terlambat">Terlambat</option>
        <option value="alfa">Alfa</option>
        <option value="izin">Izin</option>
        <option value="sakit">Sakit</option>
        <option value="cuti">Cuti</option>
        <option value="dinas_luar">Dinas Luar</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Keterangan</label>
      <input type="text" class="form-control" id="manual-ket" placeholder="Opsional">
    </div>`,
    async () => {
      try {
        const r = await callAPI('absensiManual', {
          id_karyawan: document.getElementById('manual-id-k')?.value?.trim(),
          tanggal    : fromInputDate(document.getElementById('manual-tgl')?.value),
          jam_masuk  : document.getElementById('manual-masuk')?.value,
          jam_keluar : document.getElementById('manual-keluar')?.value,
          status     : document.getElementById('manual-status')?.value,
          keterangan : document.getElementById('manual-ket')?.value
        });
        showToast(r.message, 'success');
        loadAbsensiAdmin();
      } catch(e) { showToast(e.message, 'error'); }
    }, '💾 Simpan'
  );
}

function tampilExportAbsensi() {
  const now = new Date();
  showModal('📊 Export Rekap Excel',
    `<div class="form-group" style="margin-top:8px">
      <label class="form-label">Bulan</label>
      <select class="form-control" id="exp-bulan">
        ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Tahun</label>
      <input type="number" class="form-control" id="exp-tahun" value="${now.getFullYear()}" min="2020">
    </div>`,
    async () => {
      const b = document.getElementById('exp-bulan')?.value;
      const t = document.getElementById('exp-tahun')?.value;
      await exportRekapExcel(b, t);
    }, '📊 Download Excel'
  );
}

// ─────────────────────────────────────────────────────────────
// SP ADMIN — Tabel + Tambah Manual + Cetak PDF
// ─────────────────────────────────────────────────────────────
async function renderSPAdminFull(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <h2 style="font-size:17px;font-weight:700;margin:0">⚠️ Surat Peringatan</h2>
      <button class="btn btn--primary" style="font-size:13px" onclick="tampilFormTambahSP()">
        + Tambah SP Manual
      </button>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn btn--primary" id="sp-tab-aktif" onclick="loadSPAdmin('aktif')">SP Aktif</button>
      <button class="btn btn--ghost" id="sp-tab-semua" onclick="loadSPAdmin('semua')">Semua SP</button>
    </div>

    <div id="sp-admin-list">${skeletonCard(3)}</div>`;

  await loadSPAdmin('aktif');
}

async function loadSPAdmin(filter = 'aktif') {
  const el = document.getElementById('sp-admin-list');
  if (!el) return;
  el.innerHTML = skeletonCard(3);

  try {
    const data = await callAPI('getSPSemua', {});
    let filtered = data || [];
    if (filter === 'aktif') filtered = filtered.filter(s => s.status_aktif === 'true');

    if (filtered.length === 0) { showEmpty('sp-admin-list', 'Tidak ada SP ' + filter); return; }

    el.innerHTML = filtered.map(s => `
      <div class="card" style="border-left:4px solid ${s.jenis_sp==='SP3'?'#E53E3E':s.jenis_sp==='SP2'?'#D97706':'#6C63FF'}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="background:${s.jenis_sp==='SP3'?'#FFF5F5':'#FFFAF0'};
                color:${s.jenis_sp==='SP3'?'#C53030':'#C05621'};border:1px solid currentColor;
                padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700">${s.jenis_sp}</span>
              <span style="font-weight:700;font-size:15px">${s.nama_karyawan}</span>
            </div>
            <div style="font-size:12px;color:#64748B;margin-bottom:4px">
              📅 ${formatTanggal(s.tanggal_sp)} |
              Berlaku: ${formatTanggal(s.tanggal_berlaku)} – ${formatTanggal(s.tanggal_kadaluarsa)}
            </div>
            <div style="font-size:12px;color:#64748B">${s.alasan}</div>
            <div style="font-size:11px;color:#94A3B8;margin-top:4px">
              Total alfa: ${s.total_hari_alfa_pemicu} hari |
              Status: ${s.status_aktif==='true'?'✅ Aktif':'⏹ Kadaluarsa'}
            </div>
          </div>
          <button class="btn btn--outline" style="font-size:13px;padding:8px 14px;color:#E53E3E;border-color:#E53E3E"
            onclick="cetakSuratSP('${s.id_sp}')">
            🖨️ Cetak PDF
          </button>
        </div>
      </div>`).join('');
  } catch(e) { showError('sp-admin-list', e.message); }
}

function tampilFormTambahSP() {
  showModal('⚠️ Tambah SP Manual',
    `<div class="form-group" style="margin-top:8px">
      <label class="form-label">ID Karyawan *</label>
      <input type="text" class="form-control" id="sp-id-k" placeholder="Contoh: KRY001">
    </div>
    <div class="form-group">
      <label class="form-label">Jenis SP *</label>
      <select class="form-control" id="sp-jenis">
        <option value="SP1">SP1 (Berlaku 1 bulan)</option>
        <option value="SP2">SP2 (Berlaku 2 bulan)</option>
        <option value="SP3">SP3 (Berlaku 3 bulan)</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Alasan *</label>
      <textarea class="form-control" id="sp-alasan" rows="3"
        placeholder="Jelaskan alasan pemberian SP..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Total Hari Alfa Pemicu</label>
      <input type="number" class="form-control" id="sp-alfa" value="3" min="0">
    </div>`,
    async () => {
      try {
        const r = await callAPI('tambahSP', {
          id_karyawan         : document.getElementById('sp-id-k')?.value?.trim(),
          jenis_sp            : document.getElementById('sp-jenis')?.value,
          alasan              : document.getElementById('sp-alasan')?.value?.trim(),
          total_hari_alfa     : document.getElementById('sp-alfa')?.value
        });
        showToast(r.message, 'success');
        await loadSPAdmin('aktif');
      } catch(e) { showToast(e.message, 'error'); }
    }, '⚠️ Tambah SP'
  );
}

// ─────────────────────────────────────────────────────────────
// LEMBUR ADMIN — Approve, Tolak, Rekap, Kwitansi
// ─────────────────────────────────────────────────────────────
async function renderLemburAdminFull(container) {
  const now = new Date();
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <h2 style="font-size:17px;font-weight:700;margin:0">🕒 Manajemen Lembur</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn--ghost" style="font-size:13px" onclick="tampilExportLembur()">📊 Export</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn btn--primary" onclick="loadLemburAdmin('pending')">Pending</button>
      <button class="btn btn--ghost"   onclick="loadLemburAdmin('disetujui')">Disetujui</button>
      <button class="btn btn--ghost"   onclick="loadLemburAdmin('')">Semua</button>
    </div>
    <div id="lembur-admin-list">${skeletonCard(3)}</div>`;
  await loadLemburAdmin('pending');
}

async function loadLemburAdmin(status='pending') {
  const el = document.getElementById('lembur-admin-list');
  if (!el) return;
  el.innerHTML = skeletonCard(3);
  try {
    const data = await callAPI('getLemburSemua', {});
    let filtered = data || [];
    if (status) filtered = filtered.filter(l =>
      status === 'pending' ? (l.status_bayar !== 'disetujui' && l.status_bayar !== 'ditolak')
                           : l.status_bayar === status
    );
    if (filtered.length === 0) { showEmpty('lembur-admin-list','Tidak ada data'); return; }

    el.innerHTML = filtered.map(l => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div style="flex:1">
            <div style="font-weight:700;font-size:15px;margin-bottom:4px">${l.nama_karyawan}</div>
            <div style="font-size:13px;color:#64748B">
              📅 ${formatTanggal(l.tanggal)} · 🕐 ${l.jam_mulai}–${l.jam_selesai} (${l.total_jam} jam)
            </div>
            <div style="font-size:14px;color:#1A9E74;font-weight:600;margin-top:4px">
              ${formatRupiah(l.total_bayar)}
            </div>
            ${l.catatan ? `<div style="font-size:12px;color:#94A3B8;margin-top:4px">${l.catatan}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            ${badgeStatus(l.status_bayar||'pending')}
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${l.status_bayar!=='disetujui' && l.status_bayar!=='ditolak' ? `
                <button class="btn btn--secondary" style="padding:7px 12px;font-size:12px"
                  onclick="approveLemburAdmin('${l.id_lembur}')">✅ Setujui</button>
                <button class="btn btn--danger" style="padding:7px 12px;font-size:12px"
                  onclick="tolakLemburAdmin('${l.id_lembur}')">❌ Tolak</button>` : ''}
              ${l.status_bayar==='disetujui' ? `
                <button class="btn btn--outline" style="padding:7px 12px;font-size:12px"
                  onclick="cetakKwitansiLembur('${l.id_lembur}')">🧾 Kwitansi</button>` : ''}
            </div>
          </div>
        </div>
      </div>`).join('');
  } catch(e) { showError('lembur-admin-list', e.message); }
}

function approveLemburAdmin(id) {
  showModal('✅ Setujui Lembur?','Setujui pengajuan lembur ini?',
    async () => {
      try {
        const r = await callAPI('approveLembur', {id_lembur:id});
        showToast(r.message,'success');
        await loadLemburAdmin('pending');
      } catch(e) { showToast(e.message,'error'); }
    }, '✅ Setujui'
  );
}

function tolakLemburAdmin(id) {
  showModal('❌ Tolak Lembur?','Tolak pengajuan lembur ini?',
    async () => {
      try {
        const r = await callAPI('tolakLembur', {id_lembur:id});
        showToast(r.message,'success');
        await loadLemburAdmin('pending');
      } catch(e) { showToast(e.message,'error'); }
    }, '❌ Tolak'
  );
}

function tampilExportLembur() {
  const now = new Date();
  showModal('📊 Export Rekap Lembur',
    `<div class="form-group" style="margin-top:8px">
      <label class="form-label">Bulan</label>
      <select class="form-control" id="lb-exp-bulan">
        ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Tahun</label>
      <input type="number" class="form-control" id="lb-exp-tahun" value="${now.getFullYear()}">
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn--primary" style="flex:1" onclick="document.getElementById('modal-overlay').remove();cetakRekapLemburPDF(document.getElementById('lb-exp-bulan').value,document.getElementById('lb-exp-tahun').value)">
        📄 PDF
      </button>
      <button class="btn btn--secondary" style="flex:1" onclick="document.getElementById('modal-overlay').remove();exportRekapLemburExcel(document.getElementById('lb-exp-bulan').value,document.getElementById('lb-exp-tahun').value)">
        📊 Excel
      </button>
    </div>`,
    null, ''
  );
}

// ─────────────────────────────────────────────────────────────
// PENGUMUMAN ADMIN
// ─────────────────────────────────────────────────────────────
async function renderPengumumanAdminFull(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <h2 style="font-size:17px;font-weight:700;margin:0">📢 Manajemen Pengumuman</h2>
      <button class="btn btn--primary" style="font-size:13px" onclick="tampilFormPengumuman(null)">
        + Tambah Pengumuman
      </button>
    </div>
    <div id="pengumuman-admin-list">${skeletonCard(3)}</div>`;
  await loadPengumumanAdmin();
}

async function loadPengumumanAdmin() {
  const el = document.getElementById('pengumuman-admin-list');
  if (!el) return;
  el.innerHTML = skeletonCard(3);
  try {
    const data = await callAPI('getPengumuman', {});
    if (!data||data.length===0) { showEmpty('pengumuman-admin-list','Belum ada pengumuman'); return; }
    el.innerHTML = data.map(p => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span class="pengumuman-card__badge badge--${p.prioritas}">${p.prioritas}</span>
              <span style="font-weight:700;font-size:15px">${p.judul}</span>
            </div>
            <div style="font-size:13px;color:#475569;line-height:1.5;margin-bottom:6px">
              ${(p.isi||'').substring(0,120)}${p.isi?.length>120?'...':''}
            </div>
            <div style="font-size:11px;color:#94A3B8">
              📅 ${formatTanggal(p.tanggal_mulai)} – ${formatTanggal(p.tanggal_selesai)} |
              Target: ${p.target} | Oleh: ${p.dibuat_oleh}
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn--ghost" style="padding:6px 10px;font-size:12px"
              onclick="tampilFormPengumuman('${p.id_pengumuman}')">✏️ Edit</button>
            <button class="btn" style="padding:6px 10px;font-size:12px;background:#FFF5F5;color:#E53E3E;border:1px solid #FC8181"
              onclick="hapusPengumumanAdmin('${p.id_pengumuman}')">🗑️</button>
          </div>
        </div>
      </div>`).join('');
  } catch(e) { showError('pengumuman-admin-list', e.message); }
}

function tampilFormPengumuman(idEdit) {
  const modal = document.createElement('div');
  modal.id    = 'modal-pengumuman';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)';
  const today = new Date().toISOString().split('T')[0];
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:500px;
      max-height:90vh;overflow-y:auto;animation:fadeInScale 0.2s ease">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0">${idEdit?'✏️ Edit':'➕ Tambah'} Pengumuman</h3>
        <button onclick="document.getElementById('modal-pengumuman').remove()"
          style="background:#F1F5F9;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>
      </div>
      <div class="form-group">
        <label class="form-label">Judul *</label>
        <input type="text" class="form-control" id="peng-judul" placeholder="Judul pengumuman">
      </div>
      <div class="form-group">
        <label class="form-label">Isi Pengumuman *</label>
        <textarea class="form-control" id="peng-isi" rows="4"
          placeholder="Tulis isi pengumuman..."></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label class="form-label">Prioritas</label>
          <select class="form-control" id="peng-prioritas">
            <option value="normal">Normal</option>
            <option value="penting">Penting</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Target</label>
          <select class="form-control" id="peng-target">
            <option value="semua">Semua Karyawan</option>
            <option value="departemen">Per Departemen</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tanggal Mulai *</label>
          <input type="date" class="form-control" id="peng-mulai" value="${today}">
        </div>
        <div class="form-group">
          <label class="form-label">Tanggal Selesai *</label>
          <input type="date" class="form-control" id="peng-selesai" value="${new Date(Date.now()+30*86400000).toISOString().split('T')[0]}">
        </div>
      </div>
      <button class="btn btn--primary btn--full" onclick="submitPengumumanAdmin('${idEdit||''}')">
        <div class="spinner-btn"></div>
        <span class="btn-text">💾 Simpan Pengumuman</span>
      </button>
    </div>`;
  document.body.appendChild(modal);
}

async function submitPengumumanAdmin(idEdit) {
  const btn = document.querySelector('#modal-pengumuman .btn--primary');
  if (btn) { btn.disabled=true; btn.classList.add('loading'); }
  try {
    const payload = {
      judul          : document.getElementById('peng-judul')?.value?.trim(),
      isi            : document.getElementById('peng-isi')?.value?.trim(),
      prioritas      : document.getElementById('peng-prioritas')?.value,
      target         : document.getElementById('peng-target')?.value,
      tanggal_mulai  : fromInputDate(document.getElementById('peng-mulai')?.value),
      tanggal_selesai: fromInputDate(document.getElementById('peng-selesai')?.value)
    };
    if (!payload.judul||!payload.isi) throw new Error('Judul dan isi wajib diisi');
    const action = idEdit ? 'editPengumuman' : 'tambahPengumuman';
    if (idEdit) payload.id_pengumuman = idEdit;
    const r = await callAPI(action, payload);
    document.getElementById('modal-pengumuman')?.remove();
    showToast(r.message||'Pengumuman disimpan ✅','success');
    await loadPengumumanAdmin();
  } catch(e) {
    showToast(e.message,'error');
  } finally {
    if (btn) { btn.disabled=false; btn.classList.remove('loading'); }
  }
}

function hapusPengumumanAdmin(id) {
  showModal('🗑️ Hapus Pengumuman?','Pengumuman akan dihapus permanen.',
    async () => {
      const r = await callAPI('hapusPengumuman',{id_pengumuman:id});
      showToast(r.message,'success');
      await loadPengumumanAdmin();
    }, '🗑️ Hapus'
  );
}

// ─────────────────────────────────────────────────────────────
// LOKASI KANTOR ADMIN
// ─────────────────────────────────────────────────────────────
async function renderLokasiAdminFull(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <h2 style="font-size:17px;font-weight:700;margin:0">📍 Lokasi Kantor & Radius GPS</h2>
      <button class="btn btn--primary" style="font-size:13px" onclick="tampilFormLokasi(null)">
        + Tambah Lokasi
      </button>
    </div>
    <div class="card" style="padding:12px;background:#EFF6FF;margin-bottom:12px">
      <p style="font-size:13px;color:#2D6CDF;margin:0">
        💡 Cari koordinat di <a href="https://maps.google.com" target="_blank">Google Maps</a>
        → klik titik lokasi → salin angka koordinat yang muncul.
        Contoh: <strong>-1.2345, 116.5678</strong>
      </p>
    </div>
    <div id="lokasi-admin-list">${skeletonCard(2)}</div>`;
  await loadLokasiAdmin();
}

async function loadLokasiAdmin() {
  const el = document.getElementById('lokasi-admin-list');
  if (!el) return;
  try {
    const data = await callAPI('getLokasi', {});
    if (!data||data.length===0) { showEmpty('lokasi-admin-list','Belum ada lokasi'); return; }
    el.innerHTML = data.map(l => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div style="flex:1">
            <div style="font-weight:700;font-size:15px;margin-bottom:4px">
              📍 ${l.nama_lokasi}
              <span style="background:${l.status_aktif==='true'?'#EBF8EE':'#F1F5F9'};
                color:${l.status_aktif==='true'?'#1A9E74':'#94A3B8'};font-size:11px;
                padding:2px 8px;border-radius:10px;font-weight:600;margin-left:6px">
                ${l.status_aktif==='true'?'Aktif':'Non-aktif'}
              </span>
            </div>
            <div style="font-size:13px;color:#64748B;margin-bottom:2px">
              🌐 Koordinat: ${l.latitude}, ${l.longitude}
            </div>
            <div style="font-size:13px;color:#2D6CDF;font-weight:600">
              ⭕ Radius: ${l.radius_meter} meter
            </div>
            ${l.keterangan ? `<div style="font-size:12px;color:#94A3B8;margin-top:4px">${l.keterangan}</div>` : ''}
            <a href="https://maps.google.com/?q=${l.latitude},${l.longitude}" target="_blank"
              style="font-size:12px;color:#2D6CDF;margin-top:4px;display:inline-block">
              🗺️ Lihat di Google Maps
            </a>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn--ghost" style="padding:7px 12px;font-size:12px"
              onclick="tampilFormLokasi(${JSON.stringify(l).replace(/"/g,"'")})">✏️ Edit</button>
          </div>
        </div>
      </div>`).join('');
  } catch(e) { showError('lokasi-admin-list', e.message); }
}

function tampilFormLokasi(lokasiData) {
  const isEdit = !!lokasiData?.id_lokasi;
  showModal(
    isEdit ? '✏️ Edit Lokasi Kantor' : '➕ Tambah Lokasi Kantor',
    `<div style="margin-top:8px">
      <div class="form-group">
        <label class="form-label">Nama Lokasi *</label>
        <input type="text" class="form-control" id="lok-nama"
          value="${lokasiData?.nama_lokasi||''}" placeholder="Contoh: Kantor Pusat">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label class="form-label">Latitude *</label>
          <input type="text" class="form-control" id="lok-lat"
            value="${lokasiData?.latitude||''}" placeholder="-5.1477">
        </div>
        <div class="form-group">
          <label class="form-label">Longitude *</label>
          <input type="text" class="form-control" id="lok-lon"
            value="${lokasiData?.longitude||''}" placeholder="119.4328">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Radius Absensi (meter) *</label>
        <input type="number" class="form-control" id="lok-radius"
          value="${lokasiData?.radius_meter||100}" min="10" max="5000">
        <p class="form-hint">Jarak maksimal karyawan dari titik kantor saat absen. Rekomendasi: 50–200 meter.</p>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="lok-status">
          <option value="true"  ${lokasiData?.status_aktif==='true' ?'selected':''}>Aktif</option>
          <option value="false" ${lokasiData?.status_aktif==='false'?'selected':''}>Non-aktif</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Keterangan</label>
        <input type="text" class="form-control" id="lok-ket" value="${lokasiData?.keterangan||''}">
      </div>
    </div>`,
    async () => {
      const payload = {
        nama_lokasi : document.getElementById('lok-nama')?.value?.trim(),
        latitude    : document.getElementById('lok-lat')?.value?.trim(),
        longitude   : document.getElementById('lok-lon')?.value?.trim(),
        radius_meter: document.getElementById('lok-radius')?.value,
        status_aktif: document.getElementById('lok-status')?.value,
        keterangan  : document.getElementById('lok-ket')?.value?.trim()
      };
      if (!payload.nama_lokasi||!payload.latitude||!payload.longitude)
        throw new Error('Nama, latitude, longitude wajib diisi');
      if (isEdit) payload.id_lokasi = lokasiData.id_lokasi;
      const r = await callAPI(isEdit ? 'editLokasi' : 'tambahLokasi', payload);
      showToast(r.message||'Lokasi disimpan ✅','success');
      await loadLokasiAdmin();
    }, '💾 Simpan Lokasi'
  );
}

// ─────────────────────────────────────────────────────────────
// PENGATURAN SISTEM ADMIN
// ─────────────────────────────────────────────────────────────
async function renderPengaturanAdminFull(container) {
  container.innerHTML = `
    <h2 style="font-size:17px;font-weight:700;margin-bottom:16px">⚙️ Pengaturan Sistem</h2>
    <div id="pengaturan-container">${skeletonCard(5)}</div>`;
  await loadPengaturanAdmin();
}

async function loadPengaturanAdmin() {
  const el = document.getElementById('pengaturan-container');
  if (!el) return;
  try {
    const data = await callAPI('getAllSetting', {});
    if (!data) return;
    const map = {};
    data.forEach(s => { map[s.key] = s.value; });

    el.innerHTML = `
      <div id="pengaturan-error" style="display:none;background:#FFF5F5;border:1px solid #FC8181;
        border-radius:8px;padding:12px;color:#C53030;font-size:13px;margin-bottom:12px"></div>

      <!-- Identitas Instansi -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.6px;margin-bottom:16px">
          🏢 Identitas Instansi
        </h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${settingInput('nama_instansi','Nama Instansi',map)}
          ${settingInput('singkatan_instansi','Singkatan',map)}
          ${settingInput('alamat_instansi','Alamat',map)}
          ${settingInput('telepon_instansi','Telepon',map)}
          ${settingInput('email_instansi','Email',map,'email')}
          ${settingInput('website_instansi','Website',map,'url')}
          ${settingInput('tahun_berdiri','Tahun Berdiri',map,'number')}
          ${settingInput('footer_text','Teks Footer',map)}
        </div>
      </div>

      <!-- Tampilan & Branding -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.6px;margin-bottom:16px">
          🎨 Tampilan & Branding
        </h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${settingColorInput('warna_primer','Warna Primer',map)}
          ${settingColorInput('warna_sekunder','Warna Sekunder',map)}
          ${settingInput('logo_url','URL Logo (Google Drive)',map,'url')}
          ${settingInput('bg_dashboard_karyawan_url','BG Karyawan URL',map,'url')}
          ${settingInput('bg_dashboard_admin_url','BG Admin URL',map,'url')}
          ${settingInput('bg_dashboard_superadmin_url','BG SuperAdmin URL',map,'url')}
        </div>
      </div>

      <!-- Kebijakan Kehadiran -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.6px;margin-bottom:16px">
          📋 Kebijakan Kehadiran
        </h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${settingInput('max_radius_meter','Radius GPS Maks (meter)',map,'number')}
          ${settingInput('toleransi_terlambat_default','Toleransi Terlambat (menit)',map,'number')}
          ${settingInput('sisa_cuti_default_per_tahun','Default Cuti Per Tahun (hari)',map,'number')}
        </div>
        <div class="form-group" style="margin-top:12px">
          <label class="form-label">Template Ucapan Ulang Tahun</label>
          <textarea class="form-control" id="set-ucapan_ulang_tahun_template" rows="3">${map['ucapan_ulang_tahun_template']||''}</textarea>
          <p class="form-hint">Gunakan {nama} dan {umur} sebagai placeholder</p>
        </div>
        <div class="form-group">
          <label class="form-label">One-Device Login</label>
          <select class="form-control" id="set-aktif_one_device_login">
            <option value="true"  ${map['aktif_one_device_login']==='true' ?'selected':''}>✅ Aktif — Satu akun hanya bisa login dari satu HP</option>
            <option value="false" ${map['aktif_one_device_login']==='false'?'selected':''}>❌ Nonaktif — Bebas login dari mana saja</option>
          </select>
        </div>
      </div>

      <button class="btn btn--primary btn--lg" onclick="simpanSemuaPengaturan()">
        <div class="spinner-btn"></div>
        <span class="btn-text">💾 Simpan Semua Pengaturan</span>
      </button>`;
  } catch(e) { showError('pengaturan-container', e.message); }
}

function settingInput(key, label, map, type='text') {
  return `<div class="form-group" style="margin-bottom:0">
    <label class="form-label">${label}</label>
    <input type="${type}" class="form-control" id="set-${key}" value="${map[key]||''}">
  </div>`;
}

function settingColorInput(key, label, map) {
  const val = map[key]||'#2D6CDF';
  return `<div class="form-group" style="margin-bottom:0">
    <label class="form-label">${label}</label>
    <div style="display:flex;gap:8px;align-items:center">
      <input type="color" id="set-${key}-color" value="${val}"
        style="width:44px;height:38px;border:1px solid #E2E8F0;border-radius:6px;cursor:pointer;padding:2px"
        oninput="document.getElementById('set-${key}').value=this.value">
      <input type="text" class="form-control" id="set-${key}" value="${val}"
        style="flex:1" oninput="document.getElementById('set-${key}-color').value=this.value">
    </div>
  </div>`;
}

async function simpanSemuaPengaturan() {
  const btn = document.querySelector('.admin-content .btn--primary');
  if (btn) { btn.disabled=true; btn.classList.add('loading'); }
  const err = document.getElementById('pengaturan-error');
  if (err) err.style.display = 'none';

  try {
    const keys = [
      'nama_instansi','singkatan_instansi','alamat_instansi','telepon_instansi',
      'email_instansi','website_instansi','tahun_berdiri','footer_text',
      'warna_primer','warna_sekunder','logo_url',
      'bg_dashboard_karyawan_url','bg_dashboard_admin_url','bg_dashboard_superadmin_url',
      'max_radius_meter','toleransi_terlambat_default','sisa_cuti_default_per_tahun',
      'ucapan_ulang_tahun_template','aktif_one_device_login'
    ];

    const settings = {};
    keys.forEach(k => {
      const el = document.getElementById('set-' + k);
      if (el) settings[k] = el.value?.trim();
    });

    await callAPI('setMultipleSetting', { settings });
    showToast('Pengaturan berhasil disimpan! ✅ Refresh halaman untuk melihat perubahan.', 'success', 5000);
    resetBrandingCache();
    await loadBranding(getSession()?.role || 'admin');
  } catch(e) {
    if (err) { err.style.display='block'; err.textContent='⚠️ '+e.message; }
    else showToast(e.message,'error');
  } finally {
    if (btn) { btn.disabled=false; btn.classList.remove('loading'); }
  }
}

// ─────────────────────────────────────────────────────────────
// LAPORAN ADMIN — Per Karyawan + Semua
// ─────────────────────────────────────────────────────────────
async function renderLaporanAdmin(container) {
  container.innerHTML = `
    <h2 style="font-size:17px;font-weight:700;margin-bottom:16px">📊 Laporan & Rekap</h2>

    <div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">📄 Rekap Per Karyawan (PDF)</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
        <div class="form-group">
          <label class="form-label">ID Karyawan</label>
          <input type="text" class="form-control" id="lap-id-k" placeholder="Contoh: KRY001">
        </div>
        <div class="form-group">
          <label class="form-label">Bulan</label>
          <select class="form-control" id="lap-bulan">
            ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===new Date().getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tahun</label>
          <input type="number" class="form-control" id="lap-tahun" value="${new Date().getFullYear()}">
        </div>
      </div>
      <button class="btn btn--primary" onclick="cetakRekapDariLaporan()">
        📄 Cetak PDF Rekap
      </button>
    </div>

    <div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">📊 Rekap Semua Karyawan (Excel)</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <select class="form-control" id="lap-all-bulan" style="width:160px">
          ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===new Date().getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
        </select>
        <input type="number" class="form-control" id="lap-all-tahun" value="${new Date().getFullYear()}" style="width:100px">
        <button class="btn btn--secondary" onclick="exportSemua()">📊 Export Excel</button>
      </div>
    </div>

    <div class="card">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">🧾 Rekap Lembur</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <select class="form-control" id="lap-lb-bulan" style="width:160px">
          ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i===new Date().getMonth()?'selected':''}>${bulanNama(i+1)}</option>`).join('')}
        </select>
        <input type="number" class="form-control" id="lap-lb-tahun" value="${new Date().getFullYear()}" style="width:100px">
        <button class="btn btn--primary"   onclick="exportLemburPDF()">📄 PDF</button>
        <button class="btn btn--secondary" onclick="exportLemburExcel()">📊 Excel</button>
      </div>
    </div>`;
}

async function cetakRekapDariLaporan() {
  const id = document.getElementById('lap-id-k')?.value?.trim();
  const b  = document.getElementById('lap-bulan')?.value;
  const t  = document.getElementById('lap-tahun')?.value;
  if (!id) { showToast('Masukkan ID karyawan','warning'); return; }
  await cetakRekapPDF(id, b, t);
}

function exportSemua() {
  const b = document.getElementById('lap-all-bulan')?.value;
  const t = document.getElementById('lap-all-tahun')?.value;
  exportRekapExcel(b, t);
}

function exportLemburPDF() {
  const b = document.getElementById('lap-lb-bulan')?.value;
  const t = document.getElementById('lap-lb-tahun')?.value;
  cetakRekapLemburPDF(b, t);
}

function exportLemburExcel() {
  const b = document.getElementById('lap-lb-bulan')?.value;
  const t = document.getElementById('lap-lb-tahun')?.value;
  exportRekapLemburExcel(b, t);
}
