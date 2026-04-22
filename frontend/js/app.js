import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

// State Management
let currentUser = null;
let isLoggedIn = false;

// Check authentication
async function checkAuth() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");
    const wallet = localStorage.getItem("walletAddress");
    
    if (token && role) {
        isLoggedIn = true;
        currentUser = { role, wallet };
        
        // Update UI based on role
        updateNavbar();
        
        // Redirect if on wrong page
        const path = window.location.pathname;
        if (role === "admin" && !path.includes("admin")) {
            window.location.href = "admin.html";
        } else if (role === "user" && !path.includes("user") && !path.includes("materi") && !path.includes("ujian")) {
            window.location.href = "user.html";
        }
    } else {
        // Not logged in, show login/register options
        updateNavbar(false);
    }
}

// Update navbar based on login status
function updateNavbar(loggedIn = isLoggedIn) {
    const authButtons = document.getElementById("authButtons");
    const userMenu = document.getElementById("userMenu");
    const adminMenu = document.getElementById("adminMenu");
    
    if (!authButtons) return;
    
    if (loggedIn && currentUser) {
        authButtons.style.display = "none";
        if (currentUser.role === "admin" && adminMenu) {
            adminMenu.style.display = "block";
        } else if (userMenu) {
            userMenu.style.display = "block";
        }
    } else {
        authButtons.style.display = "flex";
        if (userMenu) userMenu.style.display = "none";
        if (adminMenu) adminMenu.style.display = "none";
    }
}

// Logout function
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("walletAddress");
    currentUser = null;
    isLoggedIn = false;
    window.location.href = "index.html";
}

// Show loading state
function showLoading(show) {
    const loader = document.getElementById("loadingOverlay");
    if (loader) {
        loader.style.display = show ? "flex" : "none";
    }
}

// Format date
function formatDate(timestamp) {
    return new Date(Number(timestamp) * 1000).toLocaleString("id-ID");
}

// Shorten address
function shortenAddress(address) {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Export global functions
window.app = {
    checkAuth,
    logout,
    showLoading,
    formatDate,
    shortenAddress
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
    await checkAuth();
    
    // Setup logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }
    
    // Animate stats if on landing page
    const statNumbers = document.querySelectorAll(".stat-number");
    if (statNumbers.length) {
        statNumbers.forEach(stat => {
            const target = parseInt(stat.dataset.target);
            let current = 0;
            const increment = target / 50;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    stat.textContent = target;
                    clearInterval(timer);
                } else {
                    stat.textContent = Math.floor(current);
                }
            }, 40);
        });
    }
});