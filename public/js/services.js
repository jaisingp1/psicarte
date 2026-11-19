// ----------------------------------------------------
// SERVICES SECTION (Dynamic Rendering)
// ----------------------------------------------------
function getProviderServiceModality(provider) {
    const shifts = provider.shifts || [];
    const hasVirtual = shifts.some(s => s.room_type === 'Virtual');
    const hasPhysical = shifts.some(s => s.room_type === 'Física');
    if (hasVirtual && hasPhysical) return 'both';
    if (hasVirtual) return 'Virtual';
    if (hasPhysical) return 'Física';
    return 'Virtual';
}

function renderServicesSection() {
    renderServicesOverviewSection();
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
                    <small>${p.specialty || p.role}</small>
                </span>
            </button>
        `;
    });

    // Get selected provider and apply filters
    const provider = state.providers.find(p => p.id === selectedServicesProviderId);
    let services = provider ? [...(provider.services || [])] : [];
    const modality = provider ? getProviderServiceModality(provider) : 'Virtual';

    // Filter by modality
    if (selectedServiceType !== 'all') {
        services = services.filter(() => modality === 'both' || modality === selectedServiceType);
    }

    // Filter by search query
    if (servicesSearchQuery.trim()) {
        const q = servicesSearchQuery.toLowerCase();
        services = services.filter(s => s.name.toLowerCase().includes(q));
    }

    // Render service cards
    const prevBtn = document.getElementById("services-carousel-prev");
    const nextBtn = document.getElementById("services-carousel-next");
    const dotsContainer = document.getElementById("services-carousel-dots");

    if (services.length === 0) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
        gridContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">No se encontraron servicios con los filtros aplicados.</p>';
        return;
    }

    const badgeHtml = modality === 'both'
        ? `<span class="service-badge service-badge-virtual"><i class="fa-solid fa-wifi"></i> Online</span> <span class="service-badge service-badge-physical"><i class="fa-solid fa-building"></i> Presencial</span>`
        : (modality === 'Virtual'
            ? `<span class="service-badge service-badge-virtual"><i class="fa-solid fa-wifi"></i> Online</span>`
            : `<span class="service-badge service-badge-physical"><i class="fa-solid fa-building"></i> Presencial</span>`);

    if (servicesView === 'list') {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
        gridContainer.className = 'services-list-view';
        gridContainer.innerHTML = '';
        services.forEach(s => {
            gridContainer.innerHTML += `
                <div class="service-list-item">
                    <div class="service-list-main">
                        ${badgeHtml}
                        <span class="service-list-name">${s.name}</span>
                    </div>
                    <div class="service-list-meta">
                        <span><i class="fa-solid fa-clock"></i> ${s.duration} min</span>
                        <span><i class="fa-solid fa-user-doctor"></i> ${provider.name}</span>
                    </div>
                    <div class="service-list-price">
                        <span>$${Number(s.price).toLocaleString("es-CL")} <small>/ sesión</small></span>
                        <button class="btn-primary" type="button" onclick="bookServiceFromCard('${provider.id}', '${s.id}')">Reservar</button>
                    </div>
                </div>
            `;
        });
    } else {
        gridContainer.className = 'services-grid';
        gridContainer.innerHTML = '';
        const totalServices = services.length;
        const totalPages = Math.ceil(totalServices / SERVICES_PER_PAGE);

        if (servicesCarouselPage >= totalPages) {
            servicesCarouselPage = Math.max(0, totalPages - 1);
        }
        if (servicesCarouselPage < 0) {
            servicesCarouselPage = 0;
        }

        const startIndex = servicesCarouselPage * SERVICES_PER_PAGE;
        const visibleServices = services.slice(startIndex, startIndex + SERVICES_PER_PAGE);

        visibleServices.forEach(s => {
            gridContainer.innerHTML += `
                <div class="service-card">
                    <div class="service-card-header">
                        <h4 class="service-card-title">${s.name}</h4>
                        ${badgeHtml}
                    </div>
                    <div class="service-card-meta">
                        <span><i class="fa-solid fa-clock"></i> ${s.duration} minutos</span>
                        <span><i class="fa-solid fa-user-doctor"></i> ${provider.name}</span>
                    </div>
                    <div class="service-card-price">
                        <span class="price-amount">$${Number(s.price).toLocaleString("es-CL")}</span>
                        <span class="price-unit">Sesión</span>
                    </div>
                    <button class="btn-primary service-card-book" type="button" onclick="bookServiceFromCard('${provider.id}', '${s.id}')">Reservar este servicio</button>
                </div>
            `;
        });

        // Controles de carrusel (flechas y puntos si hay más de 4 servicios)
        if (totalServices > SERVICES_PER_PAGE) {
            if (prevBtn) {
                prevBtn.style.display = 'inline-flex';
                prevBtn.disabled = (servicesCarouselPage === 0);
                prevBtn.setAttribute('aria-disabled', String(servicesCarouselPage === 0));
            }
            if (nextBtn) {
                nextBtn.style.display = 'inline-flex';
                nextBtn.disabled = (servicesCarouselPage >= totalPages - 1);
                nextBtn.setAttribute('aria-disabled', String(servicesCarouselPage >= totalPages - 1));
            }
            if (dotsContainer) {
                dotsContainer.style.display = 'flex';
                let dotsHtml = '';
                for (let i = 0; i < totalPages; i++) {
                    const isCur = (i === servicesCarouselPage);
                    dotsHtml += `<button type="button" class="carousel-dot${isCur ? ' active' : ''}" onclick="goToServicesCarouselPage(${i})" aria-label="Página ${i + 1} de servicios" ${isCur ? 'aria-current="true"' : ''}></button>`;
                }
                dotsContainer.innerHTML = dotsHtml;
            }
        } else {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (dotsContainer) dotsContainer.style.display = 'none';
        }
    }
}

function changeServicesCarouselPage(delta) {
    servicesCarouselPage += delta;
    renderServicesSection();
}

function goToServicesCarouselPage(pageIndex) {
    servicesCarouselPage = pageIndex;
    renderServicesSection();
}

function selectServiceProvider(providerId) {
    selectedServicesProviderId = providerId;
    servicesCarouselPage = 0;
    renderServicesSection();
}

function bookServiceFromCard(providerId, serviceId) {
    const providerSelect = document.getElementById('booking-provider');
    const serviceSelect = document.getElementById('booking-service');
    if (!providerSelect || !serviceSelect) return;

    setSearchMethod('provider');
    providerSelect.value = providerId;
    onBookingProviderChange();
    serviceSelect.value = serviceId;
    goToStep(2);
    document.getElementById('agendamiento')?.scrollIntoView({ behavior: 'smooth' });
}

function setServiceTypeFilter(type) {
    selectedServiceType = type;
    servicesCarouselPage = 0;
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

// ----------------------------------------------------
// SERVICES OVERVIEW SECTION (Áreas de Acompañamiento - Carrusel)
// ----------------------------------------------------
const DEFAULT_SERVICE_AREAS = [
    {
        id: "sa-1",
        icon: "fa-brain",
        title: "Psicología Clínica y Laboral",
        description: "Psicoterapia individual, de parejas, habilidades parentales, evaluaciones psicológicas (relatores/OS-10), certificados e informes clínicos con enfoque ético e integral."
    },
    {
        id: "sa-2",
        icon: "fa-compass",
        title: "Coaching Personal y Profesional",
        description: "Acompañamiento orientado a metas personales y laborales, fortalecimiento del liderazgo, toma de decisiones, gestión del cambio y proyección vocacional."
    },
    {
        id: "sa-3",
        icon: "fa-people-group",
        title: "Capacitaciones y Habilidades Blandas",
        description: "Formación individual y grupal en comunicación efectiva, manejo de conflictos, convivencia escolar, bienestar organizacional y prevención de riesgos psicosociales."
    },
    {
        id: "sa-4",
        icon: "fa-masks-theater",
        title: "Talleres, Yoga y Artes Escénicas",
        description: "Espacios prácticos de teatro, expresión corporal, yoga presencial y venta de obras o intervenciones escénicas para colegios, empresas y comunidades."
    }
];

function getServiceAreasData() {
    if (state.content && state.content.service_areas !== undefined && state.content.service_areas !== null) {
        try {
            const parsed = typeof state.content.service_areas === 'string'
                ? JSON.parse(state.content.service_areas)
                : state.content.service_areas;
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            console.error('Error parsing service_areas:', e);
        }
    }
    return DEFAULT_SERVICE_AREAS;
}

function renderServicesOverviewSection() {
    const container = document.getElementById("dynamic-services-overview-container");
    const prevBtn = document.getElementById("overview-carousel-prev");
    const nextBtn = document.getElementById("overview-carousel-next");
    const dotsContainer = document.getElementById("overview-carousel-dots");
    if (!container) return;

    const areas = getServiceAreasData();
    const totalAreas = areas.length;
    const totalPages = Math.ceil(totalAreas / OVERVIEW_PER_PAGE);

    if (overviewCarouselPage >= totalPages) {
        overviewCarouselPage = Math.max(0, totalPages - 1);
    }
    if (overviewCarouselPage < 0) {
        overviewCarouselPage = 0;
    }

    const startIndex = overviewCarouselPage * OVERVIEW_PER_PAGE;
    const visibleAreas = areas.slice(startIndex, startIndex + OVERVIEW_PER_PAGE);

    container.innerHTML = visibleAreas.map(a => `
        <div class="service-area-card">
            <div class="service-area-icon"><i class="fa-solid ${a.icon || 'fa-brain'}"></i></div>
            <h3>${a.title}</h3>
            <p>${a.description}</p>
        </div>
    `).join('');

    if (totalAreas > OVERVIEW_PER_PAGE) {
        if (prevBtn) {
            prevBtn.style.display = 'inline-flex';
            prevBtn.disabled = (overviewCarouselPage === 0);
            prevBtn.setAttribute('aria-disabled', String(overviewCarouselPage === 0));
        }
        if (nextBtn) {
            nextBtn.style.display = 'inline-flex';
            nextBtn.disabled = (overviewCarouselPage >= totalPages - 1);
            nextBtn.setAttribute('aria-disabled', String(overviewCarouselPage >= totalPages - 1));
        }
        if (dotsContainer) {
            dotsContainer.style.display = 'flex';
            let dotsHtml = '';
            for (let i = 0; i < totalPages; i++) {
                const isCur = (i === overviewCarouselPage);
                dotsHtml += `<button type="button" class="carousel-dot${isCur ? ' active' : ''}" onclick="goToOverviewCarouselPage(${i})" aria-label="Página ${i + 1} de áreas" ${isCur ? 'aria-current="true"' : ''}></button>`;
            }
            dotsContainer.innerHTML = dotsHtml;
        }
    } else {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
    }
}

function changeOverviewCarouselPage(delta) {
    overviewCarouselPage += delta;
    renderServicesOverviewSection();
}

function goToOverviewCarouselPage(pageIndex) {
    overviewCarouselPage = pageIndex;
    renderServicesOverviewSection();
}
