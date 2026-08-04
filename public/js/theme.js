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
