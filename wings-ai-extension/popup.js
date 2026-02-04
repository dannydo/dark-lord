document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const views = {
        auth: document.getElementById('view-auth'),
        pending: document.getElementById('view-pending'),
        main: document.getElementById('view-main')
    };
    
    const phoneSection = document.getElementById('phone-section');
    const otpSection = document.getElementById('otp-section');
    const staffPhone = document.getElementById('staffPhone');
    const otpCode = document.getElementById('otpCode');
    const statusDiv = document.getElementById('status');
    const envRadios = document.getElementsByName('api_env');
    const apiKeyInput = document.getElementById('apiKey');
    const contextInput = document.getElementById('context');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const closeBtn = document.getElementById('popup-close');
    
    // Auth Flow
    const btnRequestOtp = document.getElementById('requestOtp');
    const btnVerifyOtp = document.getElementById('verifyOtp');
    const btnBackToPhone = document.getElementById('backToPhone');
    const btnCheckStatus = document.getElementById('checkStatus');
    const btnLogout = document.getElementById('logout');
    const btnLogoutPending = document.getElementById('logoutPending');
    const btnSave = document.getElementById('save');

    // 1. Load Initial State
    // We now load both session keys
    const settings = await chrome.storage.sync.get(['geminiApiKey', 'businessContext', 'staffUser_orb', 'staffUser_live', 'apiEnv']);
    
    // Set Environment
    let currentEnv = settings.apiEnv || 'orb';
    const radio = document.querySelector(`input[name="api_env"][value="${currentEnv}"]`);
    if (radio) radio.checked = true;

    // Determine and Switch View based on current env
    updateView(settings[`staffUser_${currentEnv}`]);

    // 2. View Switching Logic
    function updateView(staffUser) {
        Object.values(views).forEach(v => v.classList.remove('active'));
        
        if (!staffUser) {
            views.auth.classList.add('active');
            phoneSection.style.display = 'block';
            otpSection.style.display = 'none';
        } else if (staffUser.status === 'pending') {
            views.pending.classList.add('active');
            document.getElementById('pending-name').textContent = staffUser.displayName || 'Staff';
        } else {
            views.main.classList.add('active');
            document.getElementById('staff-name').textContent = staffUser.displayName || 'Staff';
            
            // Update Avatar
            const avatarImg = document.getElementById('staff-avatar');
            const name = staffUser.displayName || 'Staff';
            avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a1625&color=fcc33a&bold=true`;
            
            apiKeyInput.value = settings.geminiApiKey || '';
            contextInput.value = settings.businessContext || '';
        }
    }

    // 3. Event Listeners
    
    // Close Popup
    if (closeBtn) {
        closeBtn.addEventListener('click', () => window.close());
    }

    // Toggle Password Visibility
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
            apiKeyInput.setAttribute('type', type);
            // Toggle Icon
            const eyeIcon = document.getElementById('eye-icon');
            if (type === 'text') {
                eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
            } else {
                eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
            }
        });
    }

    // Env Change: This is the key for dual session UI
    envRadios.forEach(r => r.addEventListener('change', async (e) => {
        const newEnv = e.target.value;
        currentEnv = newEnv;
        chrome.storage.sync.set({ apiEnv: newEnv });
        
        // Load the session for the newly picked environment
        const data = await chrome.storage.sync.get([`staffUser_${newEnv}`]);
        updateView(data[`staffUser_${newEnv}`]);
    }));

    // Request OTP
    btnRequestOtp.addEventListener('click', async () => {
        const phone = staffPhone.value.trim();
        const env = document.querySelector('input[name="api_env"]:checked').value;
        if (!phone) return showStatus("Enter phone number", true);

        btnRequestOtp.disabled = true;
        showStatus("Requesting OTP...");
        
        chrome.runtime.sendMessage({ action: "zaloRequestOTP", phone, apiEnv: env }, (response) => {
            btnRequestOtp.disabled = false;
            if (response && response.status === 'success') {
                phoneSection.style.display = 'none';
                otpSection.style.display = 'block';
                showStatus("OTP sent to Zalo!", false);
            } else {
                const errorMsg = response?.error || (response?.data && response.data.message) || "Failed to send OTP";
                showStatus(errorMsg, true);
            }
        });
    });

    // Verify OTP
    btnVerifyOtp.addEventListener('click', async () => {
        const phone = staffPhone.value.trim();
        const otp = otpCode.value.trim();
        const env = document.querySelector('input[name="api_env"]:checked').value;
        if (!otp) return showStatus("Enter OTP code", true);

        btnVerifyOtp.disabled = true;
        showStatus("Verifying...");

        chrome.runtime.sendMessage({ action: "zaloVerifyOTP", phone, otp, apiEnv: env }, (response) => {
            btnVerifyOtp.disabled = false;
            if (response && response.status === 'success') {
                const sessionKey = `staffUser_${env}`;
                chrome.storage.sync.get([sessionKey], (data) => {
                    updateView(data[sessionKey]);
                    showStatus("Login successful!", false);
                });
            } else {
                showStatus(response?.error || "Invalid OTP", true);
            }
        });
    });

    btnBackToPhone.addEventListener('click', () => {
        phoneSection.style.display = 'block';
        otpSection.style.display = 'none';
    });

    // Check Status
    btnCheckStatus.addEventListener('click', async () => {
        const env = document.querySelector('input[name="api_env"]:checked').value;
        btnCheckStatus.disabled = true;
        showStatus("Checking status...");

        chrome.runtime.sendMessage({ action: "checkStaffStatus", apiEnv: env }, (response) => {
            btnCheckStatus.disabled = false;
            if (response && response.user) {
                updateView(response.user);
                if (response.user.status === 'pending') {
                    showStatus("Still pending approval... 🦋", true);
                } else {
                    showStatus("Approved!", false);
                }
            }
        });
    });

    // Save Settings
    btnSave.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const context = contextInput.value.trim();
        
        chrome.storage.sync.set({ 
            geminiApiKey: apiKey, 
            businessContext: context 
        }, () => {
            showStatus("Settings saved successfully!", false);
        });
    });

    // Logout
    const handleLogout = () => {
        const env = document.querySelector('input[name="api_env"]:checked').value;
        if (confirm(`Sign out of Wings AI (${env.toUpperCase()})?`)) {
            const sessionKey = `staffUser_${env}`;
            chrome.storage.sync.remove([sessionKey], () => {
                location.reload();
            });
        }
    };
    btnLogout.addEventListener('click', handleLogout);
    btnLogoutPending.addEventListener('click', handleLogout);

    // Helpers
    function showStatus(text, isError = false) {
        statusDiv.textContent = text;
        statusDiv.className = isError ? 'error' : 'success';
        setTimeout(() => { if (statusDiv.textContent === text) statusDiv.textContent = ''; }, 3000);
    }
});
