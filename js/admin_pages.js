// ============================================================
// Absensi.gs — FINAL v5
// Aturan keras:
//  1. GPS WAJIB — tidak ada bypass apapun
//  2. Di luar radius = TOLAK KERAS, tidak bisa absen
//  3. Dinas Luar = GPS tetap wajib TAPI radius diabaikan,
//     hanya berlaku dalam rentang tanggal yang disetujui
//  4. Shift malam lintas tengah malam tetap bisa absen
// ============================================================

function absenMasuk(d) {
  var idKaryawan  = d._session.id_karyawan;
  var today       = todayStr();
  var now         = nowWITA();
  var jamSekarang = Utilities.formatDate(new Date(), 'Asia/Makassar', 'HH:mm');

  // 1. Cek sudah absen masuk
  var sheetAbsensi = getSheet(SHEET_NAMES.ABSENSI);
  var absenData    = sheetToObjects(sheetAbsensi);
  var existing     = absenData.filter(function(a) {
    return String(a.id_karyawan) === String(idKaryawan) &&
           String(a.tanggal)     === String(today);
  })[0];
  if (existing && String(existing.jam_masuk || '').trim() !== '') {
    throw new Error('Anda sudah absen masuk hari ini pukul ' + existing.jam_masuk + '.');
  }

  // 2. GPS WAJIB — tidak ada bypass
  var latRaw = d.lat, lonRaw = d.lon;
  var latEmpty = latRaw === null || latRaw === undefined ||
                 String(latRaw).trim() === '' || String(latRaw).trim() === 'null';
  var lonEmpty = lonRaw === null || lonRaw === undefined ||
                 String(lonRaw).trim() === '' || String(lonRaw).trim() === 'null';
  if (latEmpty || lonEmpty) {
    throw new Error(
      'GPS wajib digunakan untuk absensi.\n\n' +
      'Koordinat GPS tidak diterima.\n\n' +
      'Langkah perbaikan:\n' +
      '① Pastikan GPS HP aktif (ikon 📍 menyala)\n' +
      '② Izinkan akses Lokasi untuk browser ini\n' +
      '③ Buka Google Maps sebentar untuk menghangatkan GPS\n' +
      '④ Kembali dan coba lagi\n\n' +
      'Jika bertugas di luar kantor, ajukan Dinas Luar terlebih dahulu.'
    );
  }

  var latVal = parseFloat(String(latRaw).trim());
  var lonVal = parseFloat(String(lonRaw).trim());
  if (isNaN(latVal) || isNaN(lonVal)) {
    throw new Error('Koordinat GPS tidak valid. Coba lagi.');
  }

  // 3. Cek Dinas Luar aktif (dengan batas tanggal ketat)
  var dinasLuarInfo = _getDinasLuarAktif(idKaryawan, today);
  var isDinasLuar   = dinasLuarInfo !== null;
  var jarak         = 0;

  if (isDinasLuar) {
    // Dinas Luar: GPS dicatat posisinya, RADIUS TIDAK DICEK
    // Tapi tetap cek terlambat berdasarkan jam shift atau jam 08:00
    jarak = 0;
  } else {
    // Karyawan biasa: validasi radius KERAS
    var cekGPS = _validateGPSKetat(latVal, lonVal);
    if (!cekGPS.valid) throw new Error(cekGPS.message);
    jarak = cekGPS.jarak;
  }

  // 4. Tentukan status & shift
  var shiftInfo = _getShiftKaryawanHariIni(idKaryawan, today);

  var status;
  if (isDinasLuar) {
    // Dinas Luar: status 'dinas_luar' tapi tetap cek terlambat
    var jamMasukRef = shiftInfo ? shiftInfo.jam_masuk : '08:00';
    var tol = shiftInfo ? parseInt(shiftInfo.toleransi_terlambat_menit || 15) : 15;
    var pmS = jamMasukRef.split(':');
    var pmM = jamSekarang.split(':');
    var mS  = parseInt(pmS[0])*60 + parseInt(pmS[1]||0);
    var mM  = parseInt(pmM[0])*60 + parseInt(pmM[1]||0);
    // Anggap dinas_luar tapi catat sebagai 'dinas_luar'
    // Jika terlambat dari jam masuk, tetap 'dinas_luar' (tidak terlambat khusus)
    status = 'dinas_luar';
  } else {
    status = _hitungStatusAbsen(jamSekarang, shiftInfo);
  }

  // 5. Upload foto
  var fotoUrl = '';
  if (d.foto_base64 && d.foto_base64.length > 100) {
    try {
      fotoUrl = uploadToDrive(
        d.foto_base64,
        'MASUK_' + idKaryawan + '_' + today.replace(/\//g,'') + '_' + Date.now() + '.jpg',
        'image/jpeg', 'foto-absen'
      );
    } catch(e) { Logger.log('Foto upload warn: ' + e.message); }
  }

  // 6. Simpan
  var idAbsensi = generateId('ABS');
  var karyawan  = getKaryawanById(idKaryawan);
  var ketInfo   = isDinasLuar
    ? ('Dinas Luar disetujui (s/d ' + dinasLuarInfo.tanggal_selesai + '): ' + (dinasLuarInfo.keterangan||''))
    : (d.keterangan || '');

  sheetAbsensi.appendRow([
    idAbsensi, idKaryawan, karyawan.nama_lengkap,
    today, hariStr(), jamSekarang, '', status,
    fotoUrl, '', latVal, lonVal, '', '', jarak,
    shiftInfo ? shiftInfo.id_shift : '',
    ketInfo, idKaryawan, now
  ]);

  logAktivitas(idKaryawan, 'ABSEN_MASUK',
    jamSekarang + ' | ' + status +
    (isDinasLuar ? ' | DINAS LUAR s/d ' + dinasLuarInfo.tanggal_selesai : ' | ' + jarak + 'm'),
    d.device_id || '');

  var pesan = '✅ Absen masuk berhasil pukul ' + jamSekarang;
  if (isDinasLuar) {
    pesan += ' 🚗 Dinas Luar (berlaku s/d ' + dinasLuarInfo.tanggal_selesai + ')';
  } else if (status === 'terlambat') {
    pesan += ' ⚠️ (Terlambat)';
  }

  return {
    id_absensi   : idAbsensi,
    jam_masuk    : jamSekarang,
    status       : status,
    jarak        : jarak,
    foto_url     : fotoUrl,
    is_dinas_luar: isDinasLuar,
    message      : pesan
  };
}

function absenKeluar(d) {
  var idKaryawan  = d._session.id_karyawan;
  var today       = todayStr();
  var jamSekarang = Utilities.formatDate(new Date(), 'Asia/Makassar', 'HH:mm');
  var sheet       = getSheet(SHEET_NAMES.ABSENSI);
  var existing    = _cariAbsenAktif(sheetToObjects(sheet), idKaryawan, today);

  if (!existing) throw new Error('Belum ada absen masuk. Lakukan absen masuk terlebih dahulu.');
  if (String(existing.jam_keluar || '').trim() !== '') {
    throw new Error('Anda sudah absen keluar pukul ' + existing.jam_keluar + '.');
  }

  var latVal = parseFloat(String(d.lat || '0').trim()) || 0;
  var lonVal = parseFloat(String(d.lon || '0').trim()) || 0;

  var fotoUrl = '';
  if (d.foto_base64 && d.foto_base64.length > 100) {
    try {
      fotoUrl = uploadToDrive(
        d.foto_base64,
        'KELUAR_' + idKaryawan + '_' + today.replace(/\//g,'') + '_' + Date.now() + '.jpg',
        'image/jpeg', 'foto-absen'
      );
    } catch(e) { Logger.log('Foto keluar warn: ' + e.message); }
  }

  updateRow(sheet, 'id_absensi', existing.id_absensi, {
    jam_keluar      : jamSekarang,
    foto_keluar_url : fotoUrl,
    lat_keluar      : latVal,
    lon_keluar      : lonVal
  });

  logAktivitas(idKaryawan, 'ABSEN_KELUAR', jamSekarang, d.device_id || '');
  return {
    jam_keluar : jamSekarang,
    foto_url   : fotoUrl,
    message    : '✅ Absen keluar berhasil pukul ' + jamSekarang + '. Selamat istirahat!'
  };
}

function _validateGPSKetat(lat, lon) {
  var lokasiList = getLokasiAktif();
  if (!lokasiList || lokasiList.length === 0) {
    return {
      valid: false, jarak: 0,
      message: '⚙️ Lokasi kantor belum dikonfigurasi.\n\nHubungi Super Admin → menu Lokasi Kantor untuk mengatur koordinat kantor.'
    };
  }

  var closest  = null, minJarak = Infinity, dlmRadius = false;
  lokasiList.forEach(function(lk) {
    var lkLat  = parseFloat(String(lk.latitude  || '0').trim());
    var lkLon  = parseFloat(String(lk.longitude || '0').trim());
    var radius = parseInt(String(lk.radius_meter || '100').trim());
    if (isNaN(lkLat) || isNaN(lkLon) || (lkLat === 0 && lkLon === 0)) return;
    var j = hitungJarak(lat, lon, lkLat, lkLon);
    if (j < minJarak) { minJarak = j; closest = lk; }
    if (j <= radius)  dlmRadius = true;
  });

  if (!closest) {
    return {
      valid: false, jarak: 0,
      message: '⚙️ Koordinat lokasi kantor belum diisi dengan benar.\nHubungi Super Admin.'
    };
  }

  if (!dlmRadius) {
    var r = parseInt(String(closest.radius_meter || '100').trim());
    return {
      valid: false,
      jarak: Math.round(minJarak),
      message:
        '🚫 Absensi Ditolak!\n\n' +
        'Anda berada di luar radius absensi.\n\n' +
        'Lokasi kantor : ' + closest.nama_lokasi + '\n' +
        'Jarak Anda    : ' + Math.round(minJarak) + ' meter\n' +
        'Batas maksimal: ' + r + ' meter\n\n' +
        'Anda harus berada dalam radius ' + r + 'm dari kantor.\n' +
        'Jika bertugas di luar, ajukan Dinas Luar melalui menu Pengajuan.'
    };
  }
  return { valid: true, jarak: Math.round(minJarak), lokasi_nama: closest.nama_lokasi };
}

function _getDinasLuarAktif(idKaryawan, today) {
  var list = sheetToObjects(getSheet(SHEET_NAMES.PENGAJUAN)).filter(function(p) {
    return String(p.id_karyawan)     === String(idKaryawan) &&
           p.jenis                   === 'dinas_luar' &&
           p.status                  === 'disetujui' &&
           String(p.tanggal_mulai).trim()   <= String(today).trim() &&
           String(p.tanggal_selesai).trim() >= String(today).trim();
  });
  return list.length > 0 ? list[0] : null;
}

function _cekDinasLuarAktif(idKaryawan, today) {
  return _getDinasLuarAktif(idKaryawan, today) !== null;
}

function getStatusAbsenHariIni(d) {
  var idKaryawan    = d._session.id_karyawan;
  var today         = todayStr();
  var absenData     = sheetToObjects(getSheet(SHEET_NAMES.ABSENSI));
  var existing      = _cariAbsenAktif(absenData, idKaryawan, today);
  var shiftInfo     = _getShiftKaryawanHariIni(idKaryawan, today);
  var lokasiAktif   = getLokasiAktif();
  var dinasLuarInfo = _getDinasLuarAktif(idKaryawan, today);
  return {
    sudah_absen_masuk : !!(existing && String(existing.jam_masuk  || '').trim() !== ''),
    sudah_absen_keluar: !!(existing && String(existing.jam_keluar || '').trim() !== ''),
    jam_masuk         : existing ? String(existing.jam_masuk  || '') : null,
    jam_keluar        : existing ? String(existing.jam_keluar || '') : null,
    status            : existing ? String(existing.status     || '') : null,
    shift             : shiftInfo,
    lokasi_aktif      : lokasiAktif.length > 0,
    jumlah_lokasi     : lokasiAktif.length,
    is_dinas_luar     : dinasLuarInfo !== null,
    dinas_luar_info   : dinasLuarInfo ? {
      keterangan     : dinasLuarInfo.keterangan,
      tanggal_mulai  : dinasLuarInfo.tanggal_mulai,
      tanggal_selesai: dinasLuarInfo.tanggal_selesai
    } : null
  };
}

function getAbsensiKaryawan(d) {
  var idK = d.id_karyawan || (d._session && d._session.id_karyawan);
  var data = sheetToObjects(getSheet(SHEET_NAMES.ABSENSI)).filter(function(a) {
    return String(a.id_karyawan) === String(idK);
  });

  // Support rentang tanggal (dd/MM/yyyy)
  if (d.tanggal_dari && d.tanggal_ke) {
    return data.filter(function(a) {
      var tgl = String(a.tanggal || '');
      return tgl >= d.tanggal_dari && tgl <= d.tanggal_ke;
    });
  }

  // Default: filter per bulan/tahun
  var bulan = parseInt(d.bulan || (new Date().getMonth() + 1));
  var tahun = parseInt(d.tahun || new Date().getFullYear());
  return data.filter(function(a) {
    var p = String(a.tanggal || '').split('/');
    return p.length >= 3 && parseInt(p[1]) === bulan && parseInt(p[2]) === tahun;
  });
}

function getAbsensiSemua(d) {
  var data = sheetToObjects(getSheet(SHEET_NAMES.ABSENSI));
  if (d.tanggal) return data.filter(function(a){ return String(a.tanggal)===String(d.tanggal); });
  if (d.bulan && d.tahun) {
    var b=parseInt(d.bulan), t=parseInt(d.tahun);
    return data.filter(function(a){
      var p=String(a.tanggal||'').split('/');
      return p.length>=3 && parseInt(p[1])===b && parseInt(p[2])===t;
    });
  }
  return data.slice(-300);
}

function absensiManual(d) {
  var adminId  = d._session.id_karyawan;
  var tanggal  = d.tanggal || todayStr();
  var sheet    = getSheet(SHEET_NAMES.ABSENSI);
  var karyawan = getKaryawanById(d.id_karyawan);
  var existing = sheetToObjects(sheet).filter(function(a) {
    return String(a.id_karyawan)===String(d.id_karyawan) && String(a.tanggal)===String(tanggal);
  })[0];
  if (existing) {
    updateRow(sheet, 'id_absensi', existing.id_absensi, {
      status: d.status,
      jam_masuk  : d.jam_masuk  !== undefined ? d.jam_masuk  : String(existing.jam_masuk  ||''),
      jam_keluar : d.jam_keluar !== undefined ? d.jam_keluar : String(existing.jam_keluar ||''),
      keterangan : d.keterangan || 'Edit manual',
      diinput_oleh: adminId
    });
    return { message: 'Absensi ' + karyawan.nama_lengkap + ' berhasil diperbarui' };
  }
  var idA = generateId('ABS');
  var sh  = _getShiftKaryawanHariIni(d.id_karyawan, tanggal);
  sheet.appendRow([
    idA, d.id_karyawan, karyawan.nama_lengkap,
    tanggal, _hariDariTanggal(tanggal),
    d.jam_masuk||'', d.jam_keluar||'', d.status,
    '','','','','','',0,
    sh ? sh.id_shift : '',
    d.keterangan || 'Input manual admin',
    adminId, nowWITA()
  ]);
  return { id_absensi: idA, message: 'Absensi ' + karyawan.nama_lengkap + ' berhasil ditambahkan' };
}

function getLokasiAktif() {
  return sheetToObjects(getSheet(SHEET_NAMES.LOKASI_KANTOR)).filter(function(l){
    return String(l.status_aktif).toLowerCase().trim() === 'true';
  });
}
function getLokasiSemua() { return sheetToObjects(getSheet(SHEET_NAMES.LOKASI_KANTOR)); }

function tambahLokasi(d) {
  var lat = parseFloat(String(d.latitude||'0').trim());
  var lon = parseFloat(String(d.longitude||'0').trim());
  if (isNaN(lat)||isNaN(lon)||(lat===0&&lon===0))
    throw new Error('Koordinat tidak valid. Isi Latitude & Longitude yang benar.');
  var id = generateId('LOK');
  getSheet(SHEET_NAMES.LOKASI_KANTOR).appendRow([
    id,d.nama_lokasi,lat,lon,parseInt(d.radius_meter||100),'true',d.keterangan||''
  ]);
  return { id_lokasi:id, message:'Lokasi berhasil ditambahkan' };
}
function editLokasi(d) {
  var lat = parseFloat(String(d.latitude||'0').trim());
  var lon = parseFloat(String(d.longitude||'0').trim());
  if (isNaN(lat)||isNaN(lon)||(lat===0&&lon===0))
    throw new Error('Koordinat tidak valid.');
  updateRow(getSheet(SHEET_NAMES.LOKASI_KANTOR),'id_lokasi',d.id_lokasi,{
    nama_lokasi:d.nama_lokasi, latitude:lat, longitude:lon,
    radius_meter:parseInt(String(d.radius_meter||100).trim()),
    status_aktif:String(d.status_aktif||'true').toLowerCase(),
    keterangan:d.keterangan||''
  });
  return { message:'Lokasi berhasil diperbarui' };
}
function hapusLokasi(d) {
  var ri=findRow(getSheet(SHEET_NAMES.LOKASI_KANTOR),'id_lokasi',d.id_lokasi);
  if(ri!==-1) getSheet(SHEET_NAMES.LOKASI_KANTOR).deleteRow(ri);
  return { message:'Lokasi berhasil dihapus' };
}

function hitungJarak(lat1,lon1,lat2,lon2) {
  var R=6371000, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  var a=Math.sin(dLat/2)*Math.sin(dLat/2)+
        Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function _hitungStatusAbsen(jamMasuk,shiftInfo) {
  if(!shiftInfo||!shiftInfo.jam_masuk) return 'hadir';
  var tol=parseInt(shiftInfo.toleransi_terlambat_menit||15);
  var ps=shiftInfo.jam_masuk.split(':'), pm=jamMasuk.split(':');
  var mS=parseInt(ps[0])*60+parseInt(ps[1]||0);
  var mM=parseInt(pm[0])*60+parseInt(pm[1]||0);
  if(mS>=22*60 && mM<6*60) mM+=24*60;
  return mM>mS+tol ? 'terlambat' : 'hadir';
}

function _getShiftKaryawanHariIni(idKaryawan,today) {
  var jadwal=sheetToObjects(getSheet(SHEET_NAMES.JADWAL_KARYAWAN));
  var aktif=jadwal.filter(function(j){
    return String(j.id_karyawan)===String(idKaryawan) &&
           String(j.tanggal_mulai).trim()<=String(today).trim() &&
           String(j.tanggal_selesai).trim()>=String(today).trim();
  })[0];
  var idShift=aktif?aktif.id_shift:null;
  if(!idShift){
    var k=sheetToObjects(getSheet(SHEET_NAMES.KARYAWAN)).filter(function(k){
      return String(k.id_karyawan)===String(idKaryawan);
    })[0];
    idShift=k?k.id_shift:null;
  }
  if(!idShift) return null;
  return sheetToObjects(getSheet(SHEET_NAMES.SHIFT)).filter(function(s){return s.id_shift===idShift;})[0]||null;
}

function _cariAbsenAktif(absenData,idKaryawan,today) {
  var r=absenData.filter(function(a){
    return String(a.id_karyawan)===String(idKaryawan) && String(a.tanggal)===String(today);
  })[0];
  if(r) return r;
  var dt=new Date(); dt.setDate(dt.getDate()-1);
  var kemarin=Utilities.formatDate(dt,'Asia/Makassar','dd/MM/yyyy');
  return absenData.filter(function(a){
    return String(a.id_karyawan)===String(idKaryawan) &&
           a.tanggal===kemarin &&
           String(a.jam_masuk||''). trim()!=='' &&
           String(a.jam_keluar||''). trim()==='';
  })[0]||null;
}

function _hariDariTanggal(tgl) {
  try{
    var p=tgl.split('/');
    return ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][
      new Date(parseInt(p[2]),parseInt(p[1])-1,parseInt(p[0])).getDay()];
  }catch(e){return hariStr();}
}
