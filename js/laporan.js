
// ─── KWITANSI LEMBUR PER KARYAWAN + RENTANG WAKTU ──────────
async function cetakKwitansiKaryawan(idKaryawan, tanggalDari, tanggalKe) {
  showToast('Membuat kwitansi...','info',2000);
  const ok = await _ensureJsPDF();
  if (!ok || !window.jspdf?.jsPDF) { showToast('Library PDF tidak tersedia.','error',5000); return; }
  try {
    const semua = await callAPI('getLemburSemua', {});
    const items = (semua||[]).filter(l =>
      String(l.id_karyawan) === String(idKaryawan) &&
      l.status_bayar === 'disetujui' &&
      String(l.tanggal||'') >= tanggalDari &&
      String(l.tanggal||'') <= tanggalKe
    );
    if (!items.length) {
      showToast('Tidak ada lembur disetujui untuk karyawan ini dalam rentang tanggal tersebut','warning',4000);
      return;
    }
    const inst = await callAPI('getMultipleSetting',{keys:'nama_instansi,alamat_instansi,telepon_instansi,email_instansi,logo_url'});
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const W=210, mL=20, mR=20;
    let y=15;
    y = await _kopSurat(doc, inst, W, mL, y);
    doc.setFontSize(13); doc.setFont('helvetica','bold');
    doc.text('KWITANSI PEMBAYARAN LEMBUR', W/2, y, {align:'center'}); y+=6;
    const noKwt = 'KWT/'+new Date().getFullYear()+'/'+String(idKaryawan).slice(-6)+'-'+tanggalDari.replace(/\//g,'-');
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text('No: '+noKwt, W/2, y, {align:'center'}); y+=5;
    doc.text('Periode: '+_fmtTgl(tanggalDari)+' s/d '+_fmtTgl(tanggalKe), W/2, y, {align:'center'}); y+=3;
    doc.setLineWidth(0.6); doc.line(mL,y,W-mR,y); y+=8;
    const totJam = items.reduce((s,l)=>s+parseFloat(l.total_jam||0),0);
    const totByr = items.reduce((s,l)=>s+parseFloat(l.total_bayar||0),0);
    const nama   = String(items[0].nama_karyawan||'-');
    doc.setLineWidth(0.4); doc.rect(mL,y-4,W-mL-mR,24);
    [['Nama Karyawan',nama],
     ['Periode',_fmtTgl(tanggalDari)+' – '+_fmtTgl(tanggalKe)],
     ['Jumlah Lembur',items.length+' kali ('+totJam.toFixed(1)+' jam)'],
     ['Total Bayar',_fmtRp(totByr)]
    ].forEach((row,ri)=>{
      const isTot=ri===3;
      if(isTot){doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setFillColor(235,248,238);doc.rect(mL,y-4,W-mL-mR,9,'F');}
      else{doc.setFont('helvetica','normal');doc.setFontSize(10);}
      doc.text(row[0],mL+3,y);doc.text(':',mL+47,y);doc.text(row[1],mL+51,y);
      y+=isTot?9:6;
    }); y+=4;
    doc.setFont('helvetica','bold');doc.setFontSize(10);
    doc.text('Rincian Lembur:',mL,y);y+=6;
    doc.setFillColor(45,108,223);doc.rect(mL,y-5,W-mL-mR,7,'F');
    doc.setTextColor(255,255,255);doc.setFontSize(9);
    doc.text('No',mL+2,y);doc.text('Tanggal',mL+10,y);doc.text('Jam Kerja',mL+45,y);
    doc.text('Durasi',mL+80,y);doc.text('Harga/Jam',mL+100,y);doc.text('Total',mL+135,y);
    doc.setTextColor(0,0,0);y+=4;
    doc.setFont('helvetica','normal');
    items.forEach((l,i)=>{
      if(i%2===0){doc.setFillColor(248,250,252);doc.rect(mL,y-4,W-mL-mR,7,'F');}
      doc.text(String(i+1),mL+4,y,{align:'center'});
      doc.text(String(_fmtTgl(l.tanggal)||'-'),mL+10,y);
      doc.text(String(l.jam_mulai||'-')+' – '+String(l.jam_selesai||'-'),mL+45,y);
      doc.text(String(l.total_jam||0)+' jam',mL+80,y);
      doc.text(String(_fmtRp(l.harga_per_jam)||'-'),mL+100,y);
      doc.text(String(_fmtRp(l.total_bayar)||'-'),mL+135,y);
      y+=6; if(y>250){doc.addPage();y=20;}
    });
    doc.setLineWidth(0.3);doc.line(mL,y,W-mR,y);y+=4;
    doc.setFillColor(255,248,220);doc.rect(mL,y-3,W-mL-mR,14,'F');
    doc.setLineWidth(0.3);doc.rect(mL,y-3,W-mL-mR,14);
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('Terbilang:',mL+3,y+2);
    doc.setFont('helvetica','italic');
    const terb = typeof _terbilangRupiah==='function'?_terbilangRupiah(totByr):formatRupiah(totByr);
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
  } catch(e){showToast('Gagal: '+e.message,'error',6000);console.error(e);}
}


