// User Dashboard Logic
let currentBab = null;
let currentSoal = [];
let userNilaiPerBab = {};
let sertifikatSoal = [];

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
    const jawaban = {};
    currentSoal.forEach(soal => {
        const selected = document.querySelector(`input[name="soal_${soal._id}"]:checked`);
        if (selected) {
            jawaban[soal._id] = selected.value;
        }
    });
    
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/ujian/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                bab: currentBab,
                jawaban: jawaban,
                soals: currentSoal
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(`Nilai Anda: ${result.nilai}%`, result.nilai >= 80 ? "success" : "error");
            document.getElementById("examModal").classList.remove("active");
            await loadBabList();
            await loadProgress();
        }
    } catch (error) {
        console.error("Error submitting exam:", error);
        showToast("Gagal submit ujian", "error");
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
    
    container.innerHTML = certificates.map(cert => `
        <div class="certificate-card bg-black/40 border border-neon-gold/30 p-6 rounded-lg relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-neon-gold/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            
            <div class="text-center mb-6">
                <i class="fas fa-certificate text-5xl text-neon-gold mb-3 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]"></i>
                <h4 class="text-2xl font-bold font-orbitron text-white tracking-widest uppercase">Sertifikat Kelulusan</h4>
                <p class="text-xs text-neon-gold tracking-widest mt-1">TAJWID LEARNING - AL FIRQOH AN-NAJIYAH</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-gray-700/50 py-4 my-4">
                <div>
                    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                    <p class="font-bold text-lg text-white">${cert.nama_lengkap || 'Tidak Diketahui'}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Nomor Peserta</p>
                    <p class="font-bold text-neon-gold">${cert.nomor_peserta || 'Masa Tunggu'}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Nilai Ujian</p>
                    <p class="font-bold text-neon-green text-lg">${cert.nilai ? cert.nilai + '%' : '-'}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Tanggal Kelulusan</p>
                    <p class="font-bold text-white">${new Date(cert.issued_at || cert.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                </div>
            </div>
            
            <div class="text-center mt-6">
                ${cert.transactionHash ? `
                    <div class="inline-flex flex-col items-center gap-2">
                        <span class="px-3 py-1 bg-green-900/30 text-green-400 border border-green-500 rounded-full text-xs font-bold tracking-wider">TERVERIFIKASI BLOCKCHAIN</span>
                        <a href="https://sepolia.etherscan.io/tx/${cert.transactionHash}" target="_blank" 
                           class="text-neon-blue text-sm hover:underline flex items-center gap-2 transition-all hover:drop-shadow-[0_0_8px_rgba(0,195,255,0.8)]">
                            <i class="fas fa-link"></i> Lihat Transaksi
                        </a>
                    </div>
                ` : '<span class="px-3 py-1 bg-yellow-900/30 text-yellow-400 border border-yellow-500 rounded-full text-xs">PENDING PEMBAYARAN</span>'}
            </div>
        </div>
    `).join("");
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
            
            document.getElementById("edit_username").value = user.username;
            document.getElementById("edit_nomor_peserta").value = user.nomor_peserta || "Belum Tersedia";
            document.getElementById("edit_nama_lengkap").value = user.nama_lengkap || "";
            document.getElementById("edit_no_hp").value = user.no_hp || "";
            document.getElementById("edit_instansi").value = user.instansi || "";
            document.getElementById("edit_kota").value = user.kota || "";

            // Jenis Kelamin - edit dropdown
            const jkSelect = document.getElementById("edit_jenis_kelamin");
            if (jkSelect) jkSelect.value = user.jenis_kelamin || "";

            // Jenis Kelamin - lihat profil
            const viewJK = document.getElementById("view_jenis_kelamin");
            if (viewJK) viewJK.textContent = user.jenis_kelamin || "-";

            // Tampilkan foto profil jika ada
            const img = document.getElementById("profilePreview");
            const icon = document.getElementById("profileAvatarIcon");
            if (user.foto_profil && img) {
                img.src = 'http://localhost:5000' + user.foto_profil;
                img.classList.remove('hidden');
                if (icon) icon.classList.add('hidden');
            } else {
                if (img) img.classList.add('hidden');
                if (icon) icon.classList.remove('hidden');
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

// Initialize
document.addEventListener("DOMContentLoaded", initUser);