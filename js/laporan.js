// ============================================================
// laporan.js — Cetak PDF Rekap, Excel, Kwitansi Lembur, Surat SP
// Menggunakan: jsPDF + SheetJS (dimuat dari CDN di index.html)
// ============================================================

// ─── Pastikan library tersedia ───────────────────────────────
async function _ensureJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return true;
  const CDNs = [
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
    'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
  ];
  for (const url of CDNs) {
    const ok = await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload  = () => { if(window.jspdf?.jsPDF) resolve(true); else resolve(false); };
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
    if (ok && window.jspdf?.jsPDF) return true;
  }
  return false;
}

async function _ensureXLSX() {
  if (typeof XLSX !== 'undefined') return true;
  // Coba xlsx-js-style (dengan support style) dulu, fallback ke versi polos
  const CDNs = [
    'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js',
    'https://unpkg.com/xlsx-js-style@1.2.0/dist/xlsx.bundle.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
  ];
  for (const url of CDNs) {
    const ok = await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload  = () => { if(typeof XLSX!=='undefined') resolve(true); else resolve(false); };
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
    if (ok && typeof XLSX !== 'undefined') return true;
  }
  return false;
}


// ─────────────────────────────────────────────────────────────
// CETAK ABSENSI HARIAN — PDF
// ─────────────────────────────────────────────────────────────
async function cetakAbsensiHarianPDF(tanggal) {
  showToast('Menyiapkan PDF...', 'info', 2000);
  const ok = await _ensureJsPDF();
  if (!ok || !window.jspdf?.jsPDF) { showToast('Library PDF tidak tersedia. Muat ulang halaman.','error',5000); return; }
  try {
    const [data, karyawanList, instansi] = await Promise.all([
      callAPI('getAbsensiSemua', { tanggal }),
      callAPI('getKaryawanAktif', {}),
      callAPI('getMultipleSetting', { keys:'nama_instansi,alamat_instansi,telepon_instansi,email_instansi,logo_url,website_instansi' })
    ]);
    const karyawanMap = {};
    (karyawanList||[]).forEach(k=>{ karyawanMap[k.id_karyawan]={jabatan:k.jabatan||'-',nik:k.nik||'-'}; });
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    const W=297, mL=15, mR=15;
    let y=15;
    y = await _kopSurat(doc, instansi, W, mL, y);
    doc.setFontSize(12);doc.setFont('helvetica','bold');
    doc.text('DAFTAR HADIR KARYAWAN',W/2,y,{align:'center'});y+=6;
    doc.setFontSize(10);doc.setFont('helvetica','normal');
    const p=tanggal.split('/');
    const HARI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    let tglLabel=tanggal;
    if(p.length===3){const dt=new Date(parseInt(p[2]),parseInt(p[1])-1,parseInt(p[0]));tglLabel=HARI[dt.getDay()]+', '+p[0]+' '+_bulanNamaPDF(p[1])+' '+p[2];}
    doc.text('Tanggal: '+tglLabel,W/2,y,{align:'center'});y+=8;
    const cols=[{header:'No',w:8,align:'center'},{header:'Nama Karyawan',w:60,align:'left'},
      {header:'NIK',w:38,align:'center'},{header:'Jabatan',w:38,align:'left'},
      {header:'Jam Masuk',w:22,align:'center'},{header:'Jam Keluar',w:22,align:'center'},
      {header:'Status',w:26,align:'center'},{header:'Jarak (m)',w:15,align:'center'},
      {header:'Keterangan',w:38,align:'left'}];
    const rowH=7,hdrH=8,xStart=mL;
    const tabelStartY=y;
    doc.setFillColor(45,108,223);doc.rect(xStart,y,W-mL-mR,hdrH,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(8.5);
    let xc=xStart;
    cols.forEach(col=>{doc.text(col.header,xc+col.w/2,y+5.5,{align:'center',maxWidth:col.w-1});xc+=col.w;});
    y+=hdrH;
    doc.setTextColor(0,0,0);doc.setFont('helvetica','normal');doc.setFontSize(8);
    const STATUS_LABEL={hadir:'Hadir',terlambat:'Terlambat',alfa:'Alfa',izin:'Izin',sakit:'Sakit',cuti:'Cuti',dinas_luar:'Dinas Luar',libur:'Libur'};
    const STATUS_COLOR={hadir:[0,158,116],terlambat:[217,119,6],alfa:[229,62,62],izin:[45,108,223],sakit:[107,114,128],cuti:[108,99,255],dinas_luar:[234,88,12],libur:[148,163,184]};
    if(!data||data.length===0){doc.setFontSize(10);doc.setTextColor(148,163,184);doc.text('Tidak ada data absensi untuk tanggal ini.',W/2,y+10,{align:'center'});y+=20;}
    else{
      data.forEach((row,idx)=>{
        const estH=Math.max(rowH,Math.ceil(((row.keterangan||'').length/18))*4.5+3);
        if(y+estH>193){doc.addPage();y=15;
          doc.setFillColor(45,108,223);doc.rect(xStart,y,W-mL-mR,hdrH,'F');
          doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(8.5);
          let xh=xStart;cols.forEach(col=>{doc.text(col.header,xh+col.w/2,y+5.5,{align:'center',maxWidth:col.w-1});xh+=col.w;});
          y+=hdrH;doc.setTextColor(30,41,59);doc.setFont('helvetica','normal');doc.setFontSize(8);}
        if(idx%2===0){doc.setFillColor(248,250,252);doc.rect(xStart,y,W-mL-mR,rowH,'F');}
        const sc=STATUS_COLOR[row.status]||[100,116,139];
        const sl=STATUS_LABEL[row.status]||(row.status||'-');
        const kMap=karyawanMap[row.id_karyawan]||{};
        const jabatan=row.jabatan||kMap.jabatan||'-';
        const nik=row.nik||kMap.nik||row.id_karyawan||'-';
        const ketText=String(row.keterangan||'-');
        const ketLines=doc.splitTextToSize(ketText,cols[8].w-3);
        const dynRowH=Math.max(rowH,ketLines.length*4.5+3);
        if(idx%2===0){doc.setFillColor(248,250,252);doc.rect(xStart,y,W-mL-mR,dynRowH,'F');}
        const rowData=[String(idx+1),String(row.nama_karyawan||'-'),String(nik),String(jabatan),
          String(row.jam_masuk||'-'),String(row.jam_keluar||'-'),String(sl),
          row.jarak_meter_masuk?String(row.jarak_meter_masuk):'-',ketText];
        let xd=xStart;
        rowData.forEach((val,ci)=>{
          const col=cols[ci];
          if(ci===6){doc.setTextColor(sc[0],sc[1],sc[2]);doc.setFont('helvetica','bold');}
          else{doc.setTextColor(30,41,59);doc.setFont('helvetica','normal');}
          const yCenter=y+dynRowH/2;
          if(ci===8){doc.setFontSize(7.5);const wl=doc.splitTextToSize(val,col.w-3);const lineH=4;const sY=y+(dynRowH-wl.length*lineH)/2+3;wl.forEach((line,li)=>{doc.text(line,xd+1.5,sY+li*lineH);});doc.setFontSize(8);}
          else{const tx=col.align==='center'?xd+col.w/2:xd+1.5;doc.text(val,tx,yCenter+1.5,{align:col.align,maxWidth:col.w-2});}
          xd+=col.w;
        });
        doc.setDrawColor(226,232,240);doc.line(xStart,y+dynRowH,xStart+(W-mL-mR),y+dynRowH);
        y+=dynRowH;
      });
    }
    y+=4;
    const ring={hadir:0,terlambat:0,alfa:0,izin:0,sakit:0,cuti:0,dinas_luar:0};
    (data||[]).forEach(r=>{if(ring[r.status]!==undefined)ring[r.status]++;});
    doc.setFontSize(8.5);doc.setFont('helvetica','bold');doc.setTextColor(30,41,59);
    const ringText=['Hadir: '+(ring.hadir+ring.terlambat+ring.dinas_luar),'Terlambat: '+ring.terlambat,'Alfa: '+ring.alfa,'Izin: '+ring.izin,'Sakit: '+ring.sakit,'Cuti: '+ring.cuti,'Dinas Luar: '+ring.dinas_luar,'Total: '+(data||[]).length].join('   |   ');
    doc.text(ringText,W/2,y,{align:'center'});y+=8;
    const spaceNeeded=45;
    if(y+spaceNeeded>195){doc.addPage();y=20;}
    const ttdY=y;
    const ttdPos=[{x:mL,label:'Dibuat oleh,'},{x:W/2-25,label:'Diperiksa,'},{x:W-mR-52,label:'Mengetahui,'}];
    doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(30,41,59);
    // Tanggal hanya di kolom kanan
    doc.text(_nowTanggal(), ttdPos[2].x+25, ttdY, {align:'center'});
    ttdPos.forEach(t=>{
      doc.text(t.label, t.x+25, ttdY+6, {align:'center'});
      doc.line(t.x+5, ttdY+24, t.x+45, ttdY+24);
      doc.text('(......................)', t.x+25, ttdY+28, {align:'center'});
    });
    y = ttdY + 32;
    const totalPages=doc.getNumberOfPages();
    for(let pg=1;pg<=totalPages;pg++){doc.setPage(pg);doc.setFontSize(7.5);doc.setTextColor(148,163,184);doc.text('Dicetak: '+_nowStr()+'   |   Hal '+pg+' dari '+totalPages,W/2,207,{align:'center'});}
    doc.save('Absensi_'+tanggal.replace(/\//g,'-')+'.pdf');
    showToast('PDF berhasil diunduh! 📄','success');
  }catch(e){showToast('Gagal cetak PDF: '+e.message,'error',6000);console.error(e);}
}
function _bulanNamaPDF(b){return['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(b)-1]||'';}

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
      [['NIK',          String(k.nik||'-')],          ['Departemen', k.departemen]],
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
      ['Hadir',      r.hadir,       '#1A9E74'],
      ['Terlambat',  r.terlambat,   '#D97706'],
      ['Alfa',       r.alfa,        '#E53E3E'],
      ['Izin',       r.izin,        '#2D6CDF'],
      ['Sakit',      r.sakit,       '#6B7280'],
      ['Cuti',       r.cuti,        '#6C63FF'],
      ['Dinas Luar', r.dinas_luar,  '#EA580C']
    ];

    const ringColW = (W - mL - mR) / 4;
    const ringH    = 15;
    sts.forEach(function(s, i) {
      const cx  = mL + (i % 4) * ringColW;
      const cy  = y + Math.floor(i / 4) * (ringH + 2);
      const hex = s[2];
      const rv  = parseInt(hex.slice(1,3),16);
      const gv  = parseInt(hex.slice(3,5),16);
      const bv  = parseInt(hex.slice(5,7),16);
      doc.setFillColor(rv,gv,bv);
      doc.setDrawColor(rv,gv,bv);
      doc.rect(cx, cy-3, ringColW-2, ringH, 'F');
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(8);
      // Label di tengah horizontal
      doc.text(s[0], cx + ringColW/2 - 1, cy+3, {align:'center'});
      doc.setFontSize(16);
      // Angka di tengah horizontal dan vertikal
      doc.text(String(s[1]), cx + ringColW/2 - 1, cy+12, {align:'center'});
    });
    doc.setTextColor(0,0,0);
    doc.setDrawColor(0,0,0);
    y += Math.ceil(sts.length / 4) * (ringH + 2) + 4;
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
    doc.setTextColor(255,255,255);
    doc.setFontSize(9);
    cols.forEach(function(c) {
      doc.text(c.label, c.x+1, y);
    });
    doc.setTextColor(0,0,0);
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
    // Kota & tanggal sebelum TTD
    var _alamatRekap = data.instansi?.alamat_instansi || '';
    var _kotaRekap = '';
    var _kabRekap = _alamatRekap.match(/Kab\.?\s+([^,\u2013\-]+)|Kota\s+([^,\u2013\-]+)/i);
    if (_kabRekap) {
      _kotaRekap = (_kabRekap[1] || _kabRekap[2] || '').trim();
    } else {
      var _prRekap = _alamatRekap.split(/[,\u2013]/);
      _kotaRekap = _prRekap[_prRekap.length-1].trim() || _prRekap[0].trim();
    }
    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(0,0,0);
    doc.text((_kotaRekap||'') + ', ' + _nowTanggal(), W-mR, y, {align:'right'});
    y += 8;

    y = await _kolomTTD(doc, [
      { label: 'Karyawan',      nama: k.nama_lengkap,               ttd: k.tanda_tangan_url },
      { label: 'Atasan',        nama: data.atasan?.nama_lengkap||'-', ttd: data.atasan?.tanda_tangan_url },
      { label: 'HRD',           nama: data.hrd?.nama_lengkap||'-',    ttd: data.hrd?.tanda_tangan_url },
      { label: 'Pimpinan',      nama: data.pimpinan?.nama_lengkap||'-', ttd: data.pimpinan?.tanda_tangan_url }
    ], mL, W-mR, y, doc, false);

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
// REKAP SEMUA KARYAWAN — EXCEL (xlsx-js-style, profesional)
// Fitur: color-coded status, freeze panes, auto-filter,
//        baris total, alternating row, weekend highlight
// ─────────────────────────────────────────────────────────────
async function exportRekapExcel(bulan, tahun, tanggalDari, tanggalKe) {
  showToast('Mempersiapkan Excel...', 'info', 2000);
  const ok = await _ensureXLSX();
  if (!ok || typeof XLSX === 'undefined') {
    showToast('Library Excel tidak tersedia.', 'error', 5000);
    return;
  }

  try {
    // ─── Ambil data dari backend ───────────────────────────────
    const payload = {};
    if (tanggalDari && tanggalKe) {
      payload.tanggal_dari = tanggalDari;
      payload.tanggal_ke   = tanggalKe;
    } else {
      payload.bulan = bulan;
      payload.tahun = tahun;
    }
    const res = await callAPI('getRekapSemua', payload);
    if (!res || !res.data) throw new Error('Data tidak tersedia');

    const data     = res.data;
    const tglList  = res.tanggal_list || [];
    const periode  = res.tgl_dari ? `${res.tgl_dari} s/d ${res.tgl_ke}` : '';
    const namaInst = res.instansi?.nama_instansi  || 'Instansi';
    const alamatI  = res.instansi?.alamat_instansi || '';
    const telpInst = res.instansi?.telepon_instansi || '';
    const tglCetak = new Date().toLocaleDateString('id-ID',
      { day:'2-digit', month:'long', year:'numeric' });

    // ─── Konstanta ─────────────────────────────────────────────
    const HARI_PENDEK = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
    const STATUS_KODE = {
      hadir:'H', terlambat:'T', alfa:'A', izin:'I',
      sakit:'S', cuti:'C', dinas_luar:'DL', libur:'L'
    };
    // Color palette profesional (tanpa alpha prefix "FF")
    const WARNA_STATUS = {
      H : { bg:'1A9E74', fg:'FFFFFF' }, // hijau — hadir
      T : { bg:'F59E0B', fg:'FFFFFF' }, // amber — terlambat
      A : { bg:'DC2626', fg:'FFFFFF' }, // merah — alfa
      I : { bg:'3B82F6', fg:'FFFFFF' }, // biru — izin
      S : { bg:'8B5CF6', fg:'FFFFFF' }, // ungu — sakit
      C : { bg:'06B6D4', fg:'FFFFFF' }, // cyan — cuti
      DL: { bg:'EA580C', fg:'FFFFFF' }, // orange — dinas luar
      L : { bg:'94A3B8', fg:'FFFFFF' }  // abu — libur
    };

    // ─── Helpers ───────────────────────────────────────────────
    const enc = (r, c) => XLSX.utils.encode_cell({ r, c });
    const THIN_BORDER = { style:'thin', color:{ rgb:'E2E8F0' } };
    const MED_BORDER  = { style:'medium', color:{ rgb:'1E3A5F' } };
    const brd = { top:THIN_BORDER, bottom:THIN_BORDER, left:THIN_BORDER, right:THIN_BORDER };
    const brdBold = { top:MED_BORDER, bottom:MED_BORDER, left:THIN_BORDER, right:THIN_BORDER };

    // ─── Susun AOA (Array of Arrays) ───────────────────────────
    const FIXED = 5;         // Kolom fixed: No, NIK, Nama, Jabatan, Dept
    const NSUM  = 11;        // Kolom summary: H T A I S C DL L Total % Penilaian

    // Baris:
    //  0 Nama instansi
    //  1 Alamat + telepon
    //  2 Judul laporan (periode)
    //  3 Dicetak tanggal
    //  4 (kosong spacer)
    //  5 Header Hari (untuk kolom tanggal)
    //  6 Header Tanggal DD + label fixed/summary
    //  7+ Data karyawan
    //  N+1 TOTAL (sum per kolom)
    //  N+3 Legend

    const rowHari = ['', '', '', '', ''];
    const rowHeader = ['No', 'NIK', 'Nama Karyawan', 'Jabatan', 'Departemen'];
    tglList.forEach(tgl => {
      const p = tgl.split('/');
      const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
      rowHari.push(HARI_PENDEK[d.getDay()]);
      rowHeader.push(p[0]); // DD saja
    });
    rowHari.push('H','T','A','I','S','C','DL','L','Total','%','Penilaian');
    rowHeader.push('Hadir','Terlambat','Alfa','Izin','Sakit','Cuti','Dinas','Libur','Hadir','Hadir','');

    const aoa = [
      [namaInst],                                                   // 0
      [alamatI + (telpInst ? '  •  Telp: ' + telpInst : '')],      // 1
      ['REKAP KEHADIRAN KARYAWAN' + (periode ? '  —  PERIODE ' + periode : '')], // 2
      ['Dicetak pada: ' + tglCetak],                                // 3
      [],                                                           // 4 spacer
      rowHari,                                                      // 5
      rowHeader                                                     // 6
    ];

    // Baris data
    data.forEach((k, i) => {
      const row = [i+1, k.nik, k.nama, k.jabatan, k.departemen];
      tglList.forEach(tgl => {
        const st = k.harian?.[tgl] || '';
        row.push(st ? (STATUS_KODE[st] || st.slice(0,2).toUpperCase()) : '');
      });
      row.push(
        k.hadir || 0, k.terlambat || 0, k.alfa || 0, k.izin || 0,
        k.sakit || 0, k.cuti || 0, k.dinas_luar || 0, k.libur || 0,
        k.hadir_total || 0, k.persen_hadir || 0, k.penilaian || ''
      );
      aoa.push(row);
    });

    // Baris TOTAL (sum per kolom)
    const totalRow = ['', '', 'TOTAL', '', ''];
    tglList.forEach(() => totalRow.push(''));
    let sumH=0, sumT=0, sumA=0, sumI=0, sumS=0, sumC=0, sumDL=0, sumL=0, sumTotal=0, sumPct=0;
    data.forEach(k => {
      sumH += k.hadir || 0; sumT += k.terlambat || 0; sumA += k.alfa || 0;
      sumI += k.izin || 0; sumS += k.sakit || 0; sumC += k.cuti || 0;
      sumDL += k.dinas_luar || 0; sumL += k.libur || 0;
      sumTotal += k.hadir_total || 0; sumPct += k.persen_hadir || 0;
    });
    const avgPct = data.length > 0 ? Math.round(sumPct / data.length) : 0;
    totalRow.push(sumH, sumT, sumA, sumI, sumS, sumC, sumDL, sumL, sumTotal, avgPct, '');
    aoa.push(totalRow);

    aoa.push([]); // spacer
    // Legend (row biasa)
    aoa.push(['Keterangan:']);
    aoa.push(['H = Hadir','T = Terlambat','A = Alfa','I = Izin','S = Sakit','C = Cuti','DL = Dinas Luar','L = Libur']);

    // ─── Build worksheet ───────────────────────────────────────
    const ws   = XLSX.utils.aoa_to_sheet(aoa);
    const ncol = rowHeader.length;
    const NROW_DATA_START = 7;
    const NROW_DATA_END   = NROW_DATA_START + data.length - 1;
    const NROW_TOTAL      = NROW_DATA_END + 1;

    // ─── Column widths ─────────────────────────────────────────
    ws['!cols'] = [
      { wch: 4 },   // No
      { wch: 14 },  // NIK
      { wch: 26 },  // Nama
      { wch: 20 },  // Jabatan
      { wch: 18 }   // Departemen
    ];
    tglList.forEach(() => ws['!cols'].push({ wch: 5 }));   // Tanggal
    for (let i = 0; i < 8; i++) ws['!cols'].push({ wch: 5 }); // H-L
    ws['!cols'].push({ wch: 7 });  // Total
    ws['!cols'].push({ wch: 7 });  // %
    ws['!cols'].push({ wch: 14 }); // Penilaian

    // ─── Row heights ───────────────────────────────────────────
    ws['!rows'] = [
      { hpt: 28 }, // 0 nama instansi
      { hpt: 16 }, // 1 alamat
      { hpt: 22 }, // 2 judul periode
      { hpt: 14 }, // 3 dicetak
      { hpt: 8 },  // 4 spacer
      { hpt: 22 }, // 5 hari
      { hpt: 24 }  // 6 header
    ];
    for (let i = 0; i < data.length; i++) ws['!rows'].push({ hpt: 18 });
    ws['!rows'].push({ hpt: 22 }); // total
    ws['!rows'].push({ hpt: 8 });  // spacer
    ws['!rows'].push({ hpt: 16 }); // "Keterangan:"
    ws['!rows'].push({ hpt: 16 }); // legend items

    // ─── Merge cells ───────────────────────────────────────────
    ws['!merges'] = [
      { s:{r:0,c:0}, e:{r:0,c:ncol-1} },
      { s:{r:1,c:0}, e:{r:1,c:ncol-1} },
      { s:{r:2,c:0}, e:{r:2,c:ncol-1} },
      { s:{r:3,c:0}, e:{r:3,c:ncol-1} }
    ];
    // Merge hari-header utk kolom fixed (No..Dept span 2 baris)
    for (let c = 0; c < FIXED; c++) {
      ws['!merges'].push({ s:{r:5,c}, e:{r:6,c} });
    }
    // Merge "TOTAL" label di baris total
    ws['!merges'].push({ s:{r:NROW_TOTAL,c:0}, e:{r:NROW_TOTAL,c:FIXED-1} });
    // Span total row kolom tanggal (jadi satu sel besar kosong)
    ws['!merges'].push({ s:{r:NROW_TOTAL,c:FIXED}, e:{r:NROW_TOTAL,c:FIXED+tglList.length-1} });

    // ─── Style helpers ─────────────────────────────────────────
    const styleInst = {
      font: { bold:true, sz:15, color:{ rgb:'FFFFFF' }, name:'Calibri' },
      fill: { patternType:'solid', fgColor:{ rgb:'1E3A5F' } },
      alignment: { horizontal:'center', vertical:'center' }
    };
    const styleAlamat = {
      font: { sz:10, color:{ rgb:'FFFFFF' }, name:'Calibri' },
      fill: { patternType:'solid', fgColor:{ rgb:'1E3A5F' } },
      alignment: { horizontal:'center', vertical:'center' }
    };
    const styleJudul = {
      font: { bold:true, sz:12, color:{ rgb:'FFFFFF' }, name:'Calibri' },
      fill: { patternType:'solid', fgColor:{ rgb:'2D6CDF' } },
      alignment: { horizontal:'center', vertical:'center' }
    };
    const styleCetak = {
      font: { sz:9, italic:true, color:{ rgb:'64748B' }, name:'Calibri' },
      alignment: { horizontal:'center' }
    };
    const styleFixedHeader = {
      font: { bold:true, sz:10, color:{ rgb:'FFFFFF' }, name:'Calibri' },
      fill: { patternType:'solid', fgColor:{ rgb:'1E3A5F' } },
      alignment: { horizontal:'center', vertical:'center', wrapText:true },
      border: brd
    };
    const styleHari = (txt) => {
      const weekend = txt === 'Min' || txt === 'Sab';
      return {
        font: { bold:true, sz:9, color:{ rgb:'FFFFFF' }, name:'Calibri' },
        fill: { patternType:'solid', fgColor:{ rgb: weekend ? '991B1B' : '334155' } },
        alignment: { horizontal:'center', vertical:'center' },
        border: brd
      };
    };
    const styleTgl = (txt) => ({
      font: { bold:true, sz:9, color:{ rgb:'FFFFFF' }, name:'Calibri' },
      fill: { patternType:'solid', fgColor:{ rgb:'475569' } },
      alignment: { horizontal:'center', vertical:'center' },
      border: brd
    });
    const styleSumHeader = {
      font: { bold:true, sz:9, color:{ rgb:'FFFFFF' }, name:'Calibri' },
      fill: { patternType:'solid', fgColor:{ rgb:'1E3A5F' } },
      alignment: { horizontal:'center', vertical:'center' },
      border: brd
    };

    // ─── Apply style: header rows ──────────────────────────────
    for (let c = 0; c < ncol; c++) {
      if (ws[enc(0,c)]) ws[enc(0,c)].s = styleInst;
      if (ws[enc(1,c)]) ws[enc(1,c)].s = styleAlamat;
      if (ws[enc(2,c)]) ws[enc(2,c)].s = styleJudul;
      if (ws[enc(3,c)]) ws[enc(3,c)].s = styleCetak;

      // Row 5: Hari / summary label (hari-of-week bar)
      const h5 = ws[enc(5,c)];
      if (h5) {
        if (c < FIXED) h5.s = styleFixedHeader;
        else if (c < FIXED + tglList.length) h5.s = styleHari(rowHari[c]);
        else h5.s = styleSumHeader;
      }
      // Row 6: Tanggal DD / label fixed/summary
      const h6 = ws[enc(6,c)];
      if (h6) {
        if (c < FIXED || c >= FIXED + tglList.length) h6.s = styleFixedHeader;
        else h6.s = styleTgl(rowHeader[c]);
      }
    }

    // ─── Apply style: data rows ────────────────────────────────
    data.forEach((k, i) => {
      const r = NROW_DATA_START + i;
      const alt = i % 2 === 1;
      const bgAlt = alt ? 'F8FAFC' : 'FFFFFF';

      for (let c = 0; c < ncol; c++) {
        const cell = ws[enc(r, c)];
        if (!cell) continue;

        // === Kolom tanggal (status harian, diwarnai) ===
        if (c >= FIXED && c < FIXED + tglList.length) {
          const tgl  = tglList[c - FIXED];
          const st   = k.harian?.[tgl] || '';
          const kode = STATUS_KODE[st] || '';
          const w    = WARNA_STATUS[kode];

          // Cek hari weekend utk kolom kosong
          const p = tgl.split('/');
          const d = new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
          const weekend = d.getDay() === 0 || d.getDay() === 6;

          if (w) {
            cell.s = {
              font: { bold:true, sz:10, color:{ rgb:w.fg }, name:'Calibri' },
              fill: { patternType:'solid', fgColor:{ rgb:w.bg } },
              alignment: { horizontal:'center', vertical:'center' },
              border: brd
            };
          } else {
            cell.s = {
              font: { sz:9, color:{ rgb:'CBD5E0' }, name:'Calibri' },
              fill: { patternType:'solid', fgColor:{ rgb: weekend ? 'FEE2E2' : bgAlt } },
              alignment: { horizontal:'center', vertical:'center' },
              border: brd
            };
          }
        }
        // === Kolom summary H-L (8 kolom angka) ===
        else if (c >= FIXED + tglList.length && c < FIXED + tglList.length + 8) {
          const val = cell.v;
          const kodeCol = ['H','T','A','I','S','C','DL','L'][c - (FIXED + tglList.length)];
          const w = WARNA_STATUS[kodeCol];
          // Warnai ringan sesuai kode (bg pucat + text dark)
          cell.s = {
            font: { bold:true, sz:10, color:{ rgb:w.bg }, name:'Calibri' },
            fill: { patternType:'solid', fgColor:{ rgb: val > 0 ? w.bg + '22' : bgAlt } },
            alignment: { horizontal:'center', vertical:'center' },
            border: brd
          };
          cell.t = 'n';
        }
        // === Kolom Total Hadir ===
        else if (c === FIXED + tglList.length + 8) {
          cell.s = {
            font: { bold:true, sz:11, color:{ rgb:'1E3A5F' }, name:'Calibri' },
            fill: { patternType:'solid', fgColor:{ rgb:'E0F2FE' } },
            alignment: { horizontal:'center', vertical:'center' },
            border: brd
          };
          cell.t = 'n';
        }
        // === Kolom % Hadir ===
        else if (c === FIXED + tglList.length + 9) {
          const pct = parseInt(k.persen_hadir) || 0;
          const colorText = pct >= 95 ? '065F46' : pct >= 85 ? '1E3A8A' : pct >= 75 ? '92400E' : '991B1B';
          const colorBg   = pct >= 95 ? 'D1FAE5' : pct >= 85 ? 'DBEAFE' : pct >= 75 ? 'FEF3C7' : 'FEE2E2';
          cell.v = pct;
          cell.t = 'n';
          cell.z = '0"%"'; // number format: 95%
          cell.s = {
            font: { bold:true, sz:10, color:{ rgb:colorText }, name:'Calibri' },
            fill: { patternType:'solid', fgColor:{ rgb:colorBg } },
            alignment: { horizontal:'center', vertical:'center' },
            border: brd
          };
        }
        // === Kolom Penilaian ===
        else if (c === FIXED + tglList.length + 10) {
          const pen = k.penilaian || '';
          const colorMap = {
            'Sangat Baik': { text:'065F46', bg:'D1FAE5' },
            'Baik':        { text:'1E3A8A', bg:'DBEAFE' },
            'Cukup':       { text:'92400E', bg:'FEF3C7' },
            'Kurang':      { text:'9A3412', bg:'FFEDD5' },
            'Buruk':       { text:'991B1B', bg:'FEE2E2' }
          };
          const col = colorMap[pen] || { text:'64748B', bg:bgAlt };
          cell.s = {
            font: { bold:true, sz:9, color:{ rgb:col.text }, name:'Calibri' },
            fill: { patternType:'solid', fgColor:{ rgb:col.bg } },
            alignment: { horizontal:'center', vertical:'center' },
            border: brd
          };
        }
        // === Kolom fixed: No, NIK, Nama, Jabatan, Dept ===
        else {
          const align = c === 0 ? 'center' : 'left';
          cell.s = {
            font: { sz:10, color:{ rgb:'1E293B' }, name:'Calibri' },
            fill: { patternType:'solid', fgColor:{ rgb:bgAlt } },
            alignment: { horizontal:align, vertical:'center', indent: c === 0 ? 0 : 1 },
            border: brd
          };
        }
      }
    });

    // ─── Style baris TOTAL ─────────────────────────────────────
    for (let c = 0; c < ncol; c++) {
      const cell = ws[enc(NROW_TOTAL, c)];
      if (!cell) {
        // Tetap create cell kosong utk border continuity
        ws[enc(NROW_TOTAL, c)] = { v:'', t:'s', s:{
          fill: { patternType:'solid', fgColor:{ rgb:'1E3A5F' } },
          border: brdBold
        }};
        continue;
      }
      if (c < FIXED) {
        cell.s = {
          font: { bold:true, sz:11, color:{ rgb:'FFFFFF' }, name:'Calibri' },
          fill: { patternType:'solid', fgColor:{ rgb:'1E3A5F' } },
          alignment: { horizontal:'center', vertical:'center' },
          border: brdBold
        };
      } else if (c >= FIXED && c < FIXED + tglList.length) {
        cell.s = {
          fill: { patternType:'solid', fgColor:{ rgb:'1E3A5F' } },
          border: brdBold
        };
      } else if (c === ncol - 1) {
        // Penilaian column - kosong tapi ada fill
        cell.s = {
          fill: { patternType:'solid', fgColor:{ rgb:'1E3A5F' } },
          border: brdBold
        };
      } else {
        cell.s = {
          font: { bold:true, sz:11, color:{ rgb:'FFFFFF' }, name:'Calibri' },
          fill: { patternType:'solid', fgColor:{ rgb:'1E3A5F' } },
          alignment: { horizontal:'center', vertical:'center' },
          border: brdBold
        };
        if (c === FIXED + tglList.length + 9) {
          // Avg % cell
          cell.v = avgPct;
          cell.z = '0"%"';
          cell.t = 'n';
        } else {
          cell.t = 'n';
        }
      }
    }

    // ─── Style legend rows ─────────────────────────────────────
    const legendRow1 = NROW_TOTAL + 2; // "Keterangan:"
    const legendRow2 = NROW_TOTAL + 3; // items
    if (ws[enc(legendRow1,0)]) {
      ws[enc(legendRow1,0)].s = {
        font: { bold:true, sz:10, color:{ rgb:'1E293B' }, name:'Calibri' }
      };
    }
    const legendKodes = ['H','T','A','I','S','C','DL','L'];
    legendKodes.forEach((kode, idx) => {
      const cell = ws[enc(legendRow2, idx)];
      if (cell) {
        const w = WARNA_STATUS[kode];
        cell.s = {
          font: { bold:true, sz:9, color:{ rgb:w.fg }, name:'Calibri' },
          fill: { patternType:'solid', fgColor:{ rgb:w.bg } },
          alignment: { horizontal:'center', vertical:'center' },
          border: brd
        };
      }
    });

    // ─── Freeze panes ──────────────────────────────────────────
    // Freeze setelah baris header (row 7) dan setelah kolom Nama (col 3)
    ws['!freeze'] = { xSplit: FIXED, ySplit: NROW_DATA_START };
    // Alternative format:
    ws['!views'] = [{
      state: 'frozen',
      xSplit: FIXED,
      ySplit: NROW_DATA_START,
      topLeftCell: XLSX.utils.encode_cell({ r: NROW_DATA_START, c: FIXED }),
      activePane: 'bottomRight'
    }];

    // ─── Auto-filter untuk kolom fixed ─────────────────────────
    // Supaya user bisa filter berdasarkan nama/jabatan/departemen
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({
      s: { r: 6, c: 0 },
      e: { r: NROW_DATA_END, c: FIXED - 1 }
    })};

    // ─── Print setup: landscape, fit 1 page wide ───────────────
    ws['!pageSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 };
    ws['!margins']   = { left:0.3, right:0.3, top:0.4, bottom:0.4, header:0.2, footer:0.2 };

    // ─── Build & download workbook ─────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Kehadiran');
    wb.Props = {
      Title: 'Rekap Kehadiran Karyawan',
      Subject: periode,
      Author: namaInst,
      CreatedDate: new Date()
    };

    const fname = 'Rekap_Kehadiran_' +
      (res.tgl_dari ? res.tgl_dari.replace(/\//g,'-') + '_sd_' + res.tgl_ke.replace(/\//g,'-')
                    : bulan + '_' + tahun) + '.xlsx';
    XLSX.writeFile(wb, fname);
    showToast('✅ Excel profesional berhasil diunduh!', 'success', 4000);
  } catch(e) {
    showToast('Gagal export: ' + e.message, 'error', 6000);
    console.error('exportRekapExcel:', e);
  }
}

async function cetakKwitansiKaryawan(idKaryawan, tanggalDari, tanggalKe) {
  showToast('Membuat kwitansi...', 'info', 2000);
  const ok = await _ensureJsPDF();
  if (!ok || !window.jspdf?.jsPDF) { showToast('Library PDF tidak tersedia.','error',5000); return; }
  try {
    const semua = await callAPI('getLemburSemua', {});
    // Helper sort tanggal dd/MM/yyyy → yyyy/MM/dd
    const _tS = t => { const p=String(t||'').split('/'); return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:''; };
    const items = (semua||[]).filter(l =>
      String(l.id_karyawan)===String(idKaryawan) &&
      l.status_bayar==='disetujui' &&
      _tS(l.tanggal) >= _tS(tanggalDari) && _tS(l.tanggal) <= _tS(tanggalKe)
    );
    if (!items.length) { showToast('Tidak ada lembur disetujui dalam rentang tanggal ini','warning',4000); return; }

    const inst = await callAPI('getMultipleSetting',{keys:'nama_instansi,alamat_instansi,telepon_instansi,email_instansi,logo_url'});
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
    const W=210, mL=20, mR=20;
    let y=15;

    // ── Kop Surat ────────────────────────────────────────────
    y = await _kopSurat(doc, inst, W, mL, y);
    // 1 garis tebal saja (kopSurat sudah buat garis)
    y += 4;

    // ── Judul ────────────────────────────────────────────────
    doc.setFillColor(30,58,138);
    doc.rect(mL, y-5, W-mL-mR, 10, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(13);
    doc.setTextColor(255,255,255);
    doc.text('KWITANSI PEMBAYARAN LEMBUR', W/2, y+1, {align:'center'});
    doc.setTextColor(0,0,0);
    y += 10;

    const noKwt = 'KWT/'+new Date().getFullYear()+'/'+String(idKaryawan).slice(-6)+'-'+tanggalDari.replace(/\//g,'-');
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text('No: '+noKwt, W/2, y, {align:'center'}); y+=5;
    doc.text('Periode: '+_fmtTgl(tanggalDari)+' s/d '+_fmtTgl(tanggalKe), W/2, y, {align:'center'}); y+=6;

    // ── Kotak Ringkasan ───────────────────────────────────────
    const totJam = items.reduce((s,l)=>s+parseFloat(l.total_jam||0),0);
    const totByr = items.reduce((s,l)=>s+parseFloat(l.total_bayar||0),0);
    const nama   = String(items[0].nama_karyawan||'-');

    const rows = [
      ['Nama Karyawan', nama],
      ['Periode',       _fmtTgl(tanggalDari)+' - '+_fmtTgl(tanggalKe)],
      ['Jumlah Lembur', items.length+' kali ('+totJam.toFixed(1)+' jam)'],
    ];
    const boxH = rows.length * 7 + 14;
    doc.setDrawColor(200,200,200); doc.setLineWidth(0.3);
    doc.rect(mL, y, W-mL-mR, boxH);
    const col1=mL+4, col2=mL+52, col3=mL+57;
    let ry = y+7;
    rows.forEach(row => {
      doc.setFont('helvetica','normal'); doc.setFontSize(10);
      doc.text(String(row[0]), col1, ry);
      doc.text(':', col2, ry);
      doc.text(String(row[1]), col3, ry);
      ry += 7;
    });
    // Total Bayar - baris khusus biru
    doc.setFillColor(30,58,138);
    doc.rect(mL, ry-5, W-mL-mR, 10, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.setTextColor(255,255,255);
    doc.text('Total Bayar', col1, ry+1);
    doc.text(':', col2, ry+1);
    doc.text(_fmtRp(totByr), col3, ry+1);
    doc.setTextColor(0,0,0);
    y += boxH + 8;

    // ── Rincian Lembur ────────────────────────────────────────
    doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text('Rincian Lembur:', mL, y); y+=6;

    // Header tabel - profesional biru navy
    // Lebar total = 170mm: No=10, Tanggal=30, JamKerja=38, Durasi=22, Harga=35, Total=35
    const cols = [
      {x:mL+1,   w:10, label:'No',         align:'center'},
      {x:mL+12,  w:30, label:'Tanggal',    align:'left'},
      {x:mL+43,  w:38, label:'Jam Kerja',  align:'center'},
      {x:mL+82,  w:22, label:'Durasi',     align:'center'},
      {x:mL+105, w:34, label:'Harga/Jam',  align:'right'},
      {x:mL+140, w:30, label:'Total',      align:'right'},
    ];

    doc.setFillColor(30,58,138);
    doc.rect(mL, y-5, W-mL-mR, 8, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.setTextColor(255,255,255);
    cols.forEach(col => {
      const tx = col.align==='center' ? col.x+col.w/2 :
                 col.align==='right'  ? col.x+col.w   : col.x;
      doc.text(col.label, tx, y, {align: col.align==='center'?'center':col.align==='right'?'right':'left'});
    });
    doc.setTextColor(0,0,0); y+=5;

    // Baris data
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    items.forEach((l,i) => {
      if(i%2===0){ doc.setFillColor(247,250,252); doc.rect(mL,y-4,W-mL-mR,7,'F'); }
      const rowData = [
        String(i+1),
        String(_fmtTgl(l.tanggal)||'-'),
        String(l.jam_mulai||'-')+' - '+String(l.jam_selesai||'-'),
        String(parseFloat(l.total_jam||0).toFixed(0))+' jam',
        String(_fmtRp(l.harga_per_jam)||'-'),
        String(_fmtRp(l.total_bayar)||'-'),
      ];
      cols.forEach((col,ci) => {
        const tx = col.align==='center' ? col.x+col.w/2 :
                   col.align==='right'  ? col.x+col.w   : col.x;
        doc.text(rowData[ci], tx, y, {align: col.align==='center'?'center':col.align==='right'?'right':'left', maxWidth:col.w});
      });
      y+=7;
      if(y>250){ doc.addPage(); y=20; }
    });

    // Garis bawah tabel
    doc.setDrawColor(180,180,180); doc.setLineWidth(0.3);
    doc.line(mL, y, W-mR, y); y+=6;

    // ── Terbilang ─────────────────────────────────────────────
    const terb = typeof _terbilangRupiah==='function' ? _terbilangRupiah(totByr) : _fmtRp(totByr);
    doc.setFillColor(255,248,220);
    doc.setDrawColor(200,180,100); doc.setLineWidth(0.3);
    doc.rect(mL, y-3, W-mL-mR, 12, 'FD');
    doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.setTextColor(100,70,0);
    doc.text('Terbilang:', mL+3, y+2);
    doc.setFont('helvetica','italic'); doc.setFontSize(9);
    doc.text(String(terb), mL+3, y+8, {maxWidth:W-mL-mR-6});
    doc.setTextColor(0,0,0);
    y += 18;

    // ── Catatan ───────────────────────────────────────────────
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    doc.setTextColor(100,100,100);
    doc.text('* Kwitansi ini merupakan bukti pembayaran sah yang diterbitkan oleh '+String(inst?.nama_instansi||'instansi'), mL, y);
    doc.setTextColor(0,0,0); y+=8;

    if(y>220){ doc.addPage(); y=20; }

    // ── Kota & Tanggal ────────────────────────────────────────
    var alamatFull = inst?.alamat_instansi || '';
    var kotaStr = '';
    var kabMatch = alamatFull.match(/Kab\.?\s+([^,\u2013\-]+)|Kota\s+([^,\u2013\-]+)/i);
    if (kabMatch) {
      kotaStr = (kabMatch[1] || kabMatch[2] || '').trim();
    } else {
      var parts = alamatFull.split(/[,\u2013]/);
      kotaStr = parts[parts.length-1].trim() || parts[0].trim();
    }

    // ── TTD 4 kolom ───────────────────────────────────────────
    var _bersihNama = function(nm) {
      if (!nm || nm==='-' || /super.?admin/i.test(nm)) return '';
      return String(nm);
    };
    // Kota & tanggal di kanan sebelum TTD
    var alamatKwt = inst?.alamat_instansi || '';
    var kotaKwt = '';
    var kabMatchKwt = alamatKwt.match(/Kab\.?\s+([^,\u2013\-]+)|Kota\s+([^,\u2013\-]+)/i);
    if (kabMatchKwt) {
      kotaKwt = (kabMatchKwt[1] || kabMatchKwt[2] || '').trim();
    } else {
      var partsKwt = alamatKwt.split(/[,\u2013]/);
      kotaKwt = partsKwt[partsKwt.length-1].trim() || partsKwt[0].trim();
    }
    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(0,0,0);
    doc.text((kotaKwt||'') + ', ' + _nowTanggal(), W-mR, y, {align:'right'}); y += 8;

    y = await _kolomTTD(doc, [
      {label:'Karyawan',  nama: _bersihNama(nama), ttd:''},
      {label:'Keuangan',  nama:'', ttd:''},
      {label:'HRD',       nama:'', ttd:''},
      {label:'Pimpinan',  nama:'', ttd:''},
    ], mL, W-mR, y, doc, false);

    doc.setFontSize(7.5); doc.setTextColor(150,150,150);
    doc.text('Dicetak: '+_nowStr(), W/2, 292, {align:'center'});
    doc.save('Kwitansi_'+nama.replace(/\s+/g,'_')+'_'+tanggalDari.replace(/\//g,'-')+'.pdf');
    showToast('Kwitansi berhasil diunduh! 🧾','success',4000);
  } catch(e) { showToast('Gagal cetak kwitansi: '+e.message,'error',6000); console.error(e); }
}

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
      ['Nama Karyawan',  String(k.nama_lengkap||'-')],
      ['NIK',            String(k.nik||'-')],
      ['Jabatan',        String(k.jabatan||'-')],
      ['Departemen',     String(k.departemen||'-')],
      ['Tanggal Lembur', String(_fmtTgl(lb.tanggal)||'-')],
      ['Waktu',          String(lb.jam_mulai||'-')+' – '+String(lb.jam_selesai||'-')+' ('+String(lb.total_jam||0)+' jam)'],
      ['Harga per Jam',  String(_fmtRp(lb.harga_per_jam)||'-')],
      ['Total Bayar',    String(_fmtRp(lb.total_bayar)||'-')]
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
      { label:'Karyawan',  nama: String(k.nama_lengkap||'-'), ttd: k.tanda_tangan_url },
      { label:'Keuangan',  nama: '', ttd: '' },
      { label:'HRD',       nama: '', ttd: '' },
      { label:'Pimpinan',  nama: '', ttd: '' }
    ], mL, W-mR, y, doc);

    doc.setFontSize(8);
    doc.setTextColor(150,150,150);
    doc.text('Dicetak: ' + _nowStr(), W/2, 292, { align:'center' });

    doc.save('Kwitansi_Lembur_' + String(k.nama_lengkap||'karyawan').replace(/\s/g,'_') + '_' + (lb.tanggal||'').replace(/\//g,'-') + '.pdf');
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
  const ok2 = await _ensureJsPDF();
  if (!ok2 || !window.jspdf?.jsPDF) { showToast('Library PDF tidak tersedia.','error',6000); return; }

  try {
    const data = await callAPI('getDataSuratSP', { id_sp: idSP });
    if (!data) throw new Error('Data SP tidak tersedia');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const W = 210;
    const mL = 20, mR = 20;
    let y = 15;

    const instansi = data.instansi;
    const sp       = data.sp;
    const k        = data.karyawan;

    // ── Kop Surat ──────────────────────────────────────────────
    y = await _kopSurat(doc, instansi, W, mL, y);
    y += 7;

    // ── Nomor Surat ────────────────────────────────────────────
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.text('Nomor    : ' + data.no_surat, mL, y); y += 5.5;
    doc.text('Lampiran : -',                mL, y); y += 5.5;
    doc.text('Hal      : Surat Peringatan ' + sp.jenis_sp, mL, y); y += 9;

    // ── Kepada ─────────────────────────────────────────────────
    doc.text('Kepada Yth.',          mL, y); y += 5;
    doc.setFont('helvetica','bold');
    doc.text('Sdr. ' + k.nama_lengkap, mL, y); y += 5;
    doc.setFont('helvetica','normal');
    doc.text(k.jabatan + ' - ' + k.departemen, mL, y); y += 5;
    doc.text('Di Tempat', mL, y); y += 9;

    // ── Pembuka ────────────────────────────────────────────────
    doc.text('Dengan hormat,', mL, y); y += 5.5;
    const par1 = 'Sehubungan dengan evaluasi kehadiran dan kedisiplinan kerja di lingkungan ' +
      (instansi?.nama_instansi||'instansi') + ', bersama ini kami sampaikan bahwa Saudara/i:';
    const par1L = doc.splitTextToSize(par1, W-mL-mR);
    doc.text(par1L, mL, y); y += par1L.length * 5 + 4;

    // ── Kotak Identitas Proporsional ───────────────────────────
    const boxH = 32;
    doc.setFillColor(239,246,255);
    doc.setDrawColor(45,108,223);
    doc.setLineWidth(0.4);
    doc.roundedRect(mL, y, W-mL-mR, boxH, 2, 2, 'FD');
    doc.setDrawColor(0,0,0);

    const col1 = mL + 5;   // label x
    const col2 = mL + 50;  // titik dua x
    const col3 = mL + 55;  // nilai x
    const identitas = [
      ['Nama Lengkap', String(k.nama_lengkap||'-')],
      ['NIK',          String(k.nik||'-')],
      ['Jabatan',      String(k.jabatan||'-')],
      ['Departemen',   String(k.departemen||'-')]
    ];
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    let iy = y + 8;
    identitas.forEach(function(row) {
      doc.setFont('helvetica','bold');   doc.text(row[0], col1, iy);
      doc.setFont('helvetica','normal'); doc.text(':', col2, iy);
                                         doc.text(row[1], col3, iy);
      iy += 6.5;
    });
    y += boxH + 5;

    // ── Alasan ─────────────────────────────────────────────────
    const par2 = 'Telah melakukan pelanggaran disiplin berupa: ' + String(sp.alasan||'-') +
      '. Total ketidakhadiran tanpa keterangan (alfa): ' + String(sp.total_hari_alfa_pemicu||0) + ' hari.';
    const par2L = doc.splitTextToSize(par2, W-mL-mR);
    doc.text(par2L, mL, y); y += par2L.length * 5 + 5;

    // ── Isi SP ─────────────────────────────────────────────────
    doc.setFont('helvetica','bold');
    doc.text('OLEH KARENA ITU', W/2, y, {align:'center'}); y += 5;
    doc.setFont('helvetica','normal');
    const spNama = { SP1:'PERTAMA', SP2:'KEDUA', SP3:'KETIGA' };
    const isiSP = 'Kami memberikan SURAT PERINGATAN ' + (spNama[sp.jenis_sp]||'') +
      ' kepada yang bersangkutan. Surat ini berlaku mulai tanggal ' + _fmtTgl(sp.tanggal_berlaku) +
      ' sampai dengan ' + _fmtTgl(sp.tanggal_kadaluarsa) + '.';
    const isiL = doc.splitTextToSize(isiSP, W-mL-mR);
    doc.text(isiL, mL, y); y += isiL.length * 5 + 4;

    // ── Konsekuensi ────────────────────────────────────────────
    const konsL = doc.splitTextToSize(data.konsekuensi, W-mL-mR);
    doc.text(konsL, mL, y); y += konsL.length * 5 + 4;

    // ── Penutup ────────────────────────────────────────────────
    const penutup = 'Demikian surat peringatan ini dibuat agar yang bersangkutan dapat memahami, menerima, dan memperbaiki perilaku kerjanya. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.';
    const penutupL = doc.splitTextToSize(penutup, W-mL-mR);
    doc.text(penutupL, mL, y); y += penutupL.length * 5 + 6;

    // ── Kota & Tanggal (kanan) ─────────────────────────────────
    var alamatFull = instansi?.alamat_instansi || '';
    var kotaStr = '';
    var kabMatch = alamatFull.match(/Kab\.?\s+([^,–\-]+)|Kota\s+([^,–\-]+)/i);
    if (kabMatch) {
      kotaStr = (kabMatch[1] || kabMatch[2] || '').trim();
    } else {
      var parts = alamatFull.split(/[,–]/);
      kotaStr = parts[parts.length-1].trim() || parts[0].trim();
    }
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.text((kotaStr||'') + ', ' + _nowTanggal(), W-mR, y, {align:'right'}); y += 8;

    // ── Tanda Tangan (pastikan muat 1 halaman) ─────────────────
    // Jika y > 220, kompres spacing di atas
    if (y > 225) y = 225;

    var _bersihNama = function(nm) {
      if (!nm || nm === '-' || /super.?admin/i.test(nm)) return '';
      return String(nm);
    };
    y = await _kolomTTD(doc, [
      { label:'Karyawan Yang Diperingatkan', nama: String(k.nama_lengkap||''),             ttd: k.tanda_tangan_url },
      { label:'Atasan Langsung',             nama: _bersihNama(data.atasan?.nama_lengkap), ttd: data.atasan?.tanda_tangan_url },
      { label:'HRD / Manager SDM',           nama: _bersihNama(data.hrd?.nama_lengkap),    ttd: data.hrd?.tanda_tangan_url },
      { label:'Pimpinan',                    nama: _bersihNama(data.pimpinan?.nama_lengkap), ttd: data.pimpinan?.tanda_tangan_url }
    ], mL, W-mR, y, doc, false);

    // ── Footer ─────────────────────────────────────────────────
    doc.setFontSize(8); doc.setTextColor(150,150,150);
    doc.text('Dokumen dicetak digital melalui Sistem Absensi | ' + _nowStr(), W/2, 292, {align:'center'});

    doc.save('Surat_SP_' + sp.jenis_sp + '_' + String(k.nama_lengkap||'').replace(/\s/g,'_') + '.pdf');
    showToast('Surat SP berhasil diunduh!', 'success');

  } catch(e) {
    showToast('Gagal cetak SP: ' + e.message, 'error');
    console.error(e);
  }
}

// ─────────────────────────────────────────────────────────────
// REKAP LEMBUR BULANAN — PDF + EXCEL
// ─────────────────────────────────────────────────────────────
async function cetakRekapLemburPDF(bulan, tahun, tanggalDari, tanggalKe) {
  showToast('Membuat rekap lembur...', 'info', 2000);
  const ok1 = await _ensureJsPDF();
  if (!ok1 || !window.jspdf?.jsPDF) { showToast('Library PDF tidak tersedia. Muat ulang halaman.','error',6000); return; }

  try {
    const lemburPayload = {};
    if (tanggalDari && tanggalKe) {
      lemburPayload.tanggal_dari = tanggalDari;
      lemburPayload.tanggal_ke   = tanggalKe;
    } else {
      lemburPayload.bulan = bulan;
      lemburPayload.tahun = tahun;
    }
    const data = await callAPI('getRekapLembur', lemburPayload);
    if (!data) throw new Error('Data tidak tersedia');

    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W    = 297; // landscape
    const mL   = 15, mR = 15;
    let y      = 15;

    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
                   'Juli','Agustus','September','Oktober','November','Desember'];
    const label = (tanggalDari && tanggalKe)
      ? (data.tgl_dari || tanggalDari) + ' s/d ' + (data.tgl_ke || tanggalKe)
      : (BULAN[parseInt(bulan)-1] || '') + ' ' + (tahun || '');

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
    doc.setTextColor(255,255,255);
    doc.setFontSize(8);
    hCols.forEach(function(c) { doc.text(c.l, c.x+1, y); });
    doc.setTextColor(0,0,0);
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

async function exportRekapLemburExcel(bulan, tahun, tanggalDari, tanggalKe) {
  showToast('Mempersiapkan Excel Lembur...', 'info', 2000);
  try {
    if (typeof XLSX === 'undefined') throw new Error('Library SheetJS belum dimuat');

    const payload = {};
    if (tanggalDari && tanggalKe) {
      payload.tanggal_dari = tanggalDari;
      payload.tanggal_ke   = tanggalKe;
    } else {
      payload.bulan = bulan;
      payload.tahun = tahun;
    }
    const res = await callAPI('getRekapLembur', payload);
    if (!res || !res.data) throw new Error('Data tidak tersedia');

    const grouped   = res.grouped || [];
    const namaInst  = res.instansi?.nama_instansi || 'Instansi';
    const tglDari2  = res.tgl_dari || '';
    const tglKe2    = res.tgl_ke   || '';
    const periode   = tglDari2 ? tglDari2 + ' s/d ' + tglKe2 : '';
    const tglCetak  = new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
    const fmtRp = n => parseInt(n||0).toLocaleString('id-ID');

    const aoa = [];
    aoa.push([namaInst]);
    aoa.push(['REKAP LEMBUR KARYAWAN — ' + periode]);
    aoa.push(['Dicetak: ' + tglCetak]);
    aoa.push([]);

    // Header
    aoa.push(['No','Tanggal','Jam Mulai','Jam Selesai','Total Jam',
              'Tarif/Jam (Rp)','Total Bayar (Rp)','Status Bayar']);

    const enc = (r,c) => XLSX.utils.encode_cell({r,c});
    const bd  = () => ({style:'thin',color:{rgb:'CCCCCC'}});
    const brd = {top:bd(),bottom:bd(),left:bd(),right:bd()};
    const sH1 = {font:{bold:true,sz:13,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E3A5F'}},alignment:{horizontal:'center',vertical:'center'}};
    const sH2 = {font:{bold:true,sz:11,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'2D6CDF'}},alignment:{horizontal:'center',vertical:'center'}};
    const sH3 = {font:{sz:9,color:{rgb:'AAAAAA'}},fill:{fgColor:{rgb:'2C3E50'}},alignment:{horizontal:'center'}};
    const sKar= {font:{bold:true,sz:11,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1A9E74'}},alignment:{horizontal:'left',vertical:'center'},border:brd};
    const sCol= {font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'34495E'}},alignment:{horizontal:'center',vertical:'center'},border:brd};
    const sDat= (alt) => ({font:{sz:9},fill:{fgColor:{rgb:alt?'F0F4F8':'FFFFFF'}},alignment:{vertical:'center'},border:brd});
    const sRp = (alt) => ({font:{sz:9},fill:{fgColor:{rgb:alt?'F0F4F8':'FFFFFF'}},numFmt:'#,##0',alignment:{horizontal:'right',vertical:'center'},border:brd});
    const sSub= {font:{bold:true,sz:10,color:{rgb:'1E3A5F'}},fill:{fgColor:{rgb:'EFF6FF'}},numFmt:'#,##0',alignment:{horizontal:'right',vertical:'center'},border:{top:{style:'medium',color:{rgb:'1A9E74'}},bottom:{style:'medium',color:{rgb:'1A9E74'}},left:bd(),right:bd()}};
    const sGrand={font:{bold:true,sz:11,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E3A5F'}},numFmt:'#,##0',alignment:{horizontal:'right',vertical:'center'}};

    const ws  = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = [
      {s:{r:0,c:0},e:{r:0,c:7}},
      {s:{r:1,c:0},e:{r:1,c:7}},
      {s:{r:2,c:0},e:{r:2,c:7}},
    ];
    ws['!rows'] = [{hpt:28},{hpt:20},{hpt:16},{hpt:6},{hpt:20}];
    ws['!cols'] = [{wch:5},{wch:14},{wch:12},{wch:12},{wch:11},{wch:18},{wch:20},{wch:16}];

    // Apply header styles
    for(let c2=0;c2<=7;c2++){
      if(ws[enc(0,c2)]) ws[enc(0,c2)].s = sH1;
      if(ws[enc(1,c2)]) ws[enc(1,c2)].s = sH2;
      if(ws[enc(2,c2)]) ws[enc(2,c2)].s = sH3;
      if(ws[enc(4,c2)]) ws[enc(4,c2)].s = sCol;
    }

    let curRow = 5; // setelah header (0-indexed)

    grouped.forEach((grp, gi) => {
      // Baris nama karyawan (group header)
      const karRow = [
        (gi+1) + '. ' + grp.nama + '  |  ' + grp.jabatan + '  |  ' + (grp.departemen||'-'),
        '','','','','','',''
      ];
      XLSX.utils.sheet_add_aoa(ws, [karRow], {origin: {r: curRow, c: 0}});
      ws['!merges'] = (ws['!merges']||[]).concat([{s:{r:curRow,c:0},e:{r:curRow,c:7}}]);
      ws['!rows']   = (ws['!rows']||[]);
      while(ws['!rows'].length <= curRow) ws['!rows'].push({hpt:18});
      ws['!rows'][curRow] = {hpt:20};
      for(let c2=0;c2<=7;c2++) if(ws[enc(curRow,c2)]) ws[enc(curRow,c2)].s = sKar;
      curRow++;

      // Rincian lembur
      grp.rincian.forEach((l, li) => {
        const alt = li%2===1;
        const sudah = String(l.status_bayar||'').toLowerCase().includes('sudah');
        const row = [li+1, l.tanggal, l.jam_mulai, l.jam_selesai,
                     parseFloat(l.total_jam||0), parseFloat(l.harga_per_jam||0),
                     parseFloat(l.total_bayar||0),
                     sudah ? 'Sudah Dibayar' : 'Belum Dibayar'];
        XLSX.utils.sheet_add_aoa(ws, [row], {origin:{r:curRow,c:0}});
        while(ws['!rows'].length <= curRow) ws['!rows'].push({hpt:16});
        for(let c2=0;c2<=7;c2++){
          const cell = ws[enc(curRow,c2)];
          if(!cell) continue;
          if(c2===4||c2===5||c2===6){
            cell.s = sRp(alt); cell.t = 'n';
          } else if(c2===7){
            cell.s = {font:{bold:true,sz:9,color:{rgb:sudah?'1A9E74':'D97706'}},
                     fill:{fgColor:{rgb:sudah?'EBF8EE':'FFFAF0'}},
                     alignment:{horizontal:'center'},border:brd};
          } else {
            cell.s = sDat(alt);
          }
        }
        curRow++;
      });

      // Subtotal per karyawan
      const subRow = ['','','','','Subtotal ' + grp.rincian.length + ' sesi:','',
                      parseFloat(grp.total_bayar||0),''];
      XLSX.utils.sheet_add_aoa(ws, [subRow], {origin:{r:curRow,c:0}});
      ws['!merges'] = (ws['!merges']||[]).concat([{s:{r:curRow,c:0},e:{r:curRow,c:4}}]);
      while(ws['!rows'].length <= curRow) ws['!rows'].push({hpt:18});
      for(let c2=0;c2<=7;c2++){
        const cell = ws[enc(curRow,c2)];
        if(!cell) continue;
        if(c2===6){cell.s=sSub;cell.t='n';}
        else cell.s={font:{bold:true,sz:9},fill:{fgColor:{rgb:'EFF6FF'}},border:brd};
      }
      curRow++;
      // Spasi antar karyawan
      XLSX.utils.sheet_add_aoa(ws, [['']], {origin:{r:curRow,c:0}});
      while(ws['!rows'].length <= curRow) ws['!rows'].push({hpt:6});
      curRow++;
    });

    // Grand total
    const gtRow = ['','','','','GRAND TOTAL','',parseFloat(res.total_bayar||0),''];
    XLSX.utils.sheet_add_aoa(ws, [gtRow], {origin:{r:curRow,c:0}});
    ws['!merges'] = (ws['!merges']||[]).concat([{s:{r:curRow,c:0},e:{r:curRow,c:5}}]);
    while(ws['!rows'].length <= curRow) ws['!rows'].push({hpt:22});
    ws['!rows'][curRow] = {hpt:22};
    for(let c2=0;c2<=7;c2++){
      const cell = ws[enc(curRow,c2)];
      if(!cell){
        ws[enc(curRow,c2)] = {v:'', t:'s', s:sGrand};
      } else {
        if(c2===6){cell.s=sGrand;cell.t='n';}
        else cell.s = sGrand;
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Lembur');
    const fname = 'Rekap_Lembur_' + (tglDari2||bulan+'_'+tahun).replace(/\//g,'-') + '.xlsx';
    XLSX.writeFile(wb, fname);
    showToast('Excel lembur berhasil diunduh! 📊','success');
  } catch(e) {
    showToast('Gagal export: ' + e.message, 'error');
    console.error(e);
  }
}


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
  doc.setLineWidth(0.8);
  doc.line(mL, y, W-mL, y);
  y += 6;
  return y;
}

async function _kolomTTD(doc, signers, xStart, xEnd, y, docRef, showTanggal) {
  const totalW = xEnd - xStart;
  const colW   = totalW / signers.length;
  const tglStr = _nowTanggal();

  doc.setFont('helvetica','normal');
  doc.setFontSize(9);

  // Tanggal hanya di kolom paling kanan — bisa dimatikan lewat showTanggal=false
  if (showTanggal !== false) {
    const lastCx = xStart + (signers.length - 1) * colW + colW / 2;
    doc.text(tglStr, lastCx, y, { align: 'center' });
    y += 6;
  }

  // Label jabatan tiap kolom
  signers.forEach(function(s, i) {
    const cx = xStart + i * colW + colW / 2;
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.text(s.label, cx, y, { align: 'center' });
  });
  y += 5;

  // Gambar TTD jika ada
  const ttdY = y;
  await Promise.all(signers.map(async function(s, i) {
    const cx = xStart + i * colW;
    if (s.ttd && s.ttd.startsWith('http')) {
      try {
        const imgData = await _urlToBase64(s.ttd);
        docRef.addImage(imgData, 'PNG', cx + colW/2 - 15, ttdY, 30, 16);
      } catch(e) {}
    }
  }));
  y += 20;

  // Garis tanda tangan
  signers.forEach(function(s, i) {
    const lx = xStart + i * colW;
    doc.setLineWidth(0.4);
    doc.line(lx + 4, y, lx + colW - 4, y);
  });
  y += 4;

  // Nama dalam kurung
  signers.forEach(function(s, i) {
    const cx = xStart + i * colW + colW / 2;
    const nm = (s.nama || '').trim();
    doc.setFont('helvetica','normal');
    doc.setFontSize(8.5);
    if (nm && nm !== '-') {
      doc.text('(' + nm + ')', cx, y, { align: 'center', maxWidth: colW - 6 });
    } else {
      doc.text('(......................)', cx, y, { align: 'center' });
    }
  });

  doc.setFont('helvetica','normal');
  doc.setLineWidth(0.3);
  y += 6;
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

// ─── FALLBACK: Export CSV jika XLSX gagal ───────────────────
async function _exportFallbackCSV(bulan, tahun) {
  try {
    const rekapPayload = {};
    if (tanggalDari && tanggalKe) {
      rekapPayload.tanggal_dari = tanggalDari;
      rekapPayload.tanggal_ke   = tanggalKe;
    } else {
      rekapPayload.bulan = bulan;
      rekapPayload.tahun = tahun;
    }
    const data = await callAPI('getRekapSemua', rekapPayload);
    if (!data || data.length === 0) { showToast('Tidak ada data', 'warning'); return; }
    const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const label = BULAN[parseInt(bulan)-1] + '_' + tahun;
    const header = ['Nama','Departemen','Jabatan','Hadir','Terlambat','Alfa','Izin','Sakit','Cuti','Dinas Luar','Skor'];
    const rows = data.map(k => [
      k.nama_lengkap, k.departemen, k.jabatan,
      k.total_hadir||0, k.total_terlambat||0, k.total_alfa||0,
      k.total_izin||0, k.total_sakit||0, k.total_cuti||0, k.total_dinas_luar||0,
      k.skor_kehadiran||0
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'Rekap_' + label + '.csv';
    a.click(); URL.revokeObjectURL(url);
    showToast('File CSV berhasil didownload ✅', 'success');
  } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

async function _exportFallbackCSVLembur(bulan, tahun) {
  try {
    const lemburPayload = {};
    if (tanggalDari && tanggalKe) {
      lemburPayload.tanggal_dari = tanggalDari;
      lemburPayload.tanggal_ke   = tanggalKe;
    } else {
      lemburPayload.bulan = bulan;
      lemburPayload.tahun = tahun;
    }
    const data = await callAPI('getRekapLembur', lemburPayload);
    if (!data || !data.lembur || data.lembur.length === 0) { showToast('Tidak ada data lembur', 'warning'); return; }
    const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const label = BULAN[parseInt(bulan)-1] + '_' + tahun;
    const header = ['Nama','Jabatan','Tanggal','Jam Mulai','Jam Selesai','Total Jam','Harga/Jam','Total Bayar','Status'];
    const rows = data.lembur.map(l => [
      l.nama_karyawan, l.jabatan||'', l.tanggal, l.jam_mulai, l.jam_selesai,
      l.total_jam, l.harga_per_jam, l.total_bayar, l.status_bayar||'pending'
    ]);
    const csv = [header, ...rows].map(r => r.map(c => '"'+c+'"').join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'Lembur_' + label + '.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('File CSV Lembur berhasil didownload ✅', 'success');
  } catch(e) { showToast('Gagal: ' + e.message, 'error'); }
}

// ─── Helper: Buat worksheet rekap harian ─────────────────────
function _buatWorksheetHarian(data, absensiHarian, instansiInfo, label) {
  if (!data || !data.length || !XLSX) return null;
  const tanggalSet = new Set();
  (absensiHarian||[]).forEach(a=>{ if(a.tanggal) tanggalSet.add(a.tanggal); });
  const tanggals = Array.from(tanggalSet).sort();
  const KODE = {hadir:'H',terlambat:'T',alfa:'A',izin:'I',sakit:'S',cuti:'C',dinas_luar:'DL',libur:'L'};
  const namaInst = instansiInfo?.nama_instansi || 'INSTANSI';
  const rows = [
    [namaInst],
    [instansiInfo?.alamat_instansi||''],
    ['REKAP ABSENSI - ' + label.toUpperCase()],
    [],
    ['No','NIK','Nama','Jabatan','Dept',
      ...tanggals.map(t=>{const p=t.split('/');return p[0]+'/'+p[1];}),
      'Hadir','Telat','Alfa','Izin','Sakit','Cuti','DL','Skor']
  ];
  data.forEach((k,i)=>{
    const row=[i+1,k.nik||'',k.nama_lengkap||'',k.jabatan||'',k.departemen||''];
    let h=0,t2=0,a=0,iz=0,s=0,c2=0,dl=0;
    tanggals.forEach(tgl=>{
      const ab=(absensiHarian||[]).find(x=>String(x.id_karyawan)===String(k.id_karyawan)&&x.tanggal===tgl);
      const kode=ab?(KODE[ab.status]||ab.status.substring(0,2).toUpperCase()):'L';
      row.push(kode);
      if(kode==='H')h++; else if(kode==='T'){h++;t2++;} else if(kode==='A')a++;
      else if(kode==='I')iz++; else if(kode==='S')s++; else if(kode==='C')c2++;
      else if(kode==='DL')dl++;
    });
    const skor=(h*100)+(t2*60)+(iz*80)+(s*90)+(c2*85)+(dl*95)-(a*150);
    row.push(h,t2,a,iz,s,c2,dl,skor);
    rows.push(row);
  });
  rows.push([]);
  rows.push(['H=Hadir T=Terlambat A=Alfa I=Izin S=Sakit C=Cuti DL=Dinas Luar L=Libur']);
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:4},{wch:14},{wch:22},{wch:18},{wch:14},...tanggals.map(()=>({wch:5})),
    {wch:7},{wch:7},{wch:6},{wch:6},{wch:6},{wch:6},{wch:6},{wch:8}];
  ws['!merges']=[
    {s:{r:0,c:0},e:{r:0,c:4+tanggals.length+7}},
    {s:{r:1,c:0},e:{r:1,c:4+tanggals.length+7}},
    {s:{r:2,c:0},e:{r:2,c:4+tanggals.length+7}},
  ];
  return ws;
}
