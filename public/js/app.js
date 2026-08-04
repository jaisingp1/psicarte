// app.js (AJAX / REST Client Version for SQLite Backend)

// Global State
const state = {
    content: {},
    rooms: [],
    providers: [],
    bookings: [],
    activities: [],
    activityEnrollments: [],
    sicknessBlocks: [],
    popupConfig: { active: false, title: "", text: "" },
    bannerConfig: { active: false, text: "" },
    whatsappConfig: { enabled: false, number: "" },
    currentUser: JSON.parse(sessionStorage.getItem("psicarte_user")) || null
};

// Booking Wizard State
let bookingState = {
    step: 1,
    provider: null,
    service: null,
    room: null,
    date: null,
    timeSlot: null,
    startTime: null,
    endTime: null,
    client: { name: "", rut: "", email: "", phone: "" }
};

// Reschedule State
let rescheduleState = {
    bookingId: null,
    providerId: null,
    serviceType: null,
    date: null,
    timeSlot: null,
    startTime: null,
    endTime: null,
    room: null,
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth()
};

// Search method state
let bookingSearchMethod = 'provider';

// Services Section State
let selectedServicesProviderId = null;
let servicesSearchQuery = '';
let selectedServiceType = 'all';
let servicesView = 'cards';

// Calendar Variables
const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth();

// Community Calendar Variables
let activityYear = new Date().getFullYear();
let activityMonth = new Date().getMonth();
let selectedActivityDate = null;
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// Initialization
document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    await loadAllData();
    setupEventListeners();
    initBookingWidget();
    renderContent();
    renderServicesSection();
    renderCommunityCalendar();
    renderActivities();
    checkPopups();
    updateAuthUI();
    renderFooterYear();
    renderWhatsAppButton();
});

// Load everything from Node/SQLite server APIs
async function loadAllData() {
    try {
        state.content = await (await fetch('/api/content')).json();
        state.rooms = await (await fetch('/api/rooms')).json();
        state.providers = await (await fetch('/api/providers')).json();
        state.bookings = await (await fetch('/api/bookings')).json();
        state.activities = await (await fetch('/api/activities')).json();
        state.sicknessBlocks = await (await fetch('/api/blocks')).json();
        
        try {
            state.activityEnrollments = await (await fetch('/api/activities/enrollments')).json();
        } catch (e) {
            state.activityEnrollments = [];
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

// Themes management
function initTheme() {
    const savedTheme = localStorage.getItem("psicarte_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeUI(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("psicarte_theme", newTheme);
    updateThemeUI(newTheme);
    showToast(`Modo ${newTheme === 'dark' ? 'Oscuro' : 'Claro'} activado`, "info");
}

function updateThemeUI(theme) {
    const themeBtn = document.getElementById("theme-toggle");
    const logoImg = document.getElementById("nav-logo");
    const footerLogo = document.getElementById("footer-logo");
    
    if (theme === "dark") {
        themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        logoImg.src = "images/logo_dark.png";
        if (footerLogo) footerLogo.src = "images/logo_dark.png";
    } else {
        themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        logoImg.src = "images/logo_light.png";
        if (footerLogo) footerLogo.src = "images/logo_light.png";
    }
}

function renderFooterYear() {
    const yearEl = document.getElementById("footer-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
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
// SERVICES SECTION (Dynamic Rendering)
// ----------------------------------------------------
function renderServicesSection() {
    const tabsContainer = document.getElementById("provider-tabs");
    const gridContainer = document.getElementById("dynamic-services-container");

    if (!tabsContainer || !gridContainer) return;

    if (state.providers.length === 0) {
        tabsContainer.innerHTML = '';
        gridContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">No hay profesionales registrados aún.</p>';
        return;
    }

    // Initialize selected provider if needed
    if (!selectedServicesProviderId || !state.providers.find(p => p.id === selectedServicesProviderId)) {
        selectedServicesProviderId = state.providers[0].id;
    }

    // Render provider tabs
    tabsContainer.innerHTML = '';
    state.providers.forEach(p => {
        const isActive = p.id === selectedServicesProviderId;
        const initials = p.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        tabsContainer.innerHTML += `
            <button class="provider-tab-btn${isActive ? ' active' : ''}" role="tab" aria-selected="${isActive}" aria-controls="dynamic-services-container" onclick="selectServiceProvider('${p.id}')">
                <span class="provider-tab-avatar">${initials}</span>
                <span class="provider-tab-info">
                    <strong>${p.name}</strong>
                    <small>${p.role.split(' (')[0]}</small>
                </span>
            </button>
        `;
    });

    // Get selected provider and apply filters
    const provider = state.providers.find(p => p.id === selectedServicesProviderId);
    let services = provider ? [...provider.services] : [];

    // Filter by modality
    if (selectedServiceType !== 'all') {
        services = services.filter(s => s.type === selectedServiceType);
    }

    // Filter by search query
    if (servicesSearchQuery.trim()) {
        const q = servicesSearchQuery.toLowerCase();
        services = services.filter(s => s.name.toLowerCase().includes(q));
    }

    // Render service cards
    if (services.length === 0) {
        gridContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">No se encontraron servicios con los filtros aplicados.</p>';
        return;
    }

    if (servicesView === 'list') {
        gridContainer.className = 'services-list-view';
        gridContainer.innerHTML = '';
        services.forEach(s => {
            const typeLabel = s.type === 'Virtual' ? 'Online' : 'Presencial';
            const typeIcon = s.type === 'Virtual' ? 'fa-wifi' : 'fa-building';
            gridContainer.innerHTML += `
                <div class="service-list-item">
                    <div class="service-list-main">
                        <span class="service-badge service-badge-${s.type === 'Virtual' ? 'virtual' : 'physical'}">
                            <i class="fa-solid ${typeIcon}"></i> ${typeLabel}
                        </span>
                        <span class="service-list-name">${s.name}</span>
                    </div>
                    <div class="service-list-meta">
                        <span><i class="fa-solid fa-clock"></i> ${s.duration} min</span>
                        <span><i class="fa-solid fa-user-doctor"></i> ${provider.name}</span>
                    </div>
                    <div class="service-list-price">$${s.price.toLocaleString("es-CL")} <small>/ sesión</small></div>
                </div>
            `;
        });
    } else {
        gridContainer.className = 'services-grid';
        gridContainer.innerHTML = '';
        services.forEach(s => {
            const typeLabel = s.type === 'Virtual' ? 'Online' : 'Presencial';
            const typeIcon = s.type === 'Virtual' ? 'fa-wifi' : 'fa-building';
            gridContainer.innerHTML += `
                <div class="service-card">
                    <div class="service-card-header">
                        <h4 class="service-card-title">${s.name}</h4>
                        <span class="service-badge service-badge-${s.type === 'Virtual' ? 'virtual' : 'physical'}">
                            <i class="fa-solid ${typeIcon}"></i> ${typeLabel}
                        </span>
                    </div>
                    <div class="service-card-meta">
                        <span><i class="fa-solid fa-clock"></i> ${s.duration} minutos</span>
                        <span><i class="fa-solid fa-user-doctor"></i> ${provider.name}</span>
                    </div>
                    <div class="service-card-price">
                        <span class="price-amount">$${s.price.toLocaleString("es-CL")}</span>
                        <span class="price-unit">Sesión</span>
                    </div>
                </div>
            `;
        });
    }
}

function selectServiceProvider(providerId) {
    selectedServicesProviderId = providerId;
    renderServicesSection();
}

function setServiceTypeFilter(type) {
    selectedServiceType = type;
    document.querySelectorAll('#service-type-filters .filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-type') === type);
    });
    renderServicesSection();
}

function setServicesView(view) {
    servicesView = view;
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-view') === view;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive);
    });
    renderServicesSection();
}

// Banners & Popups
function checkPopups() {
    const popup = document.getElementById("announcement-popup");
    const pTitle = document.getElementById("popup-title");
    const pBody = document.getElementById("popup-body");
    
    if (state.popupConfig.active && popup && pTitle && pBody) {
        pTitle.innerText = state.popupConfig.title;
        pBody.innerText = state.popupConfig.text;
        setTimeout(() => {
            popup.classList.add("active");
        }, 1000);
    }
    
    const banner = document.getElementById("announcement-banner");
    const bText = document.getElementById("banner-text");
    if (state.bannerConfig.active && banner && bText) {
        bText.innerText = state.bannerConfig.text;
        banner.style.display = "flex";
    } else if (banner) {
        banner.style.display = "none";
    }
}

function closePopup() {
    const popup = document.getElementById("announcement-popup");
    if (popup) popup.classList.remove("active");
}

function closeBanner() {
    const banner = document.getElementById("announcement-banner");
    if (banner) banner.style.display = "none";
}

// WhatsApp Floating Button
function renderWhatsAppButton() {
    const btn = document.getElementById('whatsapp-float-btn');
    if (!btn) return;
    
    if (state.whatsappConfig.enabled && state.whatsappConfig.number) {
        btn.href = `https://wa.me/${state.whatsappConfig.number}`;
        btn.style.display = 'flex';
    } else {
        btn.style.display = 'none';
    }
}

// Toast Notifications System
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "fa-circle-check";
    if (type === "error") icon = "fa-circle-xmark";
    if (type === "info") icon = "fa-circle-info";
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid ${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;
    
    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ----------------------------------------------------
// BOOKING WIDGET LOGIC
// ----------------------------------------------------
function initBookingWidget() {
    const provSelect = document.getElementById("booking-provider");
    if (!provSelect) return;
    
    provSelect.innerHTML = '<option value="">Selecciona profesional...</option>';
    state.providers.forEach(p => {
        provSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.role.split(" (")[0]})</option>`;
    });
    
    const servSelect = document.getElementById("booking-service");
    if (servSelect) {
        servSelect.innerHTML = '<option value="">Selecciona un profesional primero...</option>';
    }

    // Reset to provider tab
    setSearchMethod('provider');
    initBookingServiceAll();
}

function setSearchMethod(method) {
    bookingSearchMethod = method;

    const tabProvider = document.getElementById("tab-provider");
    const tabService = document.getElementById("tab-service");
    const groupProvider = document.getElementById("search-by-provider-group");
    const groupService = document.getElementById("search-by-service-group");

    if (method === 'provider') {
        tabProvider.classList.add("active");
        tabProvider.setAttribute("aria-selected", "true");
        tabService.classList.remove("active");
        tabService.setAttribute("aria-selected", "false");
        groupProvider.style.display = "block";
        groupService.style.display = "none";
    } else {
        tabService.classList.add("active");
        tabService.setAttribute("aria-selected", "true");
        tabProvider.classList.remove("active");
        tabProvider.setAttribute("aria-selected", "false");
        groupService.style.display = "block";
        groupProvider.style.display = "none";
    }
}

function initBookingServiceAll() {
    const servAllSelect = document.getElementById("booking-service-all");
    servAllSelect.innerHTML = '<option value="">Selecciona un servicio...</option>';

    state.providers.forEach(provider => {
        provider.services.forEach(s => {
            const label = `${s.name} - $${s.price.toLocaleString("es-CL")} (${s.duration} min) [con ${provider.name}]`;
            servAllSelect.innerHTML += `<option value="${provider.id}|${s.id}">${label}</option>`;
        });
    });
}

function onBookingServiceAllChange() {
    const val = document.getElementById("booking-service-all").value;
    const provAutoSelect = document.getElementById("booking-provider-auto");

    if (!val) {
        provAutoSelect.innerHTML = '<option value="">Se seleccionará automáticamente...</option>';
        return;
    }

    const [provId] = val.split("|");
    const provider = state.providers.find(p => p.id === provId);

    provAutoSelect.innerHTML = '';
    const opt = document.createElement("option");
    opt.value = provider.id;
    opt.textContent = `${provider.name} (${provider.role.split(" (")[0]})`;
    opt.selected = true;
    provAutoSelect.appendChild(opt);
}

function onBookingProviderChange() {
    const provId = document.getElementById("booking-provider").value;
    const servSelect = document.getElementById("booking-service");
    
    if (!provId) {
        servSelect.innerHTML = '<option value="">Selecciona un profesional primero...</option>';
        return;
    }
    
    const provider = state.providers.find(p => p.id === provId);
    servSelect.innerHTML = '<option value="">Selecciona servicio...</option>';
    provider.services.forEach(s => {
        servSelect.innerHTML += `<option value="${s.id}">${s.name} - $${s.price.toLocaleString("es-CL")} (${s.duration} min)</option>`;
    });
}

function goToStep(stepNum) {
    if (stepNum === 2 && bookingState.step === 1) {
        if (bookingSearchMethod === 'provider') {
            const provId = document.getElementById("booking-provider").value;
            const servId = document.getElementById("booking-service").value;
            
            if (!provId || !servId) {
                showToast("Por favor complete todas las selecciones del Paso 1", "error");
                return;
            }
            
            bookingState.provider = state.providers.find(p => p.id === provId);
            bookingState.service = bookingState.provider.services.find(s => s.id === servId);
        } else {
            const val = document.getElementById("booking-service-all").value;
            
            if (!val) {
                showToast("Por favor selecciona un servicio en el Paso 1", "error");
                return;
            }
            
            const [provId, servId] = val.split("|");
            bookingState.provider = state.providers.find(p => p.id === provId);
            bookingState.service = bookingState.provider.services.find(s => s.id === servId);
        }
        
        bookingState.room = null; // Automatically determined per slot
        
        renderCalendar();
        updateSlotsView();
    }
    
    if (stepNum === 3 && bookingState.step === 2) {
        if (!bookingState.date || !bookingState.timeSlot) {
            showToast("Debe seleccionar una Fecha y un Bloque Horario disponible", "error");
            return;
        }
        
        // Auto fill if client is logged in
        if (state.currentUser && state.currentUser.role === "usuario") {
            fetch('/api/clients')
                .then(r => r.json())
                .then(clients => {
                    const clientData = clients.find(c => c.email === state.currentUser.email);
                    if (clientData) {
                        document.getElementById("client-name").value = clientData.name;
                        document.getElementById("client-rut").value = clientData.rut;
                        document.getElementById("client-email").value = clientData.email;
                        document.getElementById("client-phone").value = clientData.phone;
                        document.getElementById("logged-in-autofill-msg").style.display = "block";
                    }
                });
        } else {
            document.getElementById("logged-in-autofill-msg").style.display = "none";
        }
    }
    
    if (stepNum === 4 && bookingState.step === 3) {
        const form = document.getElementById("booking-form");
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        bookingState.client.name = document.getElementById("client-name").value;
        bookingState.client.rut = document.getElementById("client-rut").value;
        bookingState.client.email = document.getElementById("client-email").value;
        bookingState.client.phone = document.getElementById("client-phone").value;
        
        // Render Summary
        document.getElementById("sum-provider").innerText = bookingState.provider.name;
        document.getElementById("sum-service").innerText = bookingState.service.name;
        document.getElementById("sum-room").innerText = bookingState.room.name;
        document.getElementById("sum-datetime").innerText = `${bookingState.date} a las ${bookingState.timeSlot}`;
        document.getElementById("sum-patient").innerText = `${bookingState.client.name} (RUT: ${bookingState.client.rut})`;
        document.getElementById("sum-price").innerText = `$${bookingState.service.price.toLocaleString("es-CL")}`;
    }

    document.querySelectorAll(".booking-pane").forEach(pane => pane.classList.remove("active"));
    document.getElementById(`pane-step-${stepNum}`).classList.add("active");
    
    document.querySelectorAll(".step-indicator").forEach((ind, idx) => {
        ind.classList.remove("active", "completed");
        if (idx + 1 === stepNum) {
            ind.classList.add("active");
        } else if (idx + 1 < stepNum) {
            ind.classList.add("completed");
        }
    });
    
    bookingState.step = stepNum;
}

// Calendar Gen
function renderCalendar() {
    const calendarMonthYear = document.getElementById("calendar-month-year");
    const calendarGrid = document.getElementById("booking-calendar");
    if (!calendarMonthYear || !calendarGrid) return;
    
    calendarMonthYear.innerText = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    calendarGrid.innerHTML = "";
    
    const headers = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
    headers.forEach(h => {
        calendarGrid.innerHTML += `<div class="calendar-day-header">${h}</div>`;
    });
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        calendarGrid.innerHTML += '<div class="calendar-cell empty"></div>';
    }
    
    const today = new Date();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(currentYear, currentMonth, day);
        let cellClass = "calendar-cell";
        
        const monthStr = String(currentMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
        
        if (cellDate < today && cellDate.toDateString() !== today.toDateString()) {
            cellClass += " disabled";
        }
        
        if (bookingState.date === dateStr) {
            cellClass += " selected";
        }
        
        calendarGrid.innerHTML += `<div class="${cellClass}" onclick="selectDate('${dateStr}', this)">${day}</div>`;
    }
}

function prevMonth() {
    const today = new Date();
    if (currentYear === today.getFullYear() && currentMonth <= today.getMonth()) {
        showToast("No puedes agendar en meses pasados", "error");
        return;
    }
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

function selectDate(dateStr, element) {
    if (element.classList.contains("disabled")) return;
    bookingState.date = dateStr;
    document.querySelectorAll(".calendar-cell").forEach(c => c.classList.remove("selected"));
    element.classList.add("selected");
    updateSlotsView();
}

// Calculate slots incorporating backend overlaps and matching room requirements automatically
function updateSlotsView() {
    const slotsGrid = document.getElementById("booking-slots");
    const label = document.getElementById("selected-date-label");
    if (!slotsGrid || !label) return;
    
    if (!bookingState.date) {
        label.innerText = "Selecciona una fecha en el calendario";
        slotsGrid.innerHTML = "";
        return;
    }
    
    const [year, month, day] = bookingState.date.split("-");
    const dateObj = new Date(year, parseInt(month) - 1, day);
    const dayOfWeekIdx = dateObj.getDay();
    const friendlyDate = dateObj.toLocaleDateString("es-CL", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    label.innerText = `Horas para: ${friendlyDate}`;
    
    const dayShifts = bookingState.provider.blocks[dayOfWeekIdx] || [];
    
    if (dayShifts.length === 0) {
        slotsGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--text-secondary);">El profesional no atiende este día.</div>';
        return;
    }
    
    slotsGrid.innerHTML = "";
    
    dayShifts.forEach(slot => {
        const [slotStart, slotEnd] = slot.split("-");
        const slotStartMin = timeToMinutes(slotStart);
        const slotEndMin = timeToMinutes(slotEnd);
        
        const matchingRooms = state.rooms.filter(r => r.type === bookingState.service.type);
        
        let isAvailable = false;
        let selectedRoomForSlot = null;
        let blockReason = "No hay salas de este tipo disponibles";
        
        // 1. Professional global blocks (sickness/licencia)
        const sicknessBlock = state.sicknessBlocks.find(sb => 
            sb.providerId === bookingState.provider.id && 
            sb.date === bookingState.date && 
            (sb.timeSlot === "all" || sb.timeSlot === slot)
        );
        
        // 2. Overlap check for Provider (regardless of room)
        const overlappingBooking = state.bookings.find(bk => {
            if (bk.providerId !== bookingState.provider.id || bk.date !== bookingState.date || bk.status === "Cancelled") {
                return false;
            }
            const bkStart = timeToMinutes(bk.startTime);
            const bkEnd = timeToMinutes(bk.endTime);
            return (slotStartMin < bkEnd && bkStart < slotEndMin);
        });
        
        if (sicknessBlock) {
            isAvailable = false;
            blockReason = "Prestador no disponible (Licencia/Enfermedad)";
        } else if (overlappingBooking) {
            isAvailable = false;
            blockReason = "Prestador ocupado en otra sala";
        } else {
            // Iterate through rooms to find one available
            for (const room of matchingRooms) {
                const roomOpenMin = timeToMinutes(room.openTime);
                const roomCloseMin = timeToMinutes(room.closeTime);
                
                // Check if room functioning hours cover the slot
                if (slotStartMin < roomOpenMin || slotEndMin > roomCloseMin) {
                    blockReason = "Sala cerrada";
                    continue;
                }
                
                // Check if room occupied by another booking
                const roomConflict = state.bookings.find(bk => {
                    if (bk.roomId !== room.id || bk.date !== bookingState.date || bk.status === "Cancelled") {
                        return false;
                    }
                    const bkStart = timeToMinutes(bk.startTime);
                    const bkEnd = timeToMinutes(bk.endTime);
                    return (slotStartMin < bkEnd && bkStart < slotEndMin);
                });
                
                if (roomConflict) {
                    blockReason = "Sala ocupada";
                    continue;
                }
                
                // Room is open and free!
                isAvailable = true;
                selectedRoomForSlot = room;
                break;
            }
        }
        
        const btnClass = isAvailable ? "slot-btn" : "slot-btn disabled";
        const titleAttr = isAvailable ? "" : `title="${blockReason}"`;
        const selectedClass = bookingState.timeSlot === slot ? " selected" : "";
        
        const roomParam = selectedRoomForSlot ? JSON.stringify(selectedRoomForSlot).replace(/"/g, '&quot;') : 'null';
        
        slotsGrid.innerHTML += `
            <button class="${btnClass}${selectedClass}" ${titleAttr} onclick="selectSlot('${slot}', '${slotStart}', '${slotEnd}', ${isAvailable}, ${roomParam})">
                ${slotStart}
            </button>
        `;
    });
}

function selectSlot(slot, start, end, isAvailable, roomObj) {
    if (!isAvailable) {
        showToast("Este bloque horario no está disponible.", "error");
        return;
    }
    bookingState.timeSlot = slot;
    bookingState.startTime = start;
    bookingState.endTime = end;
    bookingState.room = roomObj;
    
    document.querySelectorAll(".slot-btn").forEach(b => {
        if (b.innerText.trim() === start) {
            b.classList.add("selected");
        } else {
            b.classList.remove("selected");
        }
    });
}

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
}

// Process Payment and Book in SQLite Database
async function processPayment() {
    const cardNum = document.getElementById("card-number").value;
    const cardExp = document.getElementById("card-exp").value;
    const cardCvv = document.getElementById("card-cvv").value;
    
    if (!cardNum || !cardExp || !cardCvv) {
        showToast("Debe rellenar los datos de pago simulado", "error");
        return;
    }
    
    showToast("Conectando con Transbank / PsicArte Pay...", "info");
    
    const newBooking = {
        id: "bk-" + Date.now(),
        providerId: bookingState.provider.id,
        serviceId: bookingState.service.id,
        serviceName: bookingState.service.name,
        price: bookingState.service.price,
        duration: bookingState.service.duration,
        roomId: bookingState.room.id,
        roomName: bookingState.room.name,
        date: bookingState.date,
        timeSlot: bookingState.timeSlot,
        startTime: bookingState.startTime,
        endTime: bookingState.endTime,
        clientEmail: bookingState.client.email,
        clientName: bookingState.client.name,
        clientRut: bookingState.client.rut,
        clientPhone: bookingState.client.phone
    };

    setTimeout(async () => {
        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBooking)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showToast("¡Pago procesado con éxito!", "success");
                setTimeout(() => {
                    showToast(`Simulador: Email enviado a ${bookingState.client.email} con los detalles de la reserva.`, "info");
                    showToast(`Simulador: Email enviado al profesional ${bookingState.provider.email}.`, "info");
                }, 1000);
                
                // Reset Wizard
                bookingState = {
                    step: 1,
                    provider: null,
                    service: null,
                    room: null,
                    date: null,
                    timeSlot: null,
                    startTime: null,
                    endTime: null,
                    client: { name: "", rut: "", email: "", phone: "" }
                };
                
                await loadAllData();
                initBookingWidget();
                goToStep(1);
                
                if (state.currentUser) {
                    renderDashboardPanes();
                }
            } else {
                showToast(result.error || "Error al procesar la reserva", "error");
            }
        } catch (e) {
            console.error("Booking error:", e);
            showToast("Error de conexión al guardar la cita.", "error");
        }
    }, 1500);
}

// ----------------------------------------------------
// AUTH & ACCESS CONTROLLER
// ----------------------------------------------------
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
    const dashboard = document.getElementById("dashboard");
    if (dashboard) dashboard.style.display = "none";
    updateAuthUI();
    showToast("Sesión cerrada correctamente", "info");
    
    // Redirect to index.html if on acceso.html and no dashboard view
    const isAccesoPage = window.location.pathname.includes('acceso.html');
    if (isAccesoPage && !document.getElementById("dashboard-view")) {
        window.location.href = 'index.html';
    }
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
    } else {
        authBtns.style.display = "flex";
        userMenu.style.display = "none";
    }
}

// ----------------------------------------------------
// DASHBOARDS PANELS MANAGEMENT
// ----------------------------------------------------
function goToDashboard() {
    if (!state.currentUser) {
        window.location.href = 'acceso.html';
        return;
    }
    
    // If on acceso.html, show dashboard view
    const isAccesoPage = window.location.pathname.includes('acceso.html');
    if (isAccesoPage) {
        showDashboardView();
        return;
    }
    
    // Otherwise redirect to acceso.html
    window.location.href = 'acceso.html';
}

function showDashboardView() {
    const loginView = document.getElementById("login-view");
    const dashboardView = document.getElementById("dashboard-view");
    
    if (loginView) loginView.style.display = "none";
    if (dashboardView) {
        dashboardView.style.display = "block";
        renderSidebarMenu();
        renderDashboardPanes();
        const firstTab = document.querySelector(".sidebar-btn");
        if (firstTab) firstTab.click();
    }
}

function renderSidebarMenu() {
    const menuList = document.getElementById("sidebar-menu-list");
    if (!menuList) return;
    menuList.innerHTML = "";
    
    if (state.currentUser.role === "usuario") {
        menuList.innerHTML = `
            <li><button class="sidebar-btn active" onclick="switchDashboardPane('client-bookings', this)"><i class="fa-solid fa-calendar-days"></i> Mis Reservas</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('client-profile', this)"><i class="fa-solid fa-user-gear"></i> Mis Datos</button></li>
        `;
    } else if (state.currentUser.role === "prestador") {
        menuList.innerHTML = `
            <li><button class="sidebar-btn active" onclick="switchDashboardPane('provider-schedule', this)"><i class="fa-solid fa-clipboard-list"></i> Mi Agenda</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('provider-blocks', this)"><i class="fa-solid fa-calendar-minus"></i> Bloqueos</button></li>
        `;
    } else if (state.currentUser.role === "administrador") {
        menuList.innerHTML = `
            <li><button class="sidebar-btn active" onclick="switchDashboardPane('admin-rooms', this)"><i class="fa-solid fa-building"></i> Salas</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-providers', this)"><i class="fa-solid fa-user-doctor"></i> Prestadores</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-blocks', this)"><i class="fa-solid fa-calendar-minus"></i> Bloqueos Horarios</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-popups', this)"><i class="fa-solid fa-bullhorn"></i> Alertas y Pop-ups</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-calendar', this)"><i class="fa-solid fa-calendar-week"></i> Calendario Comun.</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-content', this)"><i class="fa-solid fa-file-pen"></i> Personalizar Textos</button></li>
        `;
    }
}

function switchDashboardPane(paneId, btn) {
    document.querySelectorAll(".sidebar-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    document.querySelectorAll(".dashboard-pane").forEach(p => p.classList.remove("active"));
    document.getElementById(`pane-${paneId}`).classList.add("active");
}

function renderDashboardPanes() {
    if (!state.currentUser) return;
    const role = state.currentUser.role;
    
    if (role === "usuario") {
        const bookingsList = document.getElementById("client-bookings-list");
        if (!bookingsList) return;
        
        const clientBookings = state.bookings.filter(b => b.clientEmail === state.currentUser.email);
        
        if (clientBookings.length === 0) {
            bookingsList.innerHTML = '<p style="color: var(--text-secondary);">No tienes agendamientos registrados.</p>';
        } else {
            bookingsList.innerHTML = "";
            clientBookings.forEach(bk => {
                const isPaidBadge = bk.status === "Paid" ? '<span class="badge badge-paid">Pagado</span>' : '<span class="badge badge-pending">Pendiente</span>';
                const isCancelled = bk.status === "Cancelled";
                
                let cancelBtn = "";
                let rescheduleBtn = "";
                if (!isCancelled) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    if (bk.date >= todayStr) {
                        cancelBtn = `<button class="btn-secondary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="cancelBooking('${bk.id}')"><i class="fa-solid fa-ban"></i> Cancelar</button>`;
                        
                        // Find the service for this booking
                        const provider = state.providers.find(p => p.id === bk.providerId);
                        const service = provider?.services.find(s => s.id === bk.serviceId);
                        
                        // Check if reschedule is allowed for this service
                        const serviceAllowsReschedule = service ? service.allowReschedule !== 0 : true;
                        const maxReschedules = service ? (service.maxReschedules || 1) : parseInt(state.config?.max_reschedules || '1', 10);
                        const rescheduleCount = bk.rescheduleCount || 0;
                        
                        if (bk.status === 'Paid' && serviceAllowsReschedule && rescheduleCount < maxReschedules) {
                            rescheduleBtn = `<button class="btn-primary" style="padding: 6px 12px; font-size: 0.85rem; margin-left: 5px;" onclick="openRescheduleModal('${bk.id}')"><i class="fa-solid fa-calendar-check"></i> Reagendar</button>`;
                        }
                    }
                } else {
                    cancelBtn = '<span class="badge badge-cancelled">Cancelado</span>';
                }
                
                bookingsList.innerHTML += `
                    <div class="booking-list-item">
                        <div class="booking-list-info">
                            <h4>${bk.serviceName}</h4>
                            <p><i class="fa-solid fa-user-doctor"></i> Profesional: ${state.providers.find(p => p.id === bk.providerId)?.name || 'Especialista'}</p>
                            <p><i class="fa-solid fa-calendar"></i> Fecha y Hora: ${bk.date} @ ${bk.timeSlot}</p>
                            <p><i class="fa-solid fa-door-open"></i> Sala: ${bk.roomName}</p>
                        </div>
                        <div class="booking-list-status">
                            ${isCancelled ? '' : isPaidBadge}
                            ${cancelBtn}
                            ${rescheduleBtn}
                        </div>
                    </div>
                `;
            });
        }
    }
    
    if (role === "prestador") {
        const tbody = document.getElementById("provider-bookings-table");
        if (!tbody) return;
        
        const provBookings = state.bookings.filter(b => b.providerId === state.currentUser.id);
        
        if (provBookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No tienes reservas en tu agenda.</td></tr>';
        } else {
            tbody.innerHTML = "";
            provBookings.forEach(bk => {
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${bk.date}</strong><br>${bk.timeSlot}</td>
                        <td>${bk.clientName}<br><small>${bk.clientPhone}</small></td>
                        <td>${bk.serviceName}</td>
                        <td>${bk.roomName}</td>
                        <td>
                            <span class="badge ${bk.status === 'Paid' ? 'badge-paid' : bk.status === 'Cancelled' ? 'badge-cancelled' : 'badge-pending'}">
                                ${bk.status === 'Paid' ? 'Pagado' : bk.status === 'Cancelled' ? 'Cancelado' : 'Pendiente'}
                            </span>
                        </td>
                    </tr>
                `;
            });
        }
        
        const blockList = document.getElementById("provider-blocks-list");
        if (blockList) {
            const blocks = state.sicknessBlocks.filter(b => b.providerId === state.currentUser.id);
            
            if (blocks.length === 0) {
                blockList.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No tienes bloqueos de agenda.</td></tr>';
            } else {
                blockList.innerHTML = "";
                blocks.forEach(b => {
                    blockList.innerHTML += `
                        <tr>
                            <td>${b.date}</td>
                            <td>${b.timeSlot === 'all' ? 'Todo el día' : b.timeSlot}</td>
                            <td>${b.reason}</td>
                            <td><button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="deleteBlock('${b.id}')"><i class="fa-solid fa-trash"></i></button></td>
                        </tr>
                    `;
                });
            }
        }
    }
    
    if (role === "administrador") {
        const roomsList = document.getElementById("admin-rooms-list");
        if (roomsList) {
            roomsList.innerHTML = "";
            state.rooms.forEach(r => {
                roomsList.innerHTML += `
                    <tr>
                        <td><strong>${r.name}</strong></td>
                        <td>${r.type}</td>
                        <td>${r.openTime} a ${r.closeTime}</td>
                        <td class="action-btns">
                            <button class="btn-secondary" style="padding: 6px 10px;" onclick="editRoom('${r.id}')"><i class="fa-solid fa-pencil"></i></button>
                            <button class="btn-secondary" style="padding: 6px 10px;" onclick="deleteRoom('${r.id}')"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
        
        const provServicesList = document.getElementById("admin-providers-services-list");
        if (provServicesList) {
            provServicesList.innerHTML = "";
            
            const dropdowns = [
                document.getElementById("adm-serv-provider"),
                document.getElementById("adm-block-provider")
            ];
            
            dropdowns.forEach(dd => {
                if (dd) dd.innerHTML = "";
            });
            
            state.providers.forEach(p => {
                dropdowns.forEach(dd => {
                    if (dd) dd.innerHTML += `<option value="${p.id}">${p.name}</option>`;
                });
                
                let servicesListHTML = "";
                p.services.forEach(s => {
                    const rescheduleInfo = s.allowReschedule === 0 
                        ? '<span style="color: var(--color-error);">Reagendable: No</span>' 
                        : `<span style="color: var(--color-success);">Reagendable: Sí (máx. ${s.maxReschedules})</span>`;
                    servicesListHTML += `
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding: 8px 0;">
                            <span>${s.name} ($${s.price.toLocaleString("es-CL")} - ${s.duration} min) - <em>${s.type}</em> | ${rescheduleInfo}</span>
                            <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="deleteService('${p.id}', '${s.id}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    `;
                });
                
                provServicesList.innerHTML += `
                    <div class="card" style="margin-bottom: 20px; box-shadow: none;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--color-border); padding-bottom: 8px; margin-bottom: 10px;">
                            <h4 style="color: var(--color-accent);">${p.name}</h4>
                            <button class="btn-secondary" style="padding: 6px 10px; font-size: 0.85rem;" onclick="deleteProvider('${p.id}')"><i class="fa-solid fa-user-minus"></i> Eliminar Prestador</button>
                        </div>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">Rol: ${p.role}</p>
                        <h5>Servicios Asignados</h5>
                        ${servicesListHTML || '<p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 5px;">Sin servicios asignados.</p>'}
                    </div>
                `;
            });
        }
        
        const adminBlocksList = document.getElementById("admin-blocks-list");
        if (adminBlocksList) {
            if (state.sicknessBlocks.length === 0) {
                adminBlocksList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No hay bloqueos registrados.</td></tr>';
            } else {
                adminBlocksList.innerHTML = "";
                state.sicknessBlocks.forEach(sb => {
                    const provName = state.providers.find(p => p.id === sb.providerId)?.name || 'Prestador';
                    adminBlocksList.innerHTML += `
                        <tr>
                            <td><strong>${provName}</strong></td>
                            <td>${sb.date}</td>
                            <td>${sb.timeSlot === 'all' ? 'Todo el día' : sb.timeSlot}</td>
                            <td>${sb.reason}</td>
                            <td><button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="deleteBlock('${sb.id}')"><i class="fa-solid fa-trash"></i></button></td>
                        </tr>
                    `;
                });
            }
        }
        
        const adminActivitiesTable = document.getElementById("admin-activities-table");
        if (adminActivitiesTable) {
            adminActivitiesTable.innerHTML = "";
            state.activities.forEach(act => {
                const capacity = act.capacity || 0;
                const enrolled = act.enrolledCount || 0;
                const capacityInfo = capacity > 0 ? `${enrolled}/${capacity}` : 'Sin límite';
                
                let enrollmentsBtn = '';
                if (capacity > 0) {
                    enrollmentsBtn = `<button class="btn-secondary" style="padding: 6px 10px; font-size: 0.8rem;" onclick="openAdminEnrollmentsModal('${act.id}', '${act.title.replace(/'/g, "\\'")}')"><i class="fa-solid fa-users"></i> Ver Inscritos</button>`;
                }
                
                adminActivitiesTable.innerHTML += `
                    <tr>
                        <td><strong>${act.date}</strong></td>
                        <td>${act.title}<br><small>${act.desc}</small></td>
                        <td>${act.time}<br><em>${act.location}</em><br><small>Cupos: ${capacityInfo}</small></td>
                        <td class="action-btns">
                            ${enrollmentsBtn}
                            <button class="btn-secondary" style="padding: 6px 10px;" onclick="deleteActivity('${act.id}')"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
        
        const popupActive = document.getElementById("popup-active");
        const popupConfigTitle = document.getElementById("popup-config-title");
        const popupConfigText = document.getElementById("popup-config-text");
        const bannerActive = document.getElementById("banner-active");
        const bannerConfigText = document.getElementById("banner-config-text");
        const whatsappActive = document.getElementById("whatsapp-active");
        const whatsappNumber = document.getElementById("whatsapp-number");
        
        if (popupActive) popupActive.checked = state.popupConfig.active;
        if (popupConfigTitle) popupConfigTitle.value = state.popupConfig.title;
        if (popupConfigText) popupConfigText.value = state.popupConfig.text;
        
        if (bannerActive) bannerActive.checked = state.bannerConfig.active;
        if (bannerConfigText) bannerConfigText.value = state.bannerConfig.text;
        
        if (whatsappActive) whatsappActive.checked = state.whatsappConfig.enabled;
        if (whatsappNumber) whatsappNumber.value = state.whatsappConfig.number;
    }
}

// Booking cancellations
async function cancelBooking(id) {
    if (confirm("¿Está seguro de que desea cancelar esta reserva? Las reservas confirmadas no tienen devolución, pero el cupo será liberado.")) {
        try {
            const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast("Reserva cancelada con éxito.", "success");
                await loadAllData();
                renderDashboardPanes();
                updateSlotsView();
            }
        } catch (e) {
            showToast("Error de conexión.", "error");
        }
    }
}

// Client Profile modifications
async function saveClientProfile(e) {
    e.preventDefault();
    const name = document.getElementById("profile-name").value;
    const rut = document.getElementById("profile-rut").value;
    const phone = document.getElementById("profile-phone").value;
    
    try {
        const res = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: state.currentUser.email, name, rut, phone })
        });
        
        if (res.ok) {
            state.currentUser.name = name;
            sessionStorage.setItem("psicarte_user", JSON.stringify(state.currentUser));
            showToast("Perfil actualizado correctamente.", "success");
            await loadAllData();
            updateAuthUI();
        }
    } catch (e) {
        showToast("Error de conexión.", "error");
    }
}

// Sickness blocks actions
async function addProviderBlock(e) {
    e.preventDefault();
    const date = document.getElementById("block-date").value;
    const time = document.getElementById("block-time").value;
    const reason = document.getElementById("block-reason").value;
    
    const newBlock = {
        id: "sb-" + Date.now(),
        providerId: state.currentUser.id,
        date: date,
        timeSlot: time,
        reason: reason
    };
    
    try {
        const res = await fetch('/api/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newBlock)
        });
        if (res.ok) {
            showToast("Bloqueo registrado con éxito. Las horas ya no estarán disponibles.", "success");
            document.getElementById("provider-block-form").reset();
            await loadAllData();
            renderDashboardPanes();
            updateSlotsView();
        }
    } catch (e) {
        showToast("Error al guardar bloqueo.", "error");
    }
}

async function addAdminBlock(e) {
    e.preventDefault();
    const provId = document.getElementById("adm-block-provider").value;
    const date = document.getElementById("adm-block-date").value;
    const time = document.getElementById("adm-block-time").value;
    const reason = document.getElementById("adm-block-reason").value;
    
    const newBlock = {
        id: "sb-" + Date.now(),
        providerId: provId,
        date: date,
        timeSlot: time,
        reason: reason
    };
    
    try {
        const res = await fetch('/api/blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newBlock)
        });
        if (res.ok) {
            showToast("Bloqueo administrativo guardado con éxito.", "success");
            document.getElementById("admin-block-form").reset();
            await loadAllData();
            renderDashboardPanes();
            updateSlotsView();
        }
    } catch (e) {
        showToast("Error al registrar bloqueo.", "error");
    }
}

async function deleteBlock(id) {
    try {
        const res = await fetch(`/api/blocks/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast("Bloqueo eliminado.", "success");
            await loadAllData();
            renderDashboardPanes();
            updateSlotsView();
        }
    } catch (e) {
        showToast("Error al eliminar.", "error");
    }
}

// Room Management actions
let editingRoomId = null;

async function saveRoom(e) {
    e.preventDefault();
    const name = document.getElementById("room-name").value;
    const type = document.getElementById("room-type").value;
    const open = document.getElementById("room-open").value;
    const close = document.getElementById("room-close").value;
    
    const roomPayload = {
        id: editingRoomId || ("room-" + Date.now()),
        name,
        type,
        openTime: open,
        closeTime: close
    };
    
    try {
        const res = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roomPayload)
        });
        if (res.ok) {
            showToast(editingRoomId ? "Sala editada con éxito." : "Sala creada correctamente.", "success");
            editingRoomId = null;
            document.getElementById("admin-room-form").reset();
            await loadAllData();
            renderDashboardPanes();
            updateSlotsView();
        }
    } catch (e) {
        showToast("Error al guardar sala.", "error");
    }
}

function editRoom(id) {
    const room = state.rooms.find(r => r.id === id);
    if (room) {
        document.getElementById("room-name").value = room.name;
        document.getElementById("room-type").value = room.type;
        document.getElementById("room-open").value = room.openTime;
        document.getElementById("room-close").value = room.closeTime;
        editingRoomId = id;
        document.getElementById("pane-admin-rooms").scrollIntoView({ behavior: 'smooth' });
    }
}

async function deleteRoom(id) {
    if (confirm("¿Estás seguro de eliminar esta sala?")) {
        try {
            const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast("Sala eliminada.", "success");
                await loadAllData();
                renderDashboardPanes();
            }
        } catch (e) {
            showToast("Error de conexión.", "error");
        }
    }
}

// Providers & Services Admin
async function addProvider(e) {
    e.preventDefault();
    const name = document.getElementById("adm-prov-name").value;
    const role = document.getElementById("adm-prov-role").value;
    const email = `${name.toLowerCase().replace(/ /g, "")}@psicarte.cl`;
    
    try {
        const res = await fetch('/api/providers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: "prov-" + Date.now(), name, role, email })
        });
        if (res.ok) {
            showToast("Prestador creado con éxito.", "success");
            document.getElementById("admin-provider-form").reset();
            await loadAllData();
            renderDashboardPanes();
            renderServicesSection();
            initBookingWidget();
        }
    } catch (e) {
        showToast("Error al crear prestador.", "error");
    }
}

async function deleteProvider(id) {
    if (confirm("¿Estás seguro de eliminar este prestador? Se eliminarán todos sus servicios asociados.")) {
        try {
            const res = await fetch(`/api/providers/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast("Prestador eliminado.", "success");
                await loadAllData();
                renderDashboardPanes();
                renderServicesSection();
                initBookingWidget();
            }
        } catch (e) {
            showToast("Error al eliminar.", "error");
        }
    }
}

async function addService(e) {
    e.preventDefault();
    const provId = document.getElementById("adm-serv-provider").value;
    const name = document.getElementById("adm-serv-name").value;
    const price = Number(document.getElementById("adm-serv-price").value);
    const duration = Number(document.getElementById("adm-serv-duration").value);
    const allowReschedule = document.getElementById("adm-serv-allow-reschedule").checked;
    const maxReschedules = Number(document.getElementById("adm-serv-max-reschedules").value) || 1;
    
    try {
        const res = await fetch('/api/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: "serv-" + Date.now(), providerId: provId, name, price, duration, type: "Virtual", allowReschedule, maxReschedules })
        });
        if (res.ok) {
            showToast("Servicio asignado correctamente.", "success");
            document.getElementById("admin-service-form").reset();
            document.getElementById("adm-serv-allow-reschedule").checked = true;
            document.getElementById("adm-serv-max-reschedules").value = "1";
            document.getElementById("adm-serv-max-reschedules-container").style.display = "block";
            await loadAllData();
            renderDashboardPanes();
            renderServicesSection();
        }
    } catch (e) {
        showToast("Error al añadir servicio.", "error");
    }
}

async function deleteService(provId, servId) {
    try {
        const res = await fetch(`/api/services/${servId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast("Servicio eliminado.", "success");
            await loadAllData();
            renderDashboardPanes();
            renderServicesSection();
        }
    } catch (e) {
        showToast("Error al eliminar servicio.", "error");
    }
}

// Banners & Popups Config actions
async function savePopupConfig(e) {
    e.preventDefault();
    const payload = {
        popup_active: document.getElementById("popup-active").checked,
        popup_title: document.getElementById("popup-config-title").value,
        popup_text: document.getElementById("popup-config-text").value
    };
    
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Configuración de Pop-up guardada.", "success");
            await loadAllData();
            checkPopups();
        }
    } catch (e) {
        showToast("Error de conexión.", "error");
    }
}

async function saveBannerConfig(e) {
    e.preventDefault();
    const payload = {
        banner_active: document.getElementById('banner-active').checked,
        banner_text: document.getElementById('banner-config-text').value
    };
    
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Configuración de Banner guardada.", "success");
            await loadAllData();
            checkPopups();
        }
    } catch (e) {
        showToast("Error de conexión.", "error");
    }
}

async function saveWhatsAppConfig(e) {
    e.preventDefault();
    const payload = {
        whatsapp_enabled: document.getElementById('whatsapp-active').checked,
        whatsapp_number: document.getElementById('whatsapp-number').value.replace(/\D/g, '')
    };
    
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Configuración de WhatsApp guardada.", "success");
            await loadAllData();
            renderWhatsAppButton();
        }
    } catch (e) {
        showToast("Error de conexión.", "error");
    }
}

// Community Activities actions
function updateActivitiesVisibility() {
    const section = document.getElementById("calendario");
    const calendarLinks = document.querySelectorAll('a[href="#calendario"]');
    const hasActivities = state.activities && state.activities.length > 0;
    
    if (section) {
        section.style.display = hasActivities ? "" : "none";
    }
    
    calendarLinks.forEach(link => {
        const parentLi = link.parentElement;
        if (parentLi && parentLi.tagName === 'LI') {
            parentLi.style.display = hasActivities ? "" : "none";
        }
    });
}

function renderCommunityCalendar() {
    updateActivitiesVisibility();
    
    if (!state.activities || state.activities.length === 0) {
        return;
    }

    const grid = document.getElementById("community-calendar-grid");
    const monthLabel = document.getElementById("activity-month-year");
    if (!grid || !monthLabel) return;
    
    monthLabel.innerText = `${MONTH_NAMES[activityMonth]} ${activityYear}`;
    grid.innerHTML = "";
    
    const headers = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
    headers.forEach(h => {
        grid.innerHTML += `<div class="calendar-day-header">${h}</div>`;
    });
    
    const firstDay = new Date(activityYear, activityMonth, 1).getDay();
    const daysInMonth = new Date(activityYear, activityMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += '<div class="calendar-cell empty"></div>';
    }
    
    const monthStr = String(activityMonth + 1).padStart(2, '0');
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${activityYear}-${monthStr}-${dayStr}`;
        
        const hasActivity = state.activities.some(a => a.date === dateStr);
        let cellClass = "calendar-cell";
        if (hasActivity) cellClass += " has-activity";
        if (selectedActivityDate === dateStr) cellClass += " active-selected";
        
        grid.innerHTML += `<div class="${cellClass}" onclick="selectActivityDate('${dateStr}')">${day}</div>`;
    }
}

function prevActivityMonth() {
    activityMonth--;
    if (activityMonth < 0) {
        activityMonth = 11;
        activityYear--;
    }
    selectedActivityDate = null;
    renderCommunityCalendar();
    renderActivities();
}

function nextActivityMonth() {
    activityMonth++;
    if (activityMonth > 11) {
        activityMonth = 0;
        activityYear++;
    }
    selectedActivityDate = null;
    renderCommunityCalendar();
    renderActivities();
}

function selectActivityDate(dateStr) {
    selectedActivityDate = selectedActivityDate === dateStr ? null : dateStr;
    renderCommunityCalendar();
    renderActivities();
}

function renderActivities() {
    if (!state.activities || state.activities.length === 0) {
        return;
    }
    const list = document.getElementById("community-activities-list");
    if (!list) return;
    list.innerHTML = "";
    
    const monthStr = String(activityMonth + 1).padStart(2, '0');
    let filtered = state.activities.filter(a => {
        const [y, m] = a.date.split("-");
        return y == activityYear && m === monthStr;
    });
    
    if (selectedActivityDate) {
        filtered = filtered.filter(a => a.date === selectedActivityDate);
    }
    
    filtered.sort((a, b) => a.date.localeCompare(b.date));
    
    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 30px;">' +
            (selectedActivityDate ? 'No hay actividades programadas para este día.' : 'No hay actividades este mes.') + '</p>';
        return;
    }
    
    filtered.forEach(act => {
        const [year, month, day] = act.date.split("-");
        const formattedDate = new Date(year, parseInt(month) - 1, day).toLocaleDateString("es-CL", { day: 'numeric', month: 'short', year: 'numeric' });
        
        const capacity = act.capacity || 0;
        const enrolled = act.enrolledCount || 0;
        const isFull = capacity > 0 && enrolled >= capacity;
        const spotsLeft = capacity > 0 ? capacity - enrolled : null;
        
        let capacityBadge = '';
        if (capacity > 0) {
            if (isFull) {
                capacityBadge = '<span class="activity-capacity-badge full"><i class="fa-solid fa-circle-xmark"></i> Cupos Agotados</span>';
            } else {
                capacityBadge = `<span class="activity-capacity-badge available"><i class="fa-solid fa-circle-check"></i> ${spotsLeft} cupo${spotsLeft !== 1 ? 's' : ''} disponible${spotsLeft !== 1 ? 's' : ''}</span>`;
            }
        }
        
        let enrollBtn = '';
        if (capacity > 0 && !isFull) {
            enrollBtn = `<button class="btn-primary activity-enroll-btn" onclick="openEnrollModal('${act.id}', '${act.title.replace(/'/g, "\\'")}')"><i class="fa-solid fa-user-plus"></i> Inscribirse</button>`;
        } else if (capacity > 0 && isFull) {
            enrollBtn = '<button class="btn-secondary activity-enroll-btn" disabled><i class="fa-solid fa-ban"></i> Sin Cupos</button>';
        }
        
        list.innerHTML += `
            <div class="activity-item">
                <div class="activity-info">
                    <h5>${act.title}</h5>
                    <p><i class="fa-solid fa-calendar-day"></i> ${formattedDate} | <i class="fa-solid fa-clock"></i> ${act.time}</p>
                    <p><i class="fa-solid fa-location-dot"></i> ${act.location}</p>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 5px;">${act.desc}</p>
                    ${capacityBadge}
                    ${enrollBtn}
                </div>
            </div>
        `;
    });
}

function openEnrollModal(activityId, activityTitle) {
    const enrollActivityId = document.getElementById("enroll-activity-id");
    const enrollActivityName = document.getElementById("enroll-activity-name");
    if (!enrollActivityId || !enrollActivityName) return;
    
    enrollActivityId.value = activityId;
    enrollActivityName.innerText = `Inscripción: ${activityTitle}`;
    
    // Auto-fill if user is logged in as client
    if (state.currentUser && state.currentUser.role === "usuario") {
        const client = state.bookings.find(b => b.clientEmail === state.currentUser.email);
        if (client) {
            document.getElementById("enroll-name").value = client.clientName;
            document.getElementById("enroll-email").value = client.clientEmail;
            document.getElementById("enroll-phone").value = client.clientPhone;
        } else {
            document.getElementById("enroll-name").value = state.currentUser.name || '';
            document.getElementById("enroll-email").value = state.currentUser.email || '';
            document.getElementById("enroll-phone").value = '';
        }
    }
    
    document.getElementById("activity-enroll-modal").classList.add("active");
}

function closeEnrollModal() {
    const modal = document.getElementById("activity-enroll-modal");
    const form = document.getElementById("enroll-form");
    if (modal) modal.classList.remove("active");
    if (form) form.reset();
}

async function submitActivityEnrollment(e) {
    e.preventDefault();
    
    const activityId = document.getElementById("enroll-activity-id").value;
    const clientName = document.getElementById("enroll-name").value;
    const clientEmail = document.getElementById("enroll-email").value;
    const clientPhone = document.getElementById("enroll-phone").value;
    
    try {
        const res = await fetch('/api/activities/enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId, clientName, clientEmail, clientPhone })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast("¡Inscripción exitosa! Te esperamos en la actividad.", "success");
            closeEnrollModal();
            await loadAllData();
            renderActivities();
            renderCommunityCalendar();
        } else {
            showToast(data.error || "Error al inscribirse.", "error");
        }
    } catch (e) {
        showToast("Error de conexión al inscribirse.", "error");
    }
}

function openAdminEnrollmentsModal(activityId, activityTitle) {
    const adminEnrollmentsName = document.getElementById("admin-enrollments-activity-name");
    const tbody = document.getElementById("admin-enrollments-table-body");
    const emptyMsg = document.getElementById("admin-enrollments-empty");
    
    if (!adminEnrollmentsName || !tbody || !emptyMsg) return;
    
    adminEnrollmentsName.innerText = `Inscritos: ${activityTitle}`;
    
    const enrollments = state.activityEnrollments.filter(e => e.activityId === activityId);
    
    if (enrollments.length === 0) {
        tbody.innerHTML = '';
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
        tbody.innerHTML = "";
        enrollments.forEach(enr => {
            const date = enr.created_at ? new Date(enr.created_at).toLocaleDateString("es-CL") : '-';
            tbody.innerHTML += `
                <tr>
                    <td>${enr.clientName}</td>
                    <td>${enr.clientEmail}</td>
                    <td>${enr.clientPhone}</td>
                    <td>${date}</td>
                    <td><button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="removeEnrollment('${enr.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button></td>
                </tr>
            `;
        });
    }
    
    document.getElementById("admin-view-enrollments-modal").classList.add("active");
}

function closeAdminEnrollmentsModal() {
    const modal = document.getElementById("admin-view-enrollments-modal");
    if (modal) modal.classList.remove("active");
}

async function removeEnrollment(enrollmentId) {
    if (!confirm("¿Estás seguro de eliminar esta inscripción? El cupo se liberará.")) return;
    
    try {
        const res = await fetch(`/api/activities/enrollments/${enrollmentId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast("Inscripción eliminada. Cupo liberado.", "success");
            await loadAllData();
            renderActivities();
            renderCommunityCalendar();
            renderDashboardPanes();
        }
    } catch (e) {
        showToast("Error al eliminar inscripción.", "error");
    }
}

async function addCommunityActivity(e) {
    e.preventDefault();
    const title = document.getElementById("act-title").value;
    const date = document.getElementById("act-date").value;
    const time = document.getElementById("act-time").value;
    const location = document.getElementById("act-location").value;
    const desc = document.getElementById("act-desc").value;
    const capacity = parseInt(document.getElementById("act-capacity").value) || 0;
    
    const newAct = {
        id: "act-" + Date.now(),
        title, date, time, location, desc, capacity
    };
    
    try {
        const res = await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAct)
        });
        if (res.ok) {
            showToast("Actividad comunitaria creada correctamente.", "success");
            document.getElementById("admin-activity-form").reset();
            await loadAllData();
            renderCommunityCalendar();
            renderActivities();
            renderDashboardPanes();
        }
    } catch (e) {
        showToast("Error al añadir actividad.", "error");
    }
}

async function deleteActivity(id) {
    try {
        const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast("Actividad eliminada.", "success");
            await loadAllData();
            renderCommunityCalendar();
            renderActivities();
            renderDashboardPanes();
        }
    } catch (e) {
        showToast("Error al eliminar.", "error");
    }
}

// customizable marketing texts actions
async function saveContentCustomizations(e) {
    e.preventDefault();
    const payload = {
        heroTitle: document.getElementById("custom-hero-title").value,
        heroSubtitle: document.getElementById("custom-hero-subtitle").value,
        presentationFull: document.getElementById("custom-presentation").value,
        presentationShort: document.getElementById("custom-presentation").value.substring(0, 160) + "...",
        mission: document.getElementById("custom-mission").value,
        vision: document.getElementById("custom-vision").value
    };
    
    try {
        const res = await fetch('/api/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Contenidos de la página actualizados y publicados.", "success");
            await loadAllData();
            renderContent();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (e) {
        showToast("Error al guardar contenidos.", "error");
    }
}

// Modal Windows utils
function openTermsModal() {
    const modal = document.getElementById("terms-modal");
    if (modal) modal.classList.add("active");
}

function closeTermsModal() {
    const modal = document.getElementById("terms-modal");
    if (modal) modal.classList.remove("active");
}

function setupEventListeners() {
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", toggleTheme);
    }

    // Services search input
    const servicesSearchInput = document.getElementById("services-search");
    if (servicesSearchInput) {
        servicesSearchInput.addEventListener("input", (e) => {
            servicesSearchQuery = e.target.value;
            renderServicesSection();
        });
    }

    // Allow reschedule checkbox toggle
    const allowRescheduleCheckbox = document.getElementById("adm-serv-allow-reschedule");
    const maxReschedulesContainer = document.getElementById("adm-serv-max-reschedules-container");
    if (allowRescheduleCheckbox && maxReschedulesContainer) {
        allowRescheduleCheckbox.addEventListener("change", (e) => {
            maxReschedulesContainer.style.display = e.target.checked ? "block" : "none";
        });
    }
    
    // If on acceso.html and user is logged in, show dashboard
    const isAccesoPage = window.location.pathname.includes('acceso.html');
    if (isAccesoPage && state.currentUser) {
        showDashboardView();
    }
}

// ----------------------------------------------------
// RESCHEDULE FUNCTIONALITY
// ----------------------------------------------------
function openRescheduleModal(bookingId) {
    const booking = state.bookings.find(b => b.id === bookingId);
    if (!booking) {
        showToast("Reserva no encontrada.", "error");
        return;
    }
    
    const provider = state.providers.find(p => p.id === booking.providerId);
    const serviceName = booking.serviceName;
    
    rescheduleState = {
        bookingId: booking.id,
        providerId: booking.providerId,
        serviceType: provider?.services.find(s => s.id === booking.serviceId)?.type || 'Virtual',
        date: null,
        timeSlot: null,
        startTime: null,
        endTime: null,
        room: null,
        calendarYear: new Date().getFullYear(),
        calendarMonth: new Date().getMonth()
    };
    
    document.getElementById("reschedule-booking-id").value = bookingId;
    document.getElementById("reschedule-booking-info").innerText = 
        `${serviceName} con ${provider?.name || 'Profesional'} - Actual: ${booking.date} @ ${booking.timeSlot}`;
    
    renderRescheduleCalendar();
    document.getElementById("reschedule-slots").innerHTML = '';
    document.getElementById("reschedule-date-label").innerText = 'Selecciona una fecha';
    
    document.getElementById("reschedule-modal").classList.add("active");
}

function closeRescheduleModal() {
    document.getElementById("reschedule-modal").classList.remove("active");
    rescheduleState = {
        bookingId: null,
        providerId: null,
        serviceType: null,
        date: null,
        timeSlot: null,
        startTime: null,
        endTime: null,
        room: null,
        calendarYear: new Date().getFullYear(),
        calendarMonth: new Date().getMonth()
    };
}

function renderRescheduleCalendar() {
    const monthYear = document.getElementById("reschedule-calendar-month-year");
    const grid = document.getElementById("reschedule-calendar");
    if (!monthYear || !grid) return;
    
    monthYear.innerText = `${MONTH_NAMES[rescheduleState.calendarMonth]} ${rescheduleState.calendarYear}`;
    grid.innerHTML = "";
    
    const headers = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
    headers.forEach(h => {
        grid.innerHTML += `<div class="calendar-day-header">${h}</div>`;
    });
    
    const firstDay = new Date(rescheduleState.calendarYear, rescheduleState.calendarMonth, 1).getDay();
    const daysInMonth = new Date(rescheduleState.calendarYear, rescheduleState.calendarMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += '<div class="calendar-cell empty"></div>';
    }
    
    const today = new Date();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(rescheduleState.calendarYear, rescheduleState.calendarMonth, day);
        let cellClass = "calendar-cell";
        
        const monthStr = String(rescheduleState.calendarMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${rescheduleState.calendarYear}-${monthStr}-${dayStr}`;
        
        if (cellDate < today && cellDate.toDateString() !== today.toDateString()) {
            cellClass += " disabled";
        }
        
        if (rescheduleState.date === dateStr) {
            cellClass += " selected";
        }
        
        grid.innerHTML += `<div class="${cellClass}" onclick="selectRescheduleDate('${dateStr}', this)">${day}</div>`;
    }
}

function prevRescheduleMonth() {
    rescheduleState.calendarMonth--;
    if (rescheduleState.calendarMonth < 0) {
        rescheduleState.calendarMonth = 11;
        rescheduleState.calendarYear--;
    }
    renderRescheduleCalendar();
}

function nextRescheduleMonth() {
    rescheduleState.calendarMonth++;
    if (rescheduleState.calendarMonth > 11) {
        rescheduleState.calendarMonth = 0;
        rescheduleState.calendarYear++;
    }
    renderRescheduleCalendar();
}

function selectRescheduleDate(dateStr, element) {
    if (element.classList.contains("disabled")) return;
    rescheduleState.date = dateStr;
    rescheduleState.timeSlot = null;
    rescheduleState.startTime = null;
    rescheduleState.endTime = null;
    rescheduleState.room = null;
    
    document.querySelectorAll("#reschedule-calendar .calendar-cell").forEach(c => c.classList.remove("selected"));
    element.classList.add("selected");
    
    updateRescheduleSlotsView();
}

function updateRescheduleSlotsView() {
    const slotsGrid = document.getElementById("reschedule-slots");
    const label = document.getElementById("reschedule-date-label");
    if (!slotsGrid || !label) return;
    
    if (!rescheduleState.date) {
        label.innerText = "Selecciona una fecha";
        slotsGrid.innerHTML = "";
        return;
    }
    
    const [year, month, day] = rescheduleState.date.split("-");
    const dateObj = new Date(year, parseInt(month) - 1, day);
    const dayOfWeekIdx = dateObj.getDay();
    const friendlyDate = dateObj.toLocaleDateString("es-CL", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    label.innerText = `Horas para: ${friendlyDate}`;
    
    const provider = state.providers.find(p => p.id === rescheduleState.providerId);
    if (!provider) {
        slotsGrid.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">Error: profesional no encontrado.</div>';
        return;
    }
    
    const dayShifts = provider.blocks[dayOfWeekIdx] || [];
    
    if (dayShifts.length === 0) {
        slotsGrid.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">El profesional no atiende este día.</div>';
        return;
    }
    
    slotsGrid.innerHTML = "";
    
    dayShifts.forEach(slot => {
        const [slotStart, slotEnd] = slot.split("-");
        const slotStartMin = timeToMinutes(slotStart);
        const slotEndMin = timeToMinutes(slotEnd);
        
        const matchingRooms = state.rooms.filter(r => r.type === rescheduleState.serviceType);
        
        let isAvailable = false;
        let selectedRoomForSlot = null;
        let blockReason = "No hay salas de este tipo disponibles";
        
        const sicknessBlock = state.sicknessBlocks.find(sb => 
            sb.providerId === rescheduleState.providerId && 
            sb.date === rescheduleState.date && 
            (sb.timeSlot === "all" || sb.timeSlot === slot)
        );
        
        const overlappingBooking = state.bookings.find(bk => {
            if (bk.providerId !== rescheduleState.providerId || bk.date !== rescheduleState.date || bk.status === "Cancelled" || bk.id === rescheduleState.bookingId) {
                return false;
            }
            const bkStart = timeToMinutes(bk.startTime);
            const bkEnd = timeToMinutes(bk.endTime);
            return (slotStartMin < bkEnd && bkStart < slotEndMin);
        });
        
        if (sicknessBlock) {
            isAvailable = false;
            blockReason = "Prestador no disponible (Licencia/Enfermedad)";
        } else if (overlappingBooking) {
            isAvailable = false;
            blockReason = "Prestador ocupado en otra sala";
        } else {
            for (const room of matchingRooms) {
                const roomOpenMin = timeToMinutes(room.openTime);
                const roomCloseMin = timeToMinutes(room.closeTime);
                
                if (slotStartMin < roomOpenMin || slotEndMin > roomCloseMin) {
                    blockReason = "Sala cerrada";
                    continue;
                }
                
                const roomConflict = state.bookings.find(bk => {
                    if (bk.roomId !== room.id || bk.date !== rescheduleState.date || bk.status === "Cancelled" || bk.id === rescheduleState.bookingId) {
                        return false;
                    }
                    const bkStart = timeToMinutes(bk.startTime);
                    const bkEnd = timeToMinutes(bk.endTime);
                    return (slotStartMin < bkEnd && bkStart < slotEndMin);
                });
                
                if (roomConflict) {
                    blockReason = "Sala ocupada";
                    continue;
                }
                
                isAvailable = true;
                selectedRoomForSlot = room;
                break;
            }
        }
        
        const btnClass = isAvailable ? "slot-btn" : "slot-btn disabled";
        const titleAttr = isAvailable ? "" : `title="${blockReason}"`;
        const selectedClass = rescheduleState.timeSlot === slot ? " selected" : "";
        
        slotsGrid.innerHTML += `
            <button class="${btnClass}${selectedClass}" ${titleAttr} onclick="selectRescheduleSlot('${slot}', '${slotStart}', '${slotEnd}', ${isAvailable}, ${JSON.stringify(selectedRoomForSlot).replace(/"/g, '&quot;')})">
                ${slotStart}
            </button>
        `;
    });
}

function selectRescheduleSlot(slot, start, end, isAvailable, roomObj) {
    if (!isAvailable) {
        showToast("Este bloque horario no está disponible.", "error");
        return;
    }
    rescheduleState.timeSlot = slot;
    rescheduleState.startTime = start;
    rescheduleState.endTime = end;
    rescheduleState.room = roomObj;
    
    document.querySelectorAll("#reschedule-slots .slot-btn").forEach(b => {
        if (b.innerText.trim() === start) {
            b.classList.add("selected");
        } else {
            b.classList.remove("selected");
        }
    });
}

async function confirmReschedule() {
    if (!rescheduleState.date || !rescheduleState.timeSlot || !rescheduleState.room) {
        showToast("Debe seleccionar una nueva fecha, hora y sala.", "error");
        return;
    }
    
    try {
        const res = await fetch(`/api/bookings/${rescheduleState.bookingId}/reschedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                newDate: rescheduleState.date,
                newTimeSlot: rescheduleState.timeSlot,
                newStartTime: rescheduleState.startTime,
                newEndTime: rescheduleState.endTime,
                newRoomId: rescheduleState.room.id,
                newRoomName: rescheduleState.room.name
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast("Reserva reagendada con éxito.", "success");
            closeRescheduleModal();
            await loadAllData();
            renderDashboardPanes();
            updateSlotsView();
        } else {
            showToast(data.error || "Error al reagendar.", "error");
        }
    } catch (e) {
        showToast("Error de conexión al reagendar.", "error");
    }
}
