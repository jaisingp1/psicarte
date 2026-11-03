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
            <li><button class="sidebar-btn" onclick="switchDashboardPane('community-articles', this)"><i class="fa-solid fa-newspaper"></i> Noticias y artículos</button></li>
        `;
    } else if (state.currentUser.role === "prestador") {
        menuList.innerHTML = `
            <li><button class="sidebar-btn active" onclick="switchDashboardPane('provider-schedule', this)"><i class="fa-solid fa-clipboard-list"></i> Mi Agenda</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('provider-blocks', this)"><i class="fa-solid fa-calendar-minus"></i> Bloqueos</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('community-articles', this)"><i class="fa-solid fa-newspaper"></i> Noticias y artículos</button></li>
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
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-theme', this)"><i class="fa-solid fa-palette"></i> Personalizar Colores</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-khipu-notifications', this)"><i class="fa-solid fa-bell"></i> Notificaciones Khipu</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-config-raw', this)"><i class="fa-solid fa-gears"></i> Configuración Avanzada</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('community-articles', this)"><i class="fa-solid fa-newspaper"></i> Noticias y artículos</button></li>
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
    if (paneId === 'admin-theme') {
        initAdminThemeManager();
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
                const linkBadge = r.type === 'Virtual' && r.meeting_link
                    ? `<br><small style="color: var(--text-secondary);"><i class="fa-solid fa-video"></i> <a href="${r.meeting_link}" target="_blank" rel="noopener noreferrer">${r.meeting_link}</a></small>`
                    : '';
                roomsList.innerHTML += `
                    <tr>
                        <td><strong>${r.name}</strong>${linkBadge}</td>
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
    const meetingLinkEl = document.getElementById("room-meeting-link");
    const meetingLink = meetingLinkEl ? meetingLinkEl.value.trim() : "";

    const roomPayload = {
        id: editingRoomId || crypto.randomUUID(),
        name,
        type,
        openTime: open,
        closeTime: close,
        meeting_link: meetingLink
    };

    try {
        const res = await fetch(editingRoomId ? `/api/rooms/${editingRoomId}` : '/api/rooms', {
            method: editingRoomId ? 'PUT' : 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(roomPayload)
        });
        const result = await res.json();
        if (res.ok) {
            showToast(result.message || (editingRoomId ? "Sala editada con éxito." : "Sala creada correctamente."), result.scheduleUpdated === false ? "info" : "success");
            editingRoomId = null;
            document.getElementById("admin-room-form").reset();
            await loadAllData();
            renderDashboardPanes();
            updateSlotsView();
        } else {
            showToast(result.error || "No fue posible guardar la sala.", "error");
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
        const meetingLinkEl = document.getElementById("room-meeting-link");
        if (meetingLinkEl) meetingLinkEl.value = room.meeting_link || "";
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

function collectServiceAgendaConfig() {
    const recurrence = document.querySelector('input[name="adm-serv-recurrence"]:checked').value;
    const selectedRoomId = document.getElementById("adm-serv-room").value;
    const roomIds = selectedRoomId ? [selectedRoomId] : [];
    if (!roomIds.length) throw new Error('Configura al menos una sala antes de crear la agenda.');

    if (recurrence === 'single') {
        const specificDate = document.getElementById("adm-serv-single-date").value;
        const startTime = document.getElementById("adm-serv-single-start").value;
        const endTime = document.getElementById("adm-serv-single-end").value;
        if (!specificDate || !startTime || !endTime || startTime >= endTime) {
            throw new Error('Indica una fecha y un rango horario válido para el servicio.');
        }
        return { recurrence, roomIds, specificDate, startTime, endTime };
    }

    const days = [...document.querySelectorAll('.agenda-weekday-check:checked')]
        .map(input => Number(input.value));
    const startDate = document.getElementById("adm-serv-recurrence-start-date").value;
    const endDate = document.getElementById("adm-serv-recurrence-end-date").value || null;
    if (!days.length || !startDate || (endDate && endDate < startDate)) {
        throw new Error('Selecciona al menos un día y un rango de fechas válido para la recurrencia.');
    }

    const timeRanges = {};
    for (const day of days) {
        const container = document.querySelector(`.agenda-time-ranges[data-day="${day}"]`);
        const ranges = [...container.querySelectorAll('.agenda-time-range')].map(row => ({
            start: row.querySelector('.agenda-range-start').value,
            end: row.querySelector('.agenda-range-end').value
        })).sort((a, b) => a.start.localeCompare(b.start));
        if (!ranges.length || ranges.some(range => !range.start || !range.end || range.start >= range.end)) {
            throw new Error('Revisa los intervalos horarios de cada día seleccionado.');
        }
        for (let index = 1; index < ranges.length; index += 1) {
            if (ranges[index].start < ranges[index - 1].end) {
                throw new Error('Los intervalos de un mismo día no pueden superponerse.');
            }
        }
        timeRanges[String(day)] = ranges;
    }

    const starts = Object.values(timeRanges).flat().map(range => range.start).sort();
    const ends = Object.values(timeRanges).flat().map(range => range.end).sort();
    return {
        recurrence,
        roomIds,
        startDate,
        endDate,
        startTime: starts[0],
        endTime: ends[ends.length - 1],
        recurrenceRule: JSON.stringify({
            freq: 'WEEKLY',
            interval: 1,
            byweekday: days,
            dtstart: startDate,
            time_ranges: timeRanges
        })
    };
}

async function createServiceAgendas(serviceId, providerId, agendaConfig) {
    let spotsGenerated = 0;
    for (const roomId of agendaConfig.roomIds) {
        const associationResponse = await fetch(`/api/services/${serviceId}/rooms`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ room_id: roomId })
        });
        const associationResult = await associationResponse.json();
        if (!associationResponse.ok) {
            throw new Error(associationResult.error || 'No se pudo asociar la sala al servicio.');
        }

        const agendaPayload = {
            provider_id: providerId,
            service_id: serviceId,
            room_id: roomId,
            type: agendaConfig.recurrence === 'weekly' ? 'recurrent' : 'punctual',
            recurrence_rule: agendaConfig.recurrenceRule || null,
            specific_date: agendaConfig.specificDate || null,
            start_time: agendaConfig.startTime,
            end_time: agendaConfig.endTime,
            start_date: agendaConfig.startDate || null,
            end_date: agendaConfig.endDate || null
        };
        const agendaResponse = await fetch('/api/agendas', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(agendaPayload)
        });
        const agendaResult = await agendaResponse.json();
        if (!agendaResponse.ok) {
            throw new Error(agendaResult.error || 'No se pudo crear la agenda.');
        }
        if (agendaResult.errors?.length) throw new Error(agendaResult.errors.join(' '));

        const publishResponse = await fetch(`/api/agendas/${agendaResult.id}/publish`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const publishResult = await publishResponse.json();
        if (!publishResponse.ok) {
            throw new Error(publishResult.error || 'La agenda se creó, pero no se pudo publicar.');
        }
        spotsGenerated += publishResult.spotsGenerated || 0;
    }
    return spotsGenerated;
}

function resetAgendaTimeRanges() {
    document.querySelectorAll('.agenda-time-ranges').forEach(container => {
        const rows = [...container.querySelectorAll('.agenda-time-range')];
        rows.slice(1).forEach(row => row.remove());
    });
}

function addAgendaTimeRange(day) {
    const container = document.querySelector(`.agenda-time-ranges[data-day="${day}"]`);
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'agenda-time-range';
    row.innerHTML = `
        <label>Desde <input type="time" class="agenda-range-start" value="14:00"></label>
        <label>Hasta <input type="time" class="agenda-range-end" value="18:00"></label>
        <button type="button" class="btn-secondary agenda-remove-range">Quitar</button>
    `;
    row.querySelector('.agenda-remove-range').addEventListener('click', () => row.remove());
    container.appendChild(row);
}

function setServiceScheduleEditable(isEditable) {
    const roomSelect = document.getElementById('adm-serv-room');
    if (roomSelect) {
        roomSelect.disabled = !isEditable;
        roomSelect.required = isEditable;
    }
    document.querySelectorAll(
        'input[name="adm-serv-recurrence"], #single-date-config input, #recurrence-config input, #recurrence-config button'
    ).forEach(input => { input.disabled = !isEditable; });
    const note = document.getElementById('service-schedule-locked-note');
    if (note) note.hidden = isEditable;
}

async function addService(e) {
    e.preventDefault();
    const provId = document.getElementById("adm-serv-provider").value;
    const name = document.getElementById("adm-serv-name").value;
    const price = Number(document.getElementById("adm-serv-price").value);
    const duration = Number(document.getElementById("adm-serv-duration").value);
    const roomId = document.getElementById("adm-serv-room").value || null;
    const serviceType = roomId ? (state.rooms.find(r => r.id === roomId)?.type || 'Presencial') : 'Virtual';
    const allowReschedule = document.getElementById("adm-serv-allow-reschedule").checked;
    const maxReschedules = Number(document.getElementById("adm-serv-max-reschedules").value) || 1;
    let agendaConfig;
    try {
        agendaConfig = collectServiceAgendaConfig();
    } catch (error) {
        showToast(error.message, "error");
        return;
    }
    const serviceId = crypto.randomUUID();

    try {
        const res = await fetch('/api/services', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                id: serviceId, providerId: provId, name, price, duration,
                type: serviceType,
                allowReschedule, maxReschedules
            })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "No se pudo guardar el servicio.");
        const spotsGenerated = await createServiceAgendas(serviceId, provId, agendaConfig);
        showToast(`Servicio y agenda publicados. Horarios disponibles generados: ${spotsGenerated}.`, "success");
        document.getElementById("admin-service-form").reset();
        setServiceScheduleEditable(true);
        resetAgendaTimeRanges();
        document.getElementById("adm-serv-allow-reschedule").checked = true;
        document.getElementById("adm-serv-max-reschedules").value = "1";
        document.getElementById("adm-serv-max-reschedules-container").style.display = "block";
        document.getElementById("recurrence-config").style.display = "none";
        document.getElementById("single-date-config").style.display = "block";
        await loadAllData();
        renderDashboardPanes();
        renderServicesSection();
    } catch (e) {
        showToast(`El servicio puede haberse guardado, pero la agenda no se completó: ${e.message}`, "error");
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
            const message = `Agendas procesadas: ${result.agendasProcessed}. Horarios generados: ${result.spotsGenerated}. Conflictos: ${result.conflicts}.`;
            showToast(result.errors?.length ? `${message} ${result.errors.join(' ')}` : message, result.errors?.length ? "info" : "success");
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
            const message = `Agendas procesadas: ${result.agendasProcessed}. Horarios generados: ${result.spotsGenerated}. Conflictos: ${result.conflicts}.`;
            showToast(result.errors?.length ? `${message} ${result.errors.join(' ')}` : message, result.errors?.length ? "info" : "success");
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
        contactPhone: document.getElementById("custom-contact-phone").value,
        contactAddress: document.getElementById("custom-contact-address").value
    };
    const instagramInput = document.getElementById("custom-instagram-url");
    const instagramUrl = instagramInput ? instagramInput.value.trim() : "";

    try {
        const requests = [
            fetch('/api/content', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            })
        ];
        if (instagramInput) {
            requests.push(
                fetch('/api/config', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ instagram_url: instagramUrl })
                })
            );
        }
        const responses = await Promise.all(requests);
        if (responses.every(r => r.ok)) {
            showToast("Contenidos de la página actualizados y publicados.", "success");
            await loadAllData();
            renderContent();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            showToast("Error al guardar algunos campos de contenido.", "error");
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

async function editService(provId, servId) {
    const provider = state.providers.find(p => p.id === provId);
    if (!provider) return;
    const service = provider.services.find(s => s.id === servId);
    if (!service) return;

    editingServiceId = servId;

    document.getElementById("adm-serv-provider").value = provId;
    document.getElementById("adm-serv-name").value = service.name;
    document.getElementById("adm-serv-price").value = service.price;
    document.getElementById("adm-serv-duration").value = service.duration;

    setServiceScheduleEditable(true);
    resetAgendaTimeRanges();
    document.querySelectorAll('.agenda-weekday-check').forEach(input => { input.checked = false; });

    const roomSelect = document.getElementById("adm-serv-room");
    let matchedRoomId = service.roomId || '';

    try {
        const agendasRes = await fetch(`/api/agendas?service_id=${encodeURIComponent(servId)}`, {
            headers: getAuthHeaders()
        });
        const agendas = agendasRes.ok ? await agendasRes.json() : [];
        const primaryAgenda = agendas[0] || null;

        if (primaryAgenda && primaryAgenda.room_id) {
            matchedRoomId = primaryAgenda.room_id;
        }
        if (roomSelect) {
            roomSelect.value = matchedRoomId;
        }

        const singleDateConfig = document.getElementById("single-date-config");
        const recurrenceConfig = document.getElementById("recurrence-config");

        if (primaryAgenda && primaryAgenda.type === 'recurrent') {
            const weeklyRadio = document.querySelector('input[name="adm-serv-recurrence"][value="weekly"]');
            if (weeklyRadio) weeklyRadio.checked = true;
            if (singleDateConfig) singleDateConfig.style.display = 'none';
            if (recurrenceConfig) recurrenceConfig.style.display = 'block';

            let rule = {};
            try {
                rule = primaryAgenda.recurrence_rule ? JSON.parse(primaryAgenda.recurrence_rule) : {};
            } catch {
                rule = {};
            }

            const weekdays = Array.isArray(rule.byweekday) ? rule.byweekday.map(Number) : [];
            const timeRangesMap = rule.time_ranges && typeof rule.time_ranges === 'object' ? rule.time_ranges : {};

            weekdays.forEach(day => {
                const check = document.querySelector(`.agenda-weekday-check[value="${day}"]`);
                if (check) check.checked = true;

                const dayRanges = Array.isArray(timeRangesMap[String(day)]) && timeRangesMap[String(day)].length > 0
                    ? timeRangesMap[String(day)]
                    : [{ start: primaryAgenda.start_time || '09:00', end: primaryAgenda.end_time || '13:00' }];

                const container = document.querySelector(`.agenda-time-ranges[data-day="${day}"]`);
                if (container) {
                    while (container.querySelectorAll('.agenda-time-range').length < dayRanges.length) {
                        addAgendaTimeRange(day);
                    }
                    const rows = [...container.querySelectorAll('.agenda-time-range')];
                    dayRanges.forEach((range, idx) => {
                        if (rows[idx]) {
                            const startInput = rows[idx].querySelector('.agenda-range-start');
                            const endInput = rows[idx].querySelector('.agenda-range-end');
                            if (startInput) startInput.value = range.start || '09:00';
                            if (endInput) endInput.value = range.end || '13:00';
                        }
                    });
                }
            });

            const startDateInput = document.getElementById("adm-serv-recurrence-start-date");
            const endDateInput = document.getElementById("adm-serv-recurrence-end-date");
            if (startDateInput) startDateInput.value = primaryAgenda.start_date || rule.dtstart || new Date().toISOString().slice(0, 10);
            if (endDateInput) endDateInput.value = primaryAgenda.end_date || '';
        } else {
            const singleRadio = document.querySelector('input[name="adm-serv-recurrence"][value="single"]');
            if (singleRadio) singleRadio.checked = true;
            if (singleDateConfig) singleDateConfig.style.display = 'block';
            if (recurrenceConfig) recurrenceConfig.style.display = 'none';

            if (primaryAgenda) {
                const singleDateInput = document.getElementById("adm-serv-single-date");
                const singleStartInput = document.getElementById("adm-serv-single-start");
                const singleEndInput = document.getElementById("adm-serv-single-end");
                if (singleDateInput) singleDateInput.value = primaryAgenda.specific_date || '';
                if (singleStartInput) singleStartInput.value = primaryAgenda.start_time || '09:00';
                if (singleEndInput) singleEndInput.value = primaryAgenda.end_time || '12:00';
            }
        }
    } catch (e) {
        console.error("Error loading service agendas for edit:", e);
        if (roomSelect) roomSelect.value = matchedRoomId;
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

        if (notif.type === "payment_3.0" || notif.type === "payment_1.3") {
            typeBadge = `<span class="badge badge-paid">${notif.type === "payment_3.0" ? "Pago (API 3.0)" : "Pago (API 1.3)"}</span>`;
            try {
                const bodyObj = JSON.parse(notif.body);
                if (notif.type === "payment_3.0") {
                    const amtStr = bodyObj.amount != null ? '$' + Number(bodyObj.amount).toLocaleString('es-CL') : 'N/A';
                    summaryText = `ID: <code>${bodyObj.payment_id || "N/A"}</code> | Reserva: <code>${bodyObj.transaction_id || "N/A"}</code> | Monto: ${amtStr}`;
                } else {
                    summaryText = `Token: <code>${bodyObj.notification_token || "N/A"}</code>`;
                }
            } catch (e) {
                summaryText = "Detalles del pago no disponibles";
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
        } catch (e) {
            prettyHeaders = String(notif.headers || "{}");
        }
        try {
            prettyQuery = JSON.stringify(JSON.parse(notif.query_params || "{}"), null, 2);
        } catch (e) {
            prettyQuery = String(notif.query_params || "{}");
        }
        try {
            prettyBody = JSON.stringify(JSON.parse(notif.body || "{}"), null, 2);
        } catch (e) {
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
    const providerFields = document.getElementById("adm-user-provider-fields");
    const rutInput = document.getElementById("adm-user-rut");
    const phoneInput = document.getElementById("adm-user-phone");
    const specialtyInput = document.getElementById("adm-user-specialty");
    const bioInput = document.getElementById("adm-user-bio");

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
    if (providerFields) {
        if (role === 'prestador') {
            providerFields.style.display = 'block';
        } else {
            providerFields.style.display = 'none';
            if (specialtyInput) specialtyInput.value = '';
            if (bioInput) bioInput.value = '';
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
        const specialtyInput = document.getElementById("adm-user-specialty");
        const bioInput = document.getElementById("adm-user-bio");
        if (rutInput) rutInput.value = user.rut || '';
        if (phoneInput) phoneInput.value = user.phone || '';

        document.getElementById("admin-user-form-title").innerText = "Editar Usuario";
        toggleAdminUserFields();
        if (user.role === 'prestador') {
            const provider = state.providers.find(p => p.id === user.id);
            if (specialtyInput) specialtyInput.value = user.specialty || provider?.specialty || '';
            if (bioInput) bioInput.value = user.bio || provider?.bio || '';
        }
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
    const specialty = document.getElementById("adm-user-specialty") ? document.getElementById("adm-user-specialty").value.trim() : '';
    const bio = document.getElementById("adm-user-bio") ? document.getElementById("adm-user-bio").value.trim() : '';

    try {
        if (editingId) {
            const payload = { name, email, role, rut, phone, specialty, bio };
            if (password) payload.password = password;
            await updateUser(editingId, payload);
            showToast("Usuario actualizado correctamente.", "success");
        } else {
            if (!password) {
                showToast("La contraseña es obligatoria para nuevos usuarios.", "error");
                return;
            }
            await createUser({ name, email, role, password, rut, phone, specialty, bio });
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
        servRoomSelect.innerHTML = '<option value="">Selecciona una sala</option>' +
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

// ----------------------------------------------------
// ADMIN THEME & CSS COLOR MANAGER (WCAG 2.1 + ISOLATED SANDBOX)
// ----------------------------------------------------
const THEME_COMPONENT_TABS = [
    {
        id: 'general',
        title: 'Fondos y Textos',
        icon: 'fa-layer-group',
        description: 'Colores base del lienzo de la página, textos principales, acentos institucionales y bordes divisorios.',
        properties: [
            {
                varName: '--bg-primary',
                label: 'Fondo Principal de Página',
                description: 'Color de fondo general de todas las vistas del sitio.',
                keywords: 'fondo background lienzo body principal pagina',
                contrastPairs: [
                    { fg: '--text-primary', bg: '--bg-primary', label: 'Texto Principal sobre Fondo Principal', minRatio: 4.5, kind: 'Texto normal' },
                    { fg: '--text-secondary', bg: '--bg-primary', label: 'Texto Secundario sobre Fondo Principal', minRatio: 4.5, kind: 'Texto normal' }
                ]
            },
            {
                varName: '--bg-secondary',
                label: 'Fondo Secundario / Secciones',
                description: 'Color de paneles alternos, barras laterales y bloques destacados.',
                keywords: 'fondo secundario seccion sidebar panel',
                contrastPairs: [
                    { fg: '--text-primary', bg: '--bg-secondary', label: 'Texto Principal sobre Fondo Secundario', minRatio: 4.5, kind: 'Texto normal' },
                    { fg: '--text-secondary', bg: '--bg-secondary', label: 'Texto Secundario sobre Fondo Secundario', minRatio: 4.5, kind: 'Texto normal' }
                ]
            },
            {
                varName: '--text-primary',
                label: 'Texto Principal y Títulos',
                description: 'Color de encabezados (H1-H6) y párrafos principales de lectura.',
                keywords: 'texto letra fuente titulo parrafo',
                contrastPairs: [
                    { fg: '--text-primary', bg: '--bg-primary', label: 'Sobre Fondo Principal', minRatio: 4.5, kind: 'Texto normal' },
                    { fg: '--text-primary', bg: '--bg-secondary', label: 'Sobre Fondo Secundario', minRatio: 4.5, kind: 'Texto normal' }
                ]
            },
            {
                varName: '--text-secondary',
                label: 'Texto Secundario / Subtítulos',
                description: 'Color de descripciones complementarias, etiquetas y metadatos.',
                keywords: 'texto secundario subtitulo descripcion gris',
                contrastPairs: [
                    { fg: '--text-secondary', bg: '--bg-primary', label: 'Sobre Fondo Principal', minRatio: 4.5, kind: 'Texto normal' },
                    { fg: '--text-secondary', bg: '--bg-secondary', label: 'Sobre Fondo Secundario', minRatio: 4.5, kind: 'Texto normal' }
                ]
            },
            {
                varName: '--color-accent',
                label: 'Color de Acento Principal',
                description: 'Color de énfasis para enlaces destacados, íconos activos y detalles de marca.',
                keywords: 'acento marca destacado link icono',
                contrastPairs: [
                    { fg: '--color-accent', bg: '--bg-primary', label: 'Acento sobre Fondo Principal', minRatio: 3.0, kind: 'Elemento destacado / Título' },
                    { fg: '--color-accent-text', bg: '--color-accent', label: 'Texto sobre Fondo de Acento', minRatio: 4.5, kind: 'Texto normal' }
                ]
            },
            {
                varName: '--color-accent-text',
                label: 'Texto sobre Superficies de Acento',
                description: 'Color del texto cuando se muestra encima de un bloque con color de acento.',
                keywords: 'texto acento contraste inverso',
                contrastPairs: [
                    { fg: '--color-accent-text', bg: '--color-accent', label: 'Texto sobre Fondo de Acento', minRatio: 4.5, kind: 'Texto normal' }
                ]
            },
            {
                varName: '--color-border',
                label: 'Bordes y Líneas Divisorias',
                description: 'Líneas separadoras de tablas, contenedores y secciones.',
                keywords: 'borde linea divisor separador',
                contrastPairs: []
            },
            {
                varName: '--color-navy',
                label: 'Azul Institucional (Navy)',
                description: 'Tono institucional profundo empleado en sombras y contrastes de marca.',
                keywords: 'azul navy institucional marca',
                contrastPairs: []
            },
            {
                varName: '--color-gold',
                label: 'Dorado Institucional (Gold)',
                description: 'Tono cálido institucional para íconos destacados y detalles visuales.',
                keywords: 'dorado gold amarillo institucional',
                contrastPairs: [
                    { fg: '--color-gold', bg: '--bg-primary', label: 'Ícono Dorado sobre Fondo Principal', minRatio: 3.0, kind: 'Ícono / Elemento gráfico' }
                ]
            },
            {
                varName: '--color-pomegranate',
                label: 'Granada Institucional (Pomegranate)',
                description: 'Tono granada de identidad PsicArte usado en títulos de misión y avatares.',
                keywords: 'granada pomegranate burdeo vino institucional',
                contrastPairs: [
                    { fg: '--color-pomegranate', bg: '--bg-card', label: 'Título Granada sobre Tarjeta', minRatio: 3.0, kind: 'Título grande / Ícono' }
                ]
            }
        ]
    },
    {
        id: 'navigation',
        title: 'Navegación y Footer',
        icon: 'fa-compass',
        description: 'Barra de navegación superior (Header), enlaces del menú y pie de página (Footer).',
        properties: [
            {
                varName: '--header-bg',
                label: 'Fondo de Barra Superior (Header)',
                description: 'Color base de la cabecera fija superior.',
                keywords: 'header menu navegacion arriba barra fondo',
                contrastPairs: [
                    { fg: '--nav-link-color', bg: '--header-bg', label: 'Enlaces del Menú sobre Header', minRatio: 4.5, kind: 'Texto de menú' }
                ]
            },
            {
                varName: '--header-border',
                label: 'Borde Inferior del Header',
                description: 'Línea divisoria inferior de la barra de navegación.',
                keywords: 'header borde linea',
                contrastPairs: []
            },
            {
                varName: '--nav-link-color',
                label: 'Texto de Enlaces del Menú',
                description: 'Color normal de los enlaces Inicio, Nosotros, Servicios, Comunidad y Agendar.',
                keywords: 'menu link enlace navegacion texto',
                contrastPairs: [
                    { fg: '--nav-link-color', bg: '--header-bg', label: 'Enlace sobre Fondo del Header', minRatio: 4.5, kind: 'Texto de menú' }
                ]
            },
            {
                varName: '--nav-link-accent',
                label: 'Enlace Activo / Hover del Menú',
                description: 'Color al pasar el cursor o indicar la sección activa en el menú.',
                keywords: 'menu hover activo subrayado',
                contrastPairs: [
                    { fg: '--nav-link-accent', bg: '--header-bg', label: 'Enlace Activo sobre Header', minRatio: 3.0, kind: 'Indicador activo' }
                ]
            },
            {
                varName: '--footer-bg',
                label: 'Fondo del Pie de Página (Footer)',
                description: 'Color de fondo del bloque inferior de contacto y enlaces rápidos.',
                keywords: 'footer pie pagina abajo fondo',
                contrastPairs: [
                    { fg: '--footer-text', bg: '--footer-bg', label: 'Texto del Footer sobre Fondo del Footer', minRatio: 4.5, kind: 'Texto normal' },
                    { fg: '--footer-accent', bg: '--footer-bg', label: 'Títulos del Footer sobre Fondo del Footer', minRatio: 3.0, kind: 'Título grande / Ícono' }
                ]
            },
            {
                varName: '--footer-text',
                label: 'Texto del Pie de Página',
                description: 'Color de párrafos, enlaces y derechos reservados en el footer.',
                keywords: 'footer texto letra enlaces',
                contrastPairs: [
                    { fg: '--footer-text', bg: '--footer-bg', label: 'Texto sobre Fondo del Footer', minRatio: 4.5, kind: 'Texto normal' }
                ]
            },
            {
                varName: '--footer-accent',
                label: 'Títulos e Íconos del Footer',
                description: 'Color de los encabezados (Enlaces Rápidos, Contacto) e íconos del pie de página.',
                keywords: 'footer titulo icono dorado acento',
                contrastPairs: [
                    { fg: '--footer-accent', bg: '--footer-bg', label: 'Título/Ícono sobre Fondo del Footer', minRatio: 3.0, kind: 'Título grande / Ícono' }
                ]
            },
            {
                varName: '--footer-border',
                label: 'Línea Divisoria del Footer',
                description: 'Línea que separa el contenido del footer del aviso de copyright.',
                keywords: 'footer borde linea copyright',
                contrastPairs: []
            }
        ]
    },
    {
        id: 'buttons',
        title: 'Botones y Formularios',
        icon: 'fa-hand-pointer',
        description: 'Botones primarios, secundarios, botones de ícono y campos de entrada de formularios (inputs y selects).',
        properties: [
            {
                varName: '--btn-primary-bg',
                label: 'Fondo de Botón Principal',
                description: 'Color de relleno de los botones de acción principal (Reservar, Guardar, Ingresar).',
                keywords: 'boton primario principal fondo accion',
                contrastPairs: [
                    { fg: '--btn-primary-text', bg: '--btn-primary-bg', label: 'Texto sobre Botón Principal', minRatio: 4.5, kind: 'Texto de botón' }
                ]
            },
            {
                varName: '--btn-primary-text',
                label: 'Texto de Botón Principal',
                description: 'Color de la letra e íconos dentro del botón principal.',
                keywords: 'boton primario texto letra',
                contrastPairs: [
                    { fg: '--btn-primary-text', bg: '--btn-primary-bg', label: 'Texto sobre Botón Principal', minRatio: 4.5, kind: 'Texto de botón' }
                ]
            },
            {
                varName: '--btn-secondary-bg',
                label: 'Fondo de Botón Secundario',
                description: 'Color de fondo de botones alternativos (Cancelar, Volver, Exportar).',
                keywords: 'boton secundario alternativo fondo',
                contrastPairs: [
                    { fg: '--btn-secondary-text', bg: '--btn-secondary-bg', label: 'Texto sobre Botón Secundario', minRatio: 4.5, kind: 'Texto de botón' }
                ]
            },
            {
                varName: '--btn-secondary-text',
                label: 'Texto de Botón Secundario',
                description: 'Color del texto en botones secundarios.',
                keywords: 'boton secundario texto letra',
                contrastPairs: [
                    { fg: '--btn-secondary-text', bg: '--btn-secondary-bg', label: 'Texto sobre Botón Secundario', minRatio: 4.5, kind: 'Texto de botón' }
                ]
            },
            {
                varName: '--btn-secondary-border',
                label: 'Borde de Botón Secundario',
                description: 'Color del contorno de los botones secundarios.',
                keywords: 'boton secundario borde contorno',
                contrastPairs: []
            },
            {
                varName: '--btn-icon-bg',
                label: 'Fondo de Botón de Ícono',
                description: 'Fondo del botón circular de cambio de tema (Sol/Luna) y controles de calendario.',
                keywords: 'boton icono circular tema fondo',
                contrastPairs: [
                    { fg: '--btn-icon-text', bg: '--btn-icon-bg', label: 'Ícono sobre Botón Circular', minRatio: 3.0, kind: 'Ícono interactivo' }
                ]
            },
            {
                varName: '--btn-icon-text',
                label: 'Color de Ícono en Botón Circular',
                description: 'Color del símbolo dentro de los botones de ícono.',
                keywords: 'boton icono color simbolo',
                contrastPairs: [
                    { fg: '--btn-icon-text', bg: '--btn-icon-bg', label: 'Ícono sobre Botón Circular', minRatio: 3.0, kind: 'Ícono interactivo' }
                ]
            },
            {
                varName: '--input-bg',
                label: 'Fondo de Campos de Formulario',
                description: 'Color de relleno de cajas de texto (inputs), áreas de texto y listas desplegables.',
                keywords: 'input formulario campo caja select fondo',
                contrastPairs: [
                    { fg: '--input-text', bg: '--input-bg', label: 'Texto escrito sobre Campo de Formulario', minRatio: 4.5, kind: 'Texto de formulario' }
                ]
            },
            {
                varName: '--input-text',
                label: 'Texto de Campos de Formulario',
                description: 'Color del texto que escribe el usuario dentro de los formularios.',
                keywords: 'input formulario texto letra',
                contrastPairs: [
                    { fg: '--input-text', bg: '--input-bg', label: 'Texto escrito sobre Campo de Formulario', minRatio: 4.5, kind: 'Texto de formulario' }
                ]
            },
            {
                varName: '--input-border',
                label: 'Borde Normal de Formulario',
                description: 'Contorno en reposo de los campos de entrada.',
                keywords: 'input formulario borde',
                contrastPairs: []
            },
            {
                varName: '--input-focus-border',
                label: 'Borde Activo (Focus) de Formulario',
                description: 'Color del borde cuando el usuario hace clic o escribe en un campo.',
                keywords: 'input focus activo borde foco',
                contrastPairs: [
                    { fg: '--input-focus-border', bg: '--input-bg', label: 'Borde Focus respecto al Fondo del Campo', minRatio: 3.0, kind: 'Indicador de foco UI' }
                ]
            }
        ]
    },
    {
        id: 'cards',
        title: 'Tarjetas y Servicios',
        icon: 'fa-id-card',
        description: 'Tarjetas de servicios, tarjetas de profesionales, etiquetas de modalidad (Online / Presencial), precios y filtros.',
        properties: [
            {
                varName: '--bg-card',
                label: 'Fondo de Tarjetas (Cards)',
                description: 'Superficie de las tarjetas de servicios, profesionales y paneles blancos.',
                keywords: 'tarjeta card servicio profesional fondo',
                contrastPairs: [
                    { fg: '--text-primary', bg: '--bg-card', label: 'Título sobre Fondo de Tarjeta', minRatio: 4.5, kind: 'Texto normal' },
                    { fg: '--text-secondary', bg: '--bg-card', label: 'Descripción sobre Fondo de Tarjeta', minRatio: 4.5, kind: 'Texto normal' },
                    { fg: '--service-price-color', bg: '--bg-card', label: 'Precio del Servicio sobre Tarjeta', minRatio: 3.0, kind: 'Texto grande (Precio)' }
                ]
            },
            {
                varName: '--card-border',
                label: 'Borde de Tarjetas',
                description: 'Contorno normal de cada tarjeta.',
                keywords: 'tarjeta card borde contorno',
                contrastPairs: []
            },
            {
                varName: '--card-hover-border',
                label: 'Borde de Tarjeta al Pasar el Mouse (Hover)',
                description: 'Color que resalta el borde de una tarjeta cuando el usuario pasa el cursor.',
                keywords: 'tarjeta card hover borde',
                contrastPairs: []
            },
            {
                varName: '--service-price-color',
                label: 'Color del Precio de Servicios',
                description: 'Color numérico del valor en pesos ($) en el catálogo de servicios.',
                keywords: 'precio valor costo servicio tarjeta',
                contrastPairs: [
                    { fg: '--service-price-color', bg: '--bg-card', label: 'Precio sobre Fondo de Tarjeta', minRatio: 3.0, kind: 'Texto grande (Precio 1.5rem)' }
                ]
            },
            {
                varName: '--color-online',
                label: 'Fondo de Etiqueta Modalidad Online',
                description: 'Color de la insignia para consultas virtuales / telemedicina.',
                keywords: 'badge etiqueta online virtual fondo',
                contrastPairs: [
                    { fg: '--color-online-text', bg: '--color-online', label: 'Texto sobre Etiqueta Online', minRatio: 4.5, kind: 'Etiqueta pequeña' }
                ]
            },
            {
                varName: '--color-online-text',
                label: 'Texto de Etiqueta Modalidad Online',
                description: 'Color de la letra en la insignia de atención virtual.',
                keywords: 'badge etiqueta online virtual texto',
                contrastPairs: [
                    { fg: '--color-online-text', bg: '--color-online', label: 'Texto sobre Etiqueta Online', minRatio: 4.5, kind: 'Etiqueta pequeña' }
                ]
            },
            {
                varName: '--color-in-person',
                label: 'Fondo de Etiqueta Modalidad Presencial',
                description: 'Color de la insignia para consultas físicas en el centro.',
                keywords: 'badge etiqueta presencial fisica fondo',
                contrastPairs: [
                    { fg: '--color-in-person-text', bg: '--color-in-person', label: 'Texto sobre Etiqueta Presencial', minRatio: 4.5, kind: 'Etiqueta pequeña' }
                ]
            },
            {
                varName: '--color-in-person-text',
                label: 'Texto de Etiqueta Modalidad Presencial',
                description: 'Color de la letra en la insignia de atención presencial.',
                keywords: 'badge etiqueta presencial fisica texto',
                contrastPairs: [
                    { fg: '--color-in-person-text', bg: '--color-in-person', label: 'Texto sobre Etiqueta Presencial', minRatio: 4.5, kind: 'Etiqueta pequeña' }
                ]
            },
            {
                varName: '--filter-active-bg',
                label: 'Fondo de Filtro Activo',
                description: 'Color del botón de filtro seleccionado en el catálogo de servicios.',
                keywords: 'filtro pill activo seleccionado fondo',
                contrastPairs: [
                    { fg: '--filter-active-text', bg: '--filter-active-bg', label: 'Texto sobre Filtro Activo', minRatio: 4.5, kind: 'Texto de filtro' }
                ]
            },
            {
                varName: '--filter-active-text',
                label: 'Texto de Filtro Activo',
                description: 'Color de la letra dentro del filtro activo.',
                keywords: 'filtro pill activo texto',
                contrastPairs: [
                    { fg: '--filter-active-text', bg: '--filter-active-bg', label: 'Texto sobre Filtro Activo', minRatio: 4.5, kind: 'Texto de filtro' }
                ]
            }
        ]
    },
    {
        id: 'modals',
        title: 'Modales, Pop-ups y Banners',
        icon: 'fa-window-restore',
        description: 'Ventanas emergentes (modales), pop-ups de avisos en inicio y cintillo informativo superior.',
        properties: [
            {
                varName: '--modal-bg',
                label: 'Fondo de Ventanas Modales y Pop-ups',
                description: 'Superficie interior de las ventanas de diálogo, términos y avisos.',
                keywords: 'modal ventana dialogo popup fondo',
                contrastPairs: [
                    { fg: '--modal-text', bg: '--modal-bg', label: 'Texto del Modal sobre Fondo del Modal', minRatio: 4.5, kind: 'Texto normal' },
                    { fg: '--popup-title-color', bg: '--modal-bg', label: 'Título de Pop-up sobre Fondo del Modal', minRatio: 3.0, kind: 'Título grande' }
                ]
            },
            {
                varName: '--modal-text',
                label: 'Texto de Ventanas Modales',
                description: 'Color del contenido y encabezados dentro de las ventanas modales.',
                keywords: 'modal ventana texto letra',
                contrastPairs: [
                    { fg: '--modal-text', bg: '--modal-bg', label: 'Texto sobre Fondo del Modal', minRatio: 4.5, kind: 'Texto normal' }
                ]
            },
            {
                varName: '--modal-border',
                label: 'Borde de Ventanas Modales',
                description: 'Líneas divisorias de cabecera y pie dentro de los modales.',
                keywords: 'modal borde linea',
                contrastPairs: []
            },
            {
                varName: '--modal-overlay-color',
                label: 'Color Base del Velo Oscuro (Overlay)',
                description: 'Tono base semitransparente que oscurece el fondo detrás de un modal abierto.',
                keywords: 'modal overlay velo sombra fondo detras',
                contrastPairs: []
            },
            {
                varName: '--popup-title-color',
                label: 'Título del Pop-up de Aviso Inicial',
                description: 'Color del encabezado principal en el pop-up informativo de inicio.',
                keywords: 'popup aviso alerta titulo',
                contrastPairs: [
                    { fg: '--popup-title-color', bg: '--modal-bg', label: 'Título de Pop-up sobre Fondo del Modal', minRatio: 3.0, kind: 'Título grande' }
                ]
            },
            {
                varName: '--banner-bg',
                label: 'Fondo del Banner Superior de Anuncios',
                description: 'Color de la franja informativa superior de anuncios importantes.',
                keywords: 'banner cintillo anuncio superior fondo',
                contrastPairs: [
                    { fg: '--banner-text', bg: '--banner-bg', label: 'Texto del Banner sobre Fondo del Banner', minRatio: 4.5, kind: 'Texto de anuncio' }
                ]
            },
            {
                varName: '--banner-text',
                label: 'Texto del Banner Superior de Anuncios',
                description: 'Color de la letra en la franja superior de anuncios.',
                keywords: 'banner cintillo anuncio texto',
                contrastPairs: [
                    { fg: '--banner-text', bg: '--banner-bg', label: 'Texto del Banner sobre Fondo del Banner', minRatio: 4.5, kind: 'Texto de anuncio' }
                ]
            }
        ]
    },
    {
        id: 'booking',
        title: 'Calendario y Agendamiento',
        icon: 'fa-calendar-check',
        description: 'Asistente de reserva de horas, indicadores de pasos, días del calendario y bloques horarios (slots).',
        properties: [
            {
                varName: '--booking-widget-bg',
                label: 'Fondo del Contenedor de Agendamiento',
                description: 'Superficie principal del asistente de reserva de horas.',
                keywords: 'agendamiento reserva widget contenedor fondo',
                contrastPairs: [
                    { fg: '--text-primary', bg: '--booking-widget-bg', label: 'Texto Principal sobre Widget de Reserva', minRatio: 4.5, kind: 'Texto normal' }
                ]
            },
            {
                varName: '--step-active-bg',
                label: 'Fondo de Paso Activo (1, 2, 3)',
                description: 'Color del círculo numerado del paso actual en el agendamiento.',
                keywords: 'paso step indicador activo fondo',
                contrastPairs: [
                    { fg: '--step-active-text', bg: '--step-active-bg', label: 'Número sobre Círculo de Paso Activo', minRatio: 4.5, kind: 'Indicador numérico' }
                ]
            },
            {
                varName: '--step-active-text',
                label: 'Texto de Paso Activo',
                description: 'Color del número dentro del círculo del paso activo.',
                keywords: 'paso step indicador activo texto numero',
                contrastPairs: [
                    { fg: '--step-active-text', bg: '--step-active-bg', label: 'Número sobre Círculo de Paso Activo', minRatio: 4.5, kind: 'Indicador numérico' }
                ]
            },
            {
                varName: '--cal-cell-bg',
                label: 'Fondo de Día Disponible en Calendario',
                description: 'Color de las celdas de días disponibles en el calendario mensual.',
                keywords: 'calendario dia celda disponible fondo',
                contrastPairs: [
                    { fg: '--cal-cell-text', bg: '--cal-cell-bg', label: 'Número de Día sobre Celda del Calendario', minRatio: 4.5, kind: 'Número de calendario' }
                ]
            },
            {
                varName: '--cal-cell-text',
                label: 'Texto de Día Disponible en Calendario',
                description: 'Color del número de día en las celdas disponibles.',
                keywords: 'calendario dia celda texto numero',
                contrastPairs: [
                    { fg: '--cal-cell-text', bg: '--cal-cell-bg', label: 'Número de Día sobre Celda del Calendario', minRatio: 4.5, kind: 'Número de calendario' }
                ]
            },
            {
                varName: '--cal-selected-bg',
                label: 'Fondo de Día Seleccionado en Calendario',
                description: 'Color de relleno cuando el paciente elige una fecha en el calendario.',
                keywords: 'calendario dia seleccionado activo fondo',
                contrastPairs: [
                    { fg: '--cal-selected-text', bg: '--cal-selected-bg', label: 'Número sobre Día Seleccionado', minRatio: 4.5, kind: 'Número seleccionado' }
                ]
            },
            {
                varName: '--cal-selected-text',
                label: 'Texto de Día Seleccionado en Calendario',
                description: 'Color del número en la fecha seleccionada del calendario.',
                keywords: 'calendario dia seleccionado texto',
                contrastPairs: [
                    { fg: '--cal-selected-text', bg: '--cal-selected-bg', label: 'Número sobre Día Seleccionado', minRatio: 4.5, kind: 'Número seleccionado' }
                ]
            },
            {
                varName: '--slot-bg',
                label: 'Fondo de Bloque Horario Disponible (Slot)',
                description: 'Color de los botones de hora disponible (ej. 10:00, 11:00).',
                keywords: 'horario hora slot bloque disponible fondo',
                contrastPairs: [
                    { fg: '--slot-text', bg: '--slot-bg', label: 'Hora sobre Bloque Disponible', minRatio: 4.5, kind: 'Texto de botón horario' }
                ]
            },
            {
                varName: '--slot-text',
                label: 'Texto de Bloque Horario Disponible',
                description: 'Color del texto de la hora en bloques disponibles.',
                keywords: 'horario hora slot texto',
                contrastPairs: [
                    { fg: '--slot-text', bg: '--slot-bg', label: 'Hora sobre Bloque Disponible', minRatio: 4.5, kind: 'Texto de botón horario' }
                ]
            },
            {
                varName: '--slot-selected-bg',
                label: 'Fondo de Bloque Horario Seleccionado',
                description: 'Color del botón horario cuando está seleccionado o al pasar el cursor.',
                keywords: 'horario hora slot seleccionado activo fondo',
                contrastPairs: [
                    { fg: '--slot-selected-text', bg: '--slot-selected-bg', label: 'Hora sobre Bloque Seleccionado', minRatio: 4.5, kind: 'Texto de botón horario' }
                ]
            },
            {
                varName: '--slot-selected-text',
                label: 'Texto de Bloque Horario Seleccionado',
                description: 'Color del texto de la hora cuando el bloque está seleccionado.',
                keywords: 'horario hora slot seleccionado texto',
                contrastPairs: [
                    { fg: '--slot-selected-text', bg: '--slot-selected-bg', label: 'Hora sobre Bloque Seleccionado', minRatio: 4.5, kind: 'Texto de botón horario' }
                ]
            }
        ]
    },
    {
        id: 'states',
        title: 'Estados, Alertas y Flotantes',
        icon: 'fa-bell',
        description: 'Indicadores semánticos (Éxito, Advertencia, Error, Información), notificaciones Toast y botón flotante de WhatsApp.',
        properties: [
            {
                varName: '--color-success',
                label: 'Color de Éxito / Pagado / Confirmado',
                description: 'Usado en insignias de reserva pagada, confirmaciones y cupos disponibles.',
                keywords: 'exito success verde pagado confirmado',
                contrastPairs: [
                    { fg: '--color-success', bg: '--bg-card', label: 'Indicador de Éxito sobre Tarjeta/Toast', minRatio: 3.0, kind: 'Estado semántico / Ícono' }
                ]
            },
            {
                varName: '--color-warning',
                label: 'Color de Advertencia / Pendiente',
                description: 'Usado en estados pendientes de pago, alertas preventivas y últimos cupos.',
                keywords: 'advertencia warning alerta pendiente naranja',
                contrastPairs: [
                    { fg: '--color-warning', bg: '--bg-card', label: 'Indicador de Advertencia sobre Tarjeta', minRatio: 3.0, kind: 'Estado semántico / Ícono' }
                ]
            },
            {
                varName: '--color-error',
                label: 'Color de Error / Cancelado',
                description: 'Usado en mensajes de error, reservas canceladas y cupos agotados.',
                keywords: 'error peligro rojo cancelado agotado',
                contrastPairs: [
                    { fg: '--color-error', bg: '--bg-card', label: 'Indicador de Error sobre Tarjeta/Toast', minRatio: 3.0, kind: 'Estado semántico / Ícono' }
                ]
            },
            {
                varName: '--color-info',
                label: 'Color Informativo',
                description: 'Usado en avisos informativos, objetivos y guías de usuario.',
                keywords: 'info informacion azul aviso',
                contrastPairs: [
                    { fg: '--color-info', bg: '--bg-card', label: 'Indicador Informativo sobre Tarjeta/Toast', minRatio: 3.0, kind: 'Estado semántico / Ícono' }
                ]
            },
            {
                varName: '--toast-bg',
                label: 'Fondo de Notificaciones Emergentes (Toast)',
                description: 'Superficie de los mensajes flotantes de confirmación en la esquina inferior.',
                keywords: 'toast notificacion mensaje flotante fondo',
                contrastPairs: [
                    { fg: '--toast-text', bg: '--toast-bg', label: 'Texto de Notificación sobre Fondo Toast', minRatio: 4.5, kind: 'Texto de notificación' }
                ]
            },
            {
                varName: '--toast-text',
                label: 'Texto de Notificaciones Emergentes (Toast)',
                description: 'Color del mensaje dentro de las notificaciones Toast.',
                keywords: 'toast notificacion texto letra',
                contrastPairs: [
                    { fg: '--toast-text', bg: '--toast-bg', label: 'Texto de Notificación sobre Fondo Toast', minRatio: 4.5, kind: 'Texto de notificación' }
                ]
            },
            {
                varName: '--whatsapp-bg',
                label: 'Fondo del Botón Flotante de WhatsApp',
                description: 'Color del botón circular de contacto rápido por WhatsApp.',
                keywords: 'whatsapp flotante boton verde fondo',
                contrastPairs: [
                    { fg: '--whatsapp-text', bg: '--whatsapp-bg', label: 'Ícono de WhatsApp sobre Fondo del Botón', minRatio: 3.0, kind: 'Ícono grande (30px)' }
                ]
            },
            {
                varName: '--whatsapp-text',
                label: 'Ícono del Botón Flotante de WhatsApp',
                description: 'Color del logotipo de WhatsApp dentro del botón flotante.',
                keywords: 'whatsapp flotante icono texto',
                contrastPairs: [
                    { fg: '--whatsapp-text', bg: '--whatsapp-bg', label: 'Ícono de WhatsApp sobre Fondo del Botón', minRatio: 3.0, kind: 'Ícono grande (30px)' }
                ]
            }
        ]
    }
];

const themeManagerState = {
    initialized: false,
    activeScheme: 'light',
    activeTabId: 'general',
    searchQuery: '',
    saved: { light: {}, dark: {} },
    draft: { light: {}, dark: {} },
    defaults: { light: {}, dark: {} }
};

function getAllThemePropertyNames() {
    const names = [];
    THEME_COMPONENT_TABS.forEach(tab => {
        tab.properties.forEach(prop => {
            if (!names.includes(prop.varName)) {
                names.push(prop.varName);
            }
        });
    });
    return names;
}

function normalizeToHex(colorStr) {
    if (!colorStr || typeof colorStr !== 'string') return '';
    const trimmed = colorStr.trim();
    const hex6 = /^#([0-9a-f]{6})$/i.exec(trimmed);
    if (hex6) return '#' + hex6[1].toUpperCase();

    const hex3 = /^#([0-9a-f]{3})$/i.exec(trimmed);
    if (hex3) {
        const c = hex3[1].toUpperCase();
        return '#' + c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }

    const rgbMatch = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(trimmed);
    if (rgbMatch) {
        return rgbToHex(
            Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))),
            Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))),
            Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10)))
        );
    }
    return trimmed.toUpperCase();
}

function hexToRgb(hexStr) {
    const norm = normalizeToHex(hexStr);
    const match = /^#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i.exec(norm);
    if (!match) return { r: 0, g: 0, b: 0 };
    return {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16)
    };
}

function rgbToHex(r, g, b) {
    const clamp = n => Math.min(255, Math.max(0, Math.round(Number(n) || 0)));
    const toHex = n => clamp(n).toString(16).padStart(2, '0').toUpperCase();
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

function calculateRelativeLuminance(hexColor) {
    const { r, g, b } = hexToRgb(hexColor);
    const transform = channel => {
        const sRGB = channel / 255;
        return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    };
    const R = transform(r);
    const G = transform(g);
    const B = transform(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function calculateContrastRatio(hex1, hex2) {
    const lum1 = calculateRelativeLuminance(hex1);
    const lum2 = calculateRelativeLuminance(hex2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}

function evaluateContrastStatus(ratio, minRatio) {
    const rounded = Math.round(ratio * 100) / 100;
    if (ratio >= 7.0) {
        return {
            passes: true,
            level: 'AAA',
            badgeClass: 'badge-paid',
            shortText: `${rounded.toFixed(2)}:1 · Legibilidad Óptima (WCAG AAA)`,
            detailText: `Excelente contraste. Supera ampliamente el mínimo internacional (${minRatio.toFixed(1)}:1).`
        };
    }
    if (ratio >= 4.5) {
        return {
            passes: true,
            level: 'AA',
            badgeClass: 'badge-paid',
            shortText: `${rounded.toFixed(2)}:1 · Legibilidad Buena (WCAG AA)`,
            detailText: `Cumple la norma internacional WCAG 2.1 para textos normales y botones (mín. ${minRatio.toFixed(1)}:1).`
        };
    }
    if (ratio >= 3.0) {
        const passesLarge = minRatio <= 3.0;
        return {
            passes: passesLarge,
            level: 'AA Large',
            badgeClass: passesLarge ? 'badge-info' : 'badge-pending',
            shortText: passesLarge
                ? `${rounded.toFixed(2)}:1 · Cumple para Texto Grande / Íconos (WCAG AA)`
                : `${rounded.toFixed(2)}:1 · Bajo contraste para texto pequeño (Mín. 4.5:1)`,
            detailText: passesLarge
                ? `Cumple el mínimo internacional de 3.0:1 exigido para títulos grandes, íconos o bordes.`
                : `Solo es legible en letras grandes. Para textos normales la norma WCAG 2.1 recomienda al menos 4.5:1.`
        };
    }
    return {
        passes: false,
        level: 'Falla WCAG',
        badgeClass: 'badge-cancelled',
        shortText: `${rounded.toFixed(2)}:1 · Bajo Contraste (Difícil de leer)`,
        detailText: `Los dos colores son muy similares. La norma internacional WCAG 2.1 exige al menos ${minRatio.toFixed(1)}:1 en este componente.`
    };
}

function suggestAccessibleColor(targetHex, fixedHex, minRatio) {
    const targetRgb = hexToRgb(targetHex);
    const fixedLum = calculateRelativeLuminance(fixedHex);
    const preferLighter = fixedLum < 0.35;

    const tryDirection = towardsWhite => {
        for (let step = 1; step <= 100; step++) {
            const factor = step / 100;
            const r = towardsWhite
                ? targetRgb.r + (255 - targetRgb.r) * factor
                : targetRgb.r * (1 - factor);
            const g = towardsWhite
                ? targetRgb.g + (255 - targetRgb.g) * factor
                : targetRgb.g * (1 - factor);
            const b = towardsWhite
                ? targetRgb.b + (255 - targetRgb.b) * factor
                : targetRgb.b * (1 - factor);
            const candidate = rgbToHex(r, g, b);
            if (calculateContrastRatio(candidate, fixedHex) >= minRatio + 0.08) {
                return candidate;
            }
        }
        return null;
    };

    return (
        tryDirection(preferLighter) ||
        tryDirection(!preferLighter) ||
        (preferLighter ? rgbToHex(254, 253, 249) : rgbToHex(0, 27, 64))
    );
}

function readComputedTokensFromStylesheet() {
    const names = getAllThemePropertyNames();
    const currentAttr = document.documentElement.getAttribute('data-theme') || 'light';
    const customStyleEl = document.getElementById('psicarte-custom-theme');
    const savedCustomCss = customStyleEl ? customStyleEl.textContent : '';
    if (customStyleEl) customStyleEl.textContent = '';

    const result = { light: {}, dark: {} };
    ['light', 'dark'].forEach(scheme => {
        document.documentElement.setAttribute('data-theme', scheme);
        const computed = getComputedStyle(document.documentElement);
        names.forEach(varName => {
            result[scheme][varName] = normalizeToHex(computed.getPropertyValue(varName));
        });
    });

    document.documentElement.setAttribute('data-theme', currentAttr);
    if (customStyleEl) customStyleEl.textContent = savedCustomCss;
    return result;
}

function initAdminThemeManager(forceReload = false) {
    if (themeManagerState.initialized && !forceReload) {
        renderAdminThemeManager();
        return;
    }

    const baseFromCss = readComputedTokensFromStylesheet();
    const rawConfig = state.config && state.config.theme_custom_tokens
        ? parseCustomThemeTokens(state.config.theme_custom_tokens)
        : null;

    const defaultsLight = {
        ...baseFromCss.light,
        ...(rawConfig && rawConfig.defaults && rawConfig.defaults.light ? rawConfig.defaults.light : {})
    };
    const defaultsDark = {
        ...baseFromCss.dark,
        ...(rawConfig && rawConfig.defaults && rawConfig.defaults.dark ? rawConfig.defaults.dark : {})
    };

    const savedLight = {
        ...defaultsLight,
        ...(rawConfig && rawConfig.light ? rawConfig.light : {})
    };
    const savedDark = {
        ...defaultsDark,
        ...(rawConfig && rawConfig.dark ? rawConfig.dark : {})
    };

    Object.keys(savedLight).forEach(k => { savedLight[k] = normalizeToHex(savedLight[k]); });
    Object.keys(savedDark).forEach(k => { savedDark[k] = normalizeToHex(savedDark[k]); });
    Object.keys(defaultsLight).forEach(k => { defaultsLight[k] = normalizeToHex(defaultsLight[k]); });
    Object.keys(defaultsDark).forEach(k => { defaultsDark[k] = normalizeToHex(defaultsDark[k]); });

    themeManagerState.defaults = { light: defaultsLight, dark: defaultsDark };
    themeManagerState.saved = {
        light: { ...savedLight },
        dark: { ...savedDark }
    };
    themeManagerState.draft = {
        light: { ...savedLight },
        dark: { ...savedDark }
    };

    const currentDocScheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    if (!themeManagerState.initialized) {
        themeManagerState.activeScheme = currentDocScheme;
    }
    themeManagerState.initialized = true;

    renderAdminThemeManager();
}

function toggleThemeContrastGuide() {
    const guide = document.getElementById('theme-contrast-guide');
    if (guide) {
        guide.hidden = !guide.hidden;
    }
}

function setThemeEditorScheme(scheme) {
    if (scheme !== 'light' && scheme !== 'dark') return;
    themeManagerState.activeScheme = scheme;
    renderAdminThemeManager();
}

function selectThemeComponentTab(tabId) {
    themeManagerState.activeTabId = tabId;
    renderAdminThemeManager();
}

function handleThemeComponentSearch(query) {
    themeManagerState.searchQuery = (query || '').trim();
    const clearBtn = document.getElementById('theme-search-clear-btn');
    if (clearBtn) clearBtn.hidden = themeManagerState.searchQuery.length === 0;
    renderThemeTabsNav();
    renderThemePropertiesColumn();
}

function clearThemeComponentSearch() {
    const input = document.getElementById('theme-component-search');
    if (input) input.value = '';
    handleThemeComponentSearch('');
}

function countTabContrastWarnings(tab, scheme) {
    const palette = themeManagerState.draft[scheme] || {};
    let warnings = 0;
    tab.properties.forEach(prop => {
        (prop.contrastPairs || []).forEach(pair => {
            const fgHex = palette[pair.fg];
            const bgHex = palette[pair.bg];
            if (fgHex && bgHex) {
                const ratio = calculateContrastRatio(fgHex, bgHex);
                if (ratio < pair.minRatio) warnings++;
            }
        });
    });
    return warnings;
}

function hasUnsavedThemeChanges() {
    return ['light', 'dark'].some(scheme => {
        const savedMap = themeManagerState.saved[scheme] || {};
        const draftMap = themeManagerState.draft[scheme] || {};
        return Object.keys(draftMap).some(k => normalizeToHex(draftMap[k]) !== normalizeToHex(savedMap[k]));
    });
}

function renderAdminThemeManager() {
    const lightBtn = document.getElementById('theme-edit-light-btn');
    const darkBtn = document.getElementById('theme-edit-dark-btn');
    if (lightBtn && darkBtn) {
        lightBtn.classList.toggle('active', themeManagerState.activeScheme === 'light');
        darkBtn.classList.toggle('active', themeManagerState.activeScheme === 'dark');
    }

    updateThemeDraftStatusBanner();
    renderThemeTabsNav();
    renderThemePropertiesColumn();
    renderThemeIsolatedSandbox();
}

function updateThemeDraftStatusBanner() {
    const statusContainer = document.getElementById('theme-draft-status');
    if (!statusContainer) return;

    const unsaved = hasUnsavedThemeChanges();
    if (unsaved) {
        statusContainer.innerHTML = '<span class="badge badge-pending"><i class="fa-solid fa-pen-ruler"></i> Tienes cambios en borrador (visibles solo en la Vista Previa Aislada). Presiona Guardar para aplicarlos al sitio.</span>';
    } else {
        statusContainer.innerHTML = '<span class="badge badge-info"><i class="fa-solid fa-eye"></i> Vista previa aislada activa: prueba combinaciones con seguridad antes de guardar.</span>';
    }
}

function renderThemeTabsNav() {
    const nav = document.getElementById('theme-tabs-nav');
    if (!nav) return;

    const scheme = themeManagerState.activeScheme;
    nav.innerHTML = THEME_COMPONENT_TABS.map(tab => {
        const isActive = !themeManagerState.searchQuery && tab.id === themeManagerState.activeTabId;
        const warningCount = countTabContrastWarnings(tab, scheme);
        const warningIcon = warningCount > 0
            ? `<i class="fa-solid fa-triangle-exclamation theme-tab-warning-dot" title="Hay combinaciones con bajo contraste en esta sección"></i>`
            : '';
        return `
            <button type="button" role="tab" aria-selected="${isActive ? 'true' : 'false'}"
                class="theme-tab-pill ${isActive ? 'active' : ''}"
                onclick="selectThemeComponentTab('${tab.id}')">
                <i class="fa-solid ${tab.icon}"></i>
                <span>${tab.title}</span>
                <span class="theme-tab-count">${tab.properties.length}</span>
                ${warningIcon}
            </button>
        `;
    }).join('');
}

function getFilteredThemeProperties() {
    const q = themeManagerState.searchQuery.toLowerCase();
    const scheme = themeManagerState.activeScheme;
    const draftMap = themeManagerState.draft[scheme] || {};

    if (!q) {
        const activeTab = THEME_COMPONENT_TABS.find(t => t.id === themeManagerState.activeTabId) || THEME_COMPONENT_TABS[0];
        return {
            mode: 'tab',
            tab: activeTab,
            items: activeTab.properties.map(p => ({ ...p, tabTitle: activeTab.title, tabId: activeTab.id }))
        };
    }

    const matches = [];
    THEME_COMPONENT_TABS.forEach(tab => {
        tab.properties.forEach(prop => {
            const hexVal = (draftMap[prop.varName] || '').toLowerCase();
            const rgbObj = hexToRgb(hexVal);
            const rgbStr = `rgb(${rgbObj.r}, ${rgbObj.g}, ${rgbObj.b})`;
            const haystack = `${prop.label} ${prop.description} ${prop.varName} ${prop.keywords || ''} ${tab.title} ${hexVal} ${rgbStr}`.toLowerCase();
            if (haystack.includes(q)) {
                matches.push({ ...prop, tabTitle: tab.title, tabId: tab.id });
            }
        });
    });

    return {
        mode: 'search',
        tab: null,
        items: matches
    };
}

function renderThemePropertiesColumn() {
    const headerEl = document.getElementById('theme-active-tab-header');
    const listEl = document.getElementById('theme-properties-list');
    if (!headerEl || !listEl) return;

    const scheme = themeManagerState.activeScheme;
    const schemeLabel = scheme === 'light' ? 'Modo Claro' : 'Modo Oscuro';
    const filtered = getFilteredThemeProperties();

    if (filtered.mode === 'search') {
        headerEl.innerHTML = `
            <h4><i class="fa-solid fa-magnifying-glass"></i> Resultados de búsqueda para "${escapeHtmlText(themeManagerState.searchQuery)}" (${filtered.items.length})</h4>
            <p>Mostrando componentes coincidentes en todas las pestañas para <strong>${schemeLabel}</strong>.</p>
        `;
    } else if (filtered.tab) {
        headerEl.innerHTML = `
            <h4><i class="fa-solid ${filtered.tab.icon}"></i> ${filtered.tab.title} — ${schemeLabel}</h4>
            <p>${filtered.tab.description}</p>
        `;
    }

    if (filtered.items.length === 0) {
        listEl.innerHTML = `
            <div class="card" style="box-shadow: none; text-align: center; padding: 30px;">
                <p style="color: var(--text-secondary);">No se encontraron componentes que coincidan con "${escapeHtmlText(themeManagerState.searchQuery)}".</p>
                <button type="button" class="btn-secondary" style="margin-top: 10px;" onclick="clearThemeComponentSearch()">Ver todos los componentes</button>
            </div>
        `;
        return;
    }

    const paletteSwatches = getQuickPaletteSwatches(scheme);
    listEl.innerHTML = filtered.items.map(prop => renderSingleThemePropertyCard(prop, scheme, paletteSwatches)).join('');
}

function escapeHtmlText(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getQuickPaletteSwatches(scheme) {
    const draftMap = themeManagerState.draft[scheme] || {};
    const keyVars = [
        '--bg-primary',
        '--bg-secondary',
        '--bg-card',
        '--text-primary',
        '--text-secondary',
        '--color-accent',
        '--color-navy',
        '--color-gold',
        '--color-pomegranate',
        '--color-success',
        '--color-warning',
        '--color-error'
    ];
    const unique = [];
    keyVars.forEach(v => {
        const hex = normalizeToHex(draftMap[v]);
        if (hex && !unique.includes(hex)) unique.push(hex);
    });
    return unique;
}

function renderSingleThemePropertyCard(prop, scheme, quickSwatches) {
    const savedHex = normalizeToHex(themeManagerState.saved[scheme][prop.varName]);
    const draftHex = normalizeToHex(themeManagerState.draft[scheme][prop.varName]);
    const defaultHex = normalizeToHex(themeManagerState.defaults[scheme][prop.varName]);
    const rgb = hexToRgb(draftHex);
    const savedRgb = hexToRgb(savedHex);
    const isModified = draftHex !== savedHex;

    let hasWarning = false;
    const contrastRowsHtml = (prop.contrastPairs || []).map(pair => {
        const fgHex = normalizeToHex(themeManagerState.draft[scheme][pair.fg]);
        const bgHex = normalizeToHex(themeManagerState.draft[scheme][pair.bg]);
        const ratio = calculateContrastRatio(fgHex, bgHex);
        const evalResult = evaluateContrastStatus(ratio, pair.minRatio);
        if (!evalResult.passes) hasWarning = true;

        const otherVar = pair.fg === prop.varName ? pair.bg : pair.fg;
        const fixBtnHtml = !evalResult.passes
            ? `<button type="button" class="theme-contrast-fix-btn" onclick="autoFixPropertyContrast('${prop.varName}', '${otherVar}', ${pair.minRatio})">
                   <i class="fa-solid fa-wand-magic-sparkles"></i> Sugerir color legible
               </button>`
            : '';

        return `
            <div class="theme-contrast-row">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span class="theme-contrast-sample" style="background-color: ${bgHex}; color: ${fgHex};">Aa Texto</span>
                    <div>
                        <div><strong>${pair.label}</strong> <small style="color: var(--text-secondary);">(${pair.kind})</small></div>
                        <div style="font-size: 0.78rem; color: var(--text-secondary);">${evalResult.detailText}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span class="badge ${evalResult.badgeClass}">${evalResult.shortText}</span>
                    ${fixBtnHtml}
                </div>
            </div>
        `;
    }).join('');

    const swatchesHtml = quickSwatches.map(swHex => `
        <button type="button" class="theme-quick-swatch" style="background-color: ${swHex};"
            title="Usar color ${swHex}"
            onclick="updateThemeDraftProperty('${prop.varName}', '${swHex}')"></button>
    `).join('');

    const sectionTag = themeManagerState.searchQuery
        ? `<span class="badge badge-info" style="font-size: 0.7rem; margin-right: 6px;">${prop.tabTitle}</span>`
        : '';

    return `
        <div class="theme-prop-card ${isModified ? 'is-modified' : ''} ${hasWarning ? 'has-contrast-warning' : ''}" data-var-card="${prop.varName}">
            <div class="theme-prop-top">
                <div>
                    <div class="theme-prop-title">${sectionTag}${prop.label}</div>
                    <div class="theme-prop-desc">${prop.description}</div>
                </div>
                <span class="theme-prop-var-badge" title="Variable CSS">${prop.varName}</span>
            </div>

            <div class="theme-color-comparison">
                <div class="theme-swatch-pair">
                    <div class="theme-swatch-box" title="Color guardado actualmente: ${savedHex} / rgb(${savedRgb.r}, ${savedRgb.g}, ${savedRgb.b})">
                        <small>Actual</small>
                        <div class="theme-swatch-circle" style="background-color: ${savedHex};"></div>
                        <small style="font-family: monospace; font-size: 0.7rem;">${savedHex}</small>
                    </div>
                    <i class="fa-solid fa-arrow-right" style="color: var(--text-secondary); font-size: 0.85rem;"></i>
                    <div class="theme-swatch-box" title="Color en vista previa: ${draftHex} / rgb(${rgb.r}, ${rgb.g}, ${rgb.b})">
                        <small>Nuevo</small>
                        <div class="theme-swatch-circle" style="background-color: ${draftHex};"></div>
                        <small style="font-family: monospace; font-size: 0.7rem;">${draftHex}</small>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 6px;">
                    <input type="color" class="theme-picker-native"
                        aria-label="Selector visual de color para ${prop.label}"
                        value="${draftHex}"
                        oninput="updateThemeDraftProperty('${prop.varName}', this.value)">
                </div>

                <div class="theme-inputs-grid" style="flex: 1;">
                    <div class="theme-input-field theme-hex-field">
                        <label>HEX (#RRGGBB)</label>
                        <input type="text" maxlength="7" value="${draftHex}"
                            aria-label="Código HEX para ${prop.label}"
                            onchange="handleHexInputChange('${prop.varName}', this.value)">
                    </div>
                    <div class="theme-input-field">
                        <label>R (0-255)</label>
                        <input type="number" min="0" max="255" value="${rgb.r}"
                            aria-label="Canal Rojo R para ${prop.label}"
                            oninput="handleRgbInputChange('${prop.varName}', 'r', this.value)">
                    </div>
                    <div class="theme-input-field">
                        <label>G (0-255)</label>
                        <input type="number" min="0" max="255" value="${rgb.g}"
                            aria-label="Canal Verde G para ${prop.label}"
                            oninput="handleRgbInputChange('${prop.varName}', 'g', this.value)">
                    </div>
                    <div class="theme-input-field">
                        <label>B (0-255)</label>
                        <input type="number" min="0" max="255" value="${rgb.b}"
                            aria-label="Canal Azul B para ${prop.label}"
                            oninput="handleRgbInputChange('${prop.varName}', 'b', this.value)">
                    </div>
                    <div style="display: flex; gap: 4px;">
                        <button type="button" class="btn-secondary" style="padding: 7px 10px; font-size: 0.78rem;"
                            title="Revertir al color guardado (${savedHex})"
                            onclick="updateThemeDraftProperty('${prop.varName}', '${savedHex}')"
                            ${!isModified ? 'disabled' : ''}>
                            <i class="fa-solid fa-undo"></i>
                        </button>
                        <button type="button" class="btn-secondary" style="padding: 7px 10px; font-size: 0.78rem;"
                            title="Restaurar al color original de fábrica (${defaultHex})"
                            onclick="updateThemeDraftProperty('${prop.varName}', '${defaultHex}')">
                            <i class="fa-solid fa-rotate-left"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div class="theme-rgb-copy-row">
                <span>Formato RGB: <code>rgb(${rgb.r}, ${rgb.g}, ${rgb.b})</code> · Buscador por RGB o HEX:</span>
                <input type="text" class="form-control" style="max-width: 210px; padding: 4px 8px; font-size: 0.78rem; font-family: monospace;"
                    value="rgb(${rgb.r}, ${rgb.g}, ${rgb.b})"
                    aria-label="Escribir color en formato rgb(r, g, b) o #hex para ${prop.label}"
                    onchange="handleRgbOrHexStringInput('${prop.varName}', this.value)">
                <div class="theme-quick-swatches" title="Colores rápidos de la paleta actual">
                    <small style="margin-right: 4px;">Paleta rápida:</small>
                    ${swatchesHtml}
                </div>
            </div>

            ${contrastRowsHtml ? `<div class="theme-contrast-panel">${contrastRowsHtml}</div>` : ''}
        </div>
    `;
}

function updateThemeDraftProperty(varName, newColorValue) {
    const normHex = normalizeToHex(newColorValue);
    if (!/^#[0-9A-F]{6}$/i.test(normHex)) {
        showToast('Ingresa un color válido en formato HEX (#RRGGBB) o RGB (0 a 255).', 'error');
        renderThemePropertiesColumn();
        return;
    }

    const scheme = themeManagerState.activeScheme;
    themeManagerState.draft[scheme][varName] = normHex;

    updateThemeDraftStatusBanner();
    renderThemeTabsNav();
    renderThemePropertiesColumn();
    renderThemeIsolatedSandbox();

    if (themeManagerState.searchQuery) {
        const ownerTab = THEME_COMPONENT_TABS.find(t => t.properties.some(p => p.varName === varName));
        if (ownerTab && ownerTab.id !== themeManagerState.activeTabId) {
            themeManagerState.activeTabId = ownerTab.id;
            renderThemeIsolatedSandbox();
        }
    }
}

function handleHexInputChange(varName, rawValue) {
    const val = (rawValue || '').trim();
    const withHash = val.startsWith('#') ? val : '#' + val;
    updateThemeDraftProperty(varName, withHash);
}

function handleRgbInputChange(varName, channel, rawValue) {
    const scheme = themeManagerState.activeScheme;
    const currentHex = themeManagerState.draft[scheme][varName];
    const currentRgb = hexToRgb(currentHex);
    const num = Math.min(255, Math.max(0, parseInt(rawValue, 10) || 0));
    currentRgb[channel] = num;
    const nextHex = rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b);
    updateThemeDraftProperty(varName, nextHex);
}

function handleRgbOrHexStringInput(varName, rawStr) {
    const trimmed = (rawStr || '').trim();
    if (!trimmed) return;
    if (trimmed.startsWith('#') || /^[0-9a-f]{3,6}$/i.test(trimmed)) {
        handleHexInputChange(varName, trimmed);
        return;
    }
    const nums = trimmed.match(/\d{1,3}/g);
    if (nums && nums.length >= 3) {
        const nextHex = rgbToHex(nums[0], nums[1], nums[2]);
        updateThemeDraftProperty(varName, nextHex);
        return;
    }
    showToast('Formato no reconocido. Usa #RRGGBB o rgb(r, g, b).', 'error');
    renderThemePropertiesColumn();
}

function autoFixPropertyContrast(varName, fixedVarName, minRatio) {
    const scheme = themeManagerState.activeScheme;
    const targetHex = themeManagerState.draft[scheme][varName];
    const fixedHex = themeManagerState.draft[scheme][fixedVarName];
    if (!targetHex || !fixedHex) return;

    const suggested = suggestAccessibleColor(targetHex, fixedHex, minRatio);
    updateThemeDraftProperty(varName, suggested);
    const newRatio = calculateContrastRatio(suggested, fixedHex);
    showToast(`Color ajustado a ${suggested} (Contraste ${newRatio.toFixed(2)}:1 — Cumple WCAG 2.1).`, 'info');
}

function applyDraftVariablesToSandboxElement(sandboxEl, scheme) {
    const draftMap = themeManagerState.draft[scheme] || {};
    Object.entries(draftMap).forEach(([varName, hexVal]) => {
        sandboxEl.style.setProperty(varName, hexVal);
    });
    sandboxEl.style.setProperty('--color-shadow', 'color-mix(in srgb, var(--color-navy) 12%, transparent)');
    sandboxEl.style.setProperty('--color-glass-bg', 'color-mix(in srgb, var(--header-bg) 92%, transparent)');
    sandboxEl.style.setProperty('--color-glass-border', 'var(--header-border)');
    sandboxEl.style.setProperty('--modal-overlay-bg', 'color-mix(in srgb, var(--modal-overlay-color) 62%, transparent)');
    sandboxEl.style.setProperty('--color-accent-soft', 'color-mix(in srgb, var(--color-accent) 15%, transparent)');
    sandboxEl.style.setProperty('--color-success-bg', 'color-mix(in srgb, var(--color-success) 15%, transparent)');
    sandboxEl.style.setProperty('--color-warning-bg', 'color-mix(in srgb, var(--color-warning) 15%, transparent)');
    sandboxEl.style.setProperty('--color-error-bg', 'color-mix(in srgb, var(--color-error) 15%, transparent)');
    sandboxEl.style.setProperty('--color-info-bg', 'color-mix(in srgb, var(--color-info) 15%, transparent)');
    sandboxEl.style.setProperty('--whatsapp-shadow', 'color-mix(in srgb, var(--whatsapp-bg) 40%, transparent)');
}

function renderThemeIsolatedSandbox() {
    const sandboxEl = document.getElementById('theme-preview-sandbox');
    const schemeLabelEl = document.getElementById('theme-preview-scheme-label');
    const summaryBadgeEl = document.getElementById('theme-preview-contrast-summary');
    if (!sandboxEl) return;

    const scheme = themeManagerState.activeScheme;
    const activeTab = THEME_COMPONENT_TABS.find(t => t.id === themeManagerState.activeTabId) || THEME_COMPONENT_TABS[0];

    if (schemeLabelEl) {
        schemeLabelEl.textContent = `Vista previa aislada en ${scheme === 'light' ? 'Modo Claro ☀️' : 'Modo Oscuro 🌙'} · Sección: ${activeTab.title}`;
    }

    const warningsInTab = countTabContrastWarnings(activeTab, scheme);
    if (summaryBadgeEl) {
        if (warningsInTab === 0) {
            summaryBadgeEl.className = 'badge badge-paid';
            summaryBadgeEl.innerHTML = '<i class="fa-solid fa-check-circle"></i> Contraste WCAG OK';
        } else {
            summaryBadgeEl.className = 'badge badge-pending';
            summaryBadgeEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${warningsInTab} aviso(s) de contraste`;
        }
    }

    applyDraftVariablesToSandboxElement(sandboxEl, scheme);
    sandboxEl.innerHTML = buildSandboxMarkupForTab(activeTab.id);
}

function buildSandboxMarkupForTab(tabId) {
    if (tabId === 'general') {
        return `
            <div class="sandbox-section-label">Muestra: Fondos y Textos Generales</div>
            <div class="sandbox-mock-box" style="background-color: var(--bg-primary); color: var(--text-primary); border-color: var(--color-border);">
                <h4 style="color: var(--text-primary); margin-bottom: 6px;">Centro Integral PsicArte</h4>
                <p style="color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 10px;">
                    Psicología, talleres y artes escénicas orientados al bienestar emocional y desarrollo humano.
                </p>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                    <span style="background-color: var(--color-accent); color: var(--color-accent-text); padding: 4px 10px; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600;">
                        Bloque de Acento
                    </span>
                    <span style="color: var(--color-pomegranate); font-weight: 700; font-size: 0.85rem;">
                        <i class="fa-solid fa-bullseye"></i> Misión (Granada)
                    </span>
                    <span style="color: var(--color-gold); font-weight: 700; font-size: 0.85rem;">
                        <i class="fa-solid fa-eye"></i> Visión (Dorado)
                    </span>
                </div>
            </div>
            <div class="sandbox-mock-box" style="background-color: var(--bg-secondary); color: var(--text-primary); border-color: var(--color-border); margin-bottom: 0;">
                <strong style="color: var(--text-primary); font-size: 0.9rem;">Sección con Fondo Secundario</strong>
                <p style="color: var(--text-secondary); font-size: 0.83rem; margin-top: 4px;">
                    Así se ven los paneles laterales y fondos alternos junto al borde divisor.
                </p>
            </div>
        `;
    }

    if (tabId === 'navigation') {
        return `
            <div class="sandbox-section-label">Muestra: Barra de Navegación (Header)</div>
            <div class="sandbox-mock-box" style="background-color: var(--header-bg); border-bottom: 2px solid var(--header-border); display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                <strong style="color: var(--nav-link-color); font-family: var(--font-heading);">PsicArte</strong>
                <div style="display: flex; gap: 12px; font-size: 0.85rem; font-weight: 500;">
                    <span style="color: var(--nav-link-accent); border-bottom: 2px solid var(--nav-link-accent);">Inicio</span>
                    <span style="color: var(--nav-link-color);">Nosotros</span>
                    <span style="color: var(--nav-link-color);">Servicios</span>
                </div>
            </div>
            <div class="sandbox-section-label" style="margin-top: 12px;">Muestra: Pie de Página (Footer)</div>
            <div class="sandbox-mock-box" style="background-color: var(--footer-bg); color: var(--footer-text); border-color: var(--footer-border); margin-bottom: 0;">
                <h5 style="color: var(--footer-accent); margin-bottom: 6px; font-size: 0.92rem;">Contacto PsicArte</h5>
                <p style="color: var(--footer-text); font-size: 0.82rem; opacity: 0.9; margin-bottom: 8px;">
                    <i class="fa-solid fa-envelope" style="color: var(--footer-accent);"></i> contacto@centropsicarte.cl
                </p>
                <div style="border-top: 1px solid var(--footer-border); padding-top: 8px; font-size: 0.75rem; color: var(--footer-text); opacity: 0.75;">
                    &copy; Centro Integral PsicArte. Todos los derechos reservados.
                </div>
            </div>
        `;
    }

    if (tabId === 'buttons') {
        return `
            <div class="sandbox-section-label">Muestra: Botones Interactivos</div>
            <div class="sandbox-mock-box" style="background-color: var(--bg-card); display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                <button type="button" class="btn-primary" style="pointer-events: none;">
                    <i class="fa-solid fa-calendar-check"></i> Botón Principal
                </button>
                <button type="button" class="btn-secondary" style="pointer-events: none;">
                    Botón Secundario
                </button>
                <button type="button" class="btn-icon" style="pointer-events: none;" title="Botón de Ícono">
                    <i class="fa-solid fa-moon"></i>
                </button>
            </div>
            <div class="sandbox-section-label" style="margin-top: 12px;">Muestra: Campos de Formulario</div>
            <div class="sandbox-mock-box" style="background-color: var(--bg-card); margin-bottom: 0;">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Nombre del Paciente (Normal):</label>
                <input type="text" class="form-control" value="María González" readonly style="margin-bottom: 10px;">
                <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Campo Activo (Borde Focus):</label>
                <input type="text" class="form-control" value="maria@ejemplo.cl" readonly style="border-color: var(--input-focus-border); background-color: var(--bg-card);">
            </div>
        `;
    }

    if (tabId === 'cards') {
        return `
            <div class="sandbox-section-label">Muestra: Filtros y Tarjeta de Servicio</div>
            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                <span class="filter-pill active" style="pointer-events: none;">Todos los Servicios</span>
                <span class="filter-pill" style="pointer-events: none;">Psicología</span>
            </div>
            <div class="card service-card" style="box-shadow: none; margin-bottom: 0;">
                <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                    <span class="service-type-badge service-badge-virtual" style="position: static;">
                        <i class="fa-solid fa-video"></i> Online
                    </span>
                    <span class="service-type-badge service-badge-physical" style="position: static;">
                        <i class="fa-solid fa-location-dot"></i> Presencial
                    </span>
                </div>
                <h4 style="color: var(--text-primary); margin-bottom: 4px;">Psicoterapia Individual Adultos</h4>
                <p style="color: var(--text-secondary); font-size: 0.84rem; margin-bottom: 10px;">
                    Atención clínica integral de 50 minutos con especialista.
                </p>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--card-border); padding-top: 10px;">
                    <span class="price-amount" style="font-size: 1.25rem;">$35.000</span>
                    <button type="button" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem; pointer-events: none;">Agendar</button>
                </div>
            </div>
        `;
    }

    if (tabId === 'modals') {
        return `
            <div class="sandbox-section-label">Muestra: Banner Superior de Anuncio</div>
            <div style="background-color: var(--banner-bg); color: var(--banner-text); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 500; text-align: center; margin-bottom: 12px;">
                <i class="fa-solid fa-bullhorn"></i> ¡Agende sus horas de consulta en línea de forma rápida y segura!
            </div>
            <div class="sandbox-section-label">Muestra: Ventana Modal / Pop-up sobre Velo</div>
            <div style="background-color: var(--modal-overlay-bg); padding: 14px; border-radius: var(--radius-md);">
                <div style="background-color: var(--modal-bg); color: var(--modal-text); border: 1px solid var(--modal-border); border-radius: var(--radius-md); padding: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--modal-border); padding-bottom: 8px; margin-bottom: 8px;">
                        <h4 style="color: var(--popup-title-color); font-size: 0.95rem; margin: 0;">Aviso Importante</h4>
                        <i class="fa-solid fa-xmark" style="color: var(--text-secondary);"></i>
                    </div>
                    <p style="color: var(--modal-text); font-size: 0.83rem; margin-bottom: 10px;">
                        Así se visualiza el texto dentro de las ventanas emergentes y modales del sistema.
                    </p>
                    <div style="text-align: right;">
                        <button type="button" class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem; pointer-events: none;">Entendido</button>
                    </div>
                </div>
            </div>
        `;
    }

    if (tabId === 'booking') {
        return `
            <div class="sandbox-section-label">Muestra: Widget de Reserva, Calendario y Horarios</div>
            <div style="background-color: var(--booking-widget-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 14px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span class="step-indicator active" style="width: 28px; height: 28px; font-size: 0.82rem;">1</span>
                    <strong style="color: var(--text-primary); font-size: 0.88rem;">Selecciona Fecha y Hora</strong>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px;">
                    <div class="calendar-cell available" style="padding: 6px; font-size: 0.82rem;">12</div>
                    <div class="calendar-cell selected" style="padding: 6px; font-size: 0.82rem;">13</div>
                    <div class="calendar-cell available" style="padding: 6px; font-size: 0.82rem;">14</div>
                    <div class="calendar-cell disabled" style="padding: 6px; font-size: 0.82rem;">15</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button type="button" class="slot-btn" style="padding: 7px; font-size: 0.8rem; pointer-events: none;">10:00 - 10:50</button>
                    <button type="button" class="slot-btn selected" style="padding: 7px; font-size: 0.8rem; pointer-events: none;">11:00 - 11:50</button>
                </div>
            </div>
        `;
    }

    return `
        <div class="sandbox-section-label">Muestra: Insignias de Estado, Toast y WhatsApp</div>
        <div class="sandbox-mock-box" style="background-color: var(--bg-card); display: flex; gap: 8px; flex-wrap: wrap;">
            <span class="badge badge-paid">Pagado / Éxito</span>
            <span class="badge badge-pending">Pendiente</span>
            <span class="badge badge-cancelled">Cancelado</span>
            <span class="badge badge-info">Información</span>
        </div>
        <div style="background-color: var(--toast-bg); color: var(--toast-text); border-left: 5px solid var(--color-success); padding: 10px 14px; border-radius: var(--radius-sm); box-shadow: 0 4px 12px var(--color-shadow); display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 0.84rem;">
            <span><i class="fa-solid fa-circle-check" style="color: var(--color-success); margin-right: 6px;"></i> Reserva confirmada con éxito</span>
            <i class="fa-solid fa-xmark" style="color: var(--text-secondary);"></i>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; background-color: var(--bg-secondary); padding: 10px 14px; border-radius: var(--radius-sm);">
            <span style="font-size: 0.83rem; color: var(--text-primary);">Botón flotante de WhatsApp:</span>
            <span style="width: 46px; height: 46px; border-radius: 50%; background-color: var(--whatsapp-bg); color: var(--whatsapp-text); display: inline-flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 4px 10px var(--whatsapp-shadow);">
                <i class="fa-brands fa-whatsapp"></i>
            </span>
        </div>
    `;
}

function collectAllContrastWarnings() {
    const warnings = [];
    ['light', 'dark'].forEach(scheme => {
        const schemeName = scheme === 'light' ? 'Modo Claro' : 'Modo Oscuro';
        const palette = themeManagerState.draft[scheme] || {};
        const seenPairs = new Set();

        THEME_COMPONENT_TABS.forEach(tab => {
            tab.properties.forEach(prop => {
                (prop.contrastPairs || []).forEach(pair => {
                    const pairKey = `${scheme}:${pair.fg}:${pair.bg}:${pair.label}`;
                    if (seenPairs.has(pairKey)) return;
                    seenPairs.add(pairKey);

                    const fgHex = normalizeToHex(palette[pair.fg]);
                    const bgHex = normalizeToHex(palette[pair.bg]);
                    if (!fgHex || !bgHex) return;

                    const ratio = calculateContrastRatio(fgHex, bgHex);
                    if (ratio < pair.minRatio) {
                        warnings.push({
                            scheme,
                            schemeName,
                            tabTitle: tab.title,
                            propLabel: prop.label,
                            pairLabel: pair.label,
                            kind: pair.kind,
                            fgHex,
                            bgHex,
                            ratio,
                            minRatio: pair.minRatio
                        });
                    }
                });
            });
        });
    });
    return warnings;
}

function attemptSaveThemeChanges() {
    const warnings = collectAllContrastWarnings();
    if (warnings.length > 0) {
        const listEl = document.getElementById('theme-contrast-warning-list');
        const modal = document.getElementById('theme-contrast-warning-modal');
        if (listEl && modal) {
            listEl.innerHTML = warnings.map(w => `
                <div class="theme-contrast-warning-item">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
                        <strong>${w.schemeName} · ${w.tabTitle}: ${w.pairLabel}</strong>
                        <span class="badge badge-cancelled">Contraste actual: ${w.ratio.toFixed(2)}:1 (Mínimo WCAG: ${w.minRatio.toFixed(1)}:1)</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-top: 6px;">
                        <span class="theme-contrast-sample" style="background-color: ${w.bgHex}; color: ${w.fgHex};">Muestra de lectura (${w.fgHex} sobre ${w.bgHex})</span>
                        <span style="color: var(--text-secondary); font-size: 0.8rem;">Tipo: ${w.kind}</span>
                    </div>
                </div>
            `).join('');
            modal.classList.add('active');
            return;
        }
    }

    confirmSaveThemeChanges(false);
}

function closeThemeContrastWarningModal() {
    const modal = document.getElementById('theme-contrast-warning-modal');
    if (modal) modal.classList.remove('active');
}

async function confirmSaveThemeChanges(fromModal = false) {
    if (fromModal) {
        closeThemeContrastWarningModal();
    }

    const payloadObj = {
        light: { ...themeManagerState.draft.light },
        dark: { ...themeManagerState.draft.dark },
        defaults: {
            light: { ...themeManagerState.defaults.light },
            dark: { ...themeManagerState.defaults.dark }
        }
    };
    const serialized = JSON.stringify(payloadObj);

    try {
        await saveConfig({ theme_custom_tokens: serialized });
        if (!state.config) state.config = {};
        state.config.theme_custom_tokens = serialized;

        themeManagerState.saved = {
            light: { ...themeManagerState.draft.light },
            dark: { ...themeManagerState.draft.dark }
        };

        if (typeof applyCustomThemeTokens === 'function') {
            applyCustomThemeTokens(payloadObj, true);
        }

        renderAdminThemeManager();
        showToast('Colores y tema CSS guardados y aplicados exitosamente en todo el sitio.', 'success');
    } catch (e) {
        console.error('Error guardando configuración de tema:', e);
    }
}

function cancelThemeDraftChanges() {
    themeManagerState.draft = {
        light: { ...themeManagerState.saved.light },
        dark: { ...themeManagerState.saved.dark }
    };
    renderAdminThemeManager();
    showToast('Cambios en borrador descartados. Se mantuvo la configuración guardada.', 'info');
}

function restoreDefaultThemeTokens() {
    themeManagerState.draft = {
        light: { ...themeManagerState.defaults.light },
        dark: { ...themeManagerState.defaults.dark }
    };
    renderAdminThemeManager();
    showToast('Colores originales de PsicArte cargados en la vista previa. Presiona Guardar Cambios para aplicarlos al sitio.', 'info');
}
