// Load everything from Node/SQLite server APIs

function getAuthHeaders() {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function loadAllData() {
    try {
        state.content = await (await fetch('/api/content')).json();
        state.rooms = await (await fetch('/api/rooms')).json();
        state.providers = await (await fetch('/api/providers')).json();
        
        const bookingsRes = await fetch('/api/bookings', { headers: getAuthHeaders() });
        if (bookingsRes.status === 401 || bookingsRes.status === 403) {
            forceLogout('Sesión expirada. Inicie sesión nuevamente.');
            return;
        } else {
            state.bookings = await bookingsRes.json();
        }
        
        state.activities = await (await fetch('/api/activities')).json();
        
        const blocksRes = await fetch('/api/blocks', { headers: getAuthHeaders() });
        if (blocksRes.ok) {
            state.sicknessBlocks = await blocksRes.json();
        }
        
        const clientsRes = await fetch('/api/clients', { headers: getAuthHeaders() });
        if (clientsRes.ok) {
            state.clients = await clientsRes.json();
        }
        
        try {
            const enrollRes = await fetch('/api/activities/enrollments', { headers: getAuthHeaders() });
            if (enrollRes.ok) {
                state.activityEnrollments = await enrollRes.json();
            } else {
                state.activityEnrollments = [];
            }
        } catch (e) {
            state.activityEnrollments = [];
        }

        if (state.currentUser && state.currentUser.role === 'administrador') {
            try {
                state.khipuNotifications = await (await fetch('/api/admin/khipu-notifications', { headers: getAuthHeaders() })).json();
            } catch (e) {
                console.error("Error loading Khipu notifications:", e);
                state.khipuNotifications = [];
            }
        }
        
        const cfg = await (await fetch('/api/config')).json();
        state.popupConfig = {
            active: cfg.popup_active === 'true',
            title: cfg.popup_title || "Aviso",
            text: cfg.popup_text || ""
        };
        state.bannerConfig = {
            active: cfg.banner_active === 'true',
            text: cfg.banner_text || ""
        };
        state.whatsappConfig = {
            enabled: cfg.whatsapp_enabled === 'true',
            number: cfg.whatsapp_number || ""
        };
        
        state.config = {
            max_reschedules: cfg.max_reschedules || '1'
        };
    } catch (e) {
        console.error("Error loading API data:", e);
        showToast("Error al conectar con el servidor backend.", "error");
    }
}

// Render dynamic homepage texts
function renderContent() {
    if (!state.content.heroTitle) return;
    
    const heroTitle = document.getElementById("hero-title");
    const heroSubtitle = document.getElementById("hero-subtitle");
    if (heroTitle) heroTitle.innerText = state.content.heroTitle;
    if (heroSubtitle) heroSubtitle.innerText = state.content.heroSubtitle;
    
    // These elements live on nosotros.html; guard against null on index.html
    const presShort = document.getElementById("presentation-text-short");
    const presFull = document.getElementById("presentation-text-full");
    const missionEl = document.getElementById("mission-text");
    const visionEl = document.getElementById("vision-text");
    
    if (presShort) presShort.innerText = state.content.presentationShort;
    if (presFull) presFull.innerHTML = state.content.presentationFull.replace(/\n/g, "<br>");
    if (missionEl) missionEl.innerText = state.content.mission;
    if (visionEl) visionEl.innerText = state.content.vision;
    
    // Fill forms in Admin panel
    const customHeroTitle = document.getElementById("custom-hero-title");
    const customHeroSubtitle = document.getElementById("custom-hero-subtitle");
    const customPresentation = document.getElementById("custom-presentation");
    const customMission = document.getElementById("custom-mission");
    const customVision = document.getElementById("custom-vision");
    
    if (customHeroTitle) customHeroTitle.value = state.content.heroTitle;
    if (customHeroSubtitle) customHeroSubtitle.value = state.content.heroSubtitle;
    if (customPresentation) customPresentation.value = state.content.presentationFull;
    if (customMission) customMission.value = state.content.mission;
    if (customVision) customVision.value = state.content.vision;
    
    const customObjectives = document.getElementById("custom-objectives");
    const customContactEmail = document.getElementById("custom-contact-email");
    const customContactPhone = document.getElementById("custom-contact-phone");
    if (customObjectives) customObjectives.value = state.content.objectives || '';
    if (customContactEmail) customContactEmail.value = state.content.contactEmail || '';
    if (customContactPhone) customContactPhone.value = state.content.contactPhone || '';
    
    const contactEmailEl = document.getElementById("contact-email");
    const contactPhoneEl = document.getElementById("contact-phone");
    if (contactEmailEl && state.content.contactEmail) contactEmailEl.innerText = state.content.contactEmail;
    if (contactPhoneEl && state.content.contactPhone) contactPhoneEl.innerText = state.content.contactPhone;
}

function togglePresentation() {
    const shortP = document.getElementById("presentation-text-short");
    const fullP = document.getElementById("presentation-text-full");
    const btn = document.getElementById("btn-toggle-presentation");
    
    if (fullP.style.display === "none") {
        fullP.style.display = "block";
        shortP.style.display = "none";
        btn.innerHTML = 'Leer menos <i class="fa-solid fa-chevron-up"></i>';
    } else {
        fullP.style.display = "none";
        shortP.style.display = "block";
        btn.innerHTML = 'Leer más <i class="fa-solid fa-chevron-down"></i>';
    }
}

function toggleProviderDesc(id, btn) {
    const desc = document.getElementById(id);
    if (desc.classList.contains("expanded")) {
        desc.classList.remove("expanded");
        btn.innerHTML = 'Leer más <i class="fa-solid fa-chevron-down"></i>';
    } else {
        desc.classList.add("expanded");
        btn.innerHTML = 'Leer menos <i class="fa-solid fa-chevron-up"></i>';
    }
}

// ----------------------------------------------------
// API CALLS: USERS (Admin CRUD)
// ----------------------------------------------------
async function getUsers() {
    try {
        const res = await fetch('/api/users', { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Error fetching users');
        return await res.json();
    } catch (e) {
        console.error('getUsers error:', e);
        showToast('Error al cargar usuarios.', 'error');
        return [];
    }
}

async function createUser(userData) {
    try {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(userData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error creating user');
        return data;
    } catch (e) {
        console.error('createUser error:', e);
        showToast('Error al crear usuario: ' + e.message, 'error');
        throw e;
    }
}

async function updateUser(id, userData) {
    try {
        const res = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(userData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error updating user');
        return data;
    } catch (e) {
        console.error('updateUser error:', e);
        showToast('Error al actualizar usuario: ' + e.message, 'error');
        throw e;
    }
}

async function deleteUser(id) {
    try {
        const res = await fetch(`/api/users/${id}`, { 
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error deleting user');
        return data;
    } catch (e) {
        console.error('deleteUser error:', e);
        showToast('Error al eliminar usuario: ' + e.message, 'error');
        throw e;
    }
}

// ----------------------------------------------------
// API CALLS: CONFIG (Advanced Raw)
// ----------------------------------------------------
async function getAllConfig() {
    try {
        const res = await fetch('/api/config', { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Error fetching config');
        return await res.json();
    } catch (e) {
        console.error('getAllConfig error:', e);
        showToast('Error al cargar configuración.', 'error');
        return {};
    }
}

async function saveConfig(configData) {
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(configData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error saving config');
        return data;
    } catch (e) {
        console.error('saveConfig error:', e);
        showToast('Error al guardar configuración: ' + e.message, 'error');
        throw e;
    }
}
