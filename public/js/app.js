// ----------------------------------------------------
// MAIN ENTRY POINT
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    await loadAllData();
    setupEventListeners();
    initBookingWidget();
    renderContent();
    renderServicesSection();
    renderCommunityCalendar();
    renderActivities();
    checkPopups();
    updateAuthUI();
    renderFooterYear();
    renderWhatsAppButton();
});

// ----------------------------------------------------
// SERVICE EDIT MODE (overrides addService from dashboard.js)
// ----------------------------------------------------
const originalAddService = addService;
addService = async function(e) {
    e.preventDefault();
    
    if (editingServiceId) {
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
                body: JSON.stringify({ id: editingServiceId, providerId: provId, name, price, duration, type: "Virtual", allowReschedule, maxReschedules })
            });
            if (res.ok) {
                showToast("Servicio actualizado correctamente.", "success");
                editingServiceId = null;
                document.getElementById("admin-service-form").reset();
                document.getElementById("adm-serv-allow-reschedule").checked = true;
                document.getElementById("adm-serv-max-reschedules").value = "1";
                document.getElementById("adm-serv-max-reschedules-container").style.display = "block";
                const submitBtn = document.querySelector("#admin-service-form button[type='submit']");
                if (submitBtn) submitBtn.innerHTML = 'Añadir Servicio';
                await loadAllData();
                renderDashboardPanes();
                renderServicesSection();
            }
        } catch (err) {
            showToast("Error al actualizar servicio.", "error");
        }
        return;
    }
    
    originalAddService(e);
};

// ----------------------------------------------------
// ADMIN BOOKING MODE (overrides goToStep and processPayment)
// ----------------------------------------------------
function initAdminBookingMode() {
    const isAdminMode = sessionStorage.getItem("admin_booking_mode") === "true";
    if (!isAdminMode) return;
    
    const widget = document.querySelector('.booking-widget');
    if (widget) {
        const banner = document.createElement('div');
        banner.id = 'admin-booking-banner';
        banner.style.cssText = 'background: var(--color-info); color: #fff; padding: 12px 20px; border-radius: var(--radius-sm); margin-bottom: 20px; display: flex; align-items: center; gap: 10px;';
        banner.innerHTML = '<i class="fa-solid fa-user-shield"></i> <strong>Modo Administrador:</strong> Estás creando una reserva para un cliente. El pago se omitirá automáticamente.';
        widget.insertBefore(banner, widget.firstChild);
    }
    
    const step3 = document.getElementById("pane-step-3");
    if (step3) {
        const existingSearch = document.getElementById("admin-client-search-booking");
        if (!existingSearch) {
            const searchDiv = document.createElement('div');
            searchDiv.className = 'form-group';
            searchDiv.id = 'admin-client-search-booking';
            searchDiv.innerHTML = `
                <label>Seleccionar Cliente Registrado:</label>
                <select class="form-control" id="admin-booking-client-select" onchange="onAdminBookingClientChange()">
                    <option value="">-- Crear Cliente Nuevo --</option>
                </select>
            `;
            step3.insertBefore(searchDiv, step3.firstChild);
            
            const select = document.getElementById("admin-booking-client-select");
            state.clients.forEach(c => {
                select.innerHTML += `<option value="${c.email}">${c.name} (${c.email})</option>`;
            });
        }
    }
}

function onAdminBookingClientChange() {
    const email = document.getElementById("admin-booking-client-select").value;
    if (!email) {
        document.getElementById("client-name").value = '';
        document.getElementById("client-rut").value = '';
        document.getElementById("client-email").value = '';
        document.getElementById("client-phone").value = '';
        return;
    }
    
    const client = state.clients.find(c => c.email === email);
    if (client) {
        document.getElementById("client-name").value = client.name || '';
        document.getElementById("client-rut").value = client.rut || '';
        document.getElementById("client-email").value = client.email || '';
        document.getElementById("client-phone").value = client.phone || '';
    }
}

const originalGoToStep = goToStep;
goToStep = function(stepNum) {
    originalGoToStep(stepNum);
    
    const isAdminMode = sessionStorage.getItem("admin_booking_mode") === "true";
    if (isAdminMode && stepNum === 3) {
        initAdminBookingMode();
    }
};

const originalProcessPayment = processPayment;
processPayment = async function() {
    const isAdminMode = sessionStorage.getItem("admin_booking_mode") === "true";
    
    if (isAdminMode) {
        bookingState.client.name = document.getElementById("client-name").value;
        bookingState.client.rut = document.getElementById("client-rut").value;
        bookingState.client.email = document.getElementById("client-email").value;
        bookingState.client.phone = document.getElementById("client-phone").value;
        
        if (!bookingState.client.name || !bookingState.client.email) {
            showToast("Debe completar los datos del cliente.", "error");
            return;
        }
        
        showToast("Registrando reserva como administrador...", "info");
        
        const newBooking = {
            id: "bk-" + Date.now(),
            providerId: bookingState.provider.id,
            serviceId: bookingState.service.id,
            serviceName: bookingState.service.name,
            price: bookingState.service.price,
            duration: bookingState.service.duration,
            roomId: bookingState.room.id,
            roomName: bookingState.room.name,
            date: bookingState.date,
            timeSlot: bookingState.timeSlot,
            startTime: bookingState.startTime,
            endTime: bookingState.endTime,
            clientEmail: bookingState.client.email,
            clientName: bookingState.client.name,
            clientRut: bookingState.client.rut,
            clientPhone: bookingState.client.phone,
            adminMode: true
        };
        
        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBooking)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showToast("Reserva registrada exitosamente por el administrador.", "success");
                sessionStorage.removeItem("admin_booking_mode");
                const banner = document.getElementById("admin-booking-banner");
                if (banner) banner.remove();
                
                bookingState = {
                    step: 1, provider: null, service: null, room: null,
                    date: null, timeSlot: null, startTime: null, endTime: null,
                    client: { name: "", rut: "", email: "", phone: "" }
                };
                
                await loadAllData();
                window.location.href = 'acceso.html';
            } else {
                showToast(result.error || "Error al registrar la reserva.", "error");
            }
        } catch (e) {
            showToast("Error de conexión al guardar la reserva.", "error");
        }
        return;
    }
    
    originalProcessPayment();
};
