// ===== Mechanic Pages JavaScript =====
document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;

    if (page === 'mechanic-dashboard') {
        initMechanicDashboard();
    } else if (page === 'mechanic-profile') {
        initMechanicProfile();
    } else if (page === 'job-requests') {
        initJobRequests();
    }
});

async function refreshMechanicDashboard() {
    try {
        const requests = await apiRequest('/mechanic/requests');
        if (requests) {
            const total = requests.length;
            const pending = requests.filter(r => r.status === 'pending').length;
            const accepted = requests.filter(r => r.status === 'accepted').length;
            const completed = requests.filter(r => r.status === 'completed').length;

            if (document.getElementById('totalJobs')) document.getElementById('totalJobs').textContent = total;
            if (document.getElementById('pendingJobs')) document.getElementById('pendingJobs').textContent = pending;
            if (document.getElementById('activeJobs')) document.getElementById('activeJobs').textContent = accepted;
            if (document.getElementById('completedJobs')) document.getElementById('completedJobs').textContent = completed;

            // Recent requests (show only non-pending in main body if desired, or all)
            const recentList = document.getElementById('recentJobs');
            if (recentList) {
                const recent = requests.slice(0, 5);
                if (recent.length === 0) {
                    recentList.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">📥</div>
              <h3>No job requests yet</h3>
              <p>Your incoming service requests will appear here.</p>
            </div>
          `;
                } else {
                    recentList.innerHTML = recent.map(r => `
            <div class="card" style="margin-bottom: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong>${r.userId?.name || 'Customer'}</strong>
                  <p style="color: var(--text-secondary); font-size: 0.85rem;">${r.issue}</p>
                </div>
                <span class="badge badge-${r.status}">${r.status}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                <div style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(r.createdAt)}</div>
                <button class="btn-chat" onclick="openChat('${r._id}', '${r.userId?.name || 'Customer'}')">💬 Chat</button>
              </div>
            </div>
          `).join('');
                }
            }

            // Update Sidebar automatically
            renderRequestSidebar(requests.filter(r => r.status === 'pending'));
        }
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

let dashboardPollInterval;

// Starts polling and initial fetches
async function initMechanicDashboard() {
    if (!requireAuth('mechanic')) return;
    injectSidebar('mechanic');
    setActiveNav('nav-dashboard');

    const userName = getUserName() || 'Mechanic';
    document.getElementById('welcomeName').textContent = userName;

    await refreshMechanicDashboard();

    // Poll every 5s for real-time request incoming effect
    dashboardPollInterval = setInterval(refreshMechanicDashboard, 5000);
}

// Dedicated function to render requests in the new Request Sidebar
function renderRequestSidebar(pendingReqs) {
    const rsBody = document.getElementById('rsBody');
    const rsBadge = document.getElementById('rsBadge');
    
    if (!rsBody || !rsBadge) return;

    if (pendingReqs.length > 0) {
        rsBadge.textContent = pendingReqs.length;
        rsBadge.classList.add('visible');
        
        rsBody.innerHTML = pendingReqs.map(r => `
            <div class="req-card">
                <div style="display: flex; justify-content: space-between;">
                    <h4>${r.userId?.name || 'Customer'}</h4>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${formatDate(r.createdAt).split(' ')[1]}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">📍 ${r.userId?.address || 'Location provided'}</div>
                <p><strong>Issue:</strong> ${r.issue}</p>
                <div class="req-actions">
                    <button class="btn btn-success btn-sm btn-block" onclick="updateSidebarRequestStatus('${r._id}', 'accepted')">✅ Accept</button>
                    <button class="btn btn-danger btn-sm btn-block" onclick="updateSidebarRequestStatus('${r._id}', 'rejected')">❌ Reject</button>
                </div>
            </div>
        `).join('');
    } else {
        rsBadge.classList.remove('visible');
        rsBody.innerHTML = `
            <div class="empty-state" style="padding: 2rem 1rem;">
                <div class="spinner" style="margin: 0 auto 1rem; width:24px; height:24px; border-width:2px;"></div>
                <p style="font-size:0.85rem">Listening for requests...</p>
            </div>
        `;
    }
}

async function updateSidebarRequestStatus(id, status) {
    try {
        await apiRequest(`/service/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        showToast(`Request ${status}!`, 'success');
        refreshMechanicDashboard();
        if (typeof loadJobRequests === 'function' && document.body.dataset.page === 'job-requests') {
            loadJobRequests();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ===== Mechanic Profile =====
async function initMechanicProfile() {
    if (!requireAuth('mechanic')) return;
    injectSidebar('mechanic');
    setActiveNav('nav-profile');

    try {
        const profile = await apiRequest('/profile');
        if (profile) {
            const name = profile.name || 'Mechanic';
            document.getElementById('profileName').textContent = name;
            document.getElementById('profileShop').textContent = profile.shopName || 'Not set';
            document.getElementById('profileEmail').textContent = profile.email || '—';
            document.getElementById('profilePhone').textContent = profile.phone || 'Not set';

            const avatarEl = document.getElementById('profileAvatar');
            if (avatarEl) {
                if (profile.profilePhoto) {
                    avatarEl.innerHTML = `<img src="${BASE_URL}/uploads/${profile.profilePhoto}" alt="Profile">`;
                } else {
                    avatarEl.textContent = name.charAt(0).toUpperCase();
                }
            }

            // Fill form fields with safety checks
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            };

            setVal('editName', profile.name);
            setVal('editPhone', profile.phone);
            setVal('editShopName', profile.shopName);
            setVal('editShopAddress', profile.shopAddress);
            setVal('editServiceArea', profile.serviceArea);
            
            const servicesEl = document.getElementById('editServices');
            if (servicesEl) {
                servicesEl.value = (profile.services || []).join(', ');
            }
        }
    } catch (error) {
        console.error('Mechanic profile load error:', error);
        showToast(error.message || 'Failed to load profile. Please sign in again.', 'error');
    }

    // Profile update form
    document.getElementById('mechanicProfileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            const formData = new FormData(e.target);
            const data = await apiRequest('/mechanic/update', { method: 'PUT', body: formData });
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
    ['profilePhoto', 'aadharCard', 'panCard', 'drivingLicense', 'shopImage'].forEach(id => {
        setupFileUpload(id, id + 'Label');
    });

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
            await apiRequest('/mechanic/update', { method: 'PUT', body: formData });
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

// ===== Job Requests =====
async function initJobRequests() {
    if (!requireAuth('mechanic')) return;
    injectSidebar('mechanic');
    setActiveNav('nav-jobs');

    await loadJobRequests();
}

async function loadJobRequests() {
    const listEl = document.getElementById('jobList');
    if (!listEl) return;

    listEl.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading requests...</p></div>';

    try {
        const requests = await apiRequest('/mechanic/requests');
        if (!requests || requests.length === 0) {
            listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📥</div>
          <h3>No job requests</h3>
          <p>Incoming service requests from users will appear here.</p>
        </div>
      `;
            return;
        }

        listEl.innerHTML = requests.map(r => `
      <div class="card" style="margin-bottom: 1rem; animation: fadeInUp 0.5s ease-out;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div style="flex: 1; min-width: 200px;">
            <h3 style="font-size: 1.05rem; margin-bottom: 0.25rem;">${r.userId?.name || 'Customer'}</h3>
            <div style="display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.5rem;">
              <span style="font-size: 0.85rem; color: var(--text-secondary);">📧 ${r.userId?.email || 'N/A'}</span>
              <span style="font-size: 0.85rem; color: var(--text-secondary);">📱 ${r.userId?.phone || 'N/A'}</span>
              <span style="font-size: 0.85rem; color: var(--text-secondary);">📍 ${r.userId?.address || 'N/A'}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <span class="badge badge-${r.status}">${r.status}</span>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">${formatDate(r.createdAt)}</div>
            <button class="btn-chat" style="margin-top: 0.5rem;" onclick="openChat('${r._id}', '${r.userId?.name || 'Customer'}')">💬 Chat with Customer</button>
          </div>
        </div>
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
          <p style="font-size: 0.9rem;"><strong>Issue:</strong> ${r.issue}</p>
        </div>
        ${r.status === 'pending' ? `
          <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
            <button class="btn btn-success btn-sm" onclick="updateRequestStatus('${r._id}', 'accepted')">✓ Accept</button>
            <button class="btn btn-danger btn-sm" onclick="updateRequestStatus('${r._id}', 'rejected')">✕ Reject</button>
          </div>
        ` : ''}
        ${r.status === 'accepted' ? `
          <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
            <button class="btn btn-success btn-sm" onclick="updateRequestStatus('${r._id}', 'completed')">✓ Mark Complete</button>
            <button class="btn btn-danger btn-sm" onclick="updateRequestStatus('${r._id}', 'cancelled')">✕ Cancel</button>
          </div>
        ` : ''}
      </div>
    `).join('');
    } catch (error) {
        showToast('Failed to load job requests', 'error');
    }
}

async function updateRequestStatus(requestId, status) {
    try {
        await apiRequest(`/service/${requestId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        showToast(`Request ${status}!`, 'success');
        if (typeof refreshMechanicDashboard === 'function' && document.body.dataset.page === 'mechanic-dashboard') {
            refreshMechanicDashboard();
        } else if (typeof loadJobRequests === 'function') {
            await loadJobRequests();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}
