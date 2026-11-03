// Themes management
function initTheme() {
    const savedTheme = localStorage.getItem("psicarte_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeUI(savedTheme);

    const cachedTokens = localStorage.getItem("psicarte_custom_theme_tokens");
    if (cachedTokens) {
        applyCustomThemeTokens(cachedTokens, false);
    }
}

function parseCustomThemeTokens(tokensInput) {
    if (!tokensInput) return null;
    try {
        const parsed = typeof tokensInput === "string" ? JSON.parse(tokensInput) : tokensInput;
        if (!parsed || typeof parsed !== "object") return null;
        return {
            light: parsed.light && typeof parsed.light === "object" ? parsed.light : {},
            dark: parsed.dark && typeof parsed.dark === "object" ? parsed.dark : {},
            defaults: parsed.defaults && typeof parsed.defaults === "object" ? parsed.defaults : null
        };
    } catch (e) {
        console.error("Error parsing custom theme tokens:", e);
        return null;
    }
}

function buildThemeRuleBlock(selector, tokenMap) {
    if (!tokenMap || typeof tokenMap !== "object") return "";
    const declarations = [];
    Object.entries(tokenMap).forEach(([prop, val]) => {
        if (/^--[a-z0-9-]+$/i.test(prop) && typeof val === "string" && val.trim().length > 0 && !/[{};<>]/.test(val)) {
            declarations.push(`${prop}: ${val.trim()};`);
        }
    });
    if (declarations.length === 0) return "";
    return `${selector} {\n    ${declarations.join("\n    ")}\n}`;
}

function applyCustomThemeTokens(tokensInput, persistLocal = true) {
    const parsed = parseCustomThemeTokens(tokensInput);
    if (!parsed) return;

    let styleEl = document.getElementById("psicarte-custom-theme");
    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "psicarte-custom-theme";
        document.head.appendChild(styleEl);
    }

    const lightBlock = buildThemeRuleBlock(":root", parsed.light);
    const darkBlock = buildThemeRuleBlock('[data-theme="dark"]', parsed.dark);
    styleEl.textContent = [lightBlock, darkBlock].filter(Boolean).join("\n\n");

    if (persistLocal) {
        try {
            localStorage.setItem("psicarte_custom_theme_tokens", JSON.stringify(parsed));
        } catch (e) {
            console.error("No se pudo guardar cache local de tema:", e);
        }
    }
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
    if (footerLogo) footerLogo.src = "images/logo_dark.png";
}

function renderFooterYear() {
    const yearEl = document.getElementById("footer-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
}
