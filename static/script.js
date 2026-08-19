// Initialize Users in localStorage if not exists
const DEFAULT_USERS = [
    {
        name: "Admin",
        username: "admin",
        email: "admin@freshadmin.com",
        password: "admin"
    }
];

if (!localStorage.getItem('grocery_admin_users')) {
    localStorage.setItem('grocery_admin_users', JSON.stringify(DEFAULT_USERS));
}

function getUsers() {
    return JSON.parse(localStorage.getItem('grocery_admin_users'));
}

function saveUsers(users) {
    localStorage.setItem('grocery_admin_users', JSON.stringify(users));
}

// Temporary Verification Data Store
let verificationSession = {
    username: "",
    email: "",
    code: ""
};

// Form DOM elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const forgotForm = document.getElementById('forgot-form');
const resetForm = document.getElementById('reset-form');

// Form Navigation Links/Buttons
const goRegisterBtn = document.getElementById('go-register-btn');
const goLoginFromReg = document.getElementById('go-login-from-reg');
const forgotLink = document.getElementById('forgot-link');
const goLoginFromForgot = document.getElementById('go-login-from-forgot');
const goLoginFromReset = document.getElementById('go-login-from-reset');

// Navigation Functions
function switchForm(activeForm) {
    [loginForm, registerForm, forgotForm, resetForm].forEach(form => {
        form.classList.add('hidden-form');
    });
    activeForm.classList.remove('hidden-form');
}

goRegisterBtn.addEventListener('click', () => switchForm(registerForm));
goLoginFromReg.addEventListener('click', (e) => { e.preventDefault(); switchForm(loginForm); });
forgotLink.addEventListener('click', (e) => { e.preventDefault(); switchForm(forgotForm); });
goLoginFromForgot.addEventListener('click', (e) => { e.preventDefault(); switchForm(loginForm); });
goLoginFromReset.addEventListener('click', (e) => { e.preventDefault(); switchForm(loginForm); });

// Toast Notification System
function showToast(type, title, message, duration = 3500) {
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;

    const icon = type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check';
    const color = type === 'error' ? '#ef4444' : '#10b981';

    toast.innerHTML = `
        <i class="fa-solid ${icon}" style="color: ${color}"></i>
        <div>
            <div class="toast-title">${title}</div>
            <div class="toast-desc">${message}</div>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, duration);
}

// 1. Login Handler
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userVal = document.getElementById('login-username').value.trim();
    const clientVal = document.getElementById('login-client-id').value.trim();
    const passVal = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');

    const ogHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
    btn.disabled = true;

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userVal, client_id: clientVal, password: passVal })
    })
    .then(res => res.json())
    .then(data => {
        btn.innerHTML = ogHtml;
        btn.disabled = false;

        if (data.success) {
            showToast('success', 'Login Successful', data.message);
            setTimeout(() => {
                window.location.href = '/overview';
            }, 1500);
        } else {
            showToast('error', 'Authentication Failed', data.message || 'Invalid username or password.');
        }
    })
    .catch(err => {
        btn.innerHTML = ogHtml;
        btn.disabled = false;
        showToast('error', 'Error', 'Failed to connect to the authentication server.');
    });
});

// 2. Registration Handler
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const clientId = document.getElementById('reg-client-id').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const btn = document.getElementById('reg-btn');

    const ogHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registering...';
    btn.disabled = true;

    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, client_id: clientId, email, password })
    })
    .then(res => res.json())
    .then(data => {
        btn.innerHTML = ogHtml;
        btn.disabled = false;

        if (data.success) {
            showToast('success', 'Account Created', data.message);
            registerForm.reset();
            setTimeout(() => {
                switchForm(loginForm);
            }, 1500);
        } else {
            showToast('error', 'Registration Failed', data.message || 'Please check your inputs.');
        }
    })
    .catch(err => {
        btn.innerHTML = ogHtml;
        btn.disabled = false;
        showToast('error', 'Error', 'Failed to connect to the authentication server.');
    });
});

// 3. Forgot Password Handler
forgotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('forgot-username').value.trim();
    const email = document.getElementById('forgot-email').value.trim();
    const btn = document.getElementById('forgot-btn');

    const ogHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
    btn.disabled = true;

    fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email })
    })
    .then(res => res.json())
    .then(data => {
        btn.innerHTML = ogHtml;
        btn.disabled = false;

        if (data.success) {
            // Display code for working condition testing
            showToast('success', 'Code Generated', `Verification code sent. Code: <strong>${data.code}</strong>`, 10000);
            forgotForm.reset();
            setTimeout(() => {
                switchForm(resetForm);
            }, 2000);
        } else {
            showToast('error', 'Verification Failed', data.message || 'Verification failed.');
        }
    })
    .catch(err => {
        btn.innerHTML = ogHtml;
        btn.disabled = false;
        showToast('error', 'Error', 'Failed to connect to the authentication server.');
    });
});

// 4. Reset Password Handler
resetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const enteredCode = document.getElementById('reset-code').value.trim();
    const newPassword = document.getElementById('reset-new-password').value;
    const confirmPassword = document.getElementById('reset-confirm-password').value;
    const btn = document.getElementById('reset-btn');

    if (newPassword !== confirmPassword) {
        showToast('error', 'Mismatch', 'Passwords do not match.');
        return;
    }

    const ogHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetting Password...';
    btn.disabled = true;

    fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: enteredCode, password: newPassword })
    })
    .then(res => res.json())
    .then(data => {
        btn.innerHTML = ogHtml;
        btn.disabled = false;

        if (data.success) {
            showToast('success', 'Reset Successful', data.message);
            resetForm.reset();
            setTimeout(() => {
                switchForm(loginForm);
            }, 1500);
        } else {
            showToast('error', 'Error', data.message || 'Verification code is invalid or expired.');
        }
    })
    .catch(err => {
        btn.innerHTML = ogHtml;
        btn.disabled = false;
        showToast('error', 'Error', 'Failed to connect to the authentication server.');
    });
});


