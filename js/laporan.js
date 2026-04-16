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
  // Coba 3 CDN berbeda
  const CDNs = [
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
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
      doc.text(s[0], cx+3, cy+3);
      doc.setFontSize(16);
      doc.text(String(s[1]), cx+3, cy+12);
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
async function exportRekapExcel(bulan, tahun, tanggalDari, tanggalKe) {
  showToast('Mempersiapkan Excel...', 'info', 2000);
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
    const res = await callAPI('getRekapSemua', payload);
    if (!res || !res.data) throw new Error('Data tidak tersedia');

    const data      = res.data;
    const tglList   = res.tanggal_list || [];
    const tglDari2  = res.tgl_dari || '';
    const tglKe2    = res.tgl_ke   || '';
    const namaInst  = res.instansi?.nama_instansi || 'Instansi';
    const alamat    = res.instansi?.alamat_instansi || '';
    const now       = new Date();
    const tglCetak  = now.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
    const periode   = tglDari2 ? (tglDari2 + ' s/d ' + tglKe2) : '';

    // Status map
    const KODE = { hadir:'H', terlambat:'T', alfa:'A', izin:'I', sakit:'S', cuti:'C', dinas_luar:'DL', libur:'L' };
    const WARNA= { H:'FF1A9E74', T:'FFD97706', A:'FFE53E3E', I:'FF2D6CDF',
                   S:'FF6B7280', C:'FF6C63FF', DL:'FFEA580C', L:'FF94A3B8' };

    // ── Buat AOA ──────────────────────────────────────────
    const aoa = [];
    // Header instansi
    aoa.push([namaInst]);
    aoa.push(['REKAP KEHADIRAN KARYAWAN — ' + periode]);
    aoa.push(['Dicetak: ' + tglCetak]);
    aoa.push([]);

    // Header kolom
    const hdr = ['No','NIK','Nama Karyawan','Jabatan','Departemen'];
    tglList.forEach(tgl => {
      const p = tgl.split('/');
      hdr.push(p[0] + '/' + p[1]);
    });
    hdr.push('H','T','A','I','S','C','DL','L','Total Hadir','% Hadir','Penilaian');
    aoa.push(hdr);

    // Data rows
    data.forEach((k, i) => {
      const row = [i+1, k.nik, k.nama, k.jabatan, k.departemen];
      tglList.forEach(tgl => {
        const st = k.harian?.[tgl] || '';
        row.push(st ? (KODE[st] || st.toUpperCase().slice(0,2)) : '-');
      });
      row.push(k.hadir, k.terlambat, k.alfa, k.izin, k.sakit, k.cuti, k.dinas_luar, k.libur||0,
               k.hadir_total, k.persen_hadir + '%', k.penilaian);
      aoa.push(row);
    });

    // Baris keterangan kode
    aoa.push([]);
    aoa.push(['Keterangan: H=Hadir T=Terlambat A=Alfa I=Izin S=Sakit C=Cuti DL=Dinas Luar L=Libur']);

    // ── Buat worksheet ────────────────────────────────────
    const ws   = XLSX.utils.aoa_to_sheet(aoa);
    const ncol = hdr.length;

    // Lebar kolom
    const wscols = [
      {wch:5},{wch:14},{wch:22},{wch:18},{wch:16}
    ];
    tglList.forEach(() => wscols.push({wch:6}));
    ['H','T','A','I','S','C','DL','L'].forEach(() => wscols.push({wch:5}));
    [{wch:12},{wch:9},{wch:14}].forEach(w => wscols.push(w));
    ws['!cols'] = wscols;

    // Merge header instansi
    ws['!merges'] = [
      {s:{r:0,c:0}, e:{r:0,c:ncol-1}},
      {s:{r:1,c:0}, e:{r:1,c:ncol-1}},
      {s:{r:2,c:0}, e:{r:2,c:ncol-1}},
    ];
    ws['!rows'] = [{hpt:28},{hpt:20},{hpt:16},{hpt:6},{hpt:22}];

    // Style helper
    const enc = (r,c) => XLSX.utils.encode_cell({r,c});
    const bd  = () => ({style:'thin',color:{rgb:'CCCCCC'}});
    const brd = {top:bd(),bottom:bd(),left:bd(),right:bd()};
    const sH1 = {font:{bold:true,sz:13,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E3A5F'}},alignment:{horizontal:'center',vertical:'center'}};
    const sH2 = {font:{bold:true,sz:11,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'2D6CDF'}},alignment:{horizontal:'center',vertical:'center'}};
    const sH3 = {font:{sz:9,color:{rgb:'AAAAAA'}},fill:{fgColor:{rgb:'2C3E50'}},alignment:{horizontal:'center'}};
    const sCol= {font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E3A5F'}},alignment:{horizontal:'center',vertical:'center'},border:brd};
    const sDat= (alt,c2) => ({font:{sz:9},fill:{fgColor:{rgb:alt?'F0F4F8':'FFFFFF'}},alignment:{horizontal:c2>4?'center':'left',vertical:'center'},border:brd});
    const sTotal= {font:{bold:true,sz:9},fill:{fgColor:{rgb:'EFF6FF'}},alignment:{horizontal:'center'},border:{top:{style:'medium',color:{rgb:'2D6CDF'}},bottom:{style:'medium',color:{rgb:'2D6CDF'}},left:bd(),right:bd()}};

    // Apply header row styles
    for(let c2=0;c2<ncol;c2++){
      if(ws[enc(0,c2)]) ws[enc(0,c2)].s = sH1;
      if(ws[enc(1,c2)]) ws[enc(1,c2)].s = sH2;
      if(ws[enc(2,c2)]) ws[enc(2,c2)].s = sH3;
      if(ws[enc(4,c2)]) ws[enc(4,c2)].s = sCol;
    }

    // Apply data rows with status coloring
    const fixedCols = 5;
    const summaryStart = fixedCols + tglList.length;

    data.forEach((k,i) => {
      const r = 5 + i;
      const alt = i%2===1;
      for(let c2=0;c2<ncol;c2++){
        const cell = ws[enc(r,c2)];
        if(!cell) continue;
        if(c2 >= fixedCols && c2 < summaryStart) {
          // Kolom tanggal - warnai per status
          const st = k.harian?.[tglList[c2-fixedCols]] || '';
          const kode = KODE[st] || '';
          const warnaBg = WARNA[kode];
          if(warnaBg && kode !== '-') {
            cell.s = {font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},
                     fill:{fgColor:{rgb:warnaBg}},
                     alignment:{horizontal:'center',vertical:'center'},border:brd};
          } else {
            cell.s = {font:{sz:9,color:{rgb:'BBBBBB'}},
                     fill:{fgColor:{rgb:alt?'F0F4F8':'FFFFFF'}},
                     alignment:{horizontal:'center'},border:brd};
          }
        } else if(c2 >= summaryStart && c2 < summaryStart+8) {
          // Kolom total H/T/A/I/S/C/DL/L
          cell.s = sTotal;
          cell.t = 'n';
        } else if(c2 === summaryStart+8) {
          // Total Hadir
          cell.s = {...sTotal, font:{bold:true,sz:10,color:{rgb:'1E3A5F'}}};
          cell.t = 'n';
        } else if(c2 === summaryStart+9) {
          // % Hadir
          const pct = k.persen_hadir || 0;
          const clr = pct>=95?'1A9E74':pct>=75?'D97706':'E53E3E';
          cell.s = {font:{bold:true,sz:9,color:{rgb:clr}},fill:{fgColor:{rgb:'FFFFFF'}},alignment:{horizontal:'center'},border:brd};
        } else if(c2 === summaryStart+10) {
          // Penilaian
          const pen = k.penilaian||'';
          const clr = pen==='Sangat Baik'?'1A9E74':pen==='Baik'?'0891B2':pen==='Cukup'?'D97706':pen==='Kurang'?'EA580C':'E53E3E';
          cell.s = {font:{bold:true,sz:9,color:{rgb:clr}},fill:{fgColor:{rgb:clr+'22'}},alignment:{horizontal:'center'},border:brd};
        } else {
          cell.s = sDat(alt,c2);
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Kehadiran');
    const fname = 'Rekap_Kehadiran_' + (tglDari2||bulan+'_'+tahun).replace(/\//g,'-') + '.xlsx';
    XLSX.writeFile(wb, fname);
    showToast('Excel berhasil diunduh! 📊','success');
  } catch(e) {
    showToast('Gagal export: ' + e.message, 'error');
    console.error(e);
  }
}


async function cetakKwitansiKaryawan(idKaryawan, tanggalDari, tanggalKe) {
  showToast('Membuat kwitansi...','info',2000);
  const ok = await _ensureJsPDF();
  if (!ok || !window.jspdf?.jsPDF) { showToast('Library PDF tidak tersedia.','error',5000); return; }
  try {
    const semua = await callAPI('getLemburSemua', {});
    const items = (semua||[]).filter(l =>
      String(l.id_karyawan)===String(idKaryawan) &&
      l.status_bayar==='disetujui' &&
      String(l.tanggal||'')>=tanggalDari &&
      String(l.tanggal||'')<=tanggalKe
    );
    if (!items.length) { showToast('Tidak ada lembur disetujui untuk karyawan ini dalam rentang tanggal tersebut','warning',4000); return; }
    const inst = await callAPI('getMultipleSetting',{keys:'nama_instansi,alamat_instansi,telepon_instansi,email_instansi,logo_url'});
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const W=210,mL=20,mR=20;
    let y=15;
    y = await _kopSurat(doc,inst,W,mL,y);
    doc.setFontSize(13);doc.setFont('helvetica','bold');
    doc.text('KWITANSI PEMBAYARAN LEMBUR',W/2,y,{align:'center'});y+=6;
    const noKwt='KWT/'+new Date().getFullYear()+'/'+String(idKaryawan).slice(-6)+'-'+tanggalDari.replace(/\//g,'-');
    doc.setFontSize(9);doc.setFont('helvetica','normal');
    doc.text('No: '+noKwt,W/2,y,{align:'center'});y+=5;
    doc.text('Periode: '+_fmtTgl(tanggalDari)+' s/d '+_fmtTgl(tanggalKe),W/2,y,{align:'center'});y+=3;
    doc.setLineWidth(0.6);doc.line(mL,y,W-mR,y);y+=8;
    const totJam=items.reduce((s,l)=>s+parseFloat(l.total_jam||0),0);
    const totByr=items.reduce((s,l)=>s+parseFloat(l.total_bayar||0),0);
    const nama=String(items[0].nama_karyawan||'-');
    doc.setLineWidth(0.4);doc.rect(mL,y-4,W-mL-mR,24);
    [['Nama Karyawan',nama],['Periode',_fmtTgl(tanggalDari)+' – '+_fmtTgl(tanggalKe)],
     ['Jumlah Lembur',items.length+' kali ('+totJam.toFixed(1)+' jam)'],
     ['Total Bayar',_fmtRp(totByr)]
    ].forEach((row,ri)=>{
      const isTot=ri===3;
      if(isTot){doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setFillColor(235,248,238);doc.rect(mL,y-4,W-mL-mR,9,'F');}
      else{doc.setFont('helvetica','normal');doc.setFontSize(10);}
      doc.text(row[0],mL+3,y);doc.text(':',mL+47,y);doc.text(row[1],mL+51,y);
      y+=isTot?9:6;
    });y+=4;
    doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('Rincian Lembur:',mL,y);y+=6;
    doc.setFillColor(45,108,223);doc.rect(mL,y-5,W-mL-mR,7,'F');
    doc.setTextColor(255,255,255);doc.setFontSize(9);
    doc.text('No',mL+2,y);doc.text('Tanggal',mL+10,y);doc.text('Jam Kerja',mL+45,y);
    doc.text('Durasi',mL+80,y);doc.text('Harga/Jam',mL+100,y);doc.text('Total',mL+135,y);
    doc.setTextColor(0,0,0);y+=4;doc.setFont('helvetica','normal');
    items.forEach((l,i)=>{
      if(i%2===0){doc.setFillColor(248,250,252);doc.rect(mL,y-4,W-mL-mR,7,'F');}
      doc.text(String(i+1),mL+4,y,{align:'center'});
      doc.text(String(_fmtTgl(l.tanggal)||'-'),mL+10,y);
      doc.text(String(l.jam_mulai||'-')+' – '+String(l.jam_selesai||'-'),mL+45,y);
      doc.text(String(l.total_jam||0)+' jam',mL+80,y);
      doc.text(String(_fmtRp(l.harga_per_jam)||'-'),mL+100,y);
      doc.text(String(_fmtRp(l.total_bayar)||'-'),mL+135,y);
      y+=6;if(y>250){doc.addPage();y=20;}
    });
    doc.setLineWidth(0.3);doc.line(mL,y,W-mR,y);y+=4;
    doc.setFillColor(255,248,220);doc.rect(mL,y-3,W-mL-mR,14,'F');
    doc.setLineWidth(0.3);doc.rect(mL,y-3,W-mL-mR,14);
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('Terbilang:',mL+3,y+2);
    doc.setFont('helvetica','italic');
    const terb=typeof _terbilangRupiah==='function'?_terbilangRupiah(totByr):formatRupiah(totByr);
    doc.text(terb,mL+3,y+8,{maxWidth:W-mL-mR-6});y+=18;
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(100,100,100);
    doc.text('* Kwitansi ini merupakan bukti pembayaran sah yang diterbitkan oleh '+String(inst?.nama_instansi||'instansi'),mL,y);y+=8;
    doc.setTextColor(0,0,0);
    if(y>220){doc.addPage();y=20;}
    y = await _kolomTTD(doc,[
      {label:'Karyawan',nama:nama,ttd:''},
      {label:'Keuangan',nama:'',ttd:''},
      {label:'HRD',nama:'',ttd:''},
      {label:'Pimpinan',nama:'',ttd:''},
    ],mL,W-mR,y,doc);
    doc.setFontSize(7.5);doc.setTextColor(150,150,150);
    doc.text('Dicetak: '+_nowStr(),W/2,292,{align:'center'});
    doc.save('Kwitansi_'+nama.replace(/\s+/g,'_')+'_'+tanggalDari.replace(/\//g,'-')+'.pdf');
    showToast('Kwitansi berhasil diunduh! 🧾','success',4000);
  }catch(e){showToast('Gagal cetak kwitansi: '+e.message,'error',6000);console.error(e);}
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
  if (!ok2 || !window.jspdf?.jsPDF) { showToast('Library PDF tidak tersedia. Muat ulang halaman.','error',6000); return; }

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
      ['NIK',          String(k.nik||'-')],
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
  doc.setLineWidth(0.6);
  doc.line(mL, y, W-(W-210)/2-20, y);
  y += 8;
  return y;
}

async function _kolomTTD(doc, signers, xStart, xEnd, y, docRef) {
  const totalW = xEnd - xStart;
  const colW   = totalW / signers.length;
  const tglStr = _nowTanggal();

  doc.setFont('helvetica','normal');
  doc.setFontSize(9);

  // Tanggal hanya di kolom paling kanan (format profesional)
  const lastCx = xStart + (signers.length - 1) * colW + colW / 2;
  doc.text(tglStr, lastCx, y, { align: 'center' });
  y += 6;

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
