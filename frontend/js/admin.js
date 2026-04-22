import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

// State
let currentTab = "dashboard";
let allUsers = [];
let allPayments = [];
let selectedUser = null;

// Initialize admin dashboard
async function initAdmin() {
    // Check if user is admin
    const role = localStorage.getItem("userRole");
    if (role !== "admin") {
        window.location.href = "index.html";
        return;
    }
    
    // Load data
    await loadDashboardData();
    await loadUsers();
    await loadPayments();
    
    // Setup event listeners
    setupAdminListeners();
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/admin/stats", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById("totalUsers").textContent = data.totalUsers || 0;
            document.getElementById("totalMateri").textContent = data.totalMateri || 0;
            document.getElementById("totalSertifikat").textContent = data.totalSertifikat || 0;
            document.getElementById("pendingPayments").textContent = data.pendingPayments || 0;
        }
    } catch (error) {
        console.error("Error loading dashboard:", error);
    }
}

// Load users list
async function loadUsers() {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/admin/users", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            allUsers = await response.json();
            renderUsersTable();
        }
    } catch (error) {
        console.error("Error loading users:", error);
    }
}

// Render users table
function renderUsersTable() {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = allUsers.map(user => `
        <tr>
            <td class="px-4 py-3">${user.username}</td>
            <td class="px-4 py-3">${user.email}</td>
            <td class="px-4 py-3">${user.walletAddress ? shortenAddress(user.walletAddress) : '-'}</td>
            <td class="px-4 py-3">
                <span class="badge ${user.role === 'admin' ? 'badge-warning' : 'badge-success'}">
                    ${user.role}
                </span>
            </td>
            <td class="px-4 py-3">
                <button onclick="viewUserDetail('${user._id}')" class="btn-cyber px-3 py-1 text-xs">
                    <i class="fas fa-eye"></i> Detail
                </button>
            </td>
        </tr>
    `).join("");
}

// Load payments
async function loadPayments() {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/admin/payments", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            allPayments = await response.json();
            renderPaymentsTable();
        }
    } catch (error) {
        console.error("Error loading payments:", error);
    }
}

// Render payments table
function renderPaymentsTable() {
    const tbody = document.getElementById("paymentsTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = allPayments.map(payment => `
        <tr>
            <td class="px-4 py-3">${payment.user?.username || '-'}</td>
            <td class="px-4 py-3">Rp ${payment.amount.toLocaleString()}</td>
            <td class="px-4 py-3">
                <span class="badge ${payment.status === 'pending' ? 'badge-warning' : 'badge-success'}">
                    ${payment.status}
                </span>
            </td>
            <td class="px-4 py-3">${new Date(payment.createdAt).toLocaleDateString()}</td>
            <td class="px-4 py-3">
                ${payment.status === 'pending' ? `
                    <button onclick="verifyPayment('${payment._id}')" class="btn-cyber px-3 py-1 text-xs">
                        <i class="fas fa-check"></i> Verifikasi
                    </button>
                ` : `
                    <button onclick="uploadToBlockchain('${payment._id}')" class="btn-cyber-purple px-3 py-1 text-xs">
                        <i class="fas fa-link"></i> Upload ke Blockchain
                    </button>
                `}
            </td>
        </tr>
    `).join("");
}

// View user detail
async function viewUserDetail(userId) {
    const user = allUsers.find(u => u._id === userId);
    if (!user) return;
    
    selectedUser = user;
    
    // Load user exam results
    await loadUserExamResults(userId);
    
    const modal = document.getElementById("userDetailModal");
    if (modal) {
        document.getElementById("modalUserName").textContent = user.username;
        document.getElementById("modalUserEmail").textContent = user.email;
        document.getElementById("modalUserWallet").textContent = user.walletAddress || "Belum connect";
        modal.classList.add("active");
    }
}

// Load user exam results
async function loadUserExamResults(userId) {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/admin/user-exams/${userId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const exams = await response.json();
            renderExamResults(exams);
        }
    } catch (error) {
        console.error("Error loading exam results:", error);
    }
}

// Render exam results
function renderExamResults(exams) {
    const container = document.getElementById("userExamResults");
    if (!container) return;
    
    if (!exams || exams.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Belum ada hasil ujian</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="cyber-table">
            <thead>
                <tr>
                    <th>Bab</th>
                    <th>Nilai</th>
                    <th>Tanggal</th>
                </tr>
            </thead>
            <tbody>
                ${exams.map(exam => `
                    <tr>
                        <td>${exam.bab}</td>
                        <td>
                            <span class="badge ${exam.nilai >= 80 ? 'badge-success' : 'badge-danger'}">
                                ${exam.nilai}%
                            </span>
                        </td>
                        <td>${new Date(exam.createdAt).toLocaleDateString()}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

// Verify payment
async function verifyPayment(paymentId) {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/admin/verify-payment/${paymentId}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            showToast("Pembayaran berhasil diverifikasi!", "success");
            await loadPayments();
        } else {
            showToast("Gagal verifikasi pembayaran", "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Terjadi kesalahan", "error");
    }
}

// Upload to blockchain
async function uploadToBlockchain(paymentId) {
    const payment = allPayments.find(p => p._id === paymentId);
    if (!payment) return;
    
    try {
        showLoading(true);
        
        // Get Web3 instance
        const web3 = window.web3;
        if (!web3 || !web3.currentAccount) {
            await web3.connectWallet();
        }
        
        // Upload to blockchain
        const ipfsHash = `ipfs://certificate_${paymentId}`;
        const result = await web3.terbitkanSertifikat(
            payment.user.walletAddress,
            payment.user.username,
            ipfsHash
        );
        
        if (result) {
            // Update backend
            const token = localStorage.getItem("token");
            await fetch(`http://localhost:5000/api/admin/certificate-issued/${paymentId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ transactionHash: result.hash })
            });
            
            showToast("Sertifikat berhasil diupload ke blockchain!", "success");
            await loadPayments();
        }
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        console.error(error);
        showToast("Gagal upload ke blockchain", "error");
    }
}

// Add materi form
async function addMateri(event) {
    event.preventDefault();
    
    const formData = {
        judul: document.getElementById("materiJudul").value,
        bab: document.getElementById("materiBab").value,
        konten: document.getElementById("materiKonten").value,
        videoUrl: document.getElementById("materiVideo").value,
        audioUrl: document.getElementById("materiAudio").value,
        urutan: parseInt(document.getElementById("materiUrutan").value)
    };
    
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/admin/materi", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showToast("Materi berhasil ditambahkan!", "success");
            document.getElementById("addMateriForm").reset();
            // Close modal
            document.getElementById("addMateriModal").classList.remove("active");
        } else {
            showToast("Gagal menambahkan materi", "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Terjadi kesalahan", "error");
    }
}

// Add soal form
async function addSoal(event) {
    event.preventDefault();
    
    const formData = {
        bab: document.getElementById("soalBab").value,
        pertanyaan: document.getElementById("soalPertanyaan").value,
        pilihanA: document.getElementById("soalA").value,
        pilihanB: document.getElementById("soalB").value,
        pilihanC: document.getElementById("soalC").value,
        pilihanD: document.getElementById("soalD").value,
        jawabanBenar: document.getElementById("soalJawaban").value,
        poin: parseInt(document.getElementById("soalPoin").value)
    };
    
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/admin/soal", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showToast("Soal berhasil ditambahkan!", "success");
            document.getElementById("addSoalForm").reset();
            document.getElementById("addSoalModal").classList.remove("active");
        } else {
            showToast("Gagal menambahkan soal", "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Terjadi kesalahan", "error");
    }
}

// Setup event listeners
function setupAdminListeners() {
    // Tab switching
    const tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const tabId = tab.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Modal close
    const closeBtns = document.querySelectorAll(".modal-close");
    closeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            btn.closest(".cyber-modal")?.classList.remove("active");
        });
    });
    
    // Form submissions
    const addMateriForm = document.getElementById("addMateriForm");
    if (addMateriForm) {
        addMateriForm.addEventListener("submit", addMateri);
    }
    
    const addSoalForm = document.getElementById("addSoalForm");
    if (addSoalForm) {
        addSoalForm.addEventListener("submit", addSoal);
    }
}

// Switch tab
function switchTab(tabId) {
    currentTab = tabId;
    
    // Hide all tab contents
    document.querySelectorAll(".tab-content").forEach(content => {
        content.classList.add("hidden");
    });
    
    // Show selected tab
    const selectedContent = document.getElementById(`tab-${tabId}`);
    if (selectedContent) {
        selectedContent.classList.remove("hidden");
    }
    
    // Update active tab styling
    document.querySelectorAll(".admin-tab").forEach(tab => {
        tab.classList.remove("border-neon-green", "text-neon-green");
        tab.classList.add("text-gray-400");
    });
    
    const activeTab = document.querySelector(`.admin-tab[data-tab="${tabId}"]`);
    if (activeTab) {
        activeTab.classList.add("border-neon-green", "text-neon-green");
        activeTab.classList.remove("text-gray-400");
    }
}

// Helper functions
function shortenAddress(address) {
    if (!address) return "-";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `cyber-toast fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg text-white
        ${type === "success" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-blue-600"}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showLoading(show) {
    const loader = document.getElementById("loadingOverlay");
    if (loader) {
        loader.style.display = show ? "flex" : "none";
    }
}

// Export functions
window.viewUserDetail = viewUserDetail;
window.verifyPayment = verifyPayment;
window.uploadToBlockchain = uploadToBlockchain;

// Initialize
document.addEventListener("DOMContentLoaded", initAdmin);