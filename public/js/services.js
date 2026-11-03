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
                    <small>${p.specialty || p.role}</small>
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
                    <div class="service-list-price">
                        <span>$${s.price.toLocaleString("es-CL")} <small>/ sesión</small></span>
                        <button class="btn-primary" type="button" onclick="bookServiceFromCard('${provider.id}', '${s.id}')">Reservar</button>
                    </div>
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
                    <button class="btn-primary service-card-book" type="button" onclick="bookServiceFromCard('${provider.id}', '${s.id}')">Reservar este servicio</button>
                </div>
            `;
        });
    }
}

function selectServiceProvider(providerId) {
    selectedServicesProviderId = providerId;
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
