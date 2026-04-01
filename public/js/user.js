// ===== User Pages JavaScript =====
document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;

    if (page === 'user-dashboard') {
        initUserDashboard();
    } else if (page === 'user-profile') {
        initUserProfile();
    } else if (page === 'service-history') {
        initServiceHistory();
    }
});

let userDashboardPollInterval;

async function initUserDashboard() {
    if (!requireAuth('user')) return;
    injectSidebar('user');
    setActiveNav('nav-dashboard');

    const userName = getUserName() || 'User';
    document.getElementById('welcomeName').textContent = userName;

    await refreshUserDashboard();
    userDashboardPollInterval = setInterval(refreshUserDashboard, 5000);
}

// ===== User Dashboard Refresh Logic =====
async function refreshUserDashboard() {
    try {
        const services = await apiRequest('/user/services');
        if (services) {
            const total = services.length;
            const pending = services.filter(s => s.status === 'pending').length;
            const completed = services.filter(s => s.status === 'completed').length;

            if (document.getElementById('totalRequests')) document.getElementById('totalRequests').textContent = total;
            if (document.getElementById('pendingRequests')) document.getElementById('pendingRequests').textContent = pending;
            if (document.getElementById('completedRequests')) document.getElementById('completedRequests').textContent = completed;

            // Recent requests
            const recentList = document.getElementById('recentRequests');
            if (recentList) {
                const recent = services.slice(0, 5);
                if (recent.length === 0) {
                    recentList.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">📋</div>
              <h3>No service requests yet</h3>
              <p>Find nearby mechanics and request your first service!</p>
            </div>
          `;
                } else {
                    recentList.innerHTML = recent.map(s => {
                        const isRejectedAndSearching = false; // Auto-forwarding disabled
                        const isRejectedAndFailed = s.status === 'rejected'; // Just standard rejection
                        const isAccepted = s.status === 'accepted';
                        
                        let mechanicNameLabel = s.mechanicId?.name || 'Mechanic';
                        let shopDesc = s.mechanicId?.shopName || '';
                        let badgeClass = s.status;
                        let statusBadgeText = s.status;

                        if (isRejectedAndFailed) {
                            badgeClass = 'danger';
                            statusBadgeText = '❌ Rejected';
                            mechanicNameLabel = 'Mechanic rejected your request';
                            shopDesc = 'The mechanic is currently unavailable or declined.';
                        } else if (isAccepted) {
                            statusBadgeText = '✅ Request accepted';
                        }
                        
                        return `
            <div class="card" style="margin-bottom: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong>${mechanicNameLabel}</strong>
                  <p style="color: var(--text-secondary); font-size: 0.85rem;">${shopDesc ? shopDesc + ' — ' : ''}${s.issue}</p>
                </div>
                <span class="badge badge-${badgeClass}">${statusBadgeText}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                <div style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(s.createdAt)}</div>
                ${!isRejectedAndSearching ? `<button class="btn-chat" onclick="openChat('${s._id}', '${s.mechanicId?.name || 'Mechanic'}')">💬 Chat</button>` : `<span style="font-size:0.8rem;color:var(--text-muted);">Finding next available...</span>`}
              </div>
            </div>
          `}).join('');
                }
            }
        }
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

// ===== User Profile =====
async function initUserProfile() {
    if (!requireAuth('user')) return;
    injectSidebar('user');
    setActiveNav('nav-profile');

    try {
        const profile = await apiRequest('/profile');
        if (profile) {
            const name = profile.name || 'User';
            document.getElementById('profileName').textContent = name;
            document.getElementById('profileEmail').textContent = profile.email || '—';
            document.getElementById('profilePhone').textContent = profile.phone || 'Not set';
            document.getElementById('profileAddress').textContent = profile.address || 'Not set';

            // Set avatar
            const avatarEl = document.getElementById('profileAvatar');
            if (avatarEl) {
                if (profile.profilePhoto) {
                    avatarEl.innerHTML = `<img src="${BASE_URL}/uploads/${profile.profilePhoto}" alt="Profile">`;
                } else {
                    avatarEl.textContent = name.charAt(0).toUpperCase();
                }
            }

            // Fill form
            if (document.getElementById('editName')) document.getElementById('editName').value = profile.name || '';
            if (document.getElementById('editPhone')) document.getElementById('editPhone').value = profile.phone || '';
            if (document.getElementById('editAddress')) document.getElementById('editAddress').value = profile.address || '';
        }
    } catch (error) {
        console.error('Profile load error:', error);
        showToast(error.message || 'Failed to load profile. Please try logging in again.', 'error');
    }

    // Profile update form
    document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            const formData = new FormData(e.target);
            const data = await apiRequest('/update-profile', { method: 'PUT', body: formData });
            if (data) {
                showToast('Profile updated successfully!', 'success');
                localStorage.setItem('userName', data.name);
                setTimeout(() => window.location.reload(), 800);
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
        }
    });

    // Password change form
    document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;

        if (newPass !== confirmPass) {
            showToast('Passwords do not match!', 'error');
            return;
        }

        try {
            await apiRequest('/change-password', {
                method: 'PUT',
                body: JSON.stringify({
                    currentPassword: document.getElementById('currentPassword').value,
                    newPassword: newPass
                })
            });
            showToast('Password changed successfully!', 'success');
            e.target.reset();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // File upload labels
    ['profilePhoto', 'aadharCard'].forEach(id => setupFileUpload(id, id + 'Label'));

    // Location update
    document.getElementById('updateLocationBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('updateLocationBtn');
        btn.disabled = true;
        btn.textContent = '📍 Getting location...';
        try {
            const loc = await getUserLocation();
            const formData = new FormData();
            formData.append('lat', loc.lat);
            formData.append('lng', loc.lng);
            await apiRequest('/update-profile', { method: 'PUT', body: formData });
            showToast('Location updated!', 'success');
            btn.textContent = '✓ Location updated';
            btn.style.background = 'var(--success)';
        } catch (error) {
            showToast(error.message, 'error');
            btn.textContent = '📍 Update Location';
            btn.disabled = false;
        }
    });
}

// ===== Service History =====
let serviceHistoryPollInterval;

async function initServiceHistory() {
    if (!requireAuth('user')) return;
    injectSidebar('user');
    setActiveNav('nav-history');

    await refreshServiceHistory();
    serviceHistoryPollInterval = setInterval(refreshServiceHistory, 5000);
}

async function refreshServiceHistory() {
    const listEl = document.getElementById('serviceList');
    if (!listEl) return;

    try {
        const services = await apiRequest('/user/services');
        if (!services || services.length === 0) {
            listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No service history</h3>
          <p>Your service requests will appear here.</p>
        </div>
      `;
            return;
        }

        listEl.innerHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Mechanic</th>
              <th>Shop</th>
              <th>Issue</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${services.map(s => {
                const isRejectedAndSearching = false; // Auto forwarding disabled
                const isRejectedAndFailed = s.status === 'rejected';
                const isAccepted = s.status === 'accepted';
                
                let mechanicNameLabel = s.mechanicId?.name || 'N/A';
                let shopDesc = s.mechanicId?.shopName || 'N/A';
                let badgeClass = s.status;
                let statusBadgeText = s.status;

                if (isRejectedAndFailed) {
                    badgeClass = 'danger';
                    statusBadgeText = 'Rejected';
                    mechanicNameLabel = 'Mechanic rejected your request';
                    shopDesc = 'Declined';
                } else if (isAccepted) {
                    statusBadgeText = 'Request accepted';
                }
                
                return `
              <tr>
                <td><strong>${mechanicNameLabel}</strong></td>
                <td>${shopDesc}</td>
                <td>${s.issue}</td>
                <td><span class="badge badge-${badgeClass}">${statusBadgeText}</span></td>
                <td>${formatDate(s.createdAt)}</td>
                <td>${(!isRejectedAndSearching && !isRejectedAndFailed) ? `<button class="btn-chat" onclick="openChat('${s._id}', '${s.mechanicId?.name || 'Mechanic'}')">💬</button>` : ''}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    `;
    } catch (error) {
        console.error('Failed to load service history:', error);
    }
}
