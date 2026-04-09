// ============================================================
// laporan.js — Cetak PDF Rekap, Excel, Kwitansi Lembur, Surat SP
// Menggunakan: jsPDF + SheetJS (dimuat dari CDN di index.html)
// ============================================================

// ─── Pastikan library tersedia ───────────────────────────────
async function _ensureJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return true;
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

async function _ensureXLSX() {
  if (typeof XLSX !== 'undefined') return true;
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

// ─────────────────────────────────────────────────────────────
// REKAP ABSENSI KARYAWAN — PDF
// ─────────────────────────────────────────────────────────────
async function cetakRekapPDF(idKaryawan, bulan, tahun, tanggalDari, tanggalKe) {
  showToast('Mempersiapkan dokumen PDF...', 'info', 3000);

  // Pastikan jsPDF sudah dimuat
  const ok = await _ensureJsPDF();
  if (!ok || !window.jspdf?.jsPDF) {
    showToast('Gagal buat PDF: Library jsPDF tidak tersedia. Coba muat ulang halaman.', 'error', 6000);
    return;
  }

  try {
    const payload = { id_karyawan: idKaryawan };
    if (tanggalDari && tanggalKe) {
      payload.tanggal_dari = tanggalDari;
      payload.tanggal_ke   = tanggalKe;
    } else {
      payload.bulan = bulan;
      payload.tahun = tahun;
    }
    const data = await callAPI('getRekapLengkap', payload);
    if (!data) throw new Error('Data tidak ditemukan');

    const { jsPDF } = window.jspdf;
    const doc       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const W  = 210; // lebar A4
    const mL = 20, mR = 20, mT = 15;
    let y    = mT;

    // ── KOP SURAT ──────────────────────────────────────────
    y = await _kopSurat(doc, data.instansi, W, mL, y);

    // ── JUDUL ──────────────────────────────────────────────
    doc.setFontSize(13);
    doc.setFont('helvetica','bold');
    doc.text('REKAP KEHADIRAN KARYAWAN', W/2, y, { align:'center' });
    y += 6;

    const now   = new Date();
    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
                   'Juli','Agustus','September','Oktober','November','Desember'];
    const periodeLabel = bulan
      ? BULAN[parseInt(bulan)-1] + ' ' + tahun
      : (data.periode.tgl_dari + ' s/d ' + data.periode.tgl_ke);

    doc.setFontSize(10);
    doc.setFont('helvetica','normal');
    doc.text('Periode: ' + periodeLabel, W/2, y, { align:'center' });
    y += 3;

    // Garis bawah judul
    doc.setLineWidth(0.5);
    doc.line(mL, y, W-mR, y);
    y += 6;

    // ── DATA KARYAWAN ──────────────────────────────────────
    const k = data.karyawan;
    doc.setFontSize(10);
    const kolKiri  = mL;
    const kolKanan = W/2 + 5;

    const rowKaryawan = [
      [['Nama Lengkap', k.nama_lengkap], ['Jabatan', k.jabatan]],
      [['NIK',          k.nik],          ['Departemen', k.departemen]],
      [['Bergabung',    _fmtTgl(k.tanggal_masuk)], ['Nama Atasan', k.nama_atasan||'-']],
      [['No. HP',       k.no_hp],        ['Email', k.email]]
    ];

    rowKaryawan.forEach(function(row) {
      row.forEach(function(item, colIdx) {
        const xBase = colIdx === 0 ? kolKiri : kolKanan;
        doc.setFont('helvetica','bold');
        doc.text(item[0] + ':', xBase, y);
        doc.setFont('helvetica','normal');
        doc.text(String(item[1]||'-'), xBase + 32, y);
      });
      y += 6;
    });

    doc.setLineWidth(0.3);
    doc.line(mL, y, W-mR, y);
    y += 5;

    // ── RINGKASAN ──────────────────────────────────────────
    doc.setFont('helvetica','bold');
    doc.setFontSize(10);
    doc.text('RINGKASAN KEHADIRAN', mL, y);
    y += 5;

    const r   = data.ringkasan;
    const sts = [
      ['✓ Hadir',     r.hadir,      '#1A9E74'],
      ['⏰ Terlambat', r.terlambat, '#D97706'],
      ['✗ Alfa',      r.alfa,       '#E53E3E'],
      ['📝 Izin',     r.izin,       '#2D6CDF'],
      ['🏥 Sakit',    r.sakit,      '#6B7280'],
      ['🏖️ Cuti',     r.cuti,       '#6C63FF'],
      ['🚗 Dinas Luar',r.dinas_luar,'#EA580C']
    ];

    const colW = (W - mL - mR) / 4;
    sts.forEach(function(s, i) {
      const cx = mL + (i % 4) * colW;
      const cy = y + Math.floor(i / 4) * 12;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(cx, cy-4, colW-3, 10, 2, 2, 'F');
      doc.setFont('helvetica','bold');
      doc.setFontSize(9);
      doc.text(s[0], cx+2, cy+1);
      doc.setFontSize(14);
      doc.text(String(s[1]), cx+2, cy+7);
    });

    y += Math.ceil(sts.length / 4) * 12 + 5;
    doc.setLineWidth(0.3);
    doc.line(mL, y, W-mR, y);
    y += 5;

    // ── TABEL RINCIAN HARIAN ───────────────────────────────
    doc.setFont('helvetica','bold');
    doc.setFontSize(10);
    doc.text('RINCIAN HARIAN', mL, y);
    y += 5;

    // Header tabel
    const cols = [
      { label:'No',     w:8,  x:mL },
      { label:'Tanggal',w:22, x:mL+8 },
      { label:'Hari',   w:18, x:mL+30 },
      { label:'Masuk',  w:18, x:mL+48 },
      { label:'Keluar', w:18, x:mL+66 },
      { label:'Status', w:22, x:mL+84 },
      { label:'Ket',    w:W-mR-mL-84-22, x:mL+106 }
    ];

    doc.setFillColor(45, 108, 223);
    doc.rect(mL, y-4, W-mL-mR, 7, 'F');
    doc.setFontColor(255,255,255);
    doc.setFontSize(9);
    cols.forEach(function(c) {
      doc.text(c.label, c.x+1, y);
    });
    doc.setFontColor(0,0,0);
    y += 4;

    const statusLabel = {
      hadir:'Hadir', terlambat:'Terlambat', alfa:'Alfa',
      izin:'Izin', sakit:'Sakit', cuti:'Cuti', dinas_luar:'Dinas Luar'
    };

    data.absensi.forEach(function(a, i) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      const isGanjil = i % 2 === 0;
      if (isGanjil) {
        doc.setFillColor(248, 250, 252);
        doc.rect(mL, y-3, W-mL-mR, 6.5, 'F');
      }
      doc.setFont('helvetica','normal');
      doc.setFontSize(8.5);
      doc.text(String(i+1),                         cols[0].x+1, y);
      doc.text(String(a.tanggal||'-'),              cols[1].x+1, y);
      doc.text(String(a.hari||'-'),                 cols[2].x+1, y);
      doc.text(String(a.jam_masuk||'-'),            cols[3].x+1, y);
      doc.text(String(a.jam_keluar||'-'),           cols[4].x+1, y);
      doc.text(statusLabel[a.status]||String(a.status||'-'), cols[5].x+1, y);
      const ket = String(a.keterangan||'').substring(0,25);
      doc.text(ket,                                 cols[6].x+1, y);
      y += 6.5;
    });

    // Border tabel
    doc.setLineWidth(0.3);
    const tabelTop    = y - data.absensi.length*6.5 - 9;
    const tabelBottom = y;
    doc.rect(mL, tabelTop, W-mL-mR, tabelBottom-tabelTop);

    y += 10;

    // ── TANDA TANGAN ───────────────────────────────────────
    if (y > 230) { doc.addPage(); y = 20; }
    y = await _kolomTTD(doc, [
      { label: 'Karyawan',      nama: k.nama_lengkap,               ttd: k.tanda_tangan_url },
      { label: 'Atasan',        nama: data.atasan?.nama_lengkap||'-', ttd: data.atasan?.tanda_tangan_url },
      { label: 'HRD',           nama: data.hrd?.nama_lengkap||'-',    ttd: data.hrd?.tanda_tangan_url },
      { label: 'Pimpinan',      nama: data.pimpinan?.nama_lengkap||'-', ttd: data.pimpinan?.tanda_tangan_url }
    ], mL, W-mR, y, doc);

    // ── FOOTER ─────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
      doc.setPage(pg);
      doc.setFontSize(8);
      doc.setFont('helvetica','normal');
      doc.setTextColor(150,150,150);
      doc.text(
        'Dicetak: ' + _nowStr() + ' | Hal ' + pg + '/' + totalPages,
        W/2, 292, { align:'center' }
      );
      doc.setTextColor(0,0,0);
    }

    const namaFile = 'Rekap_' + k.nama_lengkap.replace(/\s/g,'_') + '_' + periodeLabel.replace(/\s/g,'_') + '.pdf';
    doc.save(namaFile);
    showToast('PDF berhasil diunduh! 📄', 'success');

  } catch(e) {
    showToast('Gagal buat PDF: ' + e.message, 'error');
    console.error(e);
  }
}

// ─────────────────────────────────────────────────────────────
// REKAP SEMUA KARYAWAN — EXCEL (SheetJS)
// ─────────────────────────────────────────────────────────────
async function exportRekapExcel(bulan, tahun) {
  showToast('Mempersiapkan file Excel...', 'info', 2000);

  try {
    if (typeof XLSX === 'undefined') throw new Error('Library SheetJS belum dimuat');

    const data = await callAPI('getRekapSemua', { bulan, tahun });
    if (!data) throw new Error('Data tidak tersedia');

    const BULAN  = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];
    const label  = BULAN[parseInt(bulan)-1] + ' ' + tahun;
    const wb     = XLSX.utils.book_new();

    // ── Sheet 1: Rekap Semua ────────────────────────────────
    const headerRow = [
      'No','Nama Karyawan','NIK','Jabatan','Departemen',
      'Hadir','Terlambat','Alfa','Izin','Sakit','Cuti','Dinas Luar','Total Hadir'
    ];

    const rows = data.data.map(function(r, i) {
      return [
        i+1, r.nama, r.nik, r.jabatan, r.departemen,
        r.hadir, r.terlambat, r.alfa, r.izin, r.sakit, r.cuti, r.dinas_luar, r.hadir_total
      ];
    });

    // Baris total
    const total = rows.reduce(function(acc, r) {
      for (let i = 5; i <= 12; i++) acc[i] = (acc[i]||0) + (r[i]||0);
      return acc;
    }, Array(13).fill(''));
    total[0] = '';
    total[1] = 'TOTAL';
    rows.push(total);

    const wsData = [
      ['REKAP KEHADIRAN KARYAWAN — ' + label.toUpperCase()],
      ['Instansi: ' + (data.instansi?.nama_instansi||'-')],
      [],
      headerRow,
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Styling header (warna biru via sheetOpts)
    ws['!cols'] = [
      {wch:5},{wch:25},{wch:14},{wch:20},{wch:18},
      {wch:8},{wch:10},{wch:6},{wch:6},{wch:7},{wch:6},{wch:11},{wch:12}
    ];
    ws['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:12} }];
    ws['!freeze'] = { xSplit: 0, ySplit: 4 };

    // Warnai baris header (baris ke-4, index 3)
    const range  = XLSX.utils.decode_range(ws['!ref']);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r:3, c });
      if (!ws[addr]) ws[addr] = {};
      ws[addr].s = {
        fill: { fgColor: { rgb: '2D6CDF' } },
        font: { color: { rgb: 'FFFFFF' }, bold: true },
        alignment: { horizontal: 'center' }
      };
    }

    // Warnai baris total
    const totalRow = wsData.length - 1;
    for (let c = 0; c <= 12; c++) {
      const addr = XLSX.utils.encode_cell({ r: totalRow, c });
      if (!ws[addr]) ws[addr] = {};
      ws[addr].s = {
        fill: { fgColor: { rgb: 'EBF8EE' } },
        font: { bold: true }
      };
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Rekap ' + label);

    // ── Sheet 2 dst: Per Departemen ──────────────────────────
    const deptMap = {};
    data.data.forEach(function(r) {
      if (!deptMap[r.departemen]) deptMap[r.departemen] = [];
      deptMap[r.departemen].push(r);
    });

    Object.keys(deptMap).forEach(function(dept) {
      const dRows = deptMap[dept].map(function(r, i) {
        return [i+1, r.nama, r.nik, r.jabatan,
                r.hadir, r.terlambat, r.alfa, r.izin, r.sakit, r.cuti, r.dinas_luar, r.hadir_total];
      });
      const dHeader = ['No','Nama','NIK','Jabatan',
                       'Hadir','Terlambat','Alfa','Izin','Sakit','Cuti','Dinas Luar','Total'];
      const dWs = XLSX.utils.aoa_to_sheet([
        [dept.toUpperCase() + ' — ' + label],
        [],
        dHeader,
        ...dRows
      ]);
      dWs['!cols'] = [{wch:4},{wch:22},{wch:12},{wch:18},{wch:7},{wch:10},{wch:6},{wch:6},{wch:7},{wch:6},{wch:10},{wch:8}];
      const sheetName = dept.substring(0,28);
      XLSX.utils.book_append_sheet(wb, dWs, sheetName);
    });

    const namaFile = 'Rekap_Semua_Karyawan_' + label.replace(' ','_') + '.xlsx';
    XLSX.writeFile(wb, namaFile);
    showToast('Excel berhasil diunduh! 📊', 'success');

  } catch(e) {
    showToast('Gagal buat Excel: ' + e.message, 'error');
    console.error(e);
  }
}

// ─────────────────────────────────────────────────────────────
// KWITANSI LEMBUR — PDF
// ─────────────────────────────────────────────────────────────
async function cetakKwitansiLembur(idLembur) {
  showToast('Membuat kwitansi lembur...', 'info', 2000);

  try {
    const data = await callAPI('getDataKwitansi', { id_lembur: idLembur });
    if (!data) throw new Error('Data kwitansi tidak tersedia');

    await _ensureJsPDF();
  const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W   = 210;
    const mL  = 20, mR = 20;
    let y     = 15;

    // Kop surat
    y = await _kopSurat(doc, data.instansi, W, mL, y);

    // Judul
    doc.setFontSize(13);
    doc.setFont('helvetica','bold');
    doc.text('KWITANSI PEMBAYARAN LEMBUR', W/2, y, { align:'center' });
    y += 5;
    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    doc.text('No: ' + data.no_kwitansi, W/2, y, { align:'center' });
    y += 2;
    doc.setLineWidth(0.6);
    doc.line(mL, y, W-mR, y);
    y += 8;

    // Boks kwitansi utama
    doc.setLineWidth(0.4);
    doc.rect(mL, y-4, W-mL-mR, 50);

    const lb = data.lembur;
    const k  = data.karyawan;
    const kwitRow = [
      ['Nama Karyawan',  k.nama_lengkap],
      ['NIK',            k.nik],
      ['Jabatan',        k.jabatan],
      ['Departemen',     k.departemen],
      ['Tanggal Lembur', _fmtTgl(lb.tanggal)],
      ['Waktu',          lb.jam_mulai + ' – ' + lb.jam_selesai + ' (' + lb.total_jam + ' jam)'],
      ['Harga per Jam',  _fmtRp(lb.harga_per_jam)],
      ['Total Bayar',    _fmtRp(lb.total_bayar)]
    ];

    doc.setFontSize(10);
    kwitRow.forEach(function(row) {
      const isTotal = row[0] === 'Total Bayar';
      if (isTotal) {
        doc.setFont('helvetica','bold');
        doc.setFontSize(12);
        doc.setFillColor(235, 248, 238);
        doc.rect(mL, y-4, W-mL-mR, 9, 'F');
      } else {
        doc.setFont('helvetica','normal');
        doc.setFontSize(10);
      }
      doc.text(row[0], mL+3, y);
      doc.text(':', mL+43, y);
      doc.text(row[1], mL+47, y);
      y += isTotal ? 9 : 6;
    });
    y += 5;

    // Terbilang
    doc.setFillColor(255, 248, 220);
    doc.rect(mL, y-4, W-mL-mR, 12, 'F');
    doc.setLineWidth(0.3);
    doc.rect(mL, y-4, W-mL-mR, 12);
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.text('Terbilang:', mL+3, y+1);
    doc.setFont('helvetica','italic');
    doc.text(data.terbilang, mL+3, y+6, { maxWidth: W-mL-mR-6 });
    y += 18;

    // Keterangan
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(100,100,100);
    doc.text('* Kwitansi ini merupakan bukti pembayaran sah yang diterbitkan oleh ' + (data.instansi?.nama_instansi||'instansi'), mL, y);
    doc.setTextColor(0,0,0);
    y += 12;

    // TTD 4 pihak
    if (y > 220) { doc.addPage(); y = 20; }
    y = await _kolomTTD(doc, [
      { label:'Karyawan',  nama: k.nama_lengkap,                ttd: k.tanda_tangan_url },
      { label:'Keuangan',  nama: data.hrd?.nama_lengkap||'-',    ttd: data.hrd?.tanda_tangan_url },
      { label:'HRD',       nama: data.hrd?.nama_lengkap||'-',    ttd: data.hrd?.tanda_tangan_url },
      { label:'Pimpinan',  nama: data.pimpinan?.nama_lengkap||'-', ttd: data.pimpinan?.tanda_tangan_url }
    ], mL, W-mR, y, doc);

    doc.setFontSize(8);
    doc.setTextColor(150,150,150);
    doc.text('Dicetak: ' + _nowStr(), W/2, 292, { align:'center' });

    doc.save('Kwitansi_Lembur_' + k.nama_lengkap.replace(/\s/g,'_') + '_' + (lb.tanggal||'').replace(/\//g,'-') + '.pdf');
    showToast('Kwitansi berhasil diunduh! 🧾', 'success');

  } catch(e) {
    showToast('Gagal cetak kwitansi: ' + e.message, 'error');
    console.error(e);
  }
}

// ─────────────────────────────────────────────────────────────
// SURAT PERINGATAN — PDF (Format Resmi A4)
// ─────────────────────────────────────────────────────────────
async function cetakSuratSP(idSP) {
  showToast('Membuat surat peringatan...', 'info', 2000);

  try {
    const data = await callAPI('getDataSuratSP', { id_sp: idSP });
    if (!data) throw new Error('Data SP tidak tersedia');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W   = 210;
    const mL  = 25, mR = 25;
    let y     = 15;
    const instansi = data.instansi;
    const sp       = data.sp;
    const k        = data.karyawan;

    // Kop surat resmi
    y = await _kopSurat(doc, instansi, W, mL, y);

    // Garis tebal bawah kop
    doc.setLineWidth(1);
    doc.line(mL, y, W-mR, y);
    doc.setLineWidth(0.3);
    doc.line(mL, y+1.2, W-mR, y+1.2);
    y += 8;

    // Nomor surat
    doc.setFontSize(10);
    doc.setFont('helvetica','normal');
    doc.text('Nomor    : ' + data.no_surat, mL, y); y += 6;
    doc.text('Lampiran : -',                mL, y); y += 6;
    doc.text('Hal      : Surat Peringatan ' + sp.jenis_sp + ' (SP-' + sp.jenis_sp.replace('SP','') + ')', mL, y);
    y += 10;

    // Kepada
    doc.text('Kepada Yth.',     mL, y); y += 5;
    doc.setFont('helvetica','bold');
    doc.text('Sdr. ' + k.nama_lengkap, mL, y); y += 5;
    doc.setFont('helvetica','normal');
    doc.text(k.jabatan + ' — ' + k.departemen, mL, y); y += 5;
    doc.text('Di Tempat',       mL, y); y += 10;

    // Pembuka
    doc.setFont('helvetica','normal');
    const pembuka = 'Dengan hormat,';
    doc.text(pembuka, mL, y); y += 6;

    const par1 = 'Sehubungan dengan evaluasi kehadiran dan kedisiplinan kerja di lingkungan ' +
      (instansi?.nama_instansi||'instansi') + ', bersama ini kami sampaikan bahwa Saudara/i:';
    const par1Lines = doc.splitTextToSize(par1, W-mL-mR);
    doc.text(par1Lines, mL, y); y += par1Lines.length * 5.5 + 3;

    // Identitas karyawan (tabel)
    doc.setFillColor(248,250,252);
    doc.rect(mL, y-3, W-mL-mR, 30, 'F');
    doc.setLineWidth(0.3);
    doc.rect(mL, y-3, W-mL-mR, 30);
    doc.setFontSize(10);
    const identitas = [
      ['Nama Lengkap', k.nama_lengkap],
      ['NIK',          k.nik],
      ['Jabatan',      k.jabatan],
      ['Departemen',   k.departemen]
    ];
    identitas.forEach(function(row) {
      doc.setFont('helvetica','bold');   doc.text(row[0], mL+4, y);
      doc.text(':',                      mL+38, y);
      doc.setFont('helvetica','normal'); doc.text(row[1], mL+42, y);
      y += 7;
    });
    y += 2;

    // Alasan
    const par2 = 'Telah melakukan pelanggaran disiplin berupa: ' + sp.alasan +
      '. Total ketidakhadiran tanpa keterangan (alfa): ' + sp.total_hari_alfa_pemicu + ' hari.';
    const par2Lines = doc.splitTextToSize(par2, W-mL-mR);
    doc.setFont('helvetica','normal');
    doc.text(par2Lines, mL, y); y += par2Lines.length * 5.5 + 5;

    // Isi SP formal
    doc.setFont('helvetica','bold');
    doc.text('OLEH KARENA ITU', W/2, y, {align:'center'}); y += 5;
    doc.setFont('helvetica','normal');

    const spNama = { SP1:'PERTAMA', SP2:'KEDUA', SP3:'KETIGA' };
    const isiSP  = 'Kami memberikan SURAT PERINGATAN ' + (spNama[sp.jenis_sp]||'') +
      ' kepada yang bersangkutan. Surat ini berlaku mulai tanggal ' + _fmtTgl(sp.tanggal_berlaku) +
      ' sampai dengan ' + _fmtTgl(sp.tanggal_kadaluarsa) + '.';
    const isiLines = doc.splitTextToSize(isiSP, W-mL-mR);
    doc.text(isiLines, mL, y); y += isiLines.length*5.5 + 5;

    // Konsekuensi
    const konsLines = doc.splitTextToSize(data.konsekuensi, W-mL-mR);
    doc.text(konsLines, mL, y); y += konsLines.length*5.5 + 5;

    // Penutup
    const penutup = 'Demikian surat peringatan ini dibuat agar yang bersangkutan dapat memahami, menerima, dan memperbaiki perilaku kerjanya. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.';
    const penutupLines = doc.splitTextToSize(penutup, W-mL-mR);
    doc.text(penutupLines, mL, y); y += penutupLines.length*5.5 + 8;

    // Tanggal terbit
    const kotaTanggal = ((instansi?.alamat_instansi||'').split(',')[0]||'') + ', ' + _nowTanggal();
    doc.text(kotaTanggal, W-mR, y, {align:'right'}); y += 10;

    // TTD
    if (y > 220) { doc.addPage(); y = 20; }
    y = await _kolomTTD(doc, [
      { label:'Karyawan Yang Diperingatkan', nama: k.nama_lengkap,                ttd: k.tanda_tangan_url },
      { label:'Atasan Langsung',             nama: data.atasan?.nama_lengkap||'-', ttd: data.atasan?.tanda_tangan_url },
      { label:'HRD / Manager SDM',           nama: data.hrd?.nama_lengkap||'-',    ttd: data.hrd?.tanda_tangan_url },
      { label:'Pimpinan',                    nama: data.pimpinan?.nama_lengkap||'-', ttd: data.pimpinan?.tanda_tangan_url }
    ], mL, W-mR, y, doc);

    doc.setFontSize(8);
    doc.setTextColor(150,150,150);
    doc.text('Dokumen ini dicetak secara digital melalui Sistem Absensi Digital | ' + _nowStr(), W/2, 292, { align:'center' });

    doc.save('Surat_SP_' + sp.jenis_sp + '_' + k.nama_lengkap.replace(/\s/g,'_') + '.pdf');
    showToast('Surat SP berhasil diunduh! ⚠️', 'success');

  } catch(e) {
    showToast('Gagal cetak SP: ' + e.message, 'error');
    console.error(e);
  }
}

// ─────────────────────────────────────────────────────────────
// REKAP LEMBUR BULANAN — PDF + EXCEL
// ─────────────────────────────────────────────────────────────
async function cetakRekapLemburPDF(bulan, tahun) {
  showToast('Membuat rekap lembur...', 'info', 2000);

  try {
    const data = await callAPI('getRekapLembur', { bulan, tahun });
    if (!data) throw new Error('Data tidak tersedia');

    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W    = 297; // landscape
    const mL   = 15, mR = 15;
    let y      = 15;

    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
                   'Juli','Agustus','September','Oktober','November','Desember'];
    const label = BULAN[parseInt(bulan)-1] + ' ' + tahun;

    // Kop
    doc.setFontSize(14); doc.setFont('helvetica','bold');
    doc.text(data.instansi?.nama_instansi||'INSTANSI', W/2, y, {align:'center'}); y+=6;
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text(data.instansi?.alamat_instansi||'', W/2, y, {align:'center'}); y+=5;
    doc.setLineWidth(0.8); doc.line(mL, y, W-mR, y); y+=6;

    doc.setFontSize(12); doc.setFont('helvetica','bold');
    doc.text('REKAP LEMBUR KARYAWAN — ' + label.toUpperCase(), W/2, y, {align:'center'}); y+=8;

    // Header tabel
    const hCols = [
      {l:'No',w:8}, {l:'Nama Karyawan',w:40}, {l:'Jabatan',w:35},
      {l:'Tanggal',w:25}, {l:'Jam Mulai',w:20}, {l:'Jam Selesai',w:22},
      {l:'Total Jam',w:18}, {l:'Harga/Jam',w:25}, {l:'Total Bayar',w:28}, {l:'Status',w:22}
    ];
    let xCur = mL;
    hCols.forEach(function(c) { c.x = xCur; xCur += c.w; });

    doc.setFillColor(45,108,223);
    doc.rect(mL, y-4, W-mL-mR, 7, 'F');
    doc.setFontColor(255,255,255);
    doc.setFontSize(8);
    hCols.forEach(function(c) { doc.text(c.l, c.x+1, y); });
    doc.setFontColor(0,0,0);
    y += 4;

    data.data.forEach(function(l, i) {
      if (y > 175) { doc.addPage(); y = 20; }
      if (i%2===0) { doc.setFillColor(248,250,252); doc.rect(mL,y-3,W-mL-mR,6.5,'F'); }
      doc.setFontSize(8); doc.setFont('helvetica','normal');
      const row = [
        String(i+1), l.nama_karyawan, l.jabatan,
        String(l.tanggal||'-'), String(l.jam_mulai||'-'), String(l.jam_selesai||'-'),
        String(l.total_jam||0)+' jam', _fmtRp(l.harga_per_jam), _fmtRp(l.total_bayar),
        String(l.status_bayar||'-')
      ];
      hCols.forEach(function(c, ci) { doc.text(row[ci].substring(0,Math.floor(c.w/2.2)), c.x+1, y); });
      y += 6.5;
    });

    // Baris total
    doc.setFillColor(235,248,238);
    doc.rect(mL, y-3, W-mL-mR, 8, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.text('TOTAL', mL+3, y+1);
    doc.text(String(data.total_jam||0) + ' jam', hCols[6].x+1, y+1);
    doc.text(_fmtRp(data.total_bayar||0), hCols[8].x+1, y+1);
    y += 12;

    // TTD 3 pihak (landscape - 3 kolom)
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    const ttdW    = (W-mL-mR) / 3;
    const ttdPos  = [
      {label:'Dibuat oleh (HRD)', x: mL},
      {label:'Diketahui Atasan',  x: mL + ttdW},
      {label:'Pimpinan',          x: mL + ttdW*2}
    ];
    ttdPos.forEach(function(t) {
      doc.text(t.label, t.x + ttdW/2, y, {align:'center'});
    });
    y += 5;
    ttdPos.forEach(function(t) {
      doc.line(t.x+5, y+22, t.x+ttdW-5, y+22);
    });
    y += 28;
    ttdPos.forEach(function(t) {
      doc.text('(___________________)', t.x+ttdW/2, y, {align:'center'});
    });

    doc.setFontSize(8); doc.setTextColor(150,150,150);
    doc.text('Dicetak: ' + _nowStr(), W/2, 205, {align:'center'});

    doc.save('Rekap_Lembur_' + label.replace(' ','_') + '.pdf');
    showToast('Rekap lembur PDF berhasil diunduh! 📄', 'success');

  } catch(e) {
    showToast('Gagal: ' + e.message, 'error');
  }
}

async function exportRekapLemburExcel(bulan, tahun) {
  try {
    if (typeof XLSX === 'undefined') throw new Error('SheetJS belum dimuat');
    const data = await callAPI('getRekapLembur', { bulan, tahun });
    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
                   'Juli','Agustus','September','Oktober','November','Desember'];
    const label = BULAN[parseInt(bulan)-1] + ' ' + tahun;

    const header = ['No','Nama Karyawan','Jabatan','Departemen','Tanggal',
                    'Jam Mulai','Jam Selesai','Total Jam','Harga/Jam','Total Bayar','Status'];
    const rows   = data.data.map(function(l, i) {
      return [i+1, l.nama_karyawan, l.jabatan, l.departemen, l.tanggal,
              l.jam_mulai, l.jam_selesai, l.total_jam, l.harga_per_jam, l.total_bayar, l.status_bayar];
    });
    rows.push(['','TOTAL','','','','','',data.total_jam,'',data.total_bayar,'']);

    const ws = XLSX.utils.aoa_to_sheet([
      ['REKAP LEMBUR KARYAWAN — ' + label.toUpperCase()],
      ['Instansi: ' + (data.instansi?.nama_instansi||'-')],
      [], header, ...rows
    ]);
    ws['!cols'] = [{wch:4},{wch:25},{wch:20},{wch:18},{wch:12},{wch:10},{wch:12},{wch:10},{wch:14},{wch:16},{wch:14}];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lembur ' + label);
    XLSX.writeFile(wb, 'Rekap_Lembur_' + label.replace(' ','_') + '.xlsx');
    showToast('Excel lembur berhasil diunduh! 📊', 'success');
  } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ─────────────────────────────────────────────────────────────
// HELPER PDF
// ─────────────────────────────────────────────────────────────
async function _kopSurat(doc, instansi, W, mL, y) {
  // Logo (jika ada & bisa dimuat)
  let logoLoaded = false;
  if (instansi?.logo_url && instansi.logo_url.startsWith('http')) {
    try {
      const imgData = await _urlToBase64(instansi.logo_url);
      doc.addImage(imgData, 'PNG', mL, y, 18, 18);
      logoLoaded = true;
    } catch(e) {}
  }

  const xText = logoLoaded ? mL + 22 : mL;
  doc.setFontSize(16);
  doc.setFont('helvetica','bold');
  doc.text((instansi?.nama_instansi||'INSTANSI').toUpperCase(), W/2, y+6, {align:'center'});
  doc.setFontSize(9);
  doc.setFont('helvetica','normal');
  doc.text(instansi?.alamat_instansi||'', W/2, y+12, {align:'center'});
  if (instansi?.telepon_instansi || instansi?.email_instansi) {
    doc.text(
      'Telp: ' + (instansi?.telepon_instansi||'') + ' | Email: ' + (instansi?.email_instansi||''),
      W/2, y+17, {align:'center'}
    );
  }
  y += 22;
  doc.setLineWidth(0.6);
  doc.line(mL, y, W-(W-210)/2-20, y);
  y += 8;
  return y;
}

async function _kolomTTD(doc, signers, xStart, xEnd, y, docRef) {
  const totalW = xEnd - xStart;
  const colW   = totalW / signers.length;
  const tglStr = _nowTanggal();

  doc.setFontSize(9);
  doc.setFont('helvetica','normal');

  // Label & tanggal
  signers.forEach(function(s, i) {
    const cx = xStart + i * colW + colW/2;
    doc.text(s.label, cx, y, {align:'center'});
    doc.text(tglStr,  cx, y+5, {align:'center'});
  });
  y += 10;

  // TTD images
  const ttdY = y;
  await Promise.all(signers.map(async function(s, i) {
    const cx = xStart + i * colW;
    if (s.ttd && s.ttd.startsWith('http')) {
      try {
        const imgData = await _urlToBase64(s.ttd);
        docRef.addImage(imgData, 'PNG', cx + colW/2 - 20, ttdY, 40, 18);
      } catch(e) {}
    }
  }));
  y += 22;

  // Garis TTD
  signers.forEach(function(s, i) {
    const lineX = xStart + i * colW;
    doc.line(lineX + 5, y, lineX + colW - 5, y);
  });
  y += 5;

  // Nama
  signers.forEach(function(s, i) {
    const cx = xStart + i * colW + colW/2;
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.text('(' + (s.nama||'-') + ')', cx, y, {align:'center'});
  });
  doc.setFont('helvetica','normal');
  y += 8;
  return y;
}

async function _urlToBase64(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Gambar tidak dapat dimuat');
  const blob   = await resp.blob();
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload  = function(e) { resolve(e.target.result); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function _fmtTgl(str) {
  if (!str) return '-';
  const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const p = str.split('/');
  if (p.length < 3) return str;
  return parseInt(p[0]) + ' ' + BULAN[parseInt(p[1])-1] + ' ' + p[2];
}

function _fmtRp(n) {
  return 'Rp ' + parseInt(n||0).toLocaleString('id-ID');
}

function _nowStr() {
  const n = new Date();
  return n.toLocaleDateString('id-ID', {day:'2-digit',month:'long',year:'numeric'}) +
         ' ' + n.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'});
}

function _nowTanggal() {
  const n = new Date();
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  return n.getDate() + ' ' + BULAN[n.getMonth()] + ' ' + n.getFullYear();
}
