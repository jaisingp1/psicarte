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
    const accentLogo = document.getElementById("hero-logo");
    
    if (themeBtn) themeBtn.innerHTML = theme === "dark"
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';

    if (logoImg) logoImg.src = theme === "dark"
        ? "images/logo_dark.png"
        : "images/logo_light.png";
    if (accentLogo) accentLogo.src = "images/logo-original.webp";
    if (footerLogo) footerLogo.src = theme === "dark"
        ? "images/logo_dark.png"
        : "images/logo_light.png";
}

function renderFooterYear() {
    const yearEl = document.getElementById("footer-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
}
