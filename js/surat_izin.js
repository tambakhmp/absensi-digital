// ============================================================
// surat_izin.js — Surat Izin Tidak Masuk Kerja (Admin + Karyawan)
// Alur TTD: otomatis sesuai struktur (sama persis Surat Tugas)
// Tidak ada perpanjangan — setiap izin = surat baru
// ============================================================

// ── HELPER ──────────────────────────────────────────────────
function _fmtTglSI(t) {
  if (!t || t === '-') return '-';
  const B = ['','Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'];
  let p = String(t).split('/');
  if (p.length >= 3) {
    const d = parseInt(p[0]), m = parseInt(p[1]), y = p[2];
    if (d && m && m <= 12) return d + ' ' + B[m] + ' ' + y;
  }
  p = String(t).split('-');
  if (p.length >= 3) {
    const y = p[0], m = parseInt(p[1]), d = parseInt(p[2]);
    if (d && m && m <= 12) return d + ' ' + B[m] + ' ' + y;
  }
  return t;
}

function _statusSI(s) {
  const map = {
    menunggu_karyawan : { label: 'Menunggu Karyawan',    color: '#D97706', bg: '#FEF3C7' },
    menunggu_atasan   : { label: 'Menunggu Atasan',      color: '#7C3AED', bg: '#EDE9FE' },
    menunggu_pimpinan : { label: 'Menunggu Pimpinan',    color: '#2563EB', bg: '#DBEAFE' },
    menunggu_admin    : { label: 'Menunggu Persetujuan', color: '#0891B2', bg: '#CFFAFE' },
    selesai           : { label: 'Selesai / Disetujui',  color: '#059669', bg: '#D1FAE5' },
  };
  return map[s] || { label: s, color: '#64748B', bg: '#F1F5F9' };
}

// ════════════════════════════════════════════════════════════
// HALAMAN ADMIN — Buat & Kelola Surat Izin
// ════════════════════════════════════════════════════════════
async function loadSuratIzinAdmin() {
  const c = document.getElementById('admin-content');
  if (!c) return;

  c.innerHTML = `
  <div style="padding:0 0 80px">
    <div style="display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:12px;margin-bottom:20px">
      <div>
        <h2 style="font-size:20px;font-weight:700;color:#0F172A;margin:0">
          📝 Surat Izin Tidak Masuk</h2>
        <p style="font-size:13px;color:#64748B;margin:4px 0 0">
          Kelola surat izin karyawan dengan tanda tangan digital</p>
      </div>
    </div>

    <!-- Filter status -->
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button onclick="_filterSuratIzin('')"
        id="si-tab-semua"
        style="padding:7px 16px;border-radius:20px;font-size:13px;font-weight:600;
        cursor:pointer;border:1px solid #2D6CDF;background:#2D6CDF;color:#fff">
        Semua
      </button>
      <button onclick="_filterSuratIzin('menunggu_karyawan')"
        id="si-tab-karyawan"
        style="padding:7px 16px;border-radius:20px;font-size:13px;font-weight:600;
        cursor:pointer;border:1px solid #E2E8F0;background:#fff;color:#475569">
        Menunggu TTD
      </button>
      <button onclick="_filterSuratIzin('menunggu_admin')"
        id="si-tab-admin"
        style="padding:7px 16px;border-radius:20px;font-size:13px;font-weight:600;
        cursor:pointer;border:1px solid #E2E8F0;background:#fff;color:#475569">
        Siap Disetujui
      </button>
      <button onclick="_filterSuratIzin('selesai')"
        id="si-tab-selesai"
        style="padding:7px 16px;border-radius:20px;font-size:13px;font-weight:600;
        cursor:pointer;border:1px solid #E2E8F0;background:#fff;color:#475569">
        Selesai
      </button>
    </div>

    <div id="list-surat-izin"></div>
  </div>`;

  await _loadListSuratIzinAdmin('');
}

let _siFilterAktif = '';

async function _filterSuratIzin(status) {
  _siFilterAktif = status;

  // Update tab styling
  const tabs = { '': 'si-tab-semua', 'menunggu_karyawan': 'si-tab-karyawan',
                 'menunggu_admin': 'si-tab-admin', 'selesai': 'si-tab-selesai' };
  Object.keys(tabs).forEach(k => {
    const el = document.getElementById(tabs[k]);
    if (!el) return;
    const aktif = k === status;
    el.style.background = aktif ? '#2D6CDF' : '#fff';
    el.style.color       = aktif ? '#fff'    : '#475569';
    el.style.borderColor = aktif ? '#2D6CDF' : '#E2E8F0';
  });

  await _loadListSuratIzinAdmin(status);
}

async function _loadListSuratIzinAdmin(statusFilter = '') {
  const el = document.getElementById('list-surat-izin');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:30px;color:#94A3B8">Memuat...</div>';

  try {
    let data = await callAPI('getSuratIzin', {});
    if (statusFilter) data = data.filter(s => s.status_surat === statusFilter);

    if (!data || !data.length) {
      el.innerHTML = `<div style="text-align:center;padding:60px;color:#94A3B8;
        background:#fff;border-radius:12px;border:1px dashed #E2E8F0">
        <div style="font-size:36px;margin-bottom:12px">📝</div>
        <div style="font-size:15px;font-weight:600">Tidak ada surat izin</div>
        <div style="font-size:13px;margin-top:6px">Buat dari menu Pengajuan → Izin</div>
      </div>`;
      return;
    }

    const pending = data.filter(s => s.status_surat !== 'selesai');
    const done    = data.filter(s => s.status_surat === 'selesai');

    let html = '';
    if (!statusFilter || statusFilter !== 'selesai') {
      if (pending.length) {
        html += `<div style="font-size:12px;font-weight:600;color:#64748B;
          letter-spacing:.5px;margin-bottom:8px">PERLU TINDAKAN</div>`;
        pending.forEach(s => { html += _cardSuratIzin(s, true); });
      }
    }
    if (!statusFilter || statusFilter === 'selesai' || statusFilter === '') {
      if (done.length) {
        html += `<div style="font-size:12px;font-weight:600;color:#64748B;
          letter-spacing:.5px;margin:16px 0 8px">SELESAI</div>`;
        done.forEach(s => { html += _cardSuratIzin(s, true); });
      }
    }
    el.innerHTML = html || '<div style="text-align:center;padding:40px;color:#94A3B8">Tidak ada data</div>';
  } catch(e) {
    el.innerHTML = `<div style="color:#E53E3E;padding:20px">Gagal memuat: ${e.message}</div>`;
  }
}

function _cardSuratIzin(s, isAdmin = false) {
  const st = _statusSI(s.status_surat);
  return `
  <div style="background:#fff;border-radius:12px;border:1px solid #E2E8F0;
    padding:16px;margin-bottom:10px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;
      flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:11px;color:#64748B">${s.no_surat || '-'}</div>
        <div style="font-size:15px;font-weight:600;color:#0F172A;margin:2px 0">
          ${s.nama_karyawan || '-'}</div>
        <div style="font-size:13px;color:#64748B">
          ${s.jabatan || ''} · ${s.departemen || ''}</div>
      </div>
      <span style="background:${st.bg};color:${st.color};font-size:11px;
        font-weight:600;padding:4px 10px;border-radius:20px;white-space:nowrap">
        ${st.label}</span>
    </div>
    <div style="margin:10px 0;padding:10px;background:#F8FAFC;border-radius:8px;
      font-size:12px;color:#334155;line-height:1.7">
      <strong>Alasan Izin:</strong> ${s.alasan_izin || '-'}<br>
      <strong>Periode:</strong> ${_fmtTglSI(s.tanggal_mulai)} s/d ${_fmtTglSI(s.tanggal_selesai)}
        (${s.total_hari || '-'} hari)
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button onclick="_lihatSuratIzin('${s.id_surat}')"
        style="background:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;
        padding:6px 14px;font-size:12px;cursor:pointer;font-weight:600;color:#334155">
        👁 Lihat Surat
      </button>
      ${isAdmin && s.status_surat === 'menunggu_admin' ? `
      <button onclick="_setujuiSuratIzin('${s.id_surat}')"
        style="background:#059669;color:#fff;border:none;border-radius:8px;
        padding:6px 14px;font-size:12px;cursor:pointer;font-weight:600">
        ✅ Setujui
      </button>` : ''}
      <button onclick="_cetakSuratIzinPDF('${s.id_surat}')"
        style="background:#1E5F3A;color:#fff;border:none;border-radius:8px;
        padding:6px 14px;font-size:12px;cursor:pointer;font-weight:600">
        🖨 Cetak PDF
      </button>
    </div>
  </div>`;
}

// ── MODAL LIHAT SURAT IZIN ───────────────────────────────────
async function _lihatSuratIzin(idSurat) {
  document.getElementById('modal-surat-izin')?.remove();
  showToast('Memuat surat...', 'info', 1500);

  let s;
  try { s = await callAPI('getSuratIzin', { id_surat: idSurat }); }
  catch(e) { showToast('Gagal memuat: ' + e.message, 'error'); return; }

  const st      = _statusSI(s.status_surat);
  const session = getSession();
  const idMe    = String(session?.id_karyawan || '');

  // Cek apakah giliran TTD user ini
  const biasTTD = (
    (s.status_surat === 'menunggu_karyawan' && idMe === String(s.id_karyawan)) ||
    (s.status_surat === 'menunggu_atasan'   && idMe === String(s.id_atasan))   ||
    (s.status_surat === 'menunggu_pimpinan' && idMe === String(s.id_pimpinan))
  );

  const renderTTDBox = (label, nama, jabatan, ttdImg, at) => {
    if (ttdImg) {
      return `<div style="text-align:center">
        <div style="font-size:11px;color:#64748B;margin-bottom:6px">${label}</div>
        <div style="height:60px;border:1px solid #E2E8F0;border-radius:8px;
          overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center">
          <img src="data:image/png;base64,${ttdImg}" style="max-height:56px;max-width:100%">
        </div>
        <div style="border-top:1px solid #E2E8F0;margin:6px 16px"></div>
        <div style="font-size:11px;font-weight:600">${nama || '-'}</div>
        <div style="font-size:10px;color:#64748B">${jabatan || ''}</div>
        <div style="font-size:10px;color:#059669;margin-top:3px">✅ ${at || ''}</div>
      </div>`;
    }
    return `<div style="text-align:center">
      <div style="font-size:11px;color:#64748B;margin-bottom:6px">${label}</div>
      <div style="height:60px;border:1px dashed #CBD5E0;border-radius:8px;
        background:#F8FAFC;display:flex;align-items:center;justify-content:center">
        <span style="font-size:11px;color:#94A3B8">Belum ditandatangani</span>
      </div>
      <div style="border-top:1px solid #E2E8F0;margin:6px 16px"></div>
      <div style="font-size:11px;font-weight:600">${nama || '-'}</div>
      <div style="font-size:10px;color:#64748B">${jabatan || ''}</div>
    </div>`;
  };

  // Bangun slot TTD
  const slots = [];
  slots.push({ label: 'Yang mengajukan izin', nama: s.nama_karyawan || '-', jab: s.jabatan || '', img: s.ttd_karyawan, at: s.ttd_karyawan_at });
  if (s.nama_atasan && String(s.nama_atasan).trim() !== '') {
    slots.push({ label: 'Atasan langsung', nama: s.nama_atasan, jab: '', img: s.ttd_atasan, at: s.ttd_atasan_at });
  }
  if (s.nama_pimpinan && String(s.nama_pimpinan).trim() !== '') {
    slots.push({ label: 'Mengetahui', nama: s.nama_pimpinan, jab: 'Project Manager', img: s.ttd_pimpinan, at: s.ttd_pimpinan_at });
  }
  if (slots.length === 1) {
    slots.push({ label: 'Mengetahui', nama: s.nama_pembuat || 'Admin', jab: s.jabatan_pembuat || 'Admin', img: '', at: '' });
  }
  const cols = slots.length === 2 ? 'repeat(2,1fr)' : 'repeat(3,1fr)';

  const modal = document.createElement('div');
  modal.id = 'modal-surat-izin';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);' +
    'z-index:9500;overflow-y:auto;padding:16px;display:flex;' +
    'align-items:flex-start;justify-content:center;padding-top:40px';

  modal.innerHTML = `
  <div style="background:#fff;border-radius:16px;padding:0;
    width:100%;max-width:520px;overflow:hidden">

    <!-- Header -->
    <div style="background:#1E5F3A;padding:16px 20px;display:flex;
      align-items:center;justify-content:space-between">
      <div>
        <div style="color:rgba(255,255,255,.7);font-size:11px">${s.no_surat || ''}</div>
        <div style="color:#fff;font-size:15px;font-weight:600">Surat Izin Tidak Masuk</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span style="background:${st.bg};color:${st.color};font-size:11px;
          font-weight:600;padding:4px 10px;border-radius:20px">${st.label}</span>
        <button onclick="document.getElementById('modal-surat-izin').remove()"
          style="background:rgba(255,255,255,.15);border:none;border-radius:50%;
          width:30px;height:30px;color:#fff;font-size:16px;cursor:pointer">✕</button>
      </div>
    </div>

    <!-- Isi surat -->
    <div style="padding:20px;font-size:13px;color:#0F172A">

      <!-- Yang bertanda tangan = KARYAWAN PENGAJU -->
      <div style="font-size:11px;color:#64748B;margin-bottom:4px">Yang bertanda tangan di bawah ini:</div>
      <div style="background:#F8FAFC;border-radius:8px;padding:10px;margin-bottom:14px">
        <div><span style="color:#64748B;width:100px;display:inline-block">Nama</span>: <strong>${s.nama_karyawan || '-'}</strong></div>
        <div><span style="color:#64748B;width:100px;display:inline-block">NIK</span>: ${s.nik || '-'}</div>
        <div><span style="color:#64748B;width:100px;display:inline-block">Jabatan</span>: ${s.jabatan || '-'}</div>
        <div><span style="color:#64748B;width:100px;display:inline-block">Departemen</span>: ${s.departemen || '-'}</div>
        <div><span style="color:#64748B;width:100px;display:inline-block">Instansi</span>: PT. HUTAKALO MINATANI PRIMA</div>
      </div>

      <div style="font-size:11px;color:#64748B;margin-bottom:4px">Dengan ini mengajukan permohonan izin tidak masuk kerja:</div>

      <!-- Detail izin -->
      <div style="background:#F0FDF4;border-left:3px solid #16A34A;
        padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:16px;line-height:1.8">
        <div><span style="color:#64748B">Alasan Izin</span> : ${s.alasan_izin || '-'}</div>
        <div><span style="color:#64748B">Periode</span>&nbsp;&nbsp;&nbsp;&nbsp; : ${_fmtTglSI(s.tanggal_mulai)} s/d ${_fmtTglSI(s.tanggal_selesai)} (${s.total_hari || '-'} hari)</div>
      </div>

      <!-- Tanda tangan -->
      <div style="border-top:1px solid #E2E8F0;padding-top:14px;
        display:grid;grid-template-columns:${cols};gap:10px">
        ${slots.map(sl => renderTTDBox(sl.label, sl.nama, sl.jab, sl.img, sl.at)).join('')}
      </div>

      ${biasTTD ? `
      <!-- Canvas TTD -->
      <div style="margin-top:20px;border-top:1px solid #E2E8F0;padding-top:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">
          ✍️ Tanda tangani surat ini:</div>
        <canvas id="canvas-ttd-si" width="480" height="140"
          style="border:2px solid #CBD5E0;border-radius:10px;background:#fff;
          touch-action:none;width:100%;cursor:crosshair"></canvas>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="_clearCanvasTTDSI()"
            style="flex:1;padding:10px;border:1px solid #E2E8F0;border-radius:8px;
            font-size:13px;cursor:pointer;background:#fff">
            🗑 Hapus
          </button>
          <button onclick="_simpanTTDSuratIzin('${idSurat}')"
            style="flex:2;padding:10px;background:#1E5F3A;color:#fff;border:none;
            border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">
            ✅ Simpan Tanda Tangan
          </button>
        </div>
      </div>` : ''}

      <div style="display:flex;gap:8px;margin-top:16px">
        <button onclick="_cetakSuratIzinPDF('${idSurat}')"
          style="flex:1;padding:10px;background:#1E5F3A;color:#fff;border:none;
          border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">
          🖨 Cetak PDF
        </button>
      </div>
    </div>
  </div>`;

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);

  if (biasTTD) _initCanvasTTDSI();
}

// ── CANVAS TTD ───────────────────────────────────────────────
let _ttdCanvasSI = null, _ttdCtxSI = null, _ttdDrawingSI = false;

function _initCanvasTTDSI() {
  const canvas = document.getElementById('canvas-ttd-si');
  if (!canvas) return;
  _ttdCanvasSI  = canvas;
  _ttdCtxSI     = canvas.getContext('2d');
  _ttdDrawingSI = false;

  const getPos = (e) => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  };

  _ttdCtxSI.strokeStyle = '#1E293B';
  _ttdCtxSI.lineWidth   = 2;
  _ttdCtxSI.lineCap     = 'round';
  _ttdCtxSI.lineJoin    = 'round';

  const start = (e) => { e.preventDefault(); _ttdDrawingSI = true; const p = getPos(e); _ttdCtxSI.beginPath(); _ttdCtxSI.moveTo(p.x, p.y); };
  const draw  = (e) => { if (!_ttdDrawingSI) return; e.preventDefault(); const p = getPos(e); _ttdCtxSI.lineTo(p.x, p.y); _ttdCtxSI.stroke(); };
  const stop  = ()  => { _ttdDrawingSI = false; };

  canvas.addEventListener('mousedown',  start);
  canvas.addEventListener('mousemove',  draw);
  canvas.addEventListener('mouseup',    stop);
  canvas.addEventListener('mouseleave', stop);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove',  draw,  { passive: false });
  canvas.addEventListener('touchend',   stop);
}

function _clearCanvasTTDSI() {
  if (_ttdCtxSI && _ttdCanvasSI) {
    _ttdCtxSI.clearRect(0, 0, _ttdCanvasSI.width, _ttdCanvasSI.height);
  }
}

async function _simpanTTDSuratIzin(idSurat) {
  if (!_ttdCanvasSI) { showToast('Canvas tidak tersedia', 'error'); return; }
  const imgData = _ttdCtxSI.getImageData(0, 0, _ttdCanvasSI.width, _ttdCanvasSI.height).data;
  const isEmpty = !imgData.some((_, i) => i % 4 === 3 && imgData[i] > 10);
  if (isEmpty) { showToast('Silakan buat tanda tangan terlebih dahulu', 'warning'); return; }

  try {
    showToast('Menyimpan tanda tangan...', 'info', 2000);
    const base64 = _ttdCanvasSI.toDataURL('image/png').split(',')[1];
    const res    = await callAPI('simpanTandaTanganSuratIzin', { id_surat: idSurat, ttd_base64: base64 });
    document.getElementById('modal-surat-izin')?.remove();
    showToast('✅ ' + res.message, 'success', 4000);
    if (typeof _loadListSuratIzinAdmin    === 'function') _loadListSuratIzinAdmin(_siFilterAktif);
    if (typeof _loadSuratIzinPendingDashboard === 'function') _loadSuratIzinPendingDashboard();
  } catch(e) {
    showToast('Gagal: ' + e.message, 'error');
  }
}

// ── SETUJUI ──────────────────────────────────────────────────
async function _setujuiSuratIzin(idSurat) {
  if (!confirm('Setujui surat izin ini? Pengajuan izin karyawan akan otomatis disetujui.')) return;
  try {
    showToast('Memproses...', 'info', 2000);
    const res = await callAPI('setujuiSuratIzin', { id_surat: idSurat });
    showToast('✅ ' + res.message, 'success', 4000);
    document.getElementById('modal-surat-izin')?.remove();
    if (typeof _loadListSuratIzinAdmin      === 'function') _loadListSuratIzinAdmin(_siFilterAktif);
    if (typeof _loadSuratIzinPendingDashboard === 'function') _loadSuratIzinPendingDashboard();
    if (typeof loadPengajuanAdminV4         === 'function') loadPengajuanAdminV4();
  } catch(e) {
    showToast('Gagal: ' + e.message, 'error');
  }
}

// ── BUAT SURAT IZIN DARI PENGAJUAN (admin) ───────────────────
async function _buatSuratIzinDariPengajuan(idPengajuan, idKaryawan, tglMulai, tglSelesai, keterangan) {
  document.getElementById('modal-buat-si')?.remove();

  const toInputDate = (v) => {
    if (!v) return '';
    v = decodeURIComponent(v);
    const p = v.split('/');
    return p.length >= 3
      ? p[2] + '-' + String(p[1]).padStart(2,'0') + '-' + String(p[0]).padStart(2,'0')
      : v;
  };
  const toIDDate = (v) => {
    if (!v) return '';
    const p = v.split('-');
    return p.length >= 3 ? p[2] + '/' + p[1] + '/' + p[0] : v;
  };

  const tglM = toInputDate(tglMulai);
  const tglS = toInputDate(tglSelesai);
  const ket  = typeof keterangan === 'string' ? decodeURIComponent(keterangan) : '';

  // Hitung total hari
  const hitungHari = () => {
    const m = document.getElementById('si-tgl-mulai')?.value;
    const s = document.getElementById('si-tgl-selesai')?.value;
    const el = document.getElementById('si-info-hari');
    if (!m || !s || !el) return;
    const diff = Math.round((new Date(s) - new Date(m)) / 86400000) + 1;
    el.textContent = diff > 0 ? diff + ' hari' : '';
  };

  const modal = document.createElement('div');
  modal.id = 'modal-buat-si';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);' +
    'z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';

  modal.innerHTML = `
  <div style="background:#fff;border-radius:16px;padding:24px;
    width:100%;max-width:480px;max-height:90vh;overflow-y:auto">
    <input type="hidden" id="si-id-kary" value="${idKaryawan}">

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:16px;font-weight:700">📝 Buat Surat Izin</div>
        <div style="font-size:12px;color:#64748B">Dari pengajuan izin karyawan</div>
      </div>
      <button onclick="document.getElementById('modal-buat-si').remove()"
        style="background:#F1F5F9;border:none;border-radius:50%;width:32px;
        height:32px;font-size:16px;cursor:pointer">✕</button>
    </div>

    <div style="background:#F0FDF4;border-radius:8px;padding:10px 14px;
      margin-bottom:16px;font-size:12px;color:#166534">
      ℹ️ Surat izin akan dikirim ke karyawan untuk ditandatangani.
      Setiap pengajuan izin memerlukan surat tersendiri.
    </div>

    <div style="display:flex;flex-direction:column;gap:14px">
      <div>
        <label style="font-size:12px;font-weight:600;color:#64748B;display:block;margin-bottom:6px">
          ALASAN IZIN</label>
        <textarea id="si-alasan" rows="3"
          placeholder="Tuliskan alasan izin tidak masuk kerja..."
          style="width:100%;padding:10px;border:1px solid #E2E8F0;border-radius:8px;
          font-size:13px;box-sizing:border-box;resize:vertical"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748B;display:block;margin-bottom:6px">
            TANGGAL MULAI</label>
          <input id="si-tgl-mulai" type="date" value="${tglM}"
            style="width:100%;padding:10px;border:1px solid #E2E8F0;border-radius:8px;
            font-size:13px;box-sizing:border-box" onchange="this._hitungHari?.()">
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748B;display:block;margin-bottom:6px">
            TANGGAL SELESAI</label>
          <input id="si-tgl-selesai" type="date" value="${tglS}"
            style="width:100%;padding:10px;border:1px solid #E2E8F0;border-radius:8px;
            font-size:13px;box-sizing:border-box" onchange="this._hitungHari?.()">
        </div>
      </div>
      <div id="si-info-hari" style="font-size:12px;color:#1E5F3A;text-align:center;font-weight:600"></div>
    </div>

    <button onclick="_kirimSuratIzin('${idPengajuan}')"
      style="width:100%;margin-top:20px;padding:12px;background:#1E5F3A;color:#fff;
      border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">
      📤 Buat & Kirim ke Karyawan
    </button>
  </div>`;

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);

  // Setup setelah render
  setTimeout(() => {
    const elAlasan = document.getElementById('si-alasan');
    if (elAlasan && ket) elAlasan.value = ket;

    // Pasang event listener hitungHari
    const updateHari = () => {
      const m  = document.getElementById('si-tgl-mulai')?.value;
      const s  = document.getElementById('si-tgl-selesai')?.value;
      const el = document.getElementById('si-info-hari');
      if (!m || !s || !el) return;
      const diff = Math.round((new Date(s) - new Date(m)) / 86400000) + 1;
      el.textContent = diff > 0 ? diff + ' hari' : '';
    };
    document.getElementById('si-tgl-mulai')?.addEventListener('change', updateHari);
    document.getElementById('si-tgl-selesai')?.addEventListener('change', updateHari);
    updateHari();
  }, 50);
}

async function _kirimSuratIzin(idPengajuan) {
  const idK    = document.getElementById('si-id-kary')?.value?.trim();
  const alasan = document.getElementById('si-alasan')?.value?.trim();
  const tglM   = document.getElementById('si-tgl-mulai')?.value;
  const tglS   = document.getElementById('si-tgl-selesai')?.value;

  if (!idK)    { showToast('Data karyawan tidak valid', 'error');    return; }
  if (!alasan) { showToast('Isi alasan izin', 'warning');            return; }
  if (!tglM)   { showToast('Pilih tanggal mulai', 'warning');        return; }
  if (!tglS)   { showToast('Pilih tanggal selesai', 'warning');      return; }

  const toIDDate = v => { const p = v.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  const diff     = Math.round((new Date(tglS) - new Date(tglM)) / 86400000) + 1;

  try {
    showToast('Membuat surat izin...', 'info', 2000);
    const res = await callAPI('buatSuratIzin', {
      id_karyawan    : idK,
      id_pengajuan   : idPengajuan || '',
      alasan_izin    : alasan,
      tanggal_mulai  : toIDDate(tglM),
      tanggal_selesai: toIDDate(tglS),
      total_hari     : diff > 0 ? diff : 1
    });
    document.getElementById('modal-buat-si')?.remove();
    showToast('✅ ' + res.message, 'success', 4000);
    if (typeof loadPengajuanAdminV4     === 'function') loadPengajuanAdminV4();
    if (typeof _loadListSuratIzinAdmin  === 'function') _loadListSuratIzinAdmin('');
  } catch(e) {
    showToast('Gagal: ' + e.message, 'error');
  }
}

// ── WRAPPER dari tombol di card pengajuan ────────────────────
function _buatSuratIzinClick(btn) {
  const idP = btn.dataset.pgj  || '';
  const idK = btn.dataset.kary || '';
  const tm  = decodeURIComponent(btn.dataset.tm  || '');
  const ts  = decodeURIComponent(btn.dataset.ts  || '');
  const ket = decodeURIComponent(btn.dataset.ket || '');
  _buatSuratIzinDariPengajuan(idP, idK, tm, ts, ket);
}

// ── CETAK PDF ────────────────────────────────────────────────
async function _cetakSuratIzinPDF(idSurat) {
  showToast('Menyiapkan PDF...', 'info', 2000);
  const pdfOk = await _ensureJsPDF();
  if (!pdfOk) { showToast('Library PDF tidak tersedia', 'error'); return; }

  let s;
  try { s = await callAPI('getSuratIzin', { id_surat: idSurat }); }
  catch(e) { showToast('Gagal memuat: ' + e.message, 'error'); return; }

  // Ambil data instansi
  let inst = {};
  try {
    const settArr = await callAPI('getAllSetting', {});
    const sm = {};
    if (Array.isArray(settArr)) settArr.forEach(x => { if (x.key) sm[x.key] = x.value || ''; });
    inst = {
      nama_instansi  : sm.nama_instansi   || '',
      alamat_instansi: sm.alamat_instansi || '',
      telp_instansi  : sm.telepon_instansi|| '',
      email_instansi : sm.email_instansi  || '',
      logo_url       : sm.logo_url        || ''
    };
  } catch(eI) {}

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, mL = 25, mR = 25;
    let y = 15;

    // Kop surat
    y = await _kopSurat(doc, inst, W, mL, y);

    // Judul
    const BLN = ['','Januari','Februari','Maret','April','Mei','Juni',
      'Juli','Agustus','September','Oktober','November','Desember'];
    const now = new Date();
    const tglDiterbitkan = now.getDate() + ' ' + BLN[now.getMonth()+1] + ' ' + now.getFullYear();

    doc.setFont('helvetica','bold'); doc.setFontSize(14);
    doc.text('SURAT IZIN TIDAK MASUK KERJA', W/2, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.setTextColor(80,80,80);
    doc.text('Nomor: ' + (s.no_surat || '-'), W/2, y, { align: 'center' });
    doc.setTextColor(0,0,0); y += 5;
    doc.setLineWidth(0.3); doc.line(mL, y, W-mR, y); y += 8;

    // Yang bertanda tangan = KARYAWAN PENGAJU
    doc.setFontSize(10.5); doc.setFont('helvetica','normal');
    doc.text('Yang bertanda tangan di bawah ini:', mL, y); y += 7;

    const rows1 = [
      ['Nama',       s.nama_karyawan  || '-'],
      ['NIK',        s.nik            || '-'],
      ['Jabatan',    s.jabatan        || '-'],
      ['Departemen', s.departemen     || '-'],
      ['Instansi',   inst.nama_instansi || 'PT. Hutakalo Minatani Prima']
    ];
    rows1.forEach(r => {
      doc.setTextColor(100,100,100); doc.text(r[0], mL+2, y);
      doc.setTextColor(0,0,0); doc.text(': ' + r[1], mL+38, y); y += 6;
    });
    y += 2;
    doc.text('Dengan ini mengajukan permohonan izin tidak masuk kerja:', mL, y); y += 7;
    y += 2;

    // Box izin
    const padV  = 5, lineH = 7;
    const xLabel = mL+8, xColon = mL+42, xValue = mL+45;
    const valW   = W - mR - xValue;
    const izinRows = [
      ['Alasan Izin', s.alasan_izin || '-'],
      ['Periode',     _fmtTglSI(s.tanggal_mulai) + ' s/d ' + _fmtTglSI(s.tanggal_selesai) + ' (' + s.total_hari + ' hari)']
    ];

    let boxH = padV * 2;
    izinRows.forEach(r => {
      boxH += doc.splitTextToSize(r[1], valW).length * lineH;
    });

    doc.setFillColor(240, 253, 244);
    doc.roundedRect(mL, y, W-mL-mR, boxH, 2, 2, 'F');
    doc.setDrawColor(22, 163, 74); doc.setLineWidth(1.2);
    doc.line(mL, y, mL, y+boxH);
    doc.setDrawColor(167, 243, 208); doc.setLineWidth(0.3);
    doc.roundedRect(mL, y, W-mL-mR, boxH, 2, 2, 'S');
    doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);

    let ty = y + padV + 4.5;
    izinRows.forEach(r => {
      const lines = doc.splitTextToSize(r[1], valW);
      doc.setFont('helvetica','normal');
      doc.setTextColor(90,90,90); doc.text(r[0], xLabel, ty);
      doc.setTextColor(80,80,80); doc.text(':', xColon, ty);
      doc.setTextColor(0,0,0);   doc.text(lines, xValue, ty);
      ty += lines.length * lineH;
    });
    y += boxH + 8;

    // Penutup
    doc.setFontSize(10.5);
    const penutup = doc.splitTextToSize(
      'Demikian surat permohonan izin ini saya buat dengan sebenarnya. ' +
      'Atas perhatian dan persetujuan Bapak/Ibu pimpinan, saya ucapkan terima kasih.',
      W-mL-mR);
    doc.text(penutup, mL, y); y += penutup.length * 6 + 4;

    doc.setTextColor(100,100,100);
    doc.text('Dibuat di       : ' + (inst.alamat_instansi ? inst.alamat_instansi.split(',')[0].trim() : 'Gorontalo Utara'), mL, y); y += 6;
    doc.text('Tanggal         : ' + tglDiterbitkan, mL, y); y += 10;
    doc.setTextColor(0,0,0);

    // Tanda tangan — slot dinamis
    const ttdSlots = [];
    ttdSlots.push({ label: 'Yang mengajukan izin', nama: s.nama_karyawan || '-', jabatan: s.jabatan || '', img: s.ttd_karyawan || '' });
    if (s.nama_atasan && String(s.nama_atasan).trim() !== '') {
      ttdSlots.push({ label: 'Atasan langsung', nama: s.nama_atasan, jabatan: '', img: s.ttd_atasan || '' });
    }
    if (s.nama_pimpinan && String(s.nama_pimpinan).trim() !== '') {
      ttdSlots.push({ label: 'Mengetahui', nama: s.nama_pimpinan, jabatan: s.jabatan_pembuat || 'Project Manager', img: s.ttd_pimpinan || '' });
    }
    if (ttdSlots.length === 1) {
      ttdSlots.push({ label: 'Mengetahui', nama: s.nama_pembuat || 'Admin', jabatan: s.jabatan_pembuat || 'Admin', img: '' });
    }

    const nSlot = ttdSlots.length;
    const ttdW  = (W - mL - mR) / nSlot;

    doc.setFontSize(9);
    ttdSlots.forEach((slot, i) => {
      const tx = mL + i * ttdW;
      doc.setTextColor(100,100,100);
      doc.text(slot.label, tx + ttdW/2, y, { align: 'center' });
    });
    y += 4;

    ttdSlots.forEach((slot, i) => {
      const tx = mL + i * ttdW;
      doc.setDrawColor(200,210,220); doc.setLineWidth(0.3);
      doc.roundedRect(tx+2, y, ttdW-4, 20, 2, 2);
      if (slot.img && String(slot.img).length > 10) {
        try {
          const imgSrc = slot.img.startsWith('data:') ? slot.img : 'data:image/png;base64,' + slot.img;
          doc.addImage(imgSrc, 'PNG', tx+2, y, ttdW-4, 20, '', 'FAST');
        } catch(eImg) { /* biarkan kosong */ }
      }
    });
    y += 22;

    ttdSlots.forEach((slot, i) => {
      const tx = mL + i * ttdW;
      doc.setDrawColor(150,150,150); doc.setLineWidth(0.3);
      doc.line(tx+4, y, tx+ttdW-4, y);
    });
    y += 5;

    ttdSlots.forEach((slot, i) => {
      const tx = mL + i * ttdW;
      doc.setTextColor(0,0,0); doc.setFont('helvetica','bold'); doc.setFontSize(9);
      const nm = doc.splitTextToSize(slot.nama, ttdW-4);
      doc.text(nm, tx+ttdW/2, y, { align: 'center' });
      if (slot.jabatan && slot.jabatan.trim() !== '') {
        doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80); doc.setFontSize(8);
        doc.text(slot.jabatan, tx+ttdW/2, y + nm.length*4, { align: 'center' });
      }
    });

    doc.save('SuratIzin_' + (s.no_surat || 'SI').replace(/\//g, '-') + '.pdf');
    showToast('✅ PDF berhasil didownload!', 'success', 3000);
  } catch(eP) {
    showToast('Gagal cetak: ' + eP.message, 'error');
  }
}
