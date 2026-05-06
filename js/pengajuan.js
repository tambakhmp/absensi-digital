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

  const todayInputVal = new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')+'-'+String(new Date().getDate()).padStart(2,'0');

  // Hitung sisa cuti (akan di-load async)
  const sisaCutiEl = jenis === 'cuti'
    ? `<div id="info-sisa-cuti" style="background:#EBF8EE;border-radius:8px;padding:10px;
        font-size:13px;color:#1A9E74;margin-bottom:12px">⏳ Mengecek sisa cuti...</div>` : '';

  const isCutiKhusus = jenis === 'cuti_khusus';
  const _ick = window._infoCutiKhusus;
  const cutiKhususInfo = isCutiKhusus
    ? `<div id="info-cuti-khusus" style="background:linear-gradient(135deg,#EBF8EE,#F0FFF4);
        border:1px solid #1A9E74;border-radius:8px;padding:12px;font-size:13px;margin-bottom:12px">
        🎫 <strong>Cuti 6 Bulanan</strong> — Sisa: <strong>${_ick ? _ick.sisa+'/'+_ick.jatah+' hari' : '-'}</strong>
        ${_ick && _ick.nominal_tunjangan ? '· Tunjangan: <strong>' + formatRupiah(_ick.nominal_tunjangan) + '</strong>' : ''}
       </div>` : '';

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
      ${cutiKhususInfo}

      <div style="display:none"><input type="hidden" id="pjn-jenis" value="${jenis}"></div>

      <div class="form-group">
        <label class="form-label">Jenis Pengajuan <span class="required">*</span></label>
        <select class="form-control" id="pjn-jenis-select" onchange="onJenisChange(this.value)">
          <option value="izin"       ${jenis==='izin'       ?'selected':''}>📝 Izin</option>
          <option value="sakit"      ${jenis==='sakit'      ?'selected':''}>🏥 Sakit</option>
          <option value="cuti"       ${jenis==='cuti'       ?'selected':''}>🏖️ Cuti</option>
          <option value="dinas_luar" ${jenis==='dinas_luar' ?'selected':''}>🚗 Dinas Luar</option>
          ${window._bolehCutiKhusus
            ? `<option value="cuti_khusus" ${jenis==='cuti_khusus'?'selected':''}>🎫 Cuti 6 Bulanan</option>`
            : ''}
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

      <!-- LAMPIRAN SURAT SAKIT -->
      <div class="form-group" id="grup-file-sakit" style="${jenis==='sakit'?'':'display:none'}">
        <label class="form-label">📎 Foto Surat Sakit / Dokter <span class="required">*</span></label>
        <div style="display:flex;gap:10px;margin-bottom:10px">
          <!-- Tombol kamera -->
          <button type="button" onclick="ambilFotoSurat('camera')"
            style="flex:1;padding:12px;background:#EFF6FF;border:2px dashed #2D6CDF;
            border-radius:10px;cursor:pointer;font-size:13px;color:#2D6CDF;font-weight:600">
            📷 Foto Sekarang
          </button>
          <!-- Tombol galeri -->
          <button type="button" onclick="ambilFotoSurat('gallery')"
            style="flex:1;padding:12px;background:#F8FAFC;border:2px dashed #94A3B8;
            border-radius:10px;cursor:pointer;font-size:13px;color:#64748B;font-weight:600">
            🖼️ Dari Galeri
          </button>
        </div>
        <!-- Input tersembunyi -->
        <input type="file" id="pjn-file-camera"  accept="image/*" capture="environment" style="display:none"
          onchange="onFotoSuratDipilih(this)">
        <input type="file" id="pjn-file-gallery" accept="image/*" style="display:none"
          onchange="onFotoSuratDipilih(this)">
        <!-- Preview foto -->
        <div id="preview-surat-sakit" style="display:none;margin-top:10px;text-align:center">
          <img id="img-preview-surat" style="max-width:100%;max-height:220px;
            border-radius:10px;border:2px solid #E2E8F0;object-fit:contain" src="" alt="Preview">
          <div style="display:flex;align-items:center;justify-content:space-between;
            margin-top:8px;background:#EBF8EE;border-radius:8px;padding:8px 12px">
            <span id="nama-file-surat" style="font-size:12px;color:#1A9E74;font-weight:600">
              ✅ Foto terpilih</span>
            <button type="button" onclick="hapusFotoSurat()"
              style="background:#FFF5F5;border:1px solid #FC8181;border-radius:6px;
              padding:4px 10px;font-size:11px;color:#E53E3E;cursor:pointer">
              ✕ Hapus</button>
          </div>
        </div>
        <p style="font-size:12px;color:#94A3B8;margin-top:6px">
          Foto akan langsung terlihat oleh admin (bukan link)</p>
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
    if (!jenis)      throw new Error('Pilih jenis pengajuan');
    if (!mulai)      throw new Error('Tanggal mulai wajib diisi');
    if (!selesai)    throw new Error('Tanggal selesai wajib diisi');
    if (mulai > selesai) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai');
    if (!keterangan) throw new Error('Keterangan / alasan wajib diisi');

    // Validasi cuti khusus: cek sisa dari cache, tidak perlu API call lagi
    if (jenis === 'cuti_khusus') {
      if (!window._bolehCutiKhusus || !window._infoCutiKhusus) {
        throw new Error('Anda tidak terdaftar dalam sistem cuti 6 bulanan');
      }
      const info = window._infoCutiKhusus;
      const totalHari = Math.round((new Date(selesai) - new Date(mulai)) / 86400000) + 1;
      if (totalHari > info.sisa) {
        throw new Error('Sisa cuti 6 bulanan tidak cukup. Sisa: ' + info.sisa + ' hari');
      }
    }

    // Upload foto surat sakit - pakai window._suratSakitFile dari onFotoSuratDipilih
    let fileUrl = '';
    const _suratFile = window._suratSakitFile;
    if (jenis === 'sakit' && !_suratFile) throw new Error('Foto surat sakit wajib dilampirkan');
    if (_suratFile) {
      showToast('Mengunggah foto surat...', 'info', 5000);
      try {
        const compressed = await compressImage(_suratFile, 1200, 0.75);
        const b64        = await blobToBase64(compressed);
        const ext        = _suratFile.name.split('.').pop() || 'jpg';
        const uploaded   = await callAPI('simpanFilePendukung', {
          base64: b64,
          nama: 'surat_sakit_' + Date.now() + '.' + ext,
          mime: _suratFile.type || 'image/jpeg'
        });
        fileUrl = uploaded?.url || '';
        if (!fileUrl) throw new Error('Gagal mendapatkan URL foto');
      } catch(e) {
        throw new Error('Gagal upload foto: ' + e.message);
      }
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

async function approvePengajuanAdmin(idPengajuan) {
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

async function tolakPengajuanAdmin(idPengajuan) {
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

// ─── FOTO SURAT SAKIT ─────────────────────────────────────────
function ambilFotoSurat(mode) {
  const el = document.getElementById(mode === 'camera' ? 'pjn-file-camera' : 'pjn-file-gallery');
  if (el) el.click();
}

function onFotoSuratDipilih(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  window._suratSakitFile = file;

  // Tampilkan preview
  const reader = new FileReader();
  reader.onload = e => {
    const prev = document.getElementById('preview-surat-sakit');
    const img  = document.getElementById('img-preview-surat');
    const nama = document.getElementById('nama-file-surat');
    if (img)  img.src = e.target.result;
    if (prev) prev.style.display = 'block';
    if (nama) {
      const kb = (file.size / 1024).toFixed(0);
      nama.textContent = '✅ ' + file.name + ' (' + kb + ' KB)';
    }
  };
  reader.readAsDataURL(file);
}

function hapusFotoSurat() {
  window._suratSakitFile = null;
  const prev = document.getElementById('preview-surat-sakit');
  const img  = document.getElementById('img-preview-surat');
  if (prev) prev.style.display = 'none';
  if (img)  img.src = '';
  // Reset input file
  const c1 = document.getElementById('pjn-file-camera');
  const c2 = document.getElementById('pjn-file-gallery');
  if (c1) c1.value = '';
  if (c2) c2.value = '';
}
