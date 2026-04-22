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
        <div class="certificate-card">
            <i class="fas fa-certificate text-4xl text-neon-gold mb-3"></i>
            <h4 class="text-xl font-bold">Sertifikat Tajwid</h4>
            <p class="text-sm mt-2">Nilai: ${cert.nilai}%</p>
            <p class="text-xs text-gray-400">Tanggal: ${new Date(cert.createdAt).toLocaleDateString()}</p>
            ${cert.transactionHash ? `
                <a href="https://sepolia.etherscan.io/tx/${cert.transactionHash}" target="_blank" 
                   class="inline-block mt-3 text-neon-blue text-sm hover:underline">
                    <i class="fas fa-link"></i> Lihat di Blockchain
                </a>
            ` : ''}
        </div>
    `).join("");
}

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