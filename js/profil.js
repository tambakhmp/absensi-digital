// ============================================================
// profil.js — Profil Karyawan, TTD, Foto, Password, PWA Install
// ============================================================

let _signaturePad = null;
let _deferredPWAPrompt = null;

// PWA install prompt
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredPWAPrompt = e;
  const btn = document.getElementById('btn-install-pwa');
  if (btn) btn.style.display = 'flex';
});

async function loadHalamanProfil() {
  const user = getSession();
  if (!user) return;

  const elContainer = document.getElementById('profil-container');
  if (!elContainer) return;
  elContainer.innerHTML = skeletonCard(6);

  try {
    const [profil, ranking] = await Promise.all([
      callAPI('getProfilSaya', {}),
      getPredikatSaya(user.id_karyawan)
    ]);

    if (!profil) return;
    const predikat = ranking ? ranking.predikat : '';

    elContainer.innerHTML = `
      <!-- FOTO PROFIL -->
      <div class="card" style="text-align:center;padding:24px 16px">
        <div style="display:inline-block;position:relative;margin-bottom:12px">
          <div class="${(PREDIKAT_MAP[predikat]||{}).border||''}"
            style="width:96px;height:96px;border-radius:50%;overflow:hidden;display:inline-block">
            <img id="foto-profil-img" src="${getPhotoSrc(profil.foto_profil_url, profil.nama_lengkap, 96)}"
              style="width:96px;height:96px;object-fit:cover"
              onerror="this.src='${avatarInisial(profil.nama_lengkap, 96)}'">
          </div>
        </div>
        ${predikat ? `<div class="rank-badge ${(PREDIKAT_MAP[predikat]||{}).cls||''}"
          style="margin:0 auto 10px">${(PREDIKAT_MAP[predikat]||{}).icon||''} ${predikat}</div>` : ''}
        <div style="font-size:17px;font-weight:700;color:#1E293B">${profil.nama_lengkap}</div>
        <div style="font-size:13px;color:#64748B">${profil.jabatan} · ${profil.departemen}</div>
        <div style="font-size:12px;color:#94A3B8;margin-top:2px">NIK: ${profil.nik||'-'}</div>
        <label class="btn btn--outline" style="margin-top:14px;display:inline-flex;cursor:pointer;font-size:13px;padding:8px 16px">
          📷 Ganti Foto
          <input type="file" accept="image/*" capture="user" style="display:none" onchange="uploadFotoProfil(this)">
        </label>
      </div>

      <!-- DATA DIRI -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;
          letter-spacing:.6px;margin-bottom:14px">👤 Data Diri</h3>
        ${profilRow('Nama Lengkap',    profil.nama_lengkap)}
        ${profilRow('NIK Karyawan',    profil.nik)}
        ${profilRow('No. KTP',         profil.no_ktp)}
        ${profilRow('Jenis Kelamin',   profil.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan')}
        ${profilRow('Tanggal Lahir',   formatTanggal(profil.tanggal_lahir))}
        ${profilRow('Bergabung',       formatTanggal(profil.tanggal_masuk))}
        ${profilRow('Pendidikan',      profil.pendidikan_terakhir)}
        ${profilRow('Atasan',          profil.nama_atasan)}
        ${profilRow('Email',           profil.email)}
        ${profilRow('No. HP',          profil.no_hp)}
        ${profilRow('Alamat',          profil.alamat)}
      </div>

      <!-- TANDA TANGAN DIGITAL -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;
          letter-spacing:.6px;margin-bottom:14px">✍️ Tanda Tangan Digital</h3>
        ${profil.tanda_tangan_url ? `
          <div style="border:1px dashed #CBD5E0;border-radius:8px;padding:8px;margin-bottom:12px;
            background:#F8FAFC;text-align:center">
            <img id="ttd-preview" src="${profil.tanda_tangan_url}" alt="TTD"
              style="max-height:80px;max-width:100%;object-fit:contain">
          </div>` : `
          <div style="border:1px dashed #CBD5E0;border-radius:8px;padding:16px;margin-bottom:12px;
            background:#F8FAFC;text-align:center;color:#94A3B8;font-size:13px">
            Belum ada tanda tangan digital
          </div>`}
        <button class="btn btn--outline btn--full" style="font-size:13px"
          onclick="tampilPadTTD()">
          ✏️ ${profil.tanda_tangan_url ? 'Perbarui' : 'Buat'} Tanda Tangan
        </button>
      </div>

      <!-- INFORMASI AKUN -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;color:#64748B;text-transform:uppercase;
          letter-spacing:.6px;margin-bottom:14px">🔐 Informasi Akun</h3>
        ${profilRow('Username',   profil.username)}
        ${profilRow('Role',       profil.role)}
        ${profilRow('Status',     String(profil.status_aktif).toLowerCase() === 'true' ? '✅ Aktif' : '❌ Non-aktif')}
        ${profil.device_id ? profilRow('Perangkat', localStorage.getItem('device_info') || 'Terregistrasi') : ''}
        <button class="btn btn--ghost btn--full" style="margin-top:14px;font-size:13px"
          onclick="tampilGantiPassword()">🔑 Ganti Password</button>
      </div>

      <!-- INSTALL PWA -->
      <div class="card" style="background:linear-gradient(135deg,#EBF8FF,#F0FFF4)">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:8px">📲 Instal ke Layar Utama</h3>
        <p style="font-size:13px;color:#64748B;margin-bottom:14px">
          Instal aplikasi ini ke HP untuk akses lebih cepat tanpa membuka browser.
        </p>
        <button id="btn-install-pwa" class="btn btn--primary btn--full"
          style="display:none" onclick="installPWA()">
          📲 Instal Aplikasi
        </button>
        <div id="pwa-installed-info" style="font-size:12px;color:#1A9E74;display:none">
          ✅ Aplikasi sudah terinstal di perangkat Anda
        </div>
        <div id="pwa-ios-tip" style="font-size:12px;color:#64748B;display:none">
          📱 Di iOS: buka di Safari → tap ⬆️ Share → "Add to Home Screen"
        </div>
      </div>

      <!-- LOGOUT -->
      <button class="btn btn--danger btn--full" style="margin-bottom:20px"
        onclick="confirmLogout()">
        🚪 Logout
      </button>`;

    // Cek apakah PWA sudah terinstal
    if (window.matchMedia('(display-mode: standalone)').matches) {
      document.getElementById('pwa-installed-info').style.display = 'block';
    } else if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      document.getElementById('pwa-ios-tip').style.display = 'block';
    } else if (_deferredPWAPrompt) {
      document.getElementById('btn-install-pwa').style.display = 'flex';
    }

  } catch(e) {
    showError('profil-container', 'Gagal memuat profil: ' + e.message);
  }
}

function profilRow(label, value) {
  return `<div style="display:flex;gap:8px;padding:9px 0;border-bottom:1px solid #F1F5F9">
    <span style="font-size:13px;color:#94A3B8;min-width:110px;flex-shrink:0">${label}</span>
    <span style="font-size:13px;color:#1E293B;font-weight:500;flex:1">${value||'-'}</span>
  </div>`;
}

async function uploadFotoProfil(input) {
  if (!input.files[0]) return;
  const file = input.files[0];
  showToast('Mengupload foto...', 'info', 2000);
  try {
    const compressed = await compressImage(file, 600, 0.75);
    const base64     = await blobToBase64(compressed);
    const r = await callAPI('gantiFoto', { base64 });
    const img = document.getElementById('foto-profil-img');
    if (img && r.url) img.src = r.url;
    showToast('Foto profil berhasil diperbarui ✅', 'success');

    // Update user data lokal
    const user = getSession();
    if (user) { user.foto = r.url; localStorage.setItem('user_data', JSON.stringify(user)); }
  } catch(e) { showToast(e.message, 'error'); }
}

// ─── Tanda Tangan ────────────────────────────────────────────
function tampilPadTTD() {
  const modal = document.createElement('div');
  modal.id    = 'modal-ttd';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9000;
    display:flex;align-items:flex-end;backdrop-filter:blur(4px)`;
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;
      animation:slideUp 0.3s ease">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h3 style="margin:0;font-size:16px">✍️ Tanda Tangan Digital</h3>
        <button onclick="document.getElementById('modal-ttd').remove()"
          style="background:#F1F5F9;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>
      </div>
      <p style="font-size:13px;color:#64748B;margin-bottom:12px">Tanda tangan di dalam kotak di bawah ini:</p>
      <div style="border:2px solid #CBD5E0;border-radius:10px;background:#fff;overflow:hidden">
        <canvas id="ttd-pad" width="380" height="150" style="width:100%;height:150px;touch-action:none"></canvas>
      </div>
      <div style="display:flex;gap:10px;margin-top:14px">
        <button class="btn btn--ghost" style="flex:1" onclick="clearTTD()">🗑️ Hapus</button>
        <button class="btn btn--primary" style="flex:1" onclick="simpanTTD()">💾 Simpan TTD</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Init SignaturePad
  const canvas = document.getElementById('ttd-pad');
  canvas.width  = canvas.offsetWidth;
  canvas.height = 150;
  if (typeof SignaturePad !== 'undefined') {
    _signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgba(255,255,255,0)',
      penColor: '#1E293B',
      minWidth: 1.2,
      maxWidth: 3
    });
  }
}

function clearTTD() { if (_signaturePad) _signaturePad.clear(); }

async function simpanTTD() {
  if (!_signaturePad || _signaturePad.isEmpty()) {
    showToast('Silakan buat tanda tangan terlebih dahulu', 'warning');
    return;
  }
  showToast('Menyimpan tanda tangan...', 'info', 2000);
  try {
    const base64 = _signaturePad.toDataURL('image/png').split(',')[1];
    const r      = await callAPI('simpanTandaTangan', { base64 });
    document.getElementById('modal-ttd')?.remove();
    showToast('Tanda tangan berhasil disimpan ✅', 'success');

    // Update preview
    const prev = document.getElementById('ttd-preview');
    if (prev && r.url) prev.src = r.url;
  } catch(e) { showToast(e.message, 'error'); }
}

// ─── Ganti Password ───────────────────────────────────────────
function tampilGantiPassword() {
  showModal('🔑 Ganti Password',
    `<div class="form-group" style="margin-top:8px">
      <label class="form-label">Password Lama</label>
      <input type="password" class="form-control" id="pw-lama" placeholder="Password saat ini">
    </div>
    <div class="form-group">
      <label class="form-label">Password Baru</label>
      <input type="password" class="form-control" id="pw-baru" placeholder="Min. 8 karakter">
    </div>
    <div class="form-group">
      <label class="form-label">Konfirmasi Password Baru</label>
      <input type="password" class="form-control" id="pw-konfirm" placeholder="Ulangi password baru">
    </div>`,
    async () => {
      const lama   = document.getElementById('pw-lama')?.value;
      const baru   = document.getElementById('pw-baru')?.value;
      const konfirm= document.getElementById('pw-konfirm')?.value;
      if (!lama || !baru) { showToast('Semua field wajib diisi', 'warning'); return; }
      if (baru !== konfirm) { showToast('Password baru tidak cocok', 'warning'); return; }
      if (baru.length < 8)  { showToast('Password minimal 8 karakter', 'warning'); return; }
      try {
        const lamaHash = await sha256(lama);
        const baruHash = await sha256(baru);
        const r = await callAPI('gantiPassword', { password_lama_hash: lamaHash, password_baru_hash: baruHash });
        showToast(r.message, 'success');
      } catch(e) { showToast(e.message, 'error'); }
    }, 'Simpan Password'
  );
}

// ─── Install PWA ──────────────────────────────────────────────
async function installPWA() {
  if (!_deferredPWAPrompt) return;
  _deferredPWAPrompt.prompt();
  const { outcome } = await _deferredPWAPrompt.userChoice;
  if (outcome === 'accepted') {
    document.getElementById('btn-install-pwa').style.display = 'none';
    showToast('Aplikasi berhasil diinstal! ✅', 'success');
  }
  _deferredPWAPrompt = null;
}

// ─── Logout ───────────────────────────────────────────────────
function confirmLogout() {
  showModal('🚪 Logout',
    'Anda akan keluar dari aplikasi. Sesi akan berakhir.',
    () => doLogout(),
    'Ya, Logout'
  );
}
