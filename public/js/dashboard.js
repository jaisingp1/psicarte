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
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-bookings', this)"><i class="fa-solid fa-calendar-days"></i> Reservas</button></li>
            <li><button class="sidebar-btn" onclick="switchDashboardPane('admin-clients', this)"><i class="fa-solid fa-users"></i> Clientes</button></li>
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
                            <div class="action-btns">
                                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="editService('${p.id}', '${s.id}')"><i class="fa-solid fa-pencil"></i></button>
                                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="deleteService('${p.id}', '${s.id}')"><i class="fa-solid fa-trash"></i></button>
                            </div>
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
        
        const maxReschedulesInput = document.getElementById("max-reschedules-input");
        if (maxReschedulesInput) maxReschedulesInput.value = state.config?.max_reschedules || '1';
        
        renderAdminBookings();
        renderAdminClients();
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
    const bio = document.getElementById("adm-prov-bio").value;
    const email = `${name.toLowerCase().replace(/ /g, "")}@psicarte.cl`;
    
    try {
        const res = await fetch('/api/providers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: "prov-" + Date.now(), name, role, email, bio })
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

async function saveMaxReschedulesConfig(e) {
    e.preventDefault();
    const payload = {
        max_reschedules: document.getElementById('max-reschedules-input').value
    };
    
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

// ----------------------------------------------------
// ADMIN BOOKINGS MANAGEMENT
// ----------------------------------------------------
function renderAdminBookings() {
    const tbody = document.getElementById("admin-bookings-table");
    if (!tbody) return;
    
    const provFilter = document.getElementById("adm-booking-provider-filter");
    const searchInput = document.getElementById("adm-booking-search");
    
    if (provFilter && provFilter.options.length <= 1) {
        state.providers.forEach(p => {
            provFilter.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    }
    
    const filterProv = provFilter ? provFilter.value : 'all';
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filtered = [...state.bookings];
    if (filterProv !== 'all') {
        filtered = filtered.filter(b => b.providerId === filterProv);
    }
    if (searchQuery) {
        filtered = filtered.filter(b => 
            (b.clientName && b.clientName.toLowerCase().includes(searchQuery)) ||
            (b.clientEmail && b.clientEmail.toLowerCase().includes(searchQuery)) ||
            (b.serviceName && b.serviceName.toLowerCase().includes(searchQuery))
        );
    }
    
    filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No hay reservas registradas.</td></tr>';
        return;
    }
    
    tbody.innerHTML = "";
    filtered.forEach(bk => {
        const provName = state.providers.find(p => p.id === bk.providerId)?.name || 'Prestador';
        const isCancelled = bk.status === 'Cancelled';
        const statusBadge = isCancelled 
            ? '<span class="badge badge-cancelled">Cancelada</span>' 
            : bk.status === 'Paid' ? '<span class="badge badge-paid">Pagada</span>' : (bk.status === 'Pending_Payment' ? '<span class="badge badge-warning">Procesando Pago</span>' : '<span class="badge badge-pending">Pendiente</span>');
        
        let actionBtns = '';
        if (isCancelled) {
            actionBtns = `<button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="purgeBooking('${bk.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>`;
        } else {
            actionBtns = `<button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="cancelBooking('${bk.id}')"><i class="fa-solid fa-ban"></i></button>`;
        }
        
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
// ADMIN CLIENTS MANAGEMENT
// ----------------------------------------------------
function renderAdminClients() {
    const tbody = document.getElementById("admin-clients-table");
    const countEl = document.getElementById("admin-clients-count");
    if (!tbody) return;
    
    const searchInput = document.getElementById("adm-client-search");
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filtered = [...state.clients];
    if (searchQuery) {
        filtered = filtered.filter(c => 
            (c.name && c.name.toLowerCase().includes(searchQuery)) ||
            (c.email && c.email.toLowerCase().includes(searchQuery))
        );
    }
    
    if (countEl) countEl.textContent = `${filtered.length} cliente(s) registrado(s)`;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No hay clientes registrados.</td></tr>';
        return;
    }
    
    tbody.innerHTML = "";
    filtered.forEach(c => {
        const hasBookings = state.bookings.some(b => b.clientEmail === c.email);
        const deleteBtn = hasBookings
            ? `<button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; opacity: 0.5; cursor: not-allowed;" title="No se puede eliminar: tiene reservas asociadas"><i class="fa-solid fa-lock"></i></button>`
            : `<button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="deleteAdminClient('${c.email}')"><i class="fa-solid fa-trash"></i></button>`;
        
        tbody.innerHTML += `
            <tr>
                <td>${c.name}</td>
                <td>${c.email}</td>
                <td>${c.rut || '-'}</td>
                <td>${c.phone || '-'}</td>
                <td class="action-btns">
                    <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="editAdminClient('${c.email}')"><i class="fa-solid fa-pencil"></i></button>
                    ${deleteBtn}
                </td>
            </tr>
        `;
    });
}

function editAdminClient(email) {
    const client = state.clients.find(c => c.email === email);
    if (!client) return;
    
    document.getElementById("adm-client-editing-email").value = email;
    document.getElementById("adm-client-name").value = client.name || '';
    document.getElementById("adm-client-email").value = client.email || '';
    document.getElementById("adm-client-rut").value = client.rut || '';
    document.getElementById("adm-client-phone").value = client.phone || '';
    document.getElementById("admin-client-form-title").innerText = "Editar Cliente";
    document.getElementById("adm-client-email").readonly = true;
}

function resetAdminClientForm() {
    document.getElementById("admin-client-form").reset();
    document.getElementById("adm-client-editing-email").value = "";
    document.getElementById("admin-client-form-title").innerText = "Añadir Cliente";
    document.getElementById("adm-client-email").readonly = false;
}

async function saveAdminClient(e) {
    e.preventDefault();
    const editingEmail = document.getElementById("adm-client-editing-email").value;
    const name = document.getElementById("adm-client-name").value;
    const email = document.getElementById("adm-client-email").value;
    const rut = document.getElementById("adm-client-rut").value;
    const phone = document.getElementById("adm-client-phone").value;
    
    try {
        const res = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, rut, phone })
        });
        if (res.ok) {
            showToast(editingEmail ? "Cliente actualizado correctamente." : "Cliente creado correctamente.", "success");
            resetAdminClientForm();
            await loadAllData();
            renderAdminClients();
        }
    } catch (e) {
        showToast("Error de conexión.", "error");
    }
}

async function deleteAdminClient(email) {
    const hasBookings = state.bookings.some(b => b.clientEmail === email);
    if (hasBookings) {
        showToast("No se puede eliminar: el cliente tiene reservas asociadas. Cancela o elimina sus reservas primero.", "error");
        return;
    }
    
    if (confirm("¿Estás seguro de eliminar este cliente permanentemente?")) {
        try {
            const res = await fetch(`/api/clients/${encodeURIComponent(email)}`, { method: 'DELETE' });
            if (res.ok) {
                showToast("Cliente eliminado correctamente.", "success");
                await loadAllData();
                renderAdminClients();
            }
        } catch (e) {
            showToast("Error de conexión.", "error");
        }
    }
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
    document.getElementById("adm-serv-allow-reschedule").checked = service.allowReschedule !== 0;
    document.getElementById("adm-serv-max-reschedules").value = service.maxReschedules || 1;
    document.getElementById("adm-serv-max-reschedules-container").style.display = service.allowReschedule !== 0 ? "block" : "none";
    
    const submitBtn = document.querySelector("#admin-service-form button[type='submit']");
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Guardar Cambios';
    
    document.getElementById("pane-admin-providers").scrollIntoView({ behavior: 'smooth' });
}
