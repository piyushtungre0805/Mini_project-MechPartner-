// ===== Auth Page JavaScript =====
document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;

    if (page === 'login') {
        initLogin();
    } else if (page === 'signup') {
        initSignup();
    }
});

// ===== Login =====
function initLogin() {
    redirectIfLoggedIn();

    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Signing in...';

        try {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.querySelector('input[name="role"]:checked')?.value || 'user';

            const data = await apiRequest('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, role })
            });

            if (data) {
                setUserInfo(data.token, data.role, data.user.name, data.user._id);
                showToast('Login successful!', 'success');

                setTimeout(() => {
                    if (data.role === 'admin') window.location.href = 'admin-dashboard.html';
                    else if (data.role === 'mechanic') window.location.href = 'mechanic-dashboard.html';
                    else window.location.href = 'user-dashboard.html';
                }, 500);
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }
    });
}

// ===== Signup =====
function initSignup() {
    redirectIfLoggedIn();

    // Role tabs
    const userTab = document.getElementById('userTab');
    const mechanicTab = document.getElementById('mechanicTab');
    const userFields = document.getElementById('userFields');
    const mechanicFields = document.getElementById('mechanicFields');
    const roleInput = document.getElementById('roleInput');

    // Auto-select based on URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const initialRole = urlParams.get('role');

    if (userTab && mechanicTab) {
        userTab.addEventListener('click', () => {
            userTab.classList.add('active');
            mechanicTab.classList.remove('active');
            userFields.classList.remove('hidden');
            mechanicFields.classList.add('hidden');
            roleInput.value = 'user';
        });

        mechanicTab.addEventListener('click', () => {
            mechanicTab.classList.add('active');
            userTab.classList.remove('active');
            mechanicFields.classList.remove('hidden');
            userFields.classList.add('hidden');
            roleInput.value = 'mechanic';
        });

        if (initialRole === 'mechanic') {
            mechanicTab.click();
        } else {
            userTab.click(); // Default or 'user'
        }
    }

    // Location button
    document.getElementById('getLocationBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('getLocationBtn');
        btn.disabled = true;
        btn.textContent = '📍 Getting location...';

        try {
            const loc = await getUserLocation();
            document.getElementById('lat').value = loc.lat;
            document.getElementById('lng').value = loc.lng;
            btn.textContent = '✓ Location captured';
            btn.style.background = 'var(--success)';
            showToast('Location captured successfully!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
            btn.textContent = '📍 Get My Location';
            btn.disabled = false;
        }
    });

    // File upload labels
    ['profilePhoto', 'aadharCard', 'panCard', 'drivingLicense', 'shopImage'].forEach(id => {
        setupFileUpload(id, id + 'Label');
    });

    // Form submit
    const form = document.getElementById('signupForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Creating account...';

        try {
            const formData = new FormData(form);
            const role = formData.get('role') || 'user';

            const data = await apiRequest(`/signup?role=${role}`, {
                method: 'POST',
                body: formData
            });

            if (data) {
                setUserInfo(data.token, data.role, data.user.name, data.user._id);
                showToast('Account created successfully!', 'success');

                setTimeout(() => {
                    if (data.role === 'admin') window.location.href = 'admin-dashboard.html';
                    else if (data.role === 'mechanic') window.location.href = 'mechanic-dashboard.html';
                    else window.location.href = 'user-dashboard.html';
                }, 500);
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    });
}
