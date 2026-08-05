// ----------------------------------------------------
// AUTH & ACCESS CONTROLLER
// ----------------------------------------------------
function getToken() {
    return sessionStorage.getItem("psicarte_token");
}

function setToken(token) {
    sessionStorage.setItem("psicarte_token", token);
}

function clearToken() {
    sessionStorage.removeItem("psicarte_token");
}

async function validateSession() {
    const token = getToken();
    if (!token || !state.currentUser) {
        return false;
    }
    
    try {
        const res = await fetch('/api/users', { 
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401 || res.status === 403) {
            forceLogout('Sesión expirada. Inicie sesión nuevamente.');
            return false;
        }
        return true;
    } catch (e) {
        forceLogout('Error de conexión. Inicie sesión nuevamente.');
        return false;
    }
}

function forceLogout(message) {
    state.currentUser = null;
    sessionStorage.removeItem("psicarte_user");
    clearToken();
    if (message) {
        sessionStorage.setItem("psicarte_logout_msg", message);
    }
    window.location.href = 'index.html';
}

function openLoginModal() {
    const modal = document.getElementById("login-modal");
    if (modal) modal.classList.add("active");
}

function closeLoginModal() {
    const modal = document.getElementById("login-modal");
    if (modal) modal.classList.remove("active");
}

function openRecovery() {
    const loginModal = document.getElementById("login-modal");
    const recoveryModal = document.getElementById("recovery-modal");
    if (loginModal) loginModal.classList.remove("active");
    if (recoveryModal) recoveryModal.classList.add("active");
}

function closeRecoveryModal() {
    const recoveryModal = document.getElementById("recovery-modal");
    const loginModal = document.getElementById("login-modal");
    if (recoveryModal) recoveryModal.classList.remove("active");
    if (loginModal) loginModal.classList.add("active");
}

async function processRecovery() {
    const email = document.getElementById("recovery-email").value;
    if (!email) {
        showToast("Debe ingresar un correo válido", "error");
        return;
    }
    
    try {
        const res = await fetch('/api/auth/recover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        
        if (res.ok) {
            showToast(data.message, "success");
            document.getElementById("recovery-modal").classList.remove("active");
        } else {
            showToast(data.error, "error");
        }
    } catch (e) {
        showToast("Error de conexión.", "error");
    }
}

async function processLogin() {
    const email = document.getElementById("login-email").value;
    const pass = document.getElementById("login-password").value;
    const role = document.getElementById("login-role").value;
    
    if (!email || !pass) {
        showToast("Complete los campos de acceso", "error");
        return;
    }
    
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass, role })
        });
        const data = await res.json();
        
        if (res.ok) {
            state.currentUser = data;
            sessionStorage.setItem("psicarte_user", JSON.stringify(data));
            if (data.token) {
                setToken(data.token);
            }
            showToast(`¡Bienvenido/a, ${data.name}!`, "success");
            
            // Redirect to acceso.html or update UI if already there
            const isAccesoPage = window.location.pathname.includes('acceso.html');
            if (isAccesoPage) {
                updateAuthUI();
                showDashboardView();
            } else {
                window.location.href = 'acceso.html';
            }
        } else {
            showToast(data.error || "Acceso incorrecto", "error");
        }
    } catch (e) {
        showToast("Error al conectar con el servidor.", "error");
    }
}

function logout() {
    state.currentUser = null;
    sessionStorage.removeItem("psicarte_user");
    clearToken();
    const dashboard = document.getElementById("dashboard");
    if (dashboard) dashboard.style.display = "none";
    updateAuthUI();
    showToast("Sesión cerrada correctamente", "info");
    window.location.href = 'index.html';
}

function updateAuthUI() {
    const authBtns = document.getElementById("auth-buttons");
    const userMenu = document.getElementById("user-menu");
    if (!authBtns || !userMenu) return;
    
    if (state.currentUser) {
        authBtns.style.display = "none";
        userMenu.style.display = "flex";
        
        const dashUserName = document.getElementById("dash-user-name");
        const dashUserRole = document.getElementById("dash-user-role");
        const dashUserAvatar = document.getElementById("dash-user-avatar");
        
        if (dashUserName) dashUserName.innerText = state.currentUser.name;
        if (dashUserRole) dashUserRole.innerText = state.currentUser.role;
        if (dashUserAvatar) dashUserAvatar.innerText = state.currentUser.name.substring(0, 2).toUpperCase();
        
        renderSidebarMenu();
        renderDashboardPanes();
        
        // Fix: show dashboard view if we are on acceso.html with a logged-in user session
        const isAccesoPage = window.location.pathname.includes('acceso.html');
        if (isAccesoPage) {
            showDashboardView();
        }
    } else {
        authBtns.style.display = "flex";
        userMenu.style.display = "none";
    }
}
