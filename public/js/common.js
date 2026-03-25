// ===== Common JavaScript Utilities =====
const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
}

// Initialize theme on load
initTheme();

// JWT Token Management
function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
}

function getRole() {
    return localStorage.getItem('role');
}

function getUserName() {
    return localStorage.getItem('userName');
}

function setUserInfo(token, role, name, userId) {
    setToken(token);
    localStorage.setItem('role', role);
    localStorage.setItem('userName', name);
    if (userId) localStorage.setItem('userId', userId);
}

// Auth Check
function requireAuth(allowedRole) {
    const token = getToken();
    const role = getRole();
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    if (allowedRole && role !== allowedRole) {
        if (role === 'admin') window.location.href = 'admin-dashboard.html';
        else if (role === 'mechanic') window.location.href = 'mechanic-dashboard.html';
        else window.location.href = 'user-dashboard.html';
        return false;
    }
    return true;
}

function redirectIfLoggedIn() {
    const token = getToken();
    const role = getRole();
    if (token) {
        if (role === 'admin') window.location.href = 'admin-dashboard.html';
        else if (role === 'mechanic') window.location.href = 'mechanic-dashboard.html';
        else window.location.href = 'user-dashboard.html';
    }
}

// API Helper
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {};

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const config = {
        ...options,
        headers: { ...headers, ...options.headers }
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                removeToken();
                window.location.href = 'login.html';
                return null;
            }
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        return data;
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Cannot connect to server. Please ensure the backend is running.');
        }
        throw error;
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Logout
function logout() {
    removeToken();
    window.location.href = 'login.html';
}

// Inject Navbar for public pages
function injectPublicNavbar() {
    const token = getToken();
    const role = getRole();

    let authLinks = '';
    const themeBtn = `<button onclick="toggleTheme()" class="btn btn-outline btn-sm" style="padding: 0.4rem; border: none; font-size: 1.2rem; margin-left: 0.5rem;" title="Toggle Theme">🌓</button>`;

    if (token) {
        authLinks = `
          <a href="#" onclick="logout(); return false;">Logout</a>
        `;
    } else {
        authLinks = `
          <a href="login.html">Login</a>
          <a href="signup.html?role=user" class="btn btn-primary btn-sm">Sign Up</a>
        `;
    }

    const navbar = document.getElementById('navbar');
    if (navbar) {
        navbar.innerHTML = `
          <a href="index.html" class="navbar-brand">
            <span class="brand-icon">🔧</span>
            MechPartner
          </a>
          <div class="navbar-toggle" onclick="toggleNavMenu()">
            <span></span><span></span><span></span>
          </div>
          <nav class="navbar-links" id="navLinks" style="display: flex; align-items: center;">
            ${authLinks}
            <a href="index.html">Home</a>
            ${themeBtn}
          </nav>
        `;
    }
}

// Inject Sidebar for dashboard pages
function injectSidebar(role) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const userName = getUserName() || 'User';

    if (role === 'admin') {
        sidebar.innerHTML = `
      <div class="sidebar-brand">
        <span class="brand-icon">🔧</span>
        MechPartner
      </div>
      <ul class="sidebar-menu">
        <li><a href="admin-dashboard.html" id="nav-admin-dashboard"><span class="menu-icon">🛡️</span> Dashboard</a></li>
        <li><a href="#" onclick="logout(); return false;"><span class="menu-icon">🚪</span> Logout</a></li>
      </ul>
    `;
    } else if (role === 'user') {
        sidebar.innerHTML = `
      <div class="sidebar-brand">
        <span class="brand-icon">🔧</span>
        MechPartner
      </div>
      <ul class="sidebar-menu">
        <li><a href="user-dashboard.html" id="nav-dashboard"><span class="menu-icon">📊</span> Dashboard</a></li>
        <li><a href="user-profile.html" id="nav-profile"><span class="menu-icon">👤</span> My Profile</a></li>
        <li><a href="messages.html" id="nav-messages"><span class="menu-icon">💬</span> Messages</a></li>
        <li><a href="#" onclick="openMechBot(); return false;"><span class="menu-icon">🤖</span> Help Assistant</a></li>
        <li><a href="search-mechanics.html" id="nav-search"><span class="menu-icon">🔍</span> Find Mechanics</a></li>
        <li><a href="service-history.html" id="nav-history"><span class="menu-icon">📋</span> Service History</a></li>
        <li><a href="#" onclick="logout(); return false;"><span class="menu-icon">🚪</span> Logout</a></li>
      </ul>
    `;
    } else {
        sidebar.innerHTML = `
      <div class="sidebar-brand">
        <span class="brand-icon">🔧</span>
        MechPartner
      </div>
      <ul class="sidebar-menu">
        <li><a href="mechanic-dashboard.html" id="nav-dashboard"><span class="menu-icon">📊</span> Dashboard</a></li>
        <li><a href="mechanic-profile.html" id="nav-profile"><span class="menu-icon">👤</span> Profile</a></li>
        <li><a href="messages.html" id="nav-messages"><span class="menu-icon">💬</span> Messages</a></li>
        <li><a href="#" onclick="openMechBot(); return false;"><span class="menu-icon">🤖</span> Help Assistant</a></li>
        <li><a href="job-requests.html" id="nav-jobs"><span class="menu-icon">📥</span> Job Requests</a></li>
        <li><a href="#" onclick="logout(); return false;"><span class="menu-icon">🚪</span> Logout</a></li>
      </ul>
    `;
    }
}

// Set active sidebar link
function setActiveNav(linkId) {
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    const el = document.getElementById(linkId);
    if (el) el.classList.add('active');
}

// Mobile nav toggle
function toggleNavMenu() {
    document.getElementById('navLinks')?.classList.toggle('active');
}

// Mobile sidebar toggle
function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('active');
}

// Get user location via browser
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                reject(new Error('Unable to get your location. Please allow location access.'));
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// Generate star rating HTML
function getStarsHTML(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    let html = '';
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) html += '★';
        else if (i === fullStars && halfStar) html += '★';
        else html += '☆';
    }
    return html;
}

// File upload preview
function setupFileUpload(inputId, labelId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    if (input && label) {
        input.addEventListener('change', () => {
            if (input.files.length > 0) {
                label.textContent = input.files[0].name;
                label.style.color = 'var(--accent)';
            }
        });
    }
}
