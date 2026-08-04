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

// Banners & Popups
function checkPopups() {
    const popup = document.getElementById("announcement-popup");
    const pTitle = document.getElementById("popup-title");
    const pBody = document.getElementById("popup-body");
    
    if (state.popupConfig.active && popup && pTitle && pBody) {
        const currentPopupContent = `${state.popupConfig.title}|${state.popupConfig.text}`;
        const dismissedPopup = sessionStorage.getItem("dismissed_announcement");
        
        if (dismissedPopup !== currentPopupContent) {
            pTitle.innerText = state.popupConfig.title;
            pBody.innerText = state.popupConfig.text;
            setTimeout(() => {
                popup.classList.add("active");
            }, 1000);
        }
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
    if (popup) {
        popup.classList.remove("active");
        const currentPopupContent = `${state.popupConfig.title}|${state.popupConfig.text}`;
        sessionStorage.setItem("dismissed_announcement", currentPopupContent);
    }
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
