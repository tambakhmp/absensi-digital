// ============================================================
// admin_karyawan.js — Manajemen Karyawan Admin: Tabel, CRUD
// ============================================================

let _karyawanCache = [];

async function renderKaryawanAdminFull(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:gap:8px">
      <h2 style="font-size:17px;font-weight:700;margin:0">👥 Manajemen Karyawan</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn--ghost" style="font-size:13px" onclick="exportTemplateKaryawan()">
          📥 Template Excel
        </button>
        <button class="btn btn--primary" style="font-size:13px" onclick="tampilFormTambahKaryawan()">
          + Tambah Karyawan
        </button>
      </div>
    </div>

    <!-- Filter & Search -->
    <div class="card" style="padding:12px;margin-bottom:16px">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <input type="text" class="form-control" id="filter-nama"
          placeholder="🔍 Cari nama / NIK / jabatan..."
          style="flex:1;min-width:200px" oninput="filterTabelKaryawan()">
        <select class="form-control" id="filter-departemen" style="width:180px" onchange="filterTabelKaryawan()">
          <option value="">Semua Departemen</option>
        </select>
        <select class="form-control" id="filter-status" style="width:140px" onchange="filterTabelKaryawan()">
          <option value="">Semua Status</option>
          <option value="true">Aktif</option>
          <option value="false">Non-aktif</option>
        </select>
      </div>
      <div id="info-filter" style="font-size:12px;color:#64748B;margin-top:8px"></div>
    </div>

    <!-- Tabel -->
    <div class="card" style="padding:0;overflow-x:auto">
      <table class="simple-table" id="tabel-karyawan" style="min-width:700px">
        <thead>
          <tr>
            <th style="padding:12px 10px">Karyawan</th>
            <th>NIK</th>
            <th>Jabatan</th>
            <th>Departemen</th>
            <th>Bergabung</th>
            <th>Status</th>
            <th style="text-align:center">Aksi</th>
          </tr>
        </thead>
        <tbody id="tbody-karyawan">
          <tr><td colspan="7" style="text-align:center;padding:32px;color:#94A3B8">
            ${skeletonCard(3)}
          </td></tr>
        </tbody>
      </table>
    </div>`;

  await loadTabelKaryawan();
}

async function loadTabelKaryawan() {
  try {
    const data = await callAPI('getKaryawan', {});
    _karyawanCache = data || [];

    // Isi filter departemen
    const depts = [...new Set(data.map(k => k.departemen).filter(Boolean))].sort();
    const selDept = document.getElementById('filter-departemen');
    if (selDept) {
      selDept.innerHTML = '<option value="">Semua Departemen</option>' +
        depts.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    renderTabelKaryawan(data);
  } catch(e) {
    document.getElementById('tbody-karyawan').innerHTML =
      `<tr><td colspan="7" style="text-align:center;padding:24px;color:#E53E3E">
        Gagal memuat: ${e.message}</td></tr>`;
  }
}

function filterTabelKaryawan() {
  const q     = (document.getElementById('filter-nama')?.value||'').toLowerCase();
  const dept  = document.getElementById('filter-departemen')?.value || '';
  const stat  = document.getElementById('filter-status')?.value || '';

  let filtered = _karyawanCache;
  if (q)    filtered = filtered.filter(k =>
    (k.nama_lengkap||'').toLowerCase().includes(q) ||
    (k.nik||'').toLowerCase().includes(q) ||
    (k.jabatan||'').toLowerCase().includes(q));
  if (dept) filtered = filtered.filter(k => k.departemen === dept);
  if (stat) filtered = filtered.filter(k => String(k.status_aktif) === stat);

  const info = document.getElementById('info-filter');
  if (info) info.textContent = `Menampilkan ${filtered.length} dari ${_karyawanCache.length} karyawan`;

  renderTabelKaryawan(filtered);
}

function renderTabelKaryawan(data) {
  const tbody = document.getElementById('tbody-karyawan');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#94A3B8">
      Tidak ada data karyawan</td></tr>`;
    return;
  }

  const now = new Date();
  const todayMD = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;

  tbody.innerHTML = data.map(k => {
    // Cek ulang tahun
    const p       = String(k.tanggal_lahir||'').split('/');
    const isUltah = p.length >= 2 && p[0]+'/'+p[1] === todayMD;

    return `
      <tr>
        <td style="padding:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <img src="${getPhotoSrc(k.foto_profil_url, k.nama_lengkap, 36)}"
              style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0"
              onerror="this.src='${avatarInisial(k.nama_lengkap, 36)}'">
            <div>
              <div style="font-weight:600;font-size:14px">
                ${k.nama_lengkap} ${isUltah ? '🎂' : ''}
              </div>
              <div style="font-size:11px;color:#64748B">${k.email||''}</div>
            </div>
          </div>
        </td>
        <td style="font-size:13px">${k.nik||'-'}</td>
        <td style="font-size:13px">${k.jabatan||'-'}</td>
        <td style="font-size:13px">${k.departemen||'-'}</td>
        <td style="font-size:12px;color:#64748B">${formatTanggal(k.tanggal_masuk)}</td>
        <td>
          <span style="background:${String(k.status_aktif).toLowerCase()==='true'?'#EBF8EE':'#FFF5F5'};
            color:${String(k.status_aktif).toLowerCase()==='true'?'#1A9E74':'#E53E3E'};
            border:1px solid ${String(k.status_aktif).toLowerCase()==='true'?'#9AE6B4':'#FC8181'};
            padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600">
            ${String(k.status_aktif).toLowerCase()==='true' ? '✅ Aktif' : '❌ Non-aktif'}
          </span>
        </td>
        <td style="text-align:center">
          <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn--ghost" style="padding:5px 10px;font-size:12px"
              onclick="tampilFormEditKaryawan('${k.id_karyawan}')">✏️ Edit</button>
            <button class="btn btn--ghost" style="padding:5px 10px;font-size:12px"
              onclick="lihatProfilKaryawan('${k.id_karyawan}')">👁 Profil</button>
            <button class="btn btn--ghost" style="padding:5px 10px;font-size:12px;color:#2D6CDF"

            ${String(k.status_aktif).toLowerCase()==='true'
              ? `<button class="btn" style="padding:5px 10px;font-size:12px;background:#FFF5F5;color:#E53E3E;border:1px solid #FC8181"
                  onclick="konfirmasiToggleKaryawan('${k.id_karyawan}','${k.nama_lengkap}',false)">🚫 Nonaktif</button>`
              : `<button class="btn" style="padding:5px 10px;font-size:12px;background:#EBF8EE;color:#1A9E74;border:1px solid #9AE6B4"
                  onclick="konfirmasiToggleKaryawan('${k.id_karyawan}','${k.nama_lengkap}',true)">✅ Aktifkan</button>`
            }
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ─── Form Tambah / Edit Karyawan ─────────────────────────────

// Konversi dd/MM/yyyy → yyyy-MM-dd (untuk input type=date)
function toInputDate(str) {
  if (!str) return '';
  str = String(str).trim();
  if (str.includes('-') && str.length === 10) return str; // sudah format yyyy-MM-dd
  const p = str.split('/');
  if (p.length === 3) return p[2]+'-'+p[1].padStart(2,'0')+'-'+p[0].padStart(2,'0');
  return '';
}

// ═══════════════════════════════════════════════════════════════
// ID CARD FINAL — Preview flexbox + PDF koordinat terverifikasi
// ═══════════════════════════════════════════════════════════════

function _idCardPreviewHTML(k, instansi) {
  const nama    = k.nama_lengkap || '-';
  const jabatan = k.jabatan      || '-';
  const dept    = k.departemen   || '-';
  const nik     = String(k.nik   || '-');
  const namaInst= (instansi?.nama_instansi || 'INSTANSI').toUpperCase();
  const logoUrl = instansi?.logo_url ? normalizeDriveUrlFrontend(instansi.logo_url||'') : '';
  const fotoSrc = getPhotoSrc(k.foto_profil_url, k.nama_lengkap, 80);
  const alamat  = (instansi?.alamat_instansi || '').substring(0, 55);

  return `
  <div style="width:100%;height:100%;display:flex;flex-direction:column;
    background:#0f172a;border-radius:inherit;overflow:hidden;font-family:sans-serif">

    <!-- HEADER: logo + nama instansi sejajar tengah -->
    <div style="flex:0 0 22%;display:flex;align-items:center;gap:3%;
      padding:0 3%;background:rgba(0,0,0,.32);
      border-bottom:1px solid rgba(255,255,255,.1);overflow:hidden">
      ${logoUrl ? `
        <img src="${logoUrl}"
          style="height:65%;width:auto;max-width:14%;object-fit:contain;flex-shrink:0;border-radius:3px"
          onerror="this.style.display='none'">` : ''}
      <div style="min-width:0;flex:1">
        <div style="color:#fff;font-weight:700;font-size:.68em;letter-spacing:.3px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.25">
          ${namaInst}
        </div>
        <div style="color:rgba(255,255,255,.42);font-size:.52em;margin-top:.15em">
          ID CARD KARYAWAN
        </div>
      </div>
    </div>

    <!-- BODY: foto kiri + info kanan, vertical center -->
    <div style="flex:1;display:flex;align-items:center;padding:3% 3% 2% 3%;gap:4%;overflow:hidden">

      <!-- Foto: proporsional, border biru -->
      <div style="flex:0 0 34%;aspect-ratio:1/1;border-radius:8%;overflow:hidden;
        border:2px solid rgba(45,108,223,.65);background:#1e3a8a;flex-shrink:0">
        <img src="${fotoSrc}"
          style="width:100%;height:100%;object-fit:cover;display:block"
          onerror="this.src='${avatarInisial(nama, 80)}'">
      </div>

      <!-- Info karyawan -->
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:0">
        <!-- Nama -->
        <div style="color:#fff;font-weight:700;font-size:.88em;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:.25em">
          ${nama}
        </div>
        <!-- Jabatan -->
        <div style="color:#93c5fd;font-size:.68em;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:.15em">
          ${jabatan}
        </div>
        <!-- Dept -->
        <div style="color:#475569;font-size:.6em;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:.4em">
          ${dept}
        </div>
        <!-- NIK box -->
        <div style="background:#1e3a8a;border-radius:5px;padding:.35em .55em">
          <div style="color:#475569;font-size:.5em;letter-spacing:.4px;margin-bottom:.15em">NIK</div>
          <div style="color:#fff;font-weight:700;font-size:.75em;letter-spacing:.3px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${nik}
          </div>
        </div>
      </div>
    </div>

    <!-- FOOTER: alamat + aksen hijau -->
    <div style="flex:0 0 13%;display:flex;overflow:hidden">
      <div style="flex:1;background:#2D6CDF;display:flex;align-items:center;padding:0 3%">
        <span style="color:#fff;font-size:.5em;white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis">${alamat}</span>
      </div>
      <div style="width:10%;background:#1A9E74"></div>
    </div>
  </div>`;
}

async function cetakIDCard(idKaryawan) {
  showToast('Menyiapkan ID Card...', 'info', 2000);
  try {
    const ok = await _ensureJsPDF();
    if (!ok || !window.jspdf?.jsPDF) {
      showToast('Library PDF tidak tersedia. Muat ulang halaman.', 'error', 5000);
      return;
    }
    const [k, inst] = await Promise.all([
      callAPI('getKaryawanById', { id_karyawan: idKaryawan }),
      callAPI('getMultipleSetting', { keys: 'nama_instansi,alamat_instansi,logo_url' })
    ]);
    if (!k) throw new Error('Data karyawan tidak ditemukan');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] });
    const W = 85.6, H = 54;

    // ── Koordinat diturunkan dari HTML em preview ─────────────
    // Header 22% = 12mm | Body 65% = 35mm | Footer 13% = 7mm

    // Background
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(30, 58, 138); doc.triangle(W - 15, 0, W, 0, W, 15, 'F');

    // ── Header (0–12mm) ───────────────────────────────────────
    doc.setFillColor(0, 0, 0, 80); doc.rect(0, 0, W, 12, 'F');
    doc.setDrawColor(255, 255, 255, 25); doc.setLineWidth(0.3); doc.line(0, 12, W, 12);

    let xHdr = 4;
    const rawLogo = inst?.logo_url ? normalizeDriveUrlFrontend(inst.logo_url || '') : '';
    if (rawLogo && rawLogo.startsWith('http')) {
      try {
        const ld = await _urlToBase64(rawLogo);
        // Logo: y=2, h=8 → center di header 12mm
        doc.addImage(ld, 'PNG', 3, 2, 8, 8);
        xHdr = 14;
      } catch(e) {}
    }
    // Nama instansi
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    const namaInst = (inst?.nama_instansi || 'INSTANSI').toUpperCase();
    const namaL = doc.splitTextToSize(namaInst, W - xHdr - 3);
    doc.text(namaL[0], xHdr, namaL.length > 1 ? 5.5 : 6.5);
    if (namaL[1]) doc.text(namaL[1], xHdr, 9.5);
    // "ID CARD KARYAWAN" hanya jika nama 1 baris
    if (namaL.length === 1) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.2); doc.setTextColor(160, 175, 200);
      doc.text('ID CARD KARYAWAN', xHdr, 10.5);
    }

    // ── Foto: x=2.6,y=15.8,w=27.4,h=27.4 (34% width, center di body) ─
    const fX = 3, fY = 15.5, fW = 26, fH = 26;
    doc.setFillColor(30, 58, 138); doc.roundedRect(fX - 1, fY - 1, fW + 2, fH + 2, 2, 2, 'F');
    const rawFoto = k.foto_profil_url ? normalizeDriveUrlFrontend(k.foto_profil_url) : '';
    let fOk = false;
    if (rawFoto && rawFoto.startsWith('http')) {
      try { const fd = await _urlToBase64(rawFoto); doc.addImage(fd, 'JPEG', fX, fY, fW, fH); fOk = true; }
      catch(e) {}
    }
    if (!fOk) {
      doc.setFillColor(45, 108, 223); doc.roundedRect(fX, fY, fW, fH, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
      doc.text((k.nama_lengkap || 'K')[0].toUpperCase(), fX + fW / 2, fY + fH / 2 + 3, { align: 'center' });
    }

    // ── Info: x=33.4, mulai dari y=18 ─────────────────────────
    const xi = 33;
    const maxW = W - xi - 3;

    // Nama — font 10pt bold
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    const namaArr = doc.splitTextToSize(k.nama_lengkap || '-', maxW);
    doc.text(namaArr[0], xi, 22);

    // Jabatan — 7.8pt, biru muda
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(147, 197, 253);
    doc.text(k.jabatan || '-', xi, 27.5, { maxWidth: maxW });

    // Dept — 7pt, abu
    doc.setFontSize(7); doc.setTextColor(71, 85, 105);
    doc.text(k.departemen || '-', xi, 31.5, { maxWidth: maxW });

    // NIK box — y=35,h=8,bottom=43 → 4mm sebelum footer(47)
    const nW = maxW;
    doc.setFillColor(30, 58, 138); doc.roundedRect(xi, 35, nW, 8, 1.5, 1.5, 'F');
    doc.setFontSize(5); doc.setTextColor(71, 85, 105);
    doc.text('NIK', xi + 2.5, 38.8);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
    doc.text(String(k.nik || '-'), xi + 2.5, 42, { maxWidth: nW - 5 });

    // ── Footer (y=47–54) ──────────────────────────────────────
    doc.setFillColor(45, 108, 223); doc.rect(0, 47, W * 0.88, 7, 'F');
    doc.setFillColor(26, 158, 116); doc.rect(W * 0.88, 47, W * 0.12, 7, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(4.5); doc.setTextColor(255, 255, 255);
    const alamat = (inst?.alamat_instansi || '').substring(0, 60);
    if (alamat) doc.text(alamat, W * 0.44, 52, { align: 'center', maxWidth: W * 0.8 });

    doc.save('IDCard_' + (k.nama_lengkap || 'karyawan').replace(/\s+/g, '_') + '.pdf');
    showToast('ID Card berhasil didownload! 🪪', 'success');
  } catch(e) {
    showToast('Gagal cetak ID Card: ' + e.message, 'error', 5000);
    console.error(e);
  }
}

async function lihatProfilKaryawan(idKaryawan) {
  try {
    const k = await callAPI('getKaryawanById', { id_karyawan: idKaryawan });
    if (!k) return;
    const instansi = await callAPI('getMultipleSetting',{keys:'nama_instansi,singkatan_instansi,alamat_instansi'});
    const modal = document.createElement('div');
    modal.id    = 'modal-profil-k';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px);overflow-y:auto';
    const fotoSrc = getPhotoSrc(k.foto_profil_url, k.nama_lengkap, 90);

    // Muat instansi jika belum ada
    if (!instansi) instansi = {};

    modal.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:0;width:100%;max-width:520px;overflow:hidden;animation:fadeInScale 0.2s ease">
        <!-- Header bar -->
        <div style="background:linear-gradient(135deg,var(--color-primer,#2D6CDF),var(--color-sekunder,#1A9E74));
          padding:16px 20px;display:flex;justify-content:space-between;align-items:center">
          <span style="color:#fff;font-weight:700;font-size:15px">👤 Profil Karyawan</span>
          <button onclick="document.getElementById('modal-profil-k').remove()"
            style="background:rgba(255,255,255,.2);border:none;border-radius:50%;width:30px;height:30px;
            color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center">✕</button>
        </div>

        <!-- Data karyawan -->
        <div style="padding:20px;max-height:70vh;overflow-y:auto">
          <div style="display:flex;gap:16px;align-items:center;margin-bottom:20px">
            <img src="${fotoSrc}"
              style="width:80px;height:80px;border-radius:50%;object-fit:cover;
              border:3px solid var(--color-primer,#2D6CDF);flex-shrink:0"
              onerror="this.src='${avatarInisial(k.nama_lengkap,80)}'">
            <div>
              <div style="font-weight:700;font-size:18px;color:#1E293B">${k.nama_lengkap}</div>
              <div style="font-size:13px;color:#64748B;margin-top:2px">${k.jabatan||'-'} · ${k.departemen||'-'}</div>
              <div style="font-size:12px;color:#94A3B8;margin-top:2px">NIK: ${k.nik||'-'}</div>
              <span style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:20px;font-size:11px;
                font-weight:700;background:${String(k.status_aktif).toLowerCase()==='true'?'#EBF8EE':'#FFF5F5'};
                color:${String(k.status_aktif).toLowerCase()==='true'?'#1A9E74':'#E53E3E'}">
                ${String(k.status_aktif).toLowerCase()==='true'?'✅ Aktif':'❌ Non-aktif'}
              </span>
            </div>
          </div>

          <!-- Info rows -->
          <div style="background:#F8FAFC;border-radius:12px;padding:4px 0;margin-bottom:16px">
            ${[
              ['📱','No. HP', k.no_hp],
              ['📧','Email', k.email],
              ['🎂','Tanggal Lahir', formatTanggal(k.tanggal_lahir)],
              ['⚧️','Jenis Kelamin', k.jenis_kelamin==='L'?'Laki-laki':'Perempuan'],
              ['🎓','Pendidikan', k.pendidikan_terakhir],
              ['📅','Bergabung', formatTanggal(k.tanggal_masuk)],
              ['👨‍💼','Atasan', k.nama_atasan],
              ['🏠','Alamat', k.alamat],
              ['🔑','Username', k.username],
              ['🛡️','Role', k.role]
            ].map(r=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;
              border-bottom:1px solid #F1F5F9">
              <span style="font-size:14px;width:20px;text-align:center;flex-shrink:0">${r[0]}</span>
              <span style="font-size:12px;color:#94A3B8;min-width:110px;flex-shrink:0">${r[1]}</span>
              <span style="font-size:13px;color:#1E293B;font-weight:500;word-break:break-word">${r[2]||'-'}</span>
            </div>`).join('')}
          </div>

          <!-- ID Card Preview — diisi setelah modal masuk DOM -->
          <div style="margin-bottom:16px">
            <p style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;
              letter-spacing:.6px;margin-bottom:10px">🪪 ID Card</p>
            <div id="idcard-preview-admin" style="width:100%;max-width:340px;
              aspect-ratio:85.6/54;margin:0 auto;border-radius:12px;overflow:hidden;
              box-shadow:0 8px 24px rgba(0,0,0,.2)">
              <div style="width:100%;height:100%;background:#1e293b;
                display:flex;align-items:center;justify-content:center;color:#64748B;font-size:12px">
                Memuat...
              </div>
            </div>
          </div>

          <!-- Tombol aksi — proporsional tengah -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px">
            <button class="btn btn--primary" style="font-size:13px;padding:11px"
              onclick="cetakIDCard('${k.id_karyawan}')">
              🪪 Cetak ID Card
            </button>
            <button class="btn btn--ghost" style="font-size:13px;padding:11px"
              onclick="document.getElementById('modal-profil-k').remove();tampilFormEditKaryawan('${k.id_karyawan}')">
              ✏️ Edit Data
            </button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });

    // Isi ID Card SETELAH modal masuk DOM → em unit punya referensi ukuran benar
    requestAnimationFrame(() => {
      const wrap = document.getElementById('idcard-preview-admin');
      if (wrap && typeof _idCardPreviewHTML === 'function') {
        wrap.innerHTML = _idCardPreviewHTML(k, instansi);
      }
    });

  } catch(e) { showToast(e.message, 'error'); }
}


// ─── CETAK ID CARD — PDF ──────────────────────────────────────
