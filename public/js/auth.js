// ===== Auth Page JavaScript =====
document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    if (page === 'login')  initLogin();
    else if (page === 'signup') initSignup();
});

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
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
            const email    = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role     = document.querySelector('input[name="role"]:checked')?.value || 'user';

            const data = await apiRequest('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, role })
            });

            if (data) {
                setUserInfo(data.token, data.role, data.user.name, data.user._id);
                showToast('Login successful!', 'success');
                setTimeout(() => {
                    if      (data.role === 'admin')    window.location.href = 'admin-dashboard.html';
                    else if (data.role === 'mechanic') window.location.href = 'mechanic-dashboard.html';
                    else                               window.location.href = 'user-dashboard.html';
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

// ─────────────────────────────────────────────
// SIGNUP
// ─────────────────────────────────────────────
const MAPS_KEY = 'AIzaSyAWxswYYxEMa2l3PPzsV7OjE8M0aETZ4Es';
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

let currentStrength  = 0;
let userAddressOk    = false;
let shopAddressOk    = false;
let idVerified       = false;
let passwordsMatch   = false;

function initSignup() {
    redirectIfLoggedIn();

    // ── Role Tabs ──
    const userTab        = document.getElementById('userTab');
    const mechanicTab    = document.getElementById('mechanicTab');
    const userFields     = document.getElementById('userFields');
    const mechanicFields = document.getElementById('mechanicFields');
    const roleInput      = document.getElementById('roleInput');

    const urlParams   = new URLSearchParams(window.location.search);
    const initialRole = urlParams.get('role');

    if (userTab && mechanicTab) {
        userTab.addEventListener('click',     () => switchRole('user'));
        mechanicTab.addEventListener('click', () => switchRole('mechanic'));
        switchRole(initialRole === 'mechanic' ? 'mechanic' : 'user');
    }

    function switchRole(role) {
        roleInput.value = role;
        if (role === 'mechanic') {
            mechanicTab.classList.add('active');
            userTab.classList.remove('active');
            mechanicFields.classList.remove('hidden');
            userFields.classList.add('hidden');
            setRequired('shopName',    true);
            setRequired('shopAddress', true);
            setRequired('aadhaarName', true);
            setRequired('aadhaarDob',  true);
            setRequired('licenseName', true);
            setRequired('licenseDob',  true);
            setRequired('userAddress', false);
        } else {
            userTab.classList.add('active');
            mechanicTab.classList.remove('active');
            userFields.classList.remove('hidden');
            mechanicFields.classList.add('hidden');
            setRequired('shopName',    false);
            setRequired('shopAddress', false);
            setRequired('aadhaarName', false);
            setRequired('aadhaarDob',  false);
            setRequired('licenseName', false);
            setRequired('licenseDob',  false);
            setRequired('userAddress', true);
        }
    }

    function setRequired(id, val) {
        const el = document.getElementById(id);
        if (el) el.required = val;
    }

    // ── Password Strength ──
    initPasswordStrength();

    // ── Confirm Password ──
    initConfirmPassword();

    // ── Address Verification ──
    document.getElementById('verifyUserAddressBtn')
        ?.addEventListener('click', () => verifyAddress('user'));
    document.getElementById('verifyShopAddressBtn')
        ?.addEventListener('click', () => verifyAddress('shop'));

    // Reset address state on input change
    document.getElementById('userAddress')?.addEventListener('input', () => {
        userAddressOk = false;
        document.getElementById('userAddressVerified').value = '0';
        document.getElementById('userMapPreview').classList.remove('visible');
        setAddressStatus('user', '', '');
    });
    document.getElementById('shopAddress')?.addEventListener('input', () => {
        shopAddressOk = false;
        document.getElementById('shopAddressVerified').value = '0';
        document.getElementById('shopMapPreview').classList.remove('visible');
        setAddressStatus('shop', '', '');
    });

    // ── Identity cross-check (live) ──
    ['aadhaarName','licenseName','aadhaarDob','licenseDob']
        .forEach(id => document.getElementById(id)?.addEventListener('input', validateIdentity));

    // ── Location button ──
    document.getElementById('getLocationBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('getLocationBtn');
        btn.disabled = true;
        btn.textContent = '📍 Getting location...';
        try {
            const loc = await getUserLocation();
            document.getElementById('mechLat').value = loc.lat;
            document.getElementById('mechLng').value = loc.lng;
            btn.textContent = '✓ Location captured';
            btn.style.background = 'var(--success)';
            showToast('Location captured!', 'success');
        } catch (err) {
            showToast(err.message, 'error');
            btn.textContent = '📍 Get My Location';
            btn.disabled = false;
        }
    });

    // ── File upload labels + green highlight on pick + size check ──
    const fileEntries = [
        ['profilePhoto',    'profilePhotoLabel',    'userProfilePhotoWrap'],
        ['aadharCard',      'aadharCardLabel',       'userAadhaarWrap'],
        ['userPanCard',     'userPanCardLabel',      'userPanWrap'],
        ['mechProfilePhoto','mechProfilePhotoLabel', 'mechProfilePhotoWrap'],
        ['aadharCardMech',  'aadharCardMechLabel',   null],
        ['panCard',         'panCardLabel',          null],
        ['drivingLicense',  'drivingLicenseLabel',   null],
        ['shopImage',       'shopImageLabel',        null]
    ];

    fileEntries.forEach(([id, labelId, wrapId]) => {
        setupFileUpload(id, labelId);
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('change', () => {
            const file = input.files?.[0];
            if (!file) return;

            // Size check
            if (file.size > MAX_FILE_BYTES) {
                showToast(`"${file.name}" exceeds 5 MB limit. Please choose a smaller file.`, 'error');
                input.value = '';
                document.getElementById(labelId).textContent = 'No file chosen';
                return;
            }

            // Green highlight on wrap
            if (wrapId) {
                const wrap = document.getElementById(wrapId);
                if (wrap) {
                    wrap.classList.remove('required-upload');
                    wrap.classList.add('upload-ok');
                }
            }

            // For user doc pair: update badge dynamically
            if (id === 'aadharCard' || id === 'userPanCard') {
                updateDocBadges();
            }
        });
    });

    // ── Form submit ──
    const form = document.getElementById('signupForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = document.getElementById('roleInput').value;

        // ── Guard: password strength ──
        if (currentStrength < 100) {
            showToast('Password must reach 100% strength before submitting.', 'error');
            document.getElementById('password').focus();
            return;
        }

        // ── Guard: confirm password ──
        if (!passwordsMatch) {
            markConfirmError('Passwords do not match — please re-enter.');
            document.getElementById('confirmPassword').focus();
            showToast('Wrong credentials — Passwords do not match.', 'error');
            return;
        }

        // ── Guard: address (user) ──
        if (role === 'user' && !userAddressOk) {
            showToast('Please verify your address before submitting.', 'error');
            return;
        }

        // ── Guard: address (mechanic) ──
        if (role === 'mechanic' && !shopAddressOk) {
            showToast('Please verify your shop address before submitting.', 'error');
            return;
        }

        // ── Guard: profile photo (both) ──
        const photoId = role === 'user' ? 'profilePhoto' : 'mechProfilePhoto';
        const photo   = document.getElementById(photoId);
        if (!photo?.files?.length) {
            showToast('Profile photo is mandatory. Please upload your photo.', 'error');
            const wrapId = role === 'user' ? 'userProfilePhotoWrap' : 'mechProfilePhotoWrap';
            document.getElementById(wrapId)?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        // ── Guard: user document (Aadhaar OR PAN) ──
        if (role === 'user') {
            const aadhaar = document.getElementById('aadharCard');
            const pan     = document.getElementById('userPanCard');
            if (!aadhaar?.files?.length && !pan?.files?.length) {
                showToast('Please upload at least Aadhaar Card OR PAN Card.', 'error');
                document.getElementById('userAadhaarWrap')?.scrollIntoView({ behavior: 'smooth' });
                return;
            }
        }

        // ── Guard: mechanic docs ──
        if (role === 'mechanic') {
            const aadhaar = document.getElementById('aadharCardMech');
            const dl      = document.getElementById('drivingLicense');
            if (!aadhaar?.files?.length) {
                showToast('Aadhaar Card upload is required for mechanics.', 'error');
                return;
            }
            if (!dl?.files?.length) {
                showToast('Driving License upload is required for mechanics.', 'error');
                return;
            }
        }

        // ── Guard: identity (mechanic) ──
        if (role === 'mechanic' && !idVerified) {
            const reason = getIdentityMismatch();
            if (reason) {
                showToast('Identity verification failed: ' + reason, 'error');
                return;
            }
        }

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Creating account...';

        try {
            const formData = new FormData(form);

            if (role === 'mechanic') {
                formData.set('lat', document.getElementById('shopLat')?.value || '0');
                formData.set('lng', document.getElementById('shopLng')?.value || '0');
            }

            const data = await apiRequest(`/signup?role=${role}`, {
                method: 'POST',
                body: formData
            });

            if (data) {
                setUserInfo(data.token, data.role, data.user.name, data.user._id);

                if (data.verificationStatus === 'unverified') {
                    showToast('Account created but identity mismatch detected — admin review pending.', 'error');
                } else {
                    showToast('Account created successfully!', 'success');
                }

                setTimeout(() => {
                    if      (data.role === 'admin')    window.location.href = 'admin-dashboard.html';
                    else if (data.role === 'mechanic') window.location.href = 'mechanic-dashboard.html';
                    else                               window.location.href = 'user-dashboard.html';
                }, 1200);
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    });
}

// ─────────────────────────────────────────────
// PASSWORD STRENGTH
// ─────────────────────────────────────────────
function initPasswordStrength() {
    const pwInput     = document.getElementById('password');
    const toggleBtn   = document.getElementById('togglePw');
    const barWrap     = document.getElementById('strengthBarWrap');
    const barFill     = document.getElementById('strengthBarFill');
    const labelRow    = document.getElementById('strengthLabel');
    const strengthTxt = document.getElementById('strengthText');
    const strengthPct = document.getElementById('strengthPct');
    const suggBox     = document.getElementById('pwSuggestions');
    const suggList    = document.getElementById('pwSuggestionList');

    if (!pwInput) return;

    // Show/hide toggle
    toggleBtn?.addEventListener('click', () => {
        const isHidden   = pwInput.type === 'password';
        pwInput.type     = isHidden ? 'text' : 'password';
        toggleBtn.textContent = isHidden ? '🙈' : '👁';
    });

    pwInput.addEventListener('input', () => {
        const val = pwInput.value;

        if (!val) {
            barWrap.style.display  = 'none';
            labelRow.style.display = 'none';
            suggBox.style.display  = 'none';
            currentStrength = 0;
            // Re-check confirm since password changed
            checkConfirmMatch();
            return;
        }

        barWrap.style.display  = 'block';
        labelRow.style.display = 'flex';

        const criteria = [
            { test: val.length >= 8,            msg: 'At least 8 characters' },
            { test: /\d/.test(val),             msg: 'At least 1 number (0–9)' },
            { test: /[!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\;'/]/.test(val), msg: 'At least 1 special character (@, #, $ …)' },
            { test: /[A-Z]/.test(val),          msg: 'At least 1 uppercase letter (A–Z)' }
        ];

        const passed   = criteria.filter(c => c.test).length;
        const strength = passed * 25;
        currentStrength = strength;

        let colour;
        if      (strength <= 25) colour = '#ef4444';
        else if (strength <= 50) colour = '#f97316';
        else if (strength <= 75) colour = '#eab308';
        else                     colour = '#10b981';

        barFill.style.width      = strength + '%';
        barFill.style.background = colour;

        const labels = ['', 'Weak', 'Fair', 'Good', '100% Strong'];
        strengthTxt.textContent = labels[passed] || 'Weak';
        strengthPct.textContent = strength + '%';
        strengthTxt.style.color = colour;
        strengthPct.style.color = colour;

        const missing = criteria.filter(c => !c.test).map(c => c.msg);
        if (missing.length) {
            suggBox.style.display = 'block';
            suggList.innerHTML    = missing.map(m => `<li>${m}</li>`).join('');
        } else {
            suggBox.style.display = 'none';
        }

        // Re-run confirm match check on every password keystroke
        checkConfirmMatch();
    });
}

// ─────────────────────────────────────────────
// CONFIRM PASSWORD
// ─────────────────────────────────────────────
function initConfirmPassword() {
    const confirmInput = document.getElementById('confirmPassword');
    const toggleBtn    = document.getElementById('toggleConfirmPw');

    if (!confirmInput) return;

    // Show/hide toggle
    toggleBtn?.addEventListener('click', () => {
        const isHidden          = confirmInput.type === 'password';
        confirmInput.type       = isHidden ? 'text' : 'password';
        toggleBtn.textContent   = isHidden ? '🙈' : '👁';
    });

    confirmInput.addEventListener('input', checkConfirmMatch);
}

function checkConfirmMatch() {
    const pwVal      = document.getElementById('password')?.value || '';
    const confirmVal = document.getElementById('confirmPassword')?.value || '';
    const statusEl   = document.getElementById('confirmPwStatus');
    const confirmEl  = document.getElementById('confirmPassword');
    const pwEl       = document.getElementById('password');

    if (!statusEl || !confirmVal) {
        if (statusEl) { statusEl.className = 'confirm-pw-status'; statusEl.textContent = ''; }
        passwordsMatch = false;
        return;
    }

    if (pwVal === confirmVal) {
        statusEl.className   = 'confirm-pw-status match';
        statusEl.textContent = '✅ Passwords match';
        confirmEl?.classList.remove('field-error');
        pwEl?.classList.remove('field-error');
        passwordsMatch = true;
    } else {
        markConfirmError('⚠️ Wrong credentials — Passwords do not match');
        passwordsMatch = false;
    }
}

function markConfirmError(msg) {
    const statusEl  = document.getElementById('confirmPwStatus');
    const confirmEl = document.getElementById('confirmPassword');
    const pwEl      = document.getElementById('password');
    if (statusEl)  { statusEl.className = 'confirm-pw-status no-match'; statusEl.textContent = msg; }
    confirmEl?.classList.add('field-error');
    pwEl?.classList.add('field-error');
}

// ─────────────────────────────────────────────
// DOCUMENT BADGE UPDATE (User: Aadhaar OR PAN)
// ─────────────────────────────────────────────
function updateDocBadges() {
    const aadhaar    = document.getElementById('aadharCard');
    const pan        = document.getElementById('userPanCard');
    const aadhaarBadge = document.getElementById('aadhaarBadge');
    const panBadge   = document.getElementById('panBadge');

    const hasAadhaar = aadhaar?.files?.length > 0;
    const hasPan     = pan?.files?.length > 0;

    if (aadhaarBadge) {
        if (hasAadhaar) {
            aadhaarBadge.textContent  = 'Uploaded ✓';
            aadhaarBadge.style.background = 'rgba(16,185,129,0.15)';
            aadhaarBadge.style.color  = '#10b981';
        } else if (hasPan) {
            aadhaarBadge.textContent  = 'Optional';
            aadhaarBadge.style.background = 'rgba(148,163,184,0.2)';
            aadhaarBadge.style.color  = '#94a3b8';
        } else {
            aadhaarBadge.textContent  = 'Required';
            aadhaarBadge.style.background = 'rgba(239,68,68,0.15)';
            aadhaarBadge.style.color  = '#ef4444';
        }
    }

    if (panBadge) {
        if (hasPan) {
            panBadge.textContent  = 'Uploaded ✓';
            panBadge.style.background = 'rgba(16,185,129,0.15)';
            panBadge.style.color  = '#10b981';
        } else if (hasAadhaar) {
            panBadge.textContent  = 'Optional';
            panBadge.style.background = 'rgba(148,163,184,0.2)';
            panBadge.style.color  = '#94a3b8';
        } else {
            panBadge.textContent  = 'OR Required';
            panBadge.style.background = 'rgba(148,163,184,0.2)';
            panBadge.style.color  = '#94a3b8';
        }
    }
}

// ─────────────────────────────────────────────
// ADDRESS VERIFICATION
// ─────────────────────────────────────────────
async function verifyAddress(type) {
    const isUser     = type === 'user';
    const inputId    = isUser ? 'userAddress'          : 'shopAddress';
    const btnId      = isUser ? 'verifyUserAddressBtn' : 'verifyShopAddressBtn';
    const statusId   = isUser ? 'userAddressStatus'    : 'shopAddressStatus';
    const mapId      = isUser ? 'userMapPreview'       : 'shopMapPreview';
    const iframeId   = isUser ? 'userMapIframe'        : 'shopMapIframe';
    const latId      = isUser ? 'lat'                  : 'shopLat';
    const lngId      = isUser ? 'lng'                  : 'shopLng';
    const verifiedId = isUser ? 'userAddressVerified'  : 'shopAddressVerified';

    const address = document.getElementById(inputId)?.value?.trim();
    if (!address) { showToast('Please enter an address first.', 'error'); return; }

    const btn = document.getElementById(btnId);
    btn.disabled    = true;
    btn.textContent = '⏳ Verifying...';

    try {
        const url  = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${MAPS_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const result  = data.results[0];
            const lat     = result.geometry.location.lat;
            const lng     = result.geometry.location.lng;
            const fmtAddr = result.formatted_address;

            document.getElementById(latId).value      = lat;
            document.getElementById(lngId).value      = lng;
            document.getElementById(verifiedId).value = '1';

            const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${encodeURIComponent(fmtAddr)}`;
            document.getElementById(iframeId).src = embedUrl;
            document.getElementById(mapId).classList.add('visible');

            setAddressStatus(type, 'ok', '✅ Address verified: ' + fmtAddr);
            if (isUser) userAddressOk = true;
            else        shopAddressOk = true;
            showToast('Address verified!', 'success');

        } else {
            setAddressStatus(type, 'err', '❌ Address not found. Please enter a valid address.');
            document.getElementById(mapId).classList.remove('visible');
            if (isUser) userAddressOk = false;
            else        shopAddressOk = false;
        }
    } catch (err) {
        setAddressStatus(type, 'err', '❌ Could not connect to Maps API. Check internet connection.');
    } finally {
        btn.disabled    = false;
        btn.textContent = '📍 ' + (isUser ? 'Verify Address' : 'Verify Shop Address');
    }
}

function setAddressStatus(type, state, msg) {
    const id = type === 'user' ? 'userAddressStatus' : 'shopAddressStatus';
    const el = document.getElementById(id);
    if (!el) return;
    el.className   = 'address-status ' + state;
    el.textContent = msg;
}

// ─────────────────────────────────────────────
// IDENTITY CROSS-VALIDATION
// ─────────────────────────────────────────────
function normaliseName(str) {
    return (str || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function getIdentityMismatch() {
    const aN = normaliseName(document.getElementById('aadhaarName')?.value);
    const lN = normaliseName(document.getElementById('licenseName')?.value);
    const aD = document.getElementById('aadhaarDob')?.value;
    const lD = document.getElementById('licenseDob')?.value;

    const issues = [];
    if (aN && lN && aN !== lN) issues.push('Name mismatch: Aadhaar "' + aN + '" vs License "' + lN + '"');
    if (aD && lD && aD !== lD) issues.push('Date of Birth mismatch between Aadhaar and License');
    return issues.join('. ');
}

function validateIdentity() {
    const mismatch    = document.getElementById('idMismatchAlert');
    const matchOk     = document.getElementById('idMatchOk');
    const mismatchTxt = document.getElementById('idMismatchText');

    const aN = document.getElementById('aadhaarName')?.value?.trim();
    const lN = document.getElementById('licenseName')?.value?.trim();

    if (!aN || !lN) {
        mismatch?.classList.remove('visible');
        matchOk?.classList.remove('visible');
        idVerified = false;
        return;
    }

    const issue = getIdentityMismatch();
    if (issue) {
        if (mismatchTxt) mismatchTxt.textContent = issue;
        mismatch?.classList.add('visible');
        matchOk?.classList.remove('visible');
        idVerified = false;
    } else {
        mismatch?.classList.remove('visible');
        matchOk?.classList.add('visible');
        idVerified = true;
    }
}
