// ===== Global Messages Page JavaScript =====
document.addEventListener('DOMContentLoaded', () => {
    initMessagesPage();
});

async function initMessagesPage() {
    const role = getRole();
    if (!requireAuth(role)) return;
    injectSidebar(role);
    setActiveNav('nav-messages');

    if (role === 'user') {
        document.getElementById('partnerType').textContent = 'mechanics';
    } else if (role === 'mechanic') {
        document.getElementById('partnerType').textContent = 'customers';
    }

    await loadConversations();
}

async function loadConversations() {
    const listEl = document.getElementById('messagesList');
    if (!listEl) return;

    try {
        const role = getRole();
        const endpoint = role === 'user' ? '/user/services' : '/mechanic/requests';
        const requests = await apiRequest(endpoint);

        if (!requests || requests.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <h3>No conversations yet</h3>
                    <p>When you start chatting about a service request, it will appear here.</p>
                </div>
            `;
            return;
        }

        // We show all requests, but maybe highlight those with messages eventually.
        // For now, any request is an entry point to a chat.
        listEl.innerHTML = requests.map(r => {
            const partner = role === 'user' ? r.mechanicId : r.userId;
            const partnerName = partner?.name || (role === 'user' ? 'Mechanic' : 'Customer');
            const subText = role === 'user' ? (partner?.shopName || 'Garage') : (r.issue || 'Service Request');

            return `
                <div class="card animate-fade-in-up" style="margin-bottom: 1rem; cursor: pointer;" onclick="openChat('${r._id}', '${partnerName}')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div class="avatar-sm" style="width: 45px; height: 45px; background: var(--accent); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">
                                ${partnerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 style="font-size: 1.1rem; margin-bottom: 0.2rem;">${partnerName}</h3>
                                <p style="color: var(--text-secondary); font-size: 0.85rem;">${subText}</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span class="badge badge-${r.status}">${r.status}</span>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem;">${formatDate(r.createdAt)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Load conversations error:', error);
        showToast('Failed to load conversations', 'error');
    }
}
