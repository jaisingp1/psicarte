document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [contentResponse, configResponse] = await Promise.all([
            fetch('/api/content'),
            fetch('/api/config')
        ]);
        if (!contentResponse.ok || !configResponse.ok) {
            throw new Error('No se pudo cargar la configuración de contacto.');
        }

        const content = await contentResponse.json();
        const config = await configResponse.json();
        if (config.theme_custom_tokens && typeof applyCustomThemeTokens === 'function') {
            applyCustomThemeTokens(config.theme_custom_tokens);
        }
        const addressRow = document.getElementById('contact-address-row');
        const address = document.getElementById('contact-address');
        if (address && content.contactAddress) {
            address.textContent = content.contactAddress;
            if (addressRow) addressRow.hidden = false;
        }

        const emailEl = document.getElementById('contact-email');
        if (emailEl && content.contactEmail) {
            emailEl.textContent = content.contactEmail;
        }
        const phoneEl = document.getElementById('contact-phone');
        if (phoneEl && content.contactPhone) {
            phoneEl.textContent = content.contactPhone;
        }

        const whatsappSupportLink = document.getElementById('whatsapp-support-link');
        if (whatsappSupportLink && config.whatsapp_number) {
            const cleanNum = String(config.whatsapp_number).replace(/\D/g, '');
            if (cleanNum) {
                whatsappSupportLink.href = `https://wa.me/${cleanNum}`;
                whatsappSupportLink.hidden = false;
            }
        }

        const instagramUrl = config.instagram_url;
        const instagramLink = document.getElementById('contact-instagram');
        const instagramRow = document.getElementById('contact-instagram-row');
        if (!instagramUrl || !instagramLink) return;

        const parsedUrl = new URL(instagramUrl);
        if (parsedUrl.protocol !== 'https:' ||
            !['instagram.com', 'www.instagram.com'].includes(parsedUrl.hostname)) {
            throw new Error('La URL de Instagram configurada no es válida.');
        }

        instagramLink.href = parsedUrl.href;
        instagramLink.textContent = `@${parsedUrl.pathname.split('/').filter(Boolean)[0] || 'centropsicarte'}`;
        if (instagramRow) instagramRow.hidden = false;
    } catch (error) {
        console.error('Error al cargar los datos de contacto:', error);
    }
});
