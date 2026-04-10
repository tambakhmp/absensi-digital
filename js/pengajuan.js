// ============================================================
// pengajuan.js — Izin, Sakit, Cuti, Dinas Luar (mulai-selesai)
// ============================================================

async function loadHalamanPengajuan() {
  await loadPengajuanSaya();
}

async function loadPengajuanSaya() {
  const el = document.getElementById('pengajuan-list');
  if (!el) return;
  el.innerHTML = skeletonCard(3);

  try {
    const data = await callAPI('getPengajuanSaya', {});
    if (!data || data.length === 0) {
      showEmpty('pengajuan-list', 'Belum ada pengajuan');
      return;
    }
    el.innerHTML = data.slice(0,20).map(p => `
      <div class="pengajuan-item">
        <div class="pengajuan-item__header">
          <span class="pengajuan-item__jenis">${labelJenis(p.jenis)}</span>
          ${badgeStatus(p.status)}
        </div>
        <div class="pengajuan-item__detail">
          📅 ${formatTanggal(p.tanggal_mulai)}
          ${p.tanggal_selesai !== p.tanggal_mulai ? ' – ' + formatTanggal(p.tanggal_selesai) : ''}
          · <strong>${p.total_hari} hari</strong>
        </div>
        <div style="font-size:12px;color:#64748B;margin-top:4px">${p.keterangan||''}</div>
        ${p.catatan_admin ? `<div style="font-size:12px;color:#D97706;margin-top:4px">
          💬 Admin: ${p.catatan_admin}</div>` : ''}
        ${p.status === 'pending' ? `<button onclick="batalPengajuanKu('${p.id_pengajuan}')"
          style="margin-top:8px;font-size:12px;color:#E53E3E;background:none;border:none;
          cursor:pointer;padding:0">✕ Batalkan pengajuan</button>` : ''}
      </div>`).join('');
  } catch(e) {
    showError('pengajuan-list', e.message);
  }
}

function labelJenis(jenis) {
  return { izin:'📝 Izin', sakit:'🏥 Sakit', cuti:'🏖️ Cuti', dinas_luar:'🚗 Dinas Luar', lembur:'⏰ Lembur' }[jenis] || jenis;
}

function tampilFormPengajuan(jenis = '') {
  const modal = document.createElement('div');
  modal.id = 'modal-pengajuan';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;
    display:flex;align-items:flex-end;padding:0;backdrop-filter:blur(4px)`;

  const todayInputVal = new Date().toISOString().split('T')[0];

  // Hitung sisa cuti (akan di-load async)
  const sisaCutiEl = jenis === 'cuti'
    ? `<div id="info-sisa-cuti" style="background:#EBF8EE;border-radius:8px;padding:10px;
        font-size:13px;color:#1A9E74;margin-bottom:12px">⏳ Mengecek sisa cuti...</div>` : '';

  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;padding:24px;width:100%;
      max-height:90vh;overflow-y:auto;animation:slideUp 0.3s ease">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <h3 style="font-size:17px;font-weight:700;margin:0">
          ${labelJenis(jenis)} · Buat Pengajuan</h3>
        <button onclick="document.getElementById('modal-pengajuan').remove()"
          style="background:#F1F5F9;border:none;border-radius:50%;width:32px;height:32px;
          font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
      </div>

      <div id="form-error-msg" style="display:none;background:#FFF5F5;border:1px solid #FC8181;
        border-radius:8px;padding:10px;color:#C53030;font-size:13px;margin-bottom:12px"></div>

      ${sisaCutiEl}

      <div style="display:none"><input type="hidden" id="pjn-jenis" value="${jenis}"></div>

      <div class="form-group">
        <label class="form-label">Jenis Pengajuan <span class="required">*</span></label>
        <select class="form-control" id="pjn-jenis-select" onchange="onJenisChange(this.value)">
          <option value="izin"       ${jenis==='izin'       ?'selected':''}>📝 Izin</option>
          <option value="sakit"      ${jenis==='sakit'      ?'selected':''}>🏥 Sakit</option>
          <option value="cuti"       ${jenis==='cuti'       ?'selected':''}>🏖️ Cuti</option>
          <option value="dinas_luar" ${jenis==='dinas_luar' ?'selected':''}>🚗 Dinas Luar</option>
        </select>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label class="form-label">Tanggal Mulai <span class="required">*</span></label>
          <input type="date" class="form-control" id="pjn-mulai" value="${todayInputVal}"
            min="${todayInputVal}" onchange="hitungTotalHari()">
        </div>
        <div class="form-group">
          <label class="form-label">Tanggal Selesai <span class="required">*</span></label>
          <input type="date" class="form-control" id="pjn-selesai" value="${todayInputVal}"
            min="${todayInputVal}" onchange="hitungTotalHari()">
        </div>
      </div>

      <div id="info-total-hari" style="background:#EFF6FF;border-radius:8px;padding:10px;
        font-size:13px;color:#2D6CDF;margin-bottom:12px;font-weight:600">
        📅 Total: 1 hari
      </div>

      <div class="form-group">
        <label class="form-label">Alasan / Keterangan <span class="required">*</span></label>
        <textarea class="form-control" id="pjn-keterangan" rows="3"
          placeholder="Tuliskan alasan pengajuan..."></textarea>
      </div>

      <div class="form-group" id="grup-file-sakit" style="${jenis==='sakit'?'':'display:none'}">
        <label class="form-label">Surat Sakit / Dokter <span class="required">*</span></label>
        <input type="file" class="form-control" id="pjn-file" accept="image/*,.pdf">
        <p class="form-hint">Wajib untuk pengajuan sakit. Foto/scan surat dokter.</p>
      </div>

      <button class="btn btn--primary btn--full btn--lg" onclick="submitPengajuanKaryawan()">
        <div class="spinner-btn"></div>
        <span class="btn-text">📤 Kirim Pengajuan</span>
      </button>

      <p style="font-size:12px;color:#94A3B8;text-align:center;margin-top:10px">
        Pengajuan akan diproses oleh admin dalam 1×24 jam kerja
      </p>
    </div>`;

  document.body.appendChild(modal);

  // Load sisa cuti jika jenis cuti
  if (jenis === 'cuti') loadSisaCutiInfo();
}

function onJenisChange(val) {
  const grupFile = document.getElementById('grup-file-sakit');
  if (grupFile) grupFile.style.display = val === 'sakit' ? 'block' : 'none';
  if (val === 'cuti') {
    const sisaEl = document.getElementById('info-sisa-cuti');
    if (!sisaEl) {
      const ref = document.getElementById('info-total-hari');
      if (ref) {
        const div = document.createElement('div');
        div.id = 'info-sisa-cuti';
        div.style.cssText = 'background:#EBF8EE;border-radius:8px;padding:10px;font-size:13px;color:#1A9E74;margin-bottom:12px';
        div.textContent = '⏳ Mengecek sisa cuti...';
        ref.before(div);
        loadSisaCutiInfo();
      }
    }
  }
}

async function loadSisaCutiInfo() {
  // Hitung dari pengajuan yang disetujui di tahun ini
  try {
    const user   = getSession();
    const data   = await callAPI('getPengajuanSaya', {});
    const tahun  = new Date().getFullYear();
    const cuti   = (data||[]).filter(p => p.jenis === 'cuti' && p.status === 'disetujui' &&
                   String(p.tanggal_mulai||'').includes('/' + tahun));
    const terpakai = cuti.reduce((s,p) => s + parseInt(p.total_hari||0), 0);
    const defaultCuti = 12; // bisa dari setting
    const sisa   = Math.max(0, defaultCuti - terpakai);
    const el     = document.getElementById('info-sisa-cuti');
    if (el) el.innerHTML = `🏖️ Sisa cuti tahun ini: <strong>${sisa} hari</strong> dari ${defaultCuti} hari`;
  } catch(e) {}
}

function hitungTotalHari() {
  const mulai   = document.getElementById('pjn-mulai')?.value;
  const selesai = document.getElementById('pjn-selesai')?.value;
  const el      = document.getElementById('info-total-hari');
  if (!mulai || !selesai || !el) return;

  const d1   = new Date(mulai);
  const d2   = new Date(selesai);
  const diff = Math.max(1, Math.round((d2-d1)/(1000*60*60*24)) + 1);
  el.textContent = `📅 Total: ${diff} hari (${formatTanggalInput(mulai)} – ${formatTanggalInput(selesai)})`;
}

function formatTanggalInput(yyyy) {
  if (!yyyy) return '';
  const p = yyyy.split('-');
  return `${p[2]}/${p[1]}/${p[0]}`;
}

async function submitPengajuanKaryawan() {
  const btn = document.querySelector('#modal-pengajuan .btn--primary');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }

  const errEl = document.getElementById('form-error-msg');
  if (errEl) errEl.style.display = 'none';

  try {
    const jenis       = document.getElementById('pjn-jenis-select')?.value;
    const mulai       = document.getElementById('pjn-mulai')?.value;
    const selesai     = document.getElementById('pjn-selesai')?.value;
    const keterangan  = document.getElementById('pjn-keterangan')?.value?.trim();
    const fileInput   = document.getElementById('pjn-file');

    if (!jenis)      throw new Error('Pilih jenis pengajuan');
    if (!mulai)      throw new Error('Tanggal mulai wajib diisi');
    if (!selesai)    throw new Error('Tanggal selesai wajib diisi');
    if (mulai > selesai) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai');
    if (!keterangan) throw new Error('Keterangan / alasan wajib diisi');

    if (jenis === 'sakit' && (!fileInput || !fileInput.files[0])) {
      throw new Error('Surat sakit wajib dilampirkan');
    }

    // Upload file jika ada
    let fileUrl = '';
    if (fileInput?.files[0]) {
      const file     = fileInput.files[0];
      const b64      = await fileToBase64(file);
      const uploaded = await callAPI('simpanFilePendukung', { base64: b64, nama: file.name });
      fileUrl = uploaded?.url || '';
    }

    const payload = {
      jenis,
      tanggal_mulai   : fromInputDate(mulai),
      tanggal_selesai  : fromInputDate(selesai),
      keterangan,
      file_pendukung_url: fileUrl
    };

    const result = await callAPI('submitPengajuan', payload);
    document.getElementById('modal-pengajuan')?.remove();
    showToast(result.message || 'Pengajuan berhasil dikirim! ✅', 'success', 4500);
    await loadPengajuanSaya(); // Refresh list
  } catch(e) {
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = '⚠️ ' + e.message; }
    else showToast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  }
}

async function batalPengajuanKu(idPengajuan) {
  showModal(
    'Batalkan Pengajuan?',
    'Pengajuan yang sudah dibatalkan tidak bisa dipulihkan.',
    async () => {
      try {
        const r = await callAPI('batalPengajuan', { id_pengajuan: idPengajuan });
        showToast(r.message, 'success');
        await loadPengajuanSaya();
      } catch(e) { showToast(e.message, 'error'); }
    },
    'Ya, Batalkan'
  );
}

// ─── Admin: Approve/Tolak Pengajuan ──────────────────────────
async function loadPengajuanAdmin(status = 'pending') {
  const el = document.getElementById('pengajuan-admin-list');
  if (!el) return;
  el.innerHTML = skeletonCard(4);

  try {
    const data = await callAPI('getPengajuanSemua', { status });
    if (!data || data.length === 0) {
      showEmpty('pengajuan-admin-list', 'Tidak ada pengajuan ' + status);
      return;
    }
    el.innerHTML = data.map(p => `
      <div class="pengajuan-item">
        <div class="pengajuan-item__header">
          <div>
            <div style="font-weight:700;font-size:15px">${p.nama_karyawan}</div>
            <div style="font-size:12px;color:#64748B">${labelJenis(p.jenis)}</div>
          </div>
          ${badgeStatus(p.status)}
        </div>
        <div class="pengajuan-item__detail">
          📅 ${formatTanggal(p.tanggal_mulai)} – ${formatTanggal(p.tanggal_selesai)}
          · <strong>${p.total_hari} hari</strong>
        </div>
        <div style="font-size:12px;color:#64748B;margin-top:4px">${p.keterangan||''}</div>
        ${p.file_pendukung_url ? `<a href="${p.file_pendukung_url}" target="_blank"
          style="font-size:12px;color:#2D6CDF;margin-top:4px;display:block">📎 Lihat lampiran</a>` : ''}
        ${p.status === 'pending' ? `
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn--secondary" style="flex:1;padding:10px"
              onclick="approvePengajuanAdmin('${p.id_pengajuan}')">✅ Setujui</button>
            <button class="btn btn--danger" style="flex:1;padding:10px"
              onclick="tolakPengajuanAdmin('${p.id_pengajuan}')">❌ Tolak</button>
          </div>` : ''}
      </div>`).join('');
  } catch(e) { showError('pengajuan-admin-list', e.message); }
}

function approvePengajuanAdmin(idPengajuan) {
  showModal('Setujui Pengajuan?',
    'Absensi karyawan akan otomatis diperbarui sesuai periode pengajuan.',
    async () => {
      try {
        const r = await callAPI('approvePengajuan', { id_pengajuan: idPengajuan, catatan_admin: 'Disetujui' });
        showToast(r.message, 'success');
        await loadPengajuanAdmin();
      } catch(e) { showToast(e.message, 'error'); }
    }, 'Setujui ✅');
}

function tolakPengajuanAdmin(idPengajuan) {
  showModal('Tolak Pengajuan?',
    '<textarea id="catatan-tolak" class="form-control" rows="2" placeholder="Alasan penolakan (opsional)" style="margin-top:8px"></textarea>',
    async () => {
      const catatan = document.getElementById('catatan-tolak')?.value || 'Ditolak';
      try {
        const r = await callAPI('tolakPengajuan', { id_pengajuan: idPengajuan, catatan_admin: catatan });
        showToast(r.message, 'success');
        await loadPengajuanAdmin();
      } catch(e) { showToast(e.message, 'error'); }
    }, 'Tolak ❌');
}
