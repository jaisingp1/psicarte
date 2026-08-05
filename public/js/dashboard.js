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
        
        // Populate room selects for admin forms
        if (typeof populateRoomSelects === 'function') {
            populateRoomSelects();
        }
        
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
            <li><button class="sidebar-btn active" onclick="switchDashboardPane('admin-my-bookings', this)"><i class="fa-solid fa-calendar-check"></i> Mis Reservas</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-my-profile', this)"><i class="fa-solid fa-user-gear"></i> Mis Datos</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-rooms', this)"><i class="fa-solid fa-building"></i> Salas</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-room-schedule', this)"><i class="fa-solid fa-calendar-days"></i> Agenda de Salas</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-providers', this)"><i class="fa-solid fa-user-doctor"></i> Servicios</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-bookings', this)"><i class="fa-solid fa-calendar-days"></i> Reservas Globales</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-users', this)"><i class="fa-solid fa-user-shield"></i> Gestión de Usuarios</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-blocks', this)"><i class="fa-solid fa-calendar-minus"></i> Bloqueos Horarios</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-popups', this)"><i class="fa-solid fa-bullhorn"></i> Alertas y Pop-ups</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-calendar', this)"><i class="fa-solid fa-calendar-week"></i> Calendario Comun.</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-content', this)"><i class="fa-solid fa-file-pen"></i> Personalizar Textos</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-khipu-notifications', this)"><i class="fa-solid fa-bell"></i> Notificaciones Khipu</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-config-raw', this)"><i class="fa-solid fa-gears"></i> Configuración Avanzada</button></li>
        `;
    }
}

function switchDashboardPane(paneId, btn) {
    document.querySelectorAll(".sidebar-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    document.querySelectorAll(".dashboard-pane").forEach(p => p.classList.remove("active"));
    document.getElementById(`pane-${paneId}`).classList.add("active");
    
    if (paneId === 'admin-room-schedule') {
        setTimeout(() => renderRoomSchedule(), 100);
    }
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
                const isPaidBadge = bk.status === "Paid" ? '<span class="badge badge-paid">Pagado</span>' : (bk.status === "Pending_Payment" ? '<span class="badge badge-warning">Procesando Pago</span>' : '<span class="badge badge-pending">Pendiente</span>');
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
                            <span class="badge ${bk.status === 'Paid' ? 'badge-paid' : bk.status === 'Cancelled' ? 'badge-cancelled' : bk.status === 'Pending_Payment' ? 'badge-warning' : 'badge-pending'}">
                                ${bk.status === 'Paid' ? 'Pagado' : bk.status === 'Cancelled' ? 'Cancelado' : bk.status === 'Pending_Payment' ? 'Procesando Pago' : 'Pendiente'}
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
        if (!provServicesList) {
            const dropdowns = [
                document.getElementById("adm-serv-provider"),
                document.getElementById("adm-block-provider")
            ];
            dropdowns.forEach(dd => { if (dd) dd.innerHTML = ""; });
            state.providers.forEach(p => {
                dropdowns.forEach(dd => {
                    if (dd) dd.innerHTML += `<option value="${p.id}">${p.name}</option>`;
                });
            });
            
            // Also populate room select for services
            populateRoomSelects();
        }
        
        renderProvidersServicesTable();
        
        // Ensure room select is populated for service form
        const servRoomSelect = document.getElementById("adm-serv-room");
        if (servRoomSelect && servRoomSelect.options.length <= 1) {
            populateRoomSelects();
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
        
        const maxReschedulesInput = document.getElementById("max-reschedules-input");
        if (maxReschedulesInput) maxReschedulesInput.value = state.config?.max_reschedules || '1';
        
        renderAdminBookings();
        renderAdminKhipuNotifications();
        renderAdminMyBookings();
        renderAdminMyProfile();
        renderAdminUsers();
        renderAdminConfigRaw();
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
            headers: getAuthHeaders(),
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
            headers: getAuthHeaders(),
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
            headers: getAuthHeaders(),
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
        const res = await fetch(`/api/blocks/${id}`, { 
            method: 'DELETE',
            headers: getAuthHeaders()
        });
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
            headers: getAuthHeaders(),
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
            const res = await fetch(`/api/rooms/${id}`, { 
                method: 'DELETE',
                headers: getAuthHeaders()
            });
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
async function deleteProvider(id) {
    if (confirm("¿Estás seguro de eliminar este prestador? Se eliminarán todos sus servicios asociados.")) {
        try {
            const res = await fetch(`/api/providers/${id}`, { 
                method: 'DELETE',
                headers: getAuthHeaders()
            });
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

function stripAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getFlatProvidersServices() {
    const rows = [];
    state.providers.forEach(p => {
        if (p.services && p.services.length > 0) {
            p.services.forEach(s => {
                rows.push({
                    providerId: p.id,
                    providerName: p.name,
                    serviceId: s.id,
                    serviceName: s.name,
                    price: s.price,
                    duration: s.duration,
                    type: s.type,
                    allowReschedule: s.allowReschedule,
                    maxReschedules: s.maxReschedules
                });
            });
        } else {
            rows.push({
                providerId: p.id,
                providerName: p.name,
                serviceId: null,
                serviceName: '-',
                price: 0,
                duration: 0,
                type: '-',
                allowReschedule: 0,
                maxReschedules: 0
            });
        }
    });
    return rows;
}

function renderProvidersServicesTable() {
    const tbody = document.getElementById("adm-services-tbody");
    const paginationEl = document.getElementById("adm-services-pagination");
    if (!tbody) return;

    // Populate room select when rendering services table
    populateRoomSelects();

    const searchInput = document.getElementById("adm-services-search");
    const query = searchInput ? stripAccents(searchInput.value.toLowerCase().trim()) : '';

    let rows = getFlatProvidersServices();

    if (query) {
        rows = rows.filter(r =>
            stripAccents(r.providerName.toLowerCase()).includes(query) ||
            stripAccents(r.serviceName.toLowerCase()).includes(query) ||
            stripAccents(r.type.toLowerCase()).includes(query)
        );
    }

    const { key, dir } = providersServicesSort;
    rows.sort((a, b) => {
        let va = a[key], vb = b[key];
        if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
    });

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / PROVIDERS_SERVICES_PER_PAGE));
    if (providersServicesPage > totalPages) providersServicesPage = totalPages;
    const start = (providersServicesPage - 1) * PROVIDERS_SERVICES_PER_PAGE;
    const pageRows = rows.slice(start, start + PROVIDERS_SERVICES_PER_PAGE);

    if (pageRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay servicios registrados.</td></tr>`;
    } else {
        tbody.innerHTML = pageRows.map(r => {
            const rescheduleInfo = r.allowReschedule === 0
                ? '<span style="color: var(--color-error);">No</span>'
                : `<span style="color: var(--color-success);">Sí (máx. ${r.maxReschedules})</span>`;
            const actions = r.serviceId
                ? `<div class="action-btns">
                        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="editService('${r.providerId}', '${r.serviceId}')" title="Editar"><i class="fa-solid fa-pencil"></i></button>
                        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="generateServiceSpots('${r.serviceId}')" title="Generar Spots"><i class="fa-solid fa-calendar-plus"></i></button>
                        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="deleteService('${r.providerId}', '${r.serviceId}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </div>`
                : '<span style="color: var(--text-secondary); font-size: 0.85rem;">Sin servicios</span>';
            return `<tr>
                <td><strong>${r.providerName}</strong></td>
                <td>${r.serviceName}</td>
                <td>${r.price > 0 ? '$' + r.price.toLocaleString("es-CL") : '-'}</td>
                <td>${r.duration > 0 ? r.duration + ' min' : '-'}</td>
                <td>${r.type !== '-' ? '<em>' + r.type + '</em>' : '-'}</td>
                <td>${rescheduleInfo}</td>
                <td>${actions}</td>
            </tr>`;
        }).join('');
    }

    if (paginationEl) {
        const showing = total === 0 ? 0 : start + 1;
        const showingEnd = Math.min(start + PROVIDERS_SERVICES_PER_PAGE, total);
        paginationEl.innerHTML = `
            <span style="font-size: 0.85rem; color: var(--text-secondary);">Mostrando ${showing}-${showingEnd} de ${total}</span>
            <div style="display: flex; gap: 6px;">
                <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.85rem;" onclick="paginateProvidersServicesTable(1)" ${providersServicesPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-angles-left"></i></button>
                <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.85rem;" onclick="paginateProvidersServicesTable(${providersServicesPage - 1})" ${providersServicesPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-angle-left"></i></button>
                <span style="padding: 4px 10px; font-size: 0.85rem; color: var(--text-secondary);">Página ${providersServicesPage} de ${totalPages}</span>
                <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.85rem;" onclick="paginateProvidersServicesTable(${providersServicesPage + 1})" ${providersServicesPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-angle-right"></i></button>
                <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.85rem;" onclick="paginateProvidersServicesTable(${totalPages})" ${providersServicesPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-angles-right"></i></button>
            </div>
        `;
    }
}

function sortProvidersServicesTable(key) {
    if (providersServicesSort.key === key) {
        providersServicesSort.dir = providersServicesSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        providersServicesSort.key = key;
        providersServicesSort.dir = 'asc';
    }
    providersServicesPage = 1;
    renderProvidersServicesTable();
}

function paginateProvidersServicesTable(page) {
    providersServicesPage = page;
    renderProvidersServicesTable();
}

function getFilteredProvidersServices() {
    const searchInput = document.getElementById("adm-services-search");
    const query = searchInput ? stripAccents(searchInput.value.toLowerCase().trim()) : '';
    let rows = getFlatProvidersServices();
    if (query) {
        rows = rows.filter(r =>
            stripAccents(r.providerName.toLowerCase()).includes(query) ||
            stripAccents(r.serviceName.toLowerCase()).includes(query) ||
            stripAccents(r.type.toLowerCase()).includes(query)
        );
    }
    const { key, dir } = providersServicesSort;
    rows.sort((a, b) => {
        let va = a[key], vb = b[key];
        if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
    });
    return rows;
}

function exportProvidersServicesExcel() {
    const rows = getFilteredProvidersServices();
    if (rows.length === 0) {
        showToast("No hay datos para exportar.", "error");
        return;
    }

    const headers = ['Prestador', 'Servicio', 'Precio', 'Duración (min)', 'Tipo', 'Reagendable', 'Máx. Reagendamientos'];
    const csvRows = [headers.join(';')];

    rows.forEach(r => {
        const reschedule = r.allowReschedule === 0 ? 'No' : `Sí (${r.maxReschedules})`;
        const price = r.price > 0 ? r.price : '';
        const duration = r.duration > 0 ? r.duration : '';
        const line = [
            `"${r.providerName}"`,
            `"${r.serviceName}"`,
            price,
            duration,
            `"${r.type}"`,
            reschedule,
            r.maxReschedules || ''
        ].join(';');
        csvRows.push(line);
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prestadores_servicios_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exportadas ${rows.length} filas.`, "success");
}

async function addService(e) {
    e.preventDefault();
    const provId = document.getElementById("adm-serv-provider").value;
    const name = document.getElementById("adm-serv-name").value;
    const price = Number(document.getElementById("adm-serv-price").value);
    const duration = Number(document.getElementById("adm-serv-duration").value);
    const roomId = document.getElementById("adm-serv-room").value || null;
    const serviceType = roomId ? (state.rooms.find(r => r.id === roomId)?.type || 'Presencial') : 'Virtual';
    const recurrence = document.querySelector('input[name="adm-serv-recurrence"]:checked').value;
    const singleDate = recurrence === 'single' ? document.getElementById("adm-serv-single-date").value : null;
    const recurrenceDay = recurrence === 'weekly' ? Number(document.getElementById("adm-serv-recurrence-day").value) : null;
    const recurrenceStartTime = recurrence === 'weekly' ? document.getElementById("adm-serv-recurrence-start").value : null;
    const recurrenceEndTime = recurrence === 'weekly' ? document.getElementById("adm-serv-recurrence-end").value : null;
    const recurrenceStartDate = recurrence === 'weekly' ? document.getElementById("adm-serv-recurrence-start-date").value : singleDate;
    const recurrenceEndDate = recurrence === 'weekly' ? document.getElementById("adm-serv-recurrence-end-date").value || null : singleDate;
    const allowReschedule = document.getElementById("adm-serv-allow-reschedule").checked;
    const maxReschedules = Number(document.getElementById("adm-serv-max-reschedules").value) || 1;
    
    try {
        const res = await fetch('/api/services', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                id: "serv-" + Date.now(), providerId: provId, name, price, duration, 
                type: serviceType, roomId, recurrence, recurrenceDay,
                recurrenceStartTime, recurrenceEndTime, recurrenceStartDate, recurrenceEndDate,
                allowReschedule, maxReschedules 
            })
        });
        const result = await res.json();
        if (res.ok) {
            showToast(result.message || "Servicio asignado correctamente.", "success");
            document.getElementById("admin-service-form").reset();
            document.getElementById("adm-serv-allow-reschedule").checked = true;
            document.getElementById("adm-serv-max-reschedules").value = "1";
            document.getElementById("adm-serv-max-reschedules-container").style.display = "block";
            document.getElementById("recurrence-config").style.display = "none";
            document.getElementById("single-date-config").style.display = "block";
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
        const res = await fetch(`/api/services/${servId}`, { 
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            showToast("Servicio eliminado.", "success");
            await loadAllData();
            renderDashboardPanes();
            renderServicesSection();
        }
    } catch (e) {
        showToast("Error al eliminar.", "error");
    }
}

// Generate spots for a specific service
async function generateServiceSpots(serviceId) {
    try {
        showToast("Generando spots...", "info");
        const res = await fetch(`/api/services/${serviceId}/generate-spots`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const result = await res.json();
        
        if (res.ok) {
            showToast("Spots generados correctamente.", "success");
            await loadAllData();
            renderDashboardPanes();
        } else {
            showToast(result.error || "Error al generar spots.", "error");
        }
    } catch (e) {
        showToast("Error de conexión.", "error");
    }
}

// Generate spots for ALL services
async function generateAllSpots() {
    try {
        showToast("Generando spots para todos los servicios...", "info");
        const res = await fetch('/api/services/generate-all-spots', {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const result = await res.json();
        
        if (res.ok) {
            showToast(result.message || "Spots generados.", "success");
            await loadAllData();
            renderDashboardPanes();
            renderRoomSchedule();
        } else {
            showToast(result.error || "Error al generar spots.", "error");
        }
    } catch (e) {
        showToast("Error de conexión.", "error");
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
            headers: getAuthHeaders(),
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
            headers: getAuthHeaders(),
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
            headers: getAuthHeaders(),
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

async function saveMaxReschedulesConfig(e) {
    e.preventDefault();
    const payload = {
        max_reschedules: document.getElementById('max-reschedules-input').value
    };
    
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast("Límite de reagendamientos actualizado.", "success");
            await loadAllData();
        }
    } catch (e) {
        showToast("Error de conexión.", "error");
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
        vision: document.getElementById("custom-vision").value,
        objectives: document.getElementById("custom-objectives").value,
        contactEmail: document.getElementById("custom-contact-email").value,
        contactPhone: document.getElementById("custom-contact-phone").value
    };
    
    try {
        const res = await fetch('/api/content', {
            method: 'POST',
            headers: getAuthHeaders(),
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

// ----------------------------------------------------
// ADMIN BOOKINGS MANAGEMENT
// ----------------------------------------------------
function getFilteredAdminBookings() {
    const provFilter = document.getElementById("adm-booking-provider-filter");
    const searchInput = document.getElementById("adm-booking-search");
    
    if (provFilter && provFilter.options.length <= 1) {
        state.providers.forEach(p => {
            provFilter.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    }
    
    const filterProv = provFilter ? provFilter.value : 'all';
    const searchQuery = searchInput ? stripAccents(searchInput.value.toLowerCase().trim()) : '';
    
    let filtered = [...state.bookings];
    if (filterProv !== 'all') {
        filtered = filtered.filter(b => b.providerId === filterProv);
    }
    if (searchQuery) {
        filtered = filtered.filter(b => 
            stripAccents((b.clientName || '').toLowerCase()).includes(searchQuery) ||
            stripAccents((b.clientEmail || '').toLowerCase()).includes(searchQuery) ||
            stripAccents((b.serviceName || '').toLowerCase()).includes(searchQuery) ||
            stripAccents((b.roomName || '').toLowerCase()).includes(searchQuery)
        );
    }
    
    const { key, dir } = adminBookingsSort;
    filtered.sort((a, b) => {
        let va = a[key] || '', vb = b[key] || '';
        if (key === 'providerName') {
            va = state.providers.find(p => p.id === a.providerId)?.name || '';
            vb = state.providers.find(p => p.id === b.providerId)?.name || '';
        }
        if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
    });
    
    return filtered;
}

function renderAdminBookings() {
    const tbody = document.getElementById("admin-bookings-table");
    const paginationEl = document.getElementById("adm-bookings-pagination");
    if (!tbody) return;
    
    const filtered = getFilteredAdminBookings();
    
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / ADMIN_BOOKINGS_PER_PAGE));
    if (adminBookingsPage > totalPages) adminBookingsPage = totalPages;
    const start = (adminBookingsPage - 1) * ADMIN_BOOKINGS_PER_PAGE;
    const pageRows = filtered.slice(start, start + ADMIN_BOOKINGS_PER_PAGE);
    
    if (pageRows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No hay reservas registradas.</td></tr>';
    } else {
        tbody.innerHTML = "";
        pageRows.forEach(bk => {
            const provName = state.providers.find(p => p.id === bk.providerId)?.name || 'Prestador';
            const isCancelled = bk.status === 'Cancelled';
            const statusBadge = isCancelled 
                ? '<span class="badge badge-cancelled">Cancelada</span>' 
                : bk.status === 'Paid' ? '<span class="badge badge-paid">Pagada</span>' : (bk.status === 'Pending_Payment' ? '<span class="badge badge-warning">Procesando Pago</span>' : '<span class="badge badge-pending">Pendiente</span>');
            
            const actionBtns = isCancelled 
                ? `<button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="purgeBooking('${bk.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>`
                : `<button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="cancelBooking('${bk.id}')"><i class="fa-solid fa-ban"></i></button>`;
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${bk.date}</strong><br>${bk.timeSlot}</td>
                    <td>${bk.clientName}<br><small>${bk.clientEmail}</small></td>
                    <td>${provName}</td>
                    <td>${bk.serviceName}</td>
                    <td>${bk.roomName}</td>
                    <td>${statusBadge}</td>
                    <td>${actionBtns}</td>
                </tr>
            `;
        });
    }
    
    if (paginationEl) {
        const showing = total === 0 ? 0 : start + 1;
        const showingEnd = Math.min(start + ADMIN_BOOKINGS_PER_PAGE, total);
        paginationEl.innerHTML = `
            <span style="font-size: 0.85rem; color: var(--text-secondary);">Mostrando ${showing}-${showingEnd} de ${total}</span>
            <div style="display: flex; gap: 6px;">
                <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.85rem;" onclick="paginateAdminBookingsTable(1)" ${adminBookingsPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-angles-left"></i></button>
                <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.85rem;" onclick="paginateAdminBookingsTable(${adminBookingsPage - 1})" ${adminBookingsPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-angle-left"></i></button>
                <span style="padding: 4px 10px; font-size: 0.85rem; color: var(--text-secondary);">Página ${adminBookingsPage} de ${totalPages}</span>
                <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.85rem;" onclick="paginateAdminBookingsTable(${adminBookingsPage + 1})" ${adminBookingsPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-angle-right"></i></button>
                <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.85rem;" onclick="paginateAdminBookingsTable(${totalPages})" ${adminBookingsPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-angles-right"></i></button>
            </div>
        `;
    }
}

function sortAdminBookingsTable(key) {
    if (adminBookingsSort.key === key) {
        adminBookingsSort.dir = adminBookingsSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        adminBookingsSort.key = key;
        adminBookingsSort.dir = 'asc';
    }
    adminBookingsPage = 1;
    renderAdminBookings();
}

function paginateAdminBookingsTable(page) {
    adminBookingsPage = page;
    renderAdminBookings();
}

function exportAdminBookingsExcel() {
    const rows = getFilteredAdminBookings();
    if (rows.length === 0) {
        showToast("No hay datos para exportar.", "error");
        return;
    }

    const statusMap = { 'Cancelled': 'Cancelada', 'Paid': 'Pagada', 'Pending_Payment': 'Procesando Pago' };
    const headers = ['Fecha', 'Hora', 'Cliente', 'Email', 'Prestador', 'Servicio', 'Sala', 'Estado'];
    const csvRows = [headers.join(';')];

    rows.forEach(bk => {
        const provName = state.providers.find(p => p.id === bk.providerId)?.name || '';
        const status = statusMap[bk.status] || 'Pendiente';
        const line = [
            `"${bk.date || ''}"`,
            `"${bk.timeSlot || ''}"`,
            `"${bk.clientName || ''}"`,
            `"${bk.clientEmail || ''}"`,
            `"${provName}"`,
            `"${bk.serviceName || ''}"`,
            `"${bk.roomName || ''}"`,
            `"${status}"`
        ].join(';');
        csvRows.push(line);
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exportadas ${rows.length} reservas.`, "success");
}

async function purgeBooking(id) {
    if (confirm("¿Estás seguro de eliminar esta reserva permanentemente? Esta acción no se puede deshacer.")) {
        try {
            const res = await fetch(`/api/bookings/${id}/purge`, { method: 'DELETE' });
            if (res.ok) {
                showToast("Reserva eliminada permanentemente.", "success");
                await loadAllData();
                renderAdminBookings();
            }
        } catch (e) {
            showToast("Error de conexión.", "error");
        }
    }
}

function startAdminBooking() {
    sessionStorage.setItem("admin_booking_mode", "true");
    window.location.href = 'index.html#agendamiento';
}



// ----------------------------------------------------
// SERVICE EDIT MODE
// ----------------------------------------------------
let editingServiceId = null;

function editService(provId, servId) {
    const provider = state.providers.find(p => p.id === provId);
    if (!provider) return;
    const service = provider.services.find(s => s.id === servId);
    if (!service) return;
    
    editingServiceId = servId;
    
    document.getElementById("adm-serv-provider").value = provId;
    document.getElementById("adm-serv-name").value = service.name;
    document.getElementById("adm-serv-price").value = service.price;
    document.getElementById("adm-serv-duration").value = service.duration;
    
    // Set room
    const roomSelect = document.getElementById("adm-serv-room");
    if (roomSelect) roomSelect.value = service.roomId || '';
    
    // Set recurrence
    const recurrence = service.recurrence || 'single';
    const recurrenceRadio = document.querySelector(`input[name="adm-serv-recurrence"][value="${recurrence}"]`);
    if (recurrenceRadio) recurrenceRadio.checked = true;
    
    const singleDateConfig = document.getElementById("single-date-config");
    const recurrenceConfig = document.getElementById("recurrence-config");
    
    if (singleDateConfig) {
        singleDateConfig.style.display = recurrence === 'single' ? 'block' : 'none';
    }
    if (recurrenceConfig) {
        recurrenceConfig.style.display = recurrence === 'weekly' ? 'block' : 'none';
    }
    
    // Set single date
    const singleDateInput = document.getElementById("adm-serv-single-date");
    if (singleDateInput && recurrence === 'single') {
        singleDateInput.value = service.recurrenceStartDate || '';
    }
    
    if (recurrence === 'weekly') {
        const daySelect = document.getElementById("adm-serv-recurrence-day");
        const startInput = document.getElementById("adm-serv-recurrence-start");
        const endInput = document.getElementById("adm-serv-recurrence-end");
        const startDateInput = document.getElementById("adm-serv-recurrence-start-date");
        const endDateInput = document.getElementById("adm-serv-recurrence-end-date");
        
        if (daySelect) daySelect.value = service.recurrenceDay || 1;
        if (startInput) startInput.value = service.recurrenceStartTime || '09:00';
        if (endInput) endInput.value = service.recurrenceEndTime || '12:00';
        if (startDateInput) startDateInput.value = service.recurrenceStartDate || '';
        if (endDateInput) endDateInput.value = service.recurrenceEndDate || '';
    }
    
    document.getElementById("adm-serv-allow-reschedule").checked = service.allowReschedule !== 0;
    document.getElementById("adm-serv-max-reschedules").value = service.maxReschedules || 1;
    document.getElementById("adm-serv-max-reschedules-container").style.display = service.allowReschedule !== 0 ? "block" : "none";
    
    const submitBtn = document.querySelector("#admin-service-form button[type='submit']");
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Guardar Cambios';
    
    document.getElementById("pane-admin-providers").scrollIntoView({ behavior: 'smooth' });
}

// ----------------------------------------------------
// KHIPU NOTIFICATIONS PANEL RENDERER
// ----------------------------------------------------
function renderAdminKhipuNotifications() {
    const tbody = document.getElementById("admin-khipu-notifications-table");
    const emptyMsg = document.getElementById("admin-khipu-notifications-empty");
    if (!tbody) return;

    const notifs = state.khipuNotifications || [];

    if (notifs.length === 0) {
        tbody.innerHTML = "";
        if (emptyMsg) emptyMsg.style.display = "block";
        return;
    }

    if (emptyMsg) emptyMsg.style.display = "none";
    tbody.innerHTML = "";

    notifs.forEach(notif => {
        let typeBadge;
        let summaryText;

        if (notif.type === "payment_1.3") {
            typeBadge = '<span class="badge badge-paid">Pago (API 1.3)</span>';
            try {
                const bodyObj = JSON.parse(notif.body);
                summaryText = `Token: <code>${bodyObj.notification_token || "N/A"}</code>`;
            } catch (e) {
                summaryText = "Detalles del pago no disponibles";
            }
        } else if (notif.type === "rendition_drn_2.0") {
            typeBadge = '<span class="badge badge-info">Rendición (DRN-2.0)</span>';
            try {
                const bodyObj = JSON.parse(notif.body);
                summaryText = `Reporte ID: <code>${bodyObj.report_id || "N/A"}</code> | Estado: ${bodyObj.status || "N/A"}`;
            } catch (e) {
                summaryText = "Detalles del reporte DRN no disponibles";
            }
        } else if (notif.type === "transaction_dtn_1.0") {
            typeBadge = '<span class="badge badge-pending">Transacciones (DTN-1.0)</span>';
            try {
                const bodyObj = JSON.parse(notif.body);
                summaryText = `Reporte ID: <code>${bodyObj.report_id || "N/A"}</code>`;
            } catch (e) {
                summaryText = "Detalles del reporte DTN no disponibles";
            }
        } else {
            typeBadge = `<span class="badge badge-secondary">${notif.type}</span>`;
            summaryText = "Notificación genérica";
        }

        // Format Date/Time nicely
        const dateObj = new Date(notif.received_at);
        const formattedDate = isNaN(dateObj.getTime()) 
            ? notif.received_at 
            : dateObj.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "medium" });

        // Pretty print JSON structures
        let prettyHeaders;
        let prettyQuery;
        let prettyBody;
        try {
            prettyHeaders = JSON.stringify(JSON.parse(notif.headers || "{}"), null, 2);
        } catch(e) {
            prettyHeaders = String(notif.headers || "{}");
        }
        try {
            prettyQuery = JSON.stringify(JSON.parse(notif.query_params || "{}"), null, 2);
        } catch(e) {
            prettyQuery = String(notif.query_params || "{}");
        }
        try {
            prettyBody = JSON.stringify(JSON.parse(notif.body || "{}"), null, 2);
        } catch(e) {
            prettyBody = String(notif.body || "{}");
        }

        tbody.innerHTML += `
            <tr style="vertical-align: top;">
                <td style="white-space: nowrap;"><strong>${formattedDate}</strong></td>
                <td>${typeBadge}</td>
                <td><code>${notif.ip_address || "N/A"}</code></td>
                <td>
                    <div style="margin-bottom: 8px;">${summaryText}</div>
                    <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="toggleNotifDetails('${notif.id}')">
                        <i class="fa-solid fa-eye"></i> Ver Contenido Completo
                    </button>
                    <div id="notif-details-${notif.id}" style="display: none; margin-top: 10px; text-align: left; background: var(--bg-secondary); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-family: monospace; font-size: 0.85rem; max-width: 650px; overflow-x: auto; white-space: pre-wrap;">
                        <h5 style="margin: 0 0 5px 0; color: var(--color-accent);">Cabeceras (Headers):</h5>
                        <pre style="margin: 0 0 10px 0; background: var(--bg-primary); padding: 8px; border-radius: 4px; border: 1px solid var(--color-border);">${prettyHeaders}</pre>
                        
                        <h5 style="margin: 0 0 5px 0; color: var(--color-accent);">Parámetros Query:</h5>
                        <pre style="margin: 0 0 10px 0; background: var(--bg-primary); padding: 8px; border-radius: 4px; border: 1px solid var(--color-border);">${prettyQuery}</pre>
                        
                        <h5 style="margin: 0 0 5px 0; color: var(--color-accent);">Cuerpo (POST Body):</h5>
                        <pre style="margin: 0; background: var(--bg-primary); padding: 8px; border-radius: 4px; border: 1px solid var(--color-border);">${prettyBody}</pre>
                    </div>
                </td>
            </tr>
        `;
    });
}

function toggleNotifDetails(id) {
    const el = document.getElementById(`notif-details-${id}`);
    if (!el) return;
    if (el.style.display === "none") {
        el.style.display = "block";
    } else {
        el.style.display = "none";
    }
}

// ----------------------------------------------------
// ADMIN PERSONAL PANELS RENDERERS
// ----------------------------------------------------
function renderAdminMyBookings() {
    const tbody = document.getElementById("admin-my-bookings-table");
    const emptyMsg = document.getElementById("admin-my-bookings-empty");
    if (!tbody) return;

    const myBookings = state.bookings.filter(b => b.clientEmail === state.currentUser.email);

    if (myBookings.length === 0) {
        tbody.innerHTML = "";
        if (emptyMsg) emptyMsg.style.display = "block";
        return;
    }

    if (emptyMsg) emptyMsg.style.display = "none";
    tbody.innerHTML = "";

    myBookings.forEach(bk => {
        const provName = state.providers.find(p => p.id === bk.providerId)?.name || 'Prestador';
        const statusBadge = bk.status === 'Paid' 
            ? '<span class="badge badge-paid">Pagada</span>' 
            : bk.status === 'Cancelled' 
                ? '<span class="badge badge-cancelled">Cancelada</span>' 
                : '<span class="badge badge-warning">Pendiente</span>';

        tbody.innerHTML += `
            <tr>
                <td>${bk.date}</td>
                <td>${bk.timeSlot}</td>
                <td>${bk.serviceName}</td>
                <td>${provName}</td>
                <td>${bk.roomName}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });
}

function renderAdminMyProfile() {
    const nameInput = document.getElementById("adm-profile-name");
    const emailInput = document.getElementById("adm-profile-email");
    const roleInput = document.getElementById("adm-profile-role");
    
    if (nameInput) nameInput.value = state.currentUser.name || '';
    if (emailInput) emailInput.value = state.currentUser.email || '';
    if (roleInput) roleInput.value = state.currentUser.role || '';
}

async function saveAdminProfile(e) {
    e.preventDefault();
    const name = document.getElementById("adm-profile-name").value;
    const email = document.getElementById("adm-profile-email").value;
    
    try {
        const res = await fetch(`/api/users/${state.currentUser.id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, email, role: state.currentUser.role })
        });
        if (res.ok) {
            state.currentUser.name = name;
            state.currentUser.email = email;
            sessionStorage.setItem("psicarte_user", JSON.stringify(state.currentUser));
            showToast("Perfil actualizado correctamente.", "success");
            updateAuthUI();
        } else {
            const data = await res.json();
            showToast(data.error || "Error al actualizar perfil.", "error");
        }
    } catch (e) {
        showToast("Error de conexión.", "error");
    }
}

// ----------------------------------------------------
// ADMIN USERS MANAGEMENT
// ----------------------------------------------------
let editingUserId = null;

function toggleAdminUserFields() {
    const role = document.getElementById("adm-user-role").value;
    const fields = document.getElementById("adm-user-client-fields");
    const rutInput = document.getElementById("adm-user-rut");
    const phoneInput = document.getElementById("adm-user-phone");
    
    if (fields) {
        if (role === 'usuario') {
            fields.style.display = 'block';
            if (rutInput) rutInput.required = true;
            if (phoneInput) phoneInput.required = true;
        } else {
            fields.style.display = 'none';
            if (rutInput) { rutInput.required = false; rutInput.value = ''; }
            if (phoneInput) { phoneInput.required = false; phoneInput.value = ''; }
        }
    }
}

async function renderAdminUsers() {
    const tbody = document.getElementById("admin-users-table");
    const countEl = document.getElementById("admin-users-count");
    if (!tbody) return;

    const users = await getUsers();
    const searchInput = document.getElementById("adm-user-search");
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';

    let filtered = [...users];
    if (searchQuery) {
        filtered = filtered.filter(u => 
            (u.name && u.name.toLowerCase().includes(searchQuery)) ||
            (u.email && u.email.toLowerCase().includes(searchQuery))
        );
    }

    if (countEl) countEl.textContent = `${filtered.length} usuario(s)/cliente(s) registrado(s)`;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No hay usuarios registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = "";
    filtered.forEach(u => {
        const createdDate = u.created_at ? new Date(u.created_at).toLocaleDateString('es-CL') : '-';
        const roleBadge = u.role === 'administrador' 
            ? '<span class="badge badge-paid">administrador</span>' 
            : u.role === 'prestador'
                ? '<span class="badge badge-info">prestador</span>'
                : '<span class="badge badge-success">cliente</span>';
                
        tbody.innerHTML += `
            <tr>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${roleBadge}</td>
                <td>${u.rut || '-'}</td>
                <td>${u.phone || '-'}</td>
                <td>${createdDate}</td>
                <td class="action-btns">
                    <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="editAdminUser('${u.id}')"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="deleteAdminUser('${u.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function editAdminUser(id) {
    getUsers().then(users => {
        const user = users.find(u => u.id === id);
        if (!user) return;
        
        editingUserId = id;
        document.getElementById("adm-user-editing-id").value = id;
        document.getElementById("adm-user-name").value = user.name || '';
        document.getElementById("adm-user-email").value = user.email || '';
        document.getElementById("adm-user-role").value = user.role || 'usuario';
        document.getElementById("adm-user-password").value = '';
        
        const rutInput = document.getElementById("adm-user-rut");
        const phoneInput = document.getElementById("adm-user-phone");
        if (rutInput) rutInput.value = user.rut || '';
        if (phoneInput) phoneInput.value = user.phone || '';
        
        document.getElementById("admin-user-form-title").innerText = "Editar Usuario";
        toggleAdminUserFields();
    });
}

function resetAdminUserForm() {
    document.getElementById("admin-user-form").reset();
    editingUserId = null;
    document.getElementById("adm-user-editing-id").value = "";
    document.getElementById("admin-user-form-title").innerText = "Añadir Usuario";
    toggleAdminUserFields();
}

async function saveAdminUser(e) {
    e.preventDefault();
    const editingId = document.getElementById("adm-user-editing-id").value;
    const name = document.getElementById("adm-user-name").value;
    const email = document.getElementById("adm-user-email").value;
    const role = document.getElementById("adm-user-role").value;
    const password = document.getElementById("adm-user-password").value;
    
    const rut = document.getElementById("adm-user-rut") ? document.getElementById("adm-user-rut").value : '';
    const phone = document.getElementById("adm-user-phone") ? document.getElementById("adm-user-phone").value : '';

    try {
        if (editingId) {
            const payload = { name, email, role, rut, phone };
            if (password) payload.password = password;
            await updateUser(editingId, payload);
            showToast("Usuario actualizado correctamente.", "success");
        } else {
            if (!password) {
                showToast("La contraseña es obligatoria para nuevos usuarios.", "error");
                return;
            }
            await createUser({ name, email, role, password, rut, phone });
            showToast("Usuario creado correctamente.", "success");
        }
        await loadAllData();
        resetAdminUserForm();
        await renderAdminUsers();
    } catch (e) {
        // Error already shown by API functions
    }
}

async function deleteAdminUser(id) {
    if (confirm("¿Estás seguro de eliminar este usuario permanentemente?")) {
        try {
            await deleteUser(id);
            showToast("Usuario eliminado correctamente.", "success");
            await renderAdminUsers();
        } catch (e) {
            // Error already shown by API function
        }
    }
}

// ----------------------------------------------------
// ADMIN CONFIG RAW MANAGEMENT
// ----------------------------------------------------
let editingConfigKey = null;

async function renderAdminConfigRaw() {
    const tbody = document.getElementById("admin-config-raw-table");
    if (!tbody) return;

    const config = await getAllConfig();
    const searchInput = document.getElementById("adm-config-search");
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';

    const entries = Object.entries(config);
    const filtered = searchQuery 
        ? entries.filter(([key]) => key.toLowerCase().includes(searchQuery))
        : entries;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">No hay configuraciones registradas.</td></tr>';
        return;
    }

    tbody.innerHTML = "";
    filtered.forEach(([key, value]) => {
        if (editingConfigKey === key) {
            let inputHTML;
            if (key === 'popup_active' || key === 'banner_active' || key === 'whatsapp_enabled') {
                inputHTML = `
                    <select id="inline-config-val-${key}" class="form-control" style="padding: 4px; font-size: 0.9rem; width: 100%;">
                        <option value="true" ${value === 'true' ? 'selected' : ''}>true</option>
                        <option value="false" ${value === 'false' ? 'selected' : ''}>false</option>
                    </select>
                `;
            } else if (key === 'whatsapp_number') {
                inputHTML = `
                    <input type="text" id="inline-config-val-${key}" class="form-control" value="${value}" placeholder="11 dígitos" style="padding: 4px; font-size: 0.9rem; width: 100%;" maxlength="11">
                `;
            } else if (key === 'max_reschedules') {
                inputHTML = `
                    <input type="number" id="inline-config-val-${key}" class="form-control" value="${value}" min="0" step="1" style="padding: 4px; font-size: 0.9rem; width: 100%;">
                `;
            } else {
                inputHTML = `
                    <input type="text" id="inline-config-val-${key}" class="form-control" value="${value.replace(/"/g, '&quot;')}" style="padding: 4px; font-size: 0.9rem; width: 100%;">
                `;
            }

            tbody.innerHTML += `
                <tr>
                    <td><strong>${key}</strong></td>
                    <td>${inputHTML}</td>
                    <td class="action-btns">
                        <button class="btn-primary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="saveInlineConfig('${key.replace(/'/g, "\\'")}')"><i class="fa-solid fa-check"></i></button>
                        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="cancelInlineConfig()"><i class="fa-solid fa-xmark"></i></button>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${key}</strong></td>
                    <td style="max-width: 300px; word-break: break-all;">${value}</td>
                    <td class="action-btns">
                        <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="editAdminConfig('${key.replace(/'/g, "\\'")}')"><i class="fa-solid fa-pencil"></i></button>
                    </td>
                </tr>
            `;
        }
    });
}

function editAdminConfig(key) {
    editingConfigKey = key;
    renderAdminConfigRaw();
}

function cancelInlineConfig() {
    editingConfigKey = null;
    renderAdminConfigRaw();
}

async function saveInlineConfig(key) {
    const inputEl = document.getElementById(`inline-config-val-${key}`);
    if (!inputEl) return;
    
    const val = inputEl.value.trim();
    
    // Validation
    if (key === 'popup_active' || key === 'banner_active' || key === 'whatsapp_enabled') {
        if (val !== 'true' && val !== 'false') {
            showToast("El valor debe ser true o false.", "error");
            return;
        }
    } else if (key === 'whatsapp_number') {
        if (!/^\d{11}$/.test(val)) {
            showToast("El número de WhatsApp debe tener exactamente 11 dígitos enteros positivos.", "error");
            return;
        }
    } else if (key === 'max_reschedules') {
        const intVal = parseInt(val, 10);
        if (isNaN(intVal) || intVal < 0 || String(intVal) !== val) {
            showToast("El límite de reagendamientos debe ser un entero positivo o cero.", "error");
            return;
        }
    }
    
    try {
        await saveConfig({ [key]: val });
        showToast("Configuración guardada correctamente.", "success");
        editingConfigKey = null;
        await loadAllData();
        renderAdminConfigRaw();
        
        // Refresh dependent elements/views
        if (key.startsWith('popup_') || key.startsWith('banner_')) {
            if (typeof checkPopups === 'function') checkPopups();
        }
        if (key.startsWith('whatsapp_')) {
            if (typeof renderWhatsAppButton === 'function') renderWhatsAppButton();
        }
        renderDashboardPanes();
    } catch (e) {
        // Error toast already shown by saveConfig
    }
}

// ----------------------------------------------------
// ROOM SCHEDULE - CALENDARIO DE SALAS
// ----------------------------------------------------
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

const roomScheduleState = {
    view: 'day',
    currentDate: new Date(),
    selectedRoomId: null,
    dualMode: false,
    secondRoomId: null,
    roomScheduleData: { rooms: [], bookings: [], spots: [] }
};

// Drag and Drop state
let draggedBookingData = null;
let moveBookingContext = null;

function toggleRecurrenceConfig() {
    const recurrence = document.querySelector('input[name="adm-serv-recurrence"]:checked').value;
    const singleDateConfig = document.getElementById('single-date-config');
    const recurrenceConfig = document.getElementById('recurrence-config');
    
    if (singleDateConfig) {
        singleDateConfig.style.display = recurrence === 'single' ? 'block' : 'none';
    }
    if (recurrenceConfig) {
        recurrenceConfig.style.display = recurrence === 'weekly' ? 'block' : 'none';
    }
}

function populateRoomSelects() {
    const mainSelect = document.getElementById('room-schedule-select');
    if (mainSelect && state.rooms.length > 0) {
        mainSelect.innerHTML = state.rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        if (!roomScheduleState.selectedRoomId || !state.rooms.find(r => r.id === roomScheduleState.selectedRoomId)) {
            roomScheduleState.selectedRoomId = state.rooms[0].id;
        }
        mainSelect.value = roomScheduleState.selectedRoomId;
    }
    
    // Also populate the service form room select
    const servRoomSelect = document.getElementById('adm-serv-room');
    if (servRoomSelect) {
        servRoomSelect.innerHTML = '<option value="">Cualquier sala disponible</option>' + 
            state.rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    }
}

function setRoomScheduleView(view, btn) {
    roomScheduleState.view = view;
    document.querySelectorAll('#room-schedule-controls-top .view-switcher .btn-secondary').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderRoomSchedule();
}

function changeRoomSchedule() {
    const select = document.getElementById('room-schedule-select');
    if (select) {
        roomScheduleState.selectedRoomId = select.value;
        renderRoomSchedule();
    }
}

function toggleDualMode() {
    const toggle = document.getElementById('dual-mode-toggle');
    roomScheduleState.dualMode = toggle ? toggle.checked : false;
    renderRoomSchedule();
}

function prevRoomSchedule() {
    const d = roomScheduleState.currentDate;
    if (roomScheduleState.view === 'day') {
        roomScheduleState.currentDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    } else if (roomScheduleState.view === 'week') {
        roomScheduleState.currentDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
    } else {
        roomScheduleState.currentDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    }
    renderRoomSchedule();
}

function nextRoomSchedule() {
    const d = roomScheduleState.currentDate;
    if (roomScheduleState.view === 'day') {
        roomScheduleState.currentDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    } else if (roomScheduleState.view === 'week') {
        roomScheduleState.currentDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
    } else {
        roomScheduleState.currentDate = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    renderRoomSchedule();
}

function goToTodayRoomSchedule() {
    roomScheduleState.currentDate = new Date();
    renderRoomSchedule();
}

function getRoomScheduleDateRange() {
    const d = roomScheduleState.currentDate;
    let start, end;
    
    if (roomScheduleState.view === 'day') {
        start = end = formatDate(d);
    } else if (roomScheduleState.view === 'week') {
        const dayOfWeek = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        start = formatDate(monday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        end = formatDate(sunday);
    } else {
        start = formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
        end = formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    }
    
    return { start, end };
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatDateLabel() {
    const d = roomScheduleState.currentDate;
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    if (roomScheduleState.view === 'day') {
        return d.toLocaleDateString('es-CL', options);
    } else if (roomScheduleState.view === 'week') {
        const dayOfWeek = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return `${monday.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else {
        return d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    }
}

async function renderRoomSchedule() {
    populateRoomSelects();
    
    const label = document.getElementById('room-schedule-date-label');
    if (label) label.textContent = formatDateLabel();
    
    const container = document.getElementById('room-schedule-content');
    if (!container) return;
    
    const { start, end } = getRoomScheduleDateRange();
    
    try {
        const res = await fetch(`/api/rooms/schedule/all?start=${start}&end=${end}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Error loading schedule');
        roomScheduleState.roomScheduleData = await res.json();
    } catch (e) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Error al cargar la agenda.</p>';
        return;
    }
    
    if (roomScheduleState.dualMode) {
        renderDualRoomView(container);
    } else {
        renderSingleRoomView(container);
    }
}

function renderSingleRoomView(container) {
    const roomId = roomScheduleState.selectedRoomId;
    const room = state.rooms.find(r => r.id === roomId);
    if (!room) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Selecciona una sala.</p>';
        return;
    }
    
    const html = `
        <div class="room-schedule-single">
            <h4 style="margin-bottom: 10px;"><i class="fa-solid fa-building"></i> ${room.name} <small style="color: var(--text-secondary);">(${room.openTime} - ${room.closeTime})</small></h4>
            <div class="room-schedule-grid" id="room-schedule-grid-main" data-room-id="${roomId}">
                ${renderScheduleGrid(roomId, room)}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    initDragAndDrop();
}

function renderDualRoomView(container) {
    const room1Id = roomScheduleState.selectedRoomId;
    const room2Id = roomScheduleState.secondRoomId || state.rooms.find(r => r.id !== room1Id)?.id || room1Id;
    roomScheduleState.secondRoomId = room2Id;
    
    const room1 = state.rooms.find(r => r.id === room1Id);
    const room2 = state.rooms.find(r => r.id === room2Id);
    
    const html = `
        <div class="dual-room-container">
            <div class="dual-room-panel">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <select id="dual-room-select-1" class="form-control" onchange="changeDualRoom(1, this.value)" style="width: auto;">
                        ${state.rooms.map(r => `<option value="${r.id}" ${r.id === room1Id ? 'selected' : ''}>${r.name}</option>`).join('')}
                    </select>
                    <small style="color: var(--text-secondary);">${room1 ? room1.openTime + ' - ' + room1.closeTime : ''}</small>
                </div>
                <div class="room-schedule-grid" id="dual-grid-1" data-room-id="${room1Id}">
                    ${room1 ? renderScheduleGrid(room1Id, room1) : '<p>Selecciona una sala</p>'}
                </div>
            </div>
            <div class="dual-room-divider"></div>
            <div class="dual-room-panel">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <select id="dual-room-select-2" class="form-control" onchange="changeDualRoom(2, this.value)" style="width: auto;">
                        ${state.rooms.map(r => `<option value="${r.id}" ${r.id === room2Id ? 'selected' : ''}>${r.name}</option>`).join('')}
                    </select>
                    <small style="color: var(--text-secondary);">${room2 ? room2.openTime + ' - ' + room2.closeTime : ''}</small>
                </div>
                <div class="room-schedule-grid" id="dual-grid-2" data-room-id="${room2Id}">
                    ${room2 ? renderScheduleGrid(room2Id, room2) : '<p>Selecciona una sala</p>'}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    initDragAndDrop();
}

function changeDualRoom(panel, roomId) {
    if (panel === 1) {
        roomScheduleState.selectedRoomId = roomId;
    } else {
        roomScheduleState.secondRoomId = roomId;
    }
    renderRoomSchedule();
}

function renderScheduleGrid(roomId, room) {
    const data = roomScheduleState.roomScheduleData;
    const { start, end } = getRoomScheduleDateRange();
    
    // Get dates to render
    let dates = [];
    if (roomScheduleState.view === 'day') {
        dates = [start];
    } else if (roomScheduleState.view === 'week') {
        const current = new Date(start + 'T00:00:00');
        const endDate = new Date(end + 'T00:00:00');
        while (current <= endDate) {
            dates.push(formatDate(current));
            current.setDate(current.getDate() + 1);
        }
    } else {
        // Month view - show all days
        const current = new Date(start + 'T00:00:00');
        const endDate = new Date(end + 'T00:00:00');
        while (current <= endDate) {
            dates.push(formatDate(current));
            current.setDate(current.getDate() + 1);
        }
    }
    
    // Generate time slots from room open to close
    const openMin = timeToMinutes(room.openTime);
    const closeMin = timeToMinutes(room.closeTime);
    const timeSlots = [];
    for (let m = openMin; m < closeMin; m += 30) {
        timeSlots.push(minutesToTime(m));
    }
    
    // Get bookings and spots for this room
    const roomBookings = data.bookings.filter(b => b.roomId === roomId && b.status === 'Paid');
    const roomSpots = data.spots.filter(s => s.roomId === roomId);
    
    // Calculate grid columns: 1 time column + N date columns
    const totalCols = 1 + dates.length;
    const gridTemplate = `70px repeat(${dates.length}, minmax(120px, 1fr))`;
    
    let html = `<div class="schedule-grid-header" style="display: grid; grid-template-columns: ${gridTemplate};"><div class="time-col">Hora</div>`;
    dates.forEach(d => {
        const dateObj = new Date(d + 'T00:00:00');
        const dayName = dateObj.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' });
        html += `<div class="date-col">${dayName}</div>`;
    });
    html += '</div>';
    
    html += `<div class="schedule-grid-body" style="display: grid; grid-template-columns: ${gridTemplate};">`;
    timeSlots.forEach(time => {
        html += `<div class="time-slot">${time}</div>`;
        dates.forEach(date => {
            const cellBookings = roomBookings.filter(b => {
                if (b.date !== date) return false;
                const bStart = timeToMinutes(b.startTime);
                const bSlot = timeToMinutes(time);
                return bStart === bSlot;
            });
            
            const cellSpots = roomSpots.filter(s => {
                if (s.date !== date) return false;
                const sStart = timeToMinutes(s.startTime);
                const sSlot = timeToMinutes(time);
                return sStart === sSlot;
            });
            
            html += `<div class="schedule-cell" data-room-id="${roomId}" data-date="${date}" data-time="${time}" ondragover="handleCellDragOver(event)" ondrop="handleCellDrop(event)">`;
            
            cellBookings.forEach(bk => {
                const duration = bk.duration || bk.serviceDuration || 50;
                const heightSlots = Math.ceil(duration / 30);
                html += `
                    <div class="booking-draggable" 
                         draggable="true" 
                         data-booking-id="${bk.id}"
                         data-room-id="${roomId}"
                         data-date="${date}"
                         data-start-time="${bk.startTime}"
                         data-end-time="${bk.endTime}"
                         data-service="${bk.serviceName}"
                         data-provider="${bk.providerName}"
                         ondragstart="handleBookingDragStart(event)"
                         ondragend="handleBookingDragEnd(event)"
                         style="height: ${heightSlots * 40 - 4}px;">
                        <div class="booking-title">${bk.serviceName}</div>
                        <div class="booking-provider">${bk.providerName}</div>
                        <div class="booking-time">${bk.startTime} - ${bk.endTime}</div>
                    </div>
                `;
            });
            
            cellSpots.forEach(spot => {
                if (spot.status === 'available') {
                    html += `
                        <div class="spot-available" title="Spot disponible: ${spot.startTime} - ${spot.endTime}">
                            <i class="fa-solid fa-plus-circle"></i>
                        </div>
                    `;
                }
            });
            
            html += '</div>';
        });
    });
    html += '</div>';
    
    return html;
}

// ----------------------------------------------------
// DRAG AND DROP FOR BOOKINGS
// ----------------------------------------------------
function initDragAndDrop() {
    // Bookings are already set as draggable via HTML attributes
}

function handleBookingDragStart(e) {
    const el = e.target.closest('.booking-draggable');
    if (!el) return;
    
    draggedBookingData = {
        bookingId: el.dataset.bookingId,
        roomId: el.dataset.roomId,
        date: el.dataset.date,
        startTime: el.dataset.startTime,
        endTime: el.dataset.endTime,
        service: el.dataset.service,
        provider: el.dataset.provider
    };
    
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', el.dataset.bookingId);
}

function handleBookingDragEnd(e) {
    const el = e.target.closest('.booking-draggable');
    if (el) el.classList.remove('dragging');
    draggedBookingData = null;
}

function handleCellDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const cell = e.target.closest('.schedule-cell');
    if (cell) cell.classList.add('drag-over');
}

function handleCellDrop(e) {
    e.preventDefault();
    const cell = e.target.closest('.schedule-cell');
    if (cell) cell.classList.remove('drag-over');
    
    if (!draggedBookingData) return;
    
    const targetRoomId = cell.dataset.roomId;
    const targetDate = cell.dataset.date;
    const targetTime = cell.dataset.time;
    
    // Check if actually moving to a different room or time
    if (draggedBookingData.roomId === targetRoomId && 
        draggedBookingData.date === targetDate && 
        draggedBookingData.startTime === targetTime) {
        return; // No change
    }
    
    // Show move modal
    moveBookingContext = {
        bookingId: draggedBookingData.bookingId,
        newRoomId: targetRoomId,
        newDate: targetDate,
        newStartTime: targetTime,
        originalRoom: draggedBookingData.roomId,
        originalDate: draggedBookingData.date,
        service: draggedBookingData.service,
        provider: draggedBookingData.provider
    };
    
    showMoveBookingModal();
}

function showMoveBookingModal() {
    const modal = document.getElementById('move-booking-modal');
    const infoDiv = document.getElementById('move-booking-info');
    
    if (!modal || !infoDiv || !moveBookingContext) return;
    
    const newRoom = state.rooms.find(r => r.id === moveBookingContext.newRoomId);
    
    infoDiv.innerHTML = `
        <strong>Servicio:</strong> ${moveBookingContext.service}<br>
        <strong>Prestador:</strong> ${moveBookingContext.provider}<br>
        <strong>Desde:</strong> ${moveBookingContext.originalDate} (${moveBookingContext.startTime}) en ${state.rooms.find(r => r.id === moveBookingContext.originalRoom)?.name || 'N/A'}<br>
        <strong>Hasta:</strong> ${moveBookingContext.newDate} (${moveBookingContext.newStartTime}) en ${newRoom?.name || 'N/A'}
    `;
    
    modal.style.display = 'flex';
}

function closeMoveModal() {
    const modal = document.getElementById('move-booking-modal');
    if (modal) modal.style.display = 'none';
    moveBookingContext = null;
}

async function executeMoveBooking(moveAll) {
    if (!moveBookingContext) return;
    
    const { bookingId, newRoomId, newDate, newStartTime } = moveBookingContext;
    
    try {
        const res = await fetch(`/api/bookings/${bookingId}/move`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ newRoomId, newDate, newStartTime, moveAll })
        });
        
        const result = await res.json();
        
        if (res.ok) {
            showToast(result.message || "Reserva movida exitosamente.", "success");
            closeMoveModal();
            await loadAllData();
            renderRoomSchedule();
        } else {
            showToast(result.error || "Error al mover la reserva.", "error");
        }
    } catch (e) {
        showToast("Error de conexión al mover reserva.", "error");
    }
}

