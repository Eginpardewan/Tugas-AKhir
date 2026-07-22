// User Dashboard Logic
let currentBab = null;
let currentBabId = null;
let currentSoal = [];
let userNilaiPerBab = {};
let sertifikatSoal = [];

// ============================================================
// KONFIGURASI BLOCKCHAIN — Sepolia Testnet
// Isi NILAI_CONTRACT_ADDRESS setelah deploy contract:
// npx hardhat run deployment/deploy.js --network sepolia
// ============================================================
const NILAI_CONTRACT_ADDRESS = localStorage.getItem('tajwidNilaiContract') || '';


// ABI hanya fungsi yang dibutuhkan frontend
const NILAI_CONTRACT_ABI = [
    {
        "inputs": [
            { "internalType": "string", "name": "_babNama", "type": "string" },
            { "internalType": "uint256", "name": "_nilai", "type": "uint256" }
        ],
        "name": "submitNilaiBab",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true,  "name": "user",        "type": "address" },
            { "indexed": false, "name": "babNama",     "type": "string"  },
            { "indexed": false, "name": "nilai",       "type": "uint256" },
            { "indexed": false, "name": "isLulus",     "type": "bool"    },
            { "indexed": false, "name": "percobaanKe", "type": "uint256" },
            { "indexed": false, "name": "timestamp",   "type": "uint256" }
        ],
        "name": "NilaiBabDicatat",
        "type": "event"
    }
];

// Initialize user dashboard
async function initUser() {
    const role = localStorage.getItem("userRole");
    if (role !== "user") {
        window.location.href = "index.html";
        return;
    }
    
    // Load user data
    await loadUserData();
    await loadProfileData(); // Load profile settings
    await loadMateri();
    await loadBabList();
    await loadProgress();
    await loadSertifikatSaya();
    
    setupUserListeners();
}

// Load user data
async function loadUserData() {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/auth/me", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const user = await response.json();
            document.getElementById("userName").textContent = user.username;
            document.getElementById("userEmail").textContent = user.email;
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

// Load materi
async function loadMateri() {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/materi", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const materis = await response.json();
            renderMateri(materis);
        }
    } catch (error) {
        console.error("Error loading materi:", error);
    }
}

// Render materi
function renderMateri(materis) {
    const container = document.getElementById("materiList");
    if (!container) return;
    
    // Group by bab
    const grouped = materis.reduce((acc, materi) => {
        if (!acc[materi.bab]) acc[materi.bab] = [];
        acc[materi.bab].push(materi);
        return acc;
    }, {});
    
    container.innerHTML = Object.entries(grouped).map(([bab, items]) => `
        <div class="mb-8">
            <h3 class="text-2xl font-bold text-neon-green mb-4 cyber-header">📖 ${bab}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${items.map(materi => `
                    <div class="cyber-card materi-card p-4" onclick="showMateriDetail('${materi._id}')">
                        <div class="flex items-start gap-3">
                            <i class="fas fa-book-open text-neon-green text-2xl"></i>
                            <div class="flex-1">
                                <h4 class="text-lg font-bold">${materi.judul}</h4>
                                <p class="text-sm text-gray-400 mt-1">${materi.deskripsi?.substring(0, 100)}...</p>
                                ${materi.videoUrl ? `
                                    <div class="mt-2 text-xs text-neon-blue">
                                        <i class="fas fa-video"></i> Video tersedia
                                    </div>
                                ` : ''}
                                ${materi.audioUrl ? `
                                    <div class="mt-2 text-xs text-neon-purple">
                                        <i class="fas fa-headphones"></i> Audio tersedia
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `).join("");
}

// Show materi detail modal
function showMateriDetail(materiId) {
    // Fetch materi detail and show in modal
    // Implementation similar to your style
}

// Load bab list for exams
async function loadBabList() {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/ujian/bab-list", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const babs = await response.json();
            renderBabList(babs);
        }
    } catch (error) {
        console.error("Error loading bab list:", error);
    }
}

// Render bab list
function renderBabList(babs) {
    const container = document.getElementById("babList");
    if (!container) return;
    
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${babs.map(bab => `
                <div class="cyber-card p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-lg font-bold">${bab}</h4>
                        <span id="nilai-${bab}" class="badge badge-warning">Belum</span>
                    </div>
                    <button onclick="startExam('${bab}')" class="btn-cyber w-full py-2 text-sm">
                        <i class="fas fa-play"></i> Mulai Ujian
                    </button>
                </div>
            `).join("")}
        </div>
    `;
    
    // Load user scores
    loadUserScores(babs);
}

// Load user scores
async function loadUserScores(babs) {
    try {
        const token = localStorage.getItem("token");
        for (const bab of babs) {
            const response = await fetch(`http://localhost:5000/api/ujian/nilai/${bab}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const nilaiSpan = document.getElementById(`nilai-${bab}`);
                if (nilaiSpan && data.nilai) {
                    nilaiSpan.textContent = `${data.nilai}%`;
                    nilaiSpan.className = `badge ${data.nilai >= 80 ? 'badge-success' : 'badge-danger'}`;
                    userNilaiPerBab[bab] = data.nilai;
                }
            }
        }
    } catch (error) {
        console.error("Error loading scores:", error);
    }
}

// Start exam
async function startExam(bab) {
    currentBab = bab;
    
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/ujian/soal/${bab}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            currentSoal = await response.json();
            showExamModal();
        }
    } catch (error) {
        console.error("Error starting exam:", error);
        showToast("Gagal memuat soal", "error");
    }
}

// Show exam modal
function showExamModal() {
    const modal = document.getElementById("examModal");
    if (!modal) return;
    
    document.getElementById("examTitle").textContent = `Ujian Bab: ${currentBab}`;
    
    const container = document.getElementById("examQuestions");
    container.innerHTML = currentSoal.map((soal, index) => `
        <div class="soal-card">
            <p class="font-bold mb-3">${index + 1}. ${soal.pertanyaan}</p>
            <div class="radio-group">
                <label class="radio-option">
                    <input type="radio" name="soal_${soal._id}" value="A">
                    <span>A. ${soal.pilihanA}</span>
                </label>
                <label class="radio-option">
                    <input type="radio" name="soal_${soal._id}" value="B">
                    <span>B. ${soal.pilihanB}</span>
                </label>
                <label class="radio-option">
                    <input type="radio" name="soal_${soal._id}" value="C">
                    <span>C. ${soal.pilihanC}</span>
                </label>
                <label class="radio-option">
                    <input type="radio" name="soal_${soal._id}" value="D">
                    <span>D. ${soal.pilihanD}</span>
                </label>
            </div>
        </div>
    `).join("");
    
    modal.classList.add("active");
}

// Submit exam
async function submitExam() {
    const jawaban = currentSoal.map(soal => ({
        soal_id: soal.id,
        jawaban_user: document.getElementById(`jawaban_${soal.id}`)?.value?.trim() || ''
    }));

    const sessionId    = localStorage.getItem('currentExamSessionId');
    const sessionToken = localStorage.getItem('currentExamSessionToken');

    if (!sessionId || !sessionToken) {
        showToast('Session ujian tidak ditemukan. Coba mulai ulang.', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/user/submit-bab-exam', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ session_id: parseInt(sessionId), session_token: sessionToken, jawaban })
        });

        const result = await response.json();

        if (!result.success) {
            showToast(result.message || 'Gagal submit ujian', 'error');
            return;
        }

        document.getElementById('examModal').classList.remove('active');

        const isLulus = result.is_lulus;
        const nilaiPersen = result.persentase;

        if (isLulus) {
            showToast(`🎉 Selamat! Nilai Anda: ${nilaiPersen}% — Lulus!`, 'success');
            // Catat ke blockchain otomatis
            await recordNilaiBabToBlockchain(currentBabId, currentBab, nilaiPersen, true);
        } else {
            showToast(`Nilai Anda: ${nilaiPersen}%. Minimal 80% untuk lulus. Coba lagi!`, 'error');
        }

        await loadBabList();
        await loadProgress();

    } catch (error) {
        console.error('Error submitting exam:', error);
        showToast('Gagal submit ujian', 'error');
    }
}

// ============================================================
// RECORD NILAI BAB KE BLOCKCHAIN via MetaMask
// ============================================================
async function recordNilaiBabToBlockchain(babId, babNama, nilai, isLulus) {
    if (!window.ethereum) {
        showToast('MetaMask tidak terdeteksi. Nilai hanya tersimpan lokal.', 'error');
        return;
    }

    if (!NILAI_CONTRACT_ADDRESS) {
        showToast('⚠️ Contract belum di-deploy. Hubungi admin.', 'error');
        return;
    }

    try {
        // Tampilkan loading modal
        showBlockchainModal(babNama, nilai);

        // Minta akses wallet
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const walletAddress = accounts[0];

        // Cek network Sepolia (chainId 11155111 = 0xaa36a7)
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0xaa36a7') {
            updateBlockchainModal('error', 'Harap ganti network ke Sepolia Testnet di MetaMask');
            return;
        }

        updateBlockchainModal('pending', 'Menunggu konfirmasi MetaMask...');

        // Encode function call: submitNilaiBab(babNama, nilai)
        const iface = new ethers.utils.Interface(NILAI_CONTRACT_ABI);
        const data  = iface.encodeFunctionData('submitNilaiBab', [babNama, nilai]);

        // Kirim transaksi
        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
                from: walletAddress,
                to: NILAI_CONTRACT_ADDRESS,
                data: data,
                gas: '0x30D40' // ~200000 gas
            }]
        });

        updateBlockchainModal('confirming', `Transaksi terkirim! Menunggu konfirmasi...\nTX: ${txHash.slice(0,20)}...`);

        // Simpan TX hash ke backend
        const token = localStorage.getItem('token');
        await fetch('http://localhost:5000/api/user/record-bab-blockchain', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                bab_id: babId,
                bab_nama: babNama,
                nilai: nilai,
                is_lulus: isLulus,
                transaction_hash: txHash,
                wallet_address: walletAddress
            })
        });

        updateBlockchainModal('success', txHash);

    } catch (err) {
        console.error('Blockchain error:', err);
        if (err.code === 4001) {
            updateBlockchainModal('rejected', 'Transaksi ditolak pengguna. Nilai tetap tersimpan di database.');
        } else {
            updateBlockchainModal('error', err.message || 'Terjadi kesalahan');
        }
    }
}

// ============================================================
// MODAL STATUS BLOCKCHAIN
// ============================================================
function showBlockchainModal(babNama, nilai) {
    let modal = document.getElementById('blockchainModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'blockchainModal';
        modal.className = 'fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-gray-900 border-2 border-neon-green/50 rounded-2xl p-8 max-w-md w-full mx-4 shadow-[0_0_40px_rgba(0,255,136,0.2)]">
                <div class="text-center">
                    <div id="bcModalIcon" class="text-5xl mb-4">⛓️</div>
                    <h3 class="text-xl font-bold font-orbitron text-neon-green mb-2">Mencatat ke Blockchain</h3>
                    <p class="text-gray-300 text-sm mb-1">Bab: <strong class="text-white">${babNama}</strong></p>
                    <p class="text-gray-300 text-sm mb-6">Nilai: <strong class="text-neon-gold">${nilai}%</strong></p>
                    <div id="bcModalStatus" class="text-sm text-gray-400 bg-black/40 rounded-lg p-3 mb-6 min-h-[60px] flex items-center justify-center">
                        <i class="fas fa-spinner fa-spin mr-2"></i> Menghubungi MetaMask...
                    </div>
                    <button id="bcModalClose" onclick="document.getElementById('blockchainModal').remove()" 
                        class="hidden px-6 py-2 rounded-lg border border-neon-green/50 text-neon-green hover:bg-neon-green/10 transition-all">
                        Tutup
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

function updateBlockchainModal(status, message) {
    const statusEl = document.getElementById('bcModalStatus');
    const iconEl   = document.getElementById('bcModalIcon');
    const closeBtn = document.getElementById('bcModalClose');
    if (!statusEl) return;

    const configs = {
        pending:    { icon: '🦊', color: 'text-yellow-400', html: `<i class="fas fa-spinner fa-spin mr-2"></i>${message}` },
        confirming: { icon: '⏳', color: 'text-blue-400',   html: `<i class="fas fa-clock mr-2"></i>${message}` },
        success:    { icon: '✅', color: 'text-neon-green',  html: `<i class="fas fa-check-circle mr-2"></i>Nilai berhasil dicatat di blockchain!<br><a href="https://sepolia.etherscan.io/tx/${message}" target="_blank" class="text-neon-blue underline text-xs mt-2 block">Lihat di Etherscan ↗</a>` },
        rejected:   { icon: '⚠️', color: 'text-yellow-400', html: `<i class="fas fa-exclamation-triangle mr-2"></i>${message}` },
        error:      { icon: '❌', color: 'text-red-400',     html: `<i class="fas fa-times-circle mr-2"></i>${message}` }
    };

    const cfg = configs[status] || configs.error;
    if (iconEl) iconEl.textContent = cfg.icon;
    statusEl.className = `text-sm ${cfg.color} bg-black/40 rounded-lg p-3 mb-6 min-h-[60px] flex flex-col items-center justify-center`;
    statusEl.innerHTML = cfg.html;
    if (closeBtn && ['success', 'rejected', 'error'].includes(status)) {
        closeBtn.classList.remove('hidden');
    }
}

// Load progress
async function loadProgress() {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/ujian/progress", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const progress = await response.json();
            const rataRata = progress.rataRata || 0;
            const progressBar = document.getElementById("progressBar");
            if (progressBar) {
                progressBar.style.width = `${rataRata}%`;
                progressBar.textContent = `${rataRata}%`;
            }
            
            const certificateStatus = document.getElementById("certificateStatus");
            if (certificateStatus) {
                if (rataRata >= 80) {
                    certificateStatus.innerHTML = `
                        <div class="bg-green-900/30 border border-green-500 rounded-lg p-4 text-center">
                            <i class="fas fa-check-circle text-green-500 text-3xl mb-2"></i>
                            <p class="text-green-400">Selamat! Anda memenuhi syarat untuk ujian sertifikat.</p>
                            <button onclick="startCertificateExam()" class="btn-cyber mt-3 px-6 py-2">
                                <i class="fas fa-certificate"></i> Ambil Ujian Sertifikat
                            </button>
                        </div>
                    `;
                } else {
                    certificateStatus.innerHTML = `
                        <div class="bg-yellow-900/30 border border-yellow-500 rounded-lg p-4 text-center">
                            <i class="fas fa-hourglass-half text-yellow-500 text-3xl mb-2"></i>
                            <p class="text-yellow-400">Nilai rata-rata Anda: ${rataRata}%</p>
                            <p class="text-sm">Selesaikan semua ujian bab dengan nilai minimal 80% untuk ujian sertifikat</p>
                        </div>
                    `;
                }
            }
        }
    } catch (error) {
        console.error("Error loading progress:", error);
    }
}

// Start certificate exam
async function startCertificateExam() {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/ujian/soal-sertifikat", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            sertifikatSoal = await response.json();
            showCertificateModal();
        }
    } catch (error) {
        console.error("Error starting certificate exam:", error);
    }
}

// Show certificate modal
function showCertificateModal() {
    const modal = document.getElementById("certificateExamModal");
    if (!modal) return;
    
    const container = document.getElementById("certificateQuestions");
    container.innerHTML = sertifikatSoal.map((soal, index) => `
        <div class="soal-card">
            <p class="font-bold mb-3">${index + 1}. ${soal.pertanyaan}</p>
            <div class="radio-group">
                <label class="radio-option">
                    <input type="radio" name="cert_soal_${soal._id}" value="A">
                    <span>A. ${soal.pilihanA}</span>
                </label>
                <label class="radio-option">
                    <input type="radio" name="cert_soal_${soal._id}" value="B">
                    <span>B. ${soal.pilihanB}</span>
                </label>
                <label class="radio-option">
                    <input type="radio" name="cert_soal_${soal._id}" value="C">
                    <span>C. ${soal.pilihanC}</span>
                </label>
                <label class="radio-option">
                    <input type="radio" name="cert_soal_${soal._id}" value="D">
                    <span>D. ${soal.pilihanD}</span>
                </label>
            </div>
        </div>
    `).join("");
    
    modal.classList.add("active");
}

// Submit certificate exam
async function submitCertificateExam() {
    const jawaban = {};
    sertifikatSoal.forEach(soal => {
        const selected = document.querySelector(`input[name="cert_soal_${soal._id}"]:checked`);
        if (selected) {
            jawaban[soal._id] = selected.value;
        }
    });
    
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/ujian/submit-sertifikat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                jawaban: jawaban,
                soals: sertifikatSoal
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.nilai >= 80) {
                showToast(`Selamat! Anda lulus dengan nilai ${result.nilai}%`, "success");
                document.getElementById("certificateExamModal").classList.remove("active");
                showPaymentModal();
            } else {
                showToast(`Maaf, nilai Anda ${result.nilai}%. Minimal 80 untuk sertifikat.`, "error");
            }
        }
    } catch (error) {
        console.error("Error submitting certificate:", error);
        showToast("Gagal submit ujian", "error");
    }
}

// Show payment modal
function showPaymentModal() {
    const modal = document.getElementById("paymentModal");
    if (modal) {
        modal.classList.add("active");
    }
}

// Upload payment proof
async function uploadPayment() {
    const fileInput = document.getElementById("paymentProof");
    const file = fileInput.files[0];
    
    if (!file) {
        showToast("Silakan upload bukti pembayaran", "error");
        return;
    }
    
    const formData = new FormData();
    formData.append("bukti", file);
    
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/payment/upload", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });
        
        if (response.ok) {
            showToast("Bukti pembayaran berhasil diupload!", "success");
            document.getElementById("paymentModal").classList.remove("active");
        }
    } catch (error) {
        console.error(error);
        showToast("Gagal upload bukti", "error");
    }
}

// Load user certificates
async function loadSertifikatSaya() {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/payment/certificates", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const certificates = await response.json();
            renderCertificates(certificates);
        }
    } catch (error) {
        console.error("Error loading certificates:", error);
    }
}

// Render certificates
function renderCertificates(certificates) {
    const container = document.getElementById("sertifikatList");
    if (!container) return;
    
    if (!certificates || certificates.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-8">Belum ada sertifikat</div>';
        return;
    }
    
    container.innerHTML = certificates.map(cert => {
        const txHash = cert.transactionHash || cert.transaction_hash;
        return `
            <div class="certificate-card bg-black/60 border-2 border-neon-gold/40 p-6 md:p-8 rounded-xl relative overflow-hidden shadow-[0_0_25px_rgba(255,215,0,0.15)] flex flex-col md:flex-row gap-6 items-center">
                <!-- Glowing background elements -->
                <div class="absolute top-0 right-0 w-32 h-32 bg-neon-gold/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div class="absolute bottom-0 left-0 w-32 h-32 bg-neon-green/5 rounded-full blur-3xl -ml-10 -mb-10"></div>
                
                <!-- Certificate Main Info -->
                <div class="flex-1 w-full text-left">
                    <div class="flex items-center gap-3 mb-4">
                        <i class="fas fa-certificate text-4xl md:text-5xl text-neon-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]"></i>
                        <div>
                            <h4 class="text-xl md:text-2xl font-bold font-orbitron text-white tracking-wider uppercase">Sertifikat Kelulusan</h4>
                            <p class="text-xs text-neon-gold tracking-widest mt-0.5">TAJWID LEARNING - AL FIRQOH AN-NAJIYAH</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-gray-700/50 py-4 my-4">
                        <div>
                            <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                            <p class="font-bold text-base md:text-lg text-white">${cert.nama_lengkap || 'Tidak Diketahui'}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Nomor Peserta</p>
                            <p class="font-bold text-neon-gold font-mono">${cert.nomor_peserta || 'Masa Tunggu'}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Nilai Ujian</p>
                            <p class="font-bold text-neon-green text-base md:text-lg">${cert.nilai ? cert.nilai + '%' : '-'}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Tanggal Kelulusan</p>
                            <p class="font-bold text-white text-sm md:text-base">${new Date(cert.issued_at || cert.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                        </div>
                    </div>

                    <div class="flex flex-wrap gap-2 items-center text-xs mt-3">
                        ${txHash ? `
                            <span class="px-3 py-1 bg-green-950/40 text-neon-green border border-neon-green/30 rounded-full font-bold tracking-wider flex items-center gap-1.5 shadow-[0_0_8px_rgba(0,255,136,0.1)]">
                                <span class="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse"></span>
                                TERVERIFIKASI BLOCKCHAIN
                            </span>
                        ` : `
                            <span class="px-3 py-1 bg-yellow-950/40 text-neon-gold border border-neon-gold/30 rounded-full font-bold tracking-wider">
                                PENDING PEMBAYARAN
                            </span>
                        `}
                        <span class="text-gray-500 font-mono">ID: #${cert.blockchain_id !== undefined ? cert.blockchain_id : cert.id}</span>
                    </div>
                </div>

                <!-- QR Code Section -->
                ${txHash ? `
                    <div class="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-neon-gold/20 backdrop-blur-sm shadow-[0_0_15px_rgba(255,215,0,0.05)] w-full md:w-auto">
                        <div class="relative bg-white p-2 rounded-lg shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent('https://sepolia.etherscan.io/tx/' + txHash)}&color=05070a&bgcolor=ffffff" 
                                 alt="QR Code Verifikasi" 
                                 class="w-28 h-28" />
                        </div>
                        <p class="text-[10px] text-neon-gold tracking-widest uppercase mt-3 font-semibold text-center">Scan to Verify</p>
                        <a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank" 
                           class="mt-2 text-neon-blue text-xs hover:underline flex items-center gap-1.5 transition-all hover:drop-shadow-[0_0_6px_rgba(0,242,255,0.6)]">
                            <i class="fas fa-external-link-alt text-[10px]"></i> Lihat Transaksi
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
    }).join("");
}

// Load Profile Data
async function loadProfileData() {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/user/profile", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const user = result.data;

            // Helper aman
            const setText = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val || '-';
            };
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            };

            // ============================================================
            // TAB: LIHAT PROFIL
            // ============================================================
            setText('view_nama',          user.nama_lengkap);
            setText('view_username',      user.username);
            setText('view_email',         user.email);
            setText('view_no_hp',         user.no_hp);
            setText('view_jenis_kelamin', user.jenis_kelamin);
            setText('view_kota',          user.kota);
            setText('view_instansi',      user.instansi);

            const viewNomor = document.getElementById('view_nomor_peserta');
            if (viewNomor) viewNomor.textContent = `Nomor Peserta: ${user.nomor_peserta || 'Belum Tersedia'}`;

            // Foto profil — tab Lihat
            const viewAvatar     = document.getElementById('viewAvatar');
            const viewAvatarIcon = document.getElementById('viewAvatarIcon');
            if (user.foto_profil && viewAvatar) {
                viewAvatar.src = 'http://localhost:5000' + user.foto_profil;
                viewAvatar.classList.remove('hidden');
                if (viewAvatarIcon) viewAvatarIcon.classList.add('hidden');
            } else {
                if (viewAvatar) viewAvatar.classList.add('hidden');
                if (viewAvatarIcon) viewAvatarIcon.classList.remove('hidden');
            }

            // ============================================================
            // TAB: EDIT PROFIL
            // ============================================================
            setVal('edit_username',     user.username);
            setVal('edit_nama_lengkap', user.nama_lengkap);
            setVal('edit_no_hp',        user.no_hp);
            setVal('edit_instansi',     user.instansi);
            setVal('edit_kota',         user.kota);

            const editNomor = document.getElementById('edit_nomor_peserta');
            if (editNomor) editNomor.value = user.nomor_peserta || 'Belum Tersedia';

            const jkSelect = document.getElementById('edit_jenis_kelamin');
            if (jkSelect) jkSelect.value = user.jenis_kelamin || '';

            // Foto profil — tab Edit
            const editImg  = document.getElementById('profilePreview');
            const editIcon = document.getElementById('profileAvatarIcon');
            if (user.foto_profil && editImg) {
                editImg.src = 'http://localhost:5000' + user.foto_profil;
                editImg.classList.remove('hidden');
                if (editIcon) editIcon.classList.add('hidden');
            } else {
                if (editImg) editImg.classList.add('hidden');
                if (editIcon) editIcon.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

// Preview Profile Image (tampilkan preview saat memilih file)
function previewProfileImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById('profilePreview');
            const icon = document.getElementById('profileAvatarIcon');
            if (img) {
                img.src = e.target.result;
                img.classList.remove('hidden');
            }
            if (icon) icon.classList.add('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    }
}
window.previewProfileImage = previewProfileImage;

// Setup event listeners
function setupUserListeners() {
    // Close modals
    document.querySelectorAll(".modal-close").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.closest(".cyber-modal")?.classList.remove("active");
        });
    });
    
    // Submit exam button
    const submitExamBtn = document.getElementById("submitExamBtn");
    if (submitExamBtn) {
        submitExamBtn.addEventListener("click", submitExam);
    }
    
    // Submit certificate button
    const submitCertBtn = document.getElementById("submitCertBtn");
    if (submitCertBtn) {
        submitCertBtn.addEventListener("click", submitCertificateExam);
    }
    
    // Upload payment button
    const uploadPaymentBtn = document.getElementById("uploadPaymentBtn");
    if (uploadPaymentBtn) {
        uploadPaymentBtn.addEventListener("click", uploadPayment);
    }

    // Handle Profile Update
    const profileForm = document.getElementById("profileForm");
    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const messageDiv = document.getElementById("profileMessage");
            messageDiv.classList.remove("hidden");
            messageDiv.className = "mt-4 text-center text-sm font-bold p-3 rounded bg-yellow-900/50 text-yellow-400 border border-yellow-500";
            messageDiv.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Menyimpan...';
            
            const formData = new FormData(profileForm);
            
            try {
                const token = localStorage.getItem("token");
                const response = await fetch("http://localhost:5000/api/user/profile", {
                    method: 'PUT',
                    headers: { "Authorization": `Bearer ${token}` },
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    messageDiv.className = "mt-4 text-center text-sm font-bold p-3 rounded bg-green-900/50 text-green-400 border border-green-500";
                    messageDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i> ' + result.message;
                    await loadProfileData(); // Reload preview
                } else {
                    messageDiv.className = "mt-4 text-center text-sm font-bold p-3 rounded bg-red-900/50 text-red-400 border border-red-500";
                    messageDiv.innerHTML = '<i class="fas fa-times-circle mr-2"></i> ' + result.message;
                }
            } catch (error) {
                messageDiv.className = "mt-4 text-center text-sm font-bold p-3 rounded bg-red-900/50 text-red-400 border border-red-500";
                messageDiv.innerHTML = '<i class="fas fa-wifi mr-2"></i> Gagal terhubung ke server';
            }
        });
    }
}

// Helper functions
function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `cyber-toast fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg text-white
        ${type === "success" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-blue-600"}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Export functions
window.showMateriDetail = showMateriDetail;
window.startExam = startExam;
window.startCertificateExam = startCertificateExam;
window.recordNilaiBabToBlockchain = recordNilaiBabToBlockchain;

// Initialize
document.addEventListener('DOMContentLoaded', initUser);