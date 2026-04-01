// ===== Search Mechanics Page JavaScript =====
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'search-mechanics') {
        initSearchMechanics();
    }
});

function initSearchMechanics() {
    if (!requireAuth('user')) return;
    injectSidebar('user');
    setActiveNav('nav-search');

    const searchBtn = document.getElementById('searchBtn');
    const resultsEl = document.getElementById('searchResults');

    searchBtn?.addEventListener('click', async () => {
        searchBtn.disabled = true;
        searchBtn.innerHTML = '📍 Getting your location...';
        resultsEl.innerHTML = '<div class="loading"><div class="spinner"></div><p>Finding nearby mechanics...</p></div>';

        try {
            const loc = await getUserLocation();

            searchBtn.innerHTML = '🔍 Searching mechanics...';

            const mechanics = await apiRequest(`/mechanics/nearby?lat=${loc.lat}&lng=${loc.lng}&radius=10`);

            if (!mechanics || mechanics.length === 0) {
                resultsEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h3>No mechanics found nearby</h3>
            <p>We couldn't find any mechanics within 10 km of your location. Try again later.</p>
          </div>
        `;
            } else {
                resultsEl.innerHTML = `
          <div style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
            Found <strong style="color: var(--accent);">${mechanics.length}</strong> mechanic${mechanics.length > 1 ? 's' : ''} within 10 km
          </div>
          <div class="mechanic-list">
            ${mechanics.map(m => renderMechanicCard(m)).join('')}
          </div>
        `;
            }
        } catch (error) {
            resultsEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Location access required</h3>
          <p>${error.message}</p>
        </div>
      `;
            showToast(error.message, 'error');
        } finally {
            searchBtn.disabled = false;
            searchBtn.innerHTML = '🔍 Find Nearby Mechanics';
        }
    });
}

function renderMechanicCard(mechanic) {
    const avatar = mechanic.profilePhoto
        ? `<img src="${BASE_URL}/uploads/${mechanic.profilePhoto}" alt="${mechanic.name}">`
        : mechanic.name.charAt(0).toUpperCase();

    const services = (mechanic.services || []).map(s =>
        `<span class="service-tag">${s}</span>`
    ).join('');

    const rating = mechanic.rating || 0;
    const starsHTML = getStarsHTML(rating);

    return `
    <div class="mechanic-card">
      <div class="mechanic-card-header">
        <div class="mechanic-avatar">
          ${typeof avatar === 'string' && avatar.startsWith('<') ? avatar : avatar}
        </div>
        <div>
          <div class="mechanic-name">${mechanic.name}</div>
          <div class="mechanic-shop">${mechanic.shopName || 'Independent Mechanic'}</div>
        </div>
      </div>
      
      <div class="mechanic-info">
        <div class="mechanic-info-item">
          <span class="info-icon">📍</span>
          <span><strong>${mechanic.distance} km</strong> away</span>
        </div>
        <div class="mechanic-info-item">
          <span class="info-icon">📱</span>
          <span>${mechanic.phone}</span>
        </div>
        ${mechanic.shopAddress ? `
          <div class="mechanic-info-item">
            <span class="info-icon">🏪</span>
            <span>${mechanic.shopAddress}</span>
          </div>
        ` : ''}
      </div>

      ${services ? `<div class="mechanic-services">${services}</div>` : ''}

      <div class="mechanic-rating">
        <span class="stars">${starsHTML}</span>
        <span class="rating-text">${rating > 0 ? rating.toFixed(1) : 'No ratings'}</span>
      </div>

      <div class="mechanic-card-footer">
        <button class="btn btn-primary btn-sm" onclick="openRequestModal('${mechanic._id}', '${mechanic.name.replace(/'/g, "\\'")}')">
          Request Service
        </button>
        <a href="tel:${mechanic.phone}" class="btn btn-secondary btn-sm">📞 Call</a>
      </div>
    </div>
  `;
}

// ===== Service Request Modal =====
function openRequestModal(mechanicId, mechanicName) {
    let overlay = document.getElementById('requestModal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'requestModal';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>Request Service</h2>
          <button class="modal-close" onclick="closeRequestModal()">&times;</button>
        </div>
        <p style="color: var(--text-secondary); margin-bottom: 1.25rem;">
          Requesting service from <strong id="modalMechanicName"></strong>
        </p>
        <form id="requestForm">
          <input type="hidden" id="requestMechanicId">
          <div class="form-group">
            <label for="issueDescription">Describe your issue</label>
            <textarea class="form-control" id="issueDescription" rows="4" placeholder="e.g., Car engine making noise, bike puncture, brake issue..." required></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Submit Request</button>
        </form>
      </div>
    `;
        document.body.appendChild(overlay);

        document.getElementById('requestForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Submitting...';

            try {
                // Get user location for the request (used for auto-forwarding to nearest mechanic)
                const loc = await getUserLocation();
                
                const mechanicId = document.getElementById('requestMechanicId').value;
                const issue = document.getElementById('issueDescription').value;

                await apiRequest('/request-service', {
                    method: 'POST',
                    body: JSON.stringify({ mechanicId, issue, lat: loc.lat, lng: loc.lng })
                });

                showToast('Service request sent successfully!', 'success');
                closeRequestModal();
                document.getElementById('issueDescription').value = '';
            } catch (error) {
                showToast(error.message || 'Failed to get location or send request.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Submit Request';
            }
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeRequestModal();
        });
    }

    document.getElementById('requestMechanicId').value = mechanicId;
    document.getElementById('modalMechanicName').textContent = mechanicName;
    overlay.classList.add('active');
}

function closeRequestModal() {
    document.getElementById('requestModal')?.classList.remove('active');
}
