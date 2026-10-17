// ----------------------------------------------------
// BOOKING WIDGET LOGIC
// ----------------------------------------------------
function initBookingWidget() {
    const provSelect = document.getElementById("booking-provider");
    if (!provSelect) return;
    
    provSelect.innerHTML = '<option value="">Selecciona profesional...</option>';
    state.providers.forEach(p => {
        provSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.role.split(" (")[0]})</option>`;
    });
    
    const servSelect = document.getElementById("booking-service");
    if (servSelect) {
        servSelect.innerHTML = '<option value="">Selecciona un profesional primero...</option>';
    }

    // Reset to provider tab
    setSearchMethod('provider');
    initBookingServiceAll();
}

function setSearchMethod(method) {
    bookingSearchMethod = method;

    const tabProvider = document.getElementById("tab-provider");
    const tabService = document.getElementById("tab-service");
    const groupProvider = document.getElementById("search-by-provider-group");
    const groupService = document.getElementById("search-by-service-group");

    if (method === 'provider') {
        tabProvider.classList.add("active");
        tabProvider.setAttribute("aria-selected", "true");
        tabService.classList.remove("active");
        tabService.setAttribute("aria-selected", "false");
        groupProvider.style.display = "block";
        groupService.style.display = "none";
    } else {
        tabService.classList.add("active");
        tabService.setAttribute("aria-selected", "true");
        tabProvider.classList.remove("active");
        tabProvider.setAttribute("aria-selected", "false");
        groupService.style.display = "block";
        groupProvider.style.display = "none";
    }
}

function initBookingServiceAll() {
    const servAllSelect = document.getElementById("booking-service-all");
    servAllSelect.innerHTML = '<option value="">Selecciona un servicio...</option>';

    state.providers.forEach(provider => {
        provider.services.forEach(s => {
            const label = `${s.name} - $${s.price.toLocaleString("es-CL")} (${s.duration} min) [con ${provider.name}]`;
            servAllSelect.innerHTML += `<option value="${provider.id}|${s.id}">${label}</option>`;
        });
    });
}

function onBookingServiceAllChange() {
    const val = document.getElementById("booking-service-all").value;
    const provAutoSelect = document.getElementById("booking-provider-auto");

    if (!val) {
        provAutoSelect.innerHTML = '<option value="">Se seleccionará automáticamente...</option>';
        return;
    }

    const [provId] = val.split("|");
    const provider = state.providers.find(p => p.id === provId);

    provAutoSelect.innerHTML = '';
    const opt = document.createElement("option");
    opt.value = provider.id;
    opt.textContent = `${provider.name} (${provider.role.split(" (")[0]})`;
    opt.selected = true;
    provAutoSelect.appendChild(opt);
}

function onBookingProviderChange() {
    const provId = document.getElementById("booking-provider").value;
    const servSelect = document.getElementById("booking-service");
    
    if (!provId) {
        servSelect.innerHTML = '<option value="">Selecciona un profesional primero...</option>';
        return;
    }
    
    const provider = state.providers.find(p => p.id === provId);
    servSelect.innerHTML = '<option value="">Selecciona servicio...</option>';
    provider.services.forEach(s => {
        servSelect.innerHTML += `<option value="${s.id}">${s.name} - $${s.price.toLocaleString("es-CL")} (${s.duration} min)</option>`;
    });
}

function goToStep(stepNum) {
    if (stepNum === 2 && bookingState.step === 1) {
        if (bookingSearchMethod === 'provider') {
            const provId = document.getElementById("booking-provider").value;
            const servId = document.getElementById("booking-service").value;
            
            if (!provId || !servId) {
                showToast("Por favor complete todas las selecciones del Paso 1", "error");
                return;
            }
            
            bookingState.provider = state.providers.find(p => p.id === provId);
            bookingState.service = bookingState.provider.services.find(s => s.id === servId);
        } else {
            const val = document.getElementById("booking-service-all").value;
            
            if (!val) {
                showToast("Por favor selecciona un servicio en el Paso 1", "error");
                return;
            }
            
            const [provId, servId] = val.split("|");
            bookingState.provider = state.providers.find(p => p.id === provId);
            bookingState.service = bookingState.provider.services.find(s => s.id === servId);
        }
        
        bookingState.room = null; // Automatically determined per slot
        bookingState.selectedSpotId = null;
        bookingState.availableSpots = [];
        
        renderCalendar();
        updateSlotsView();
    }
    
    if (stepNum === 3 && bookingState.step === 2) {
        if (!bookingState.date || !bookingState.timeSlot) {
            showToast("Debe seleccionar una Fecha y un Bloque Horario disponible", "error");
            return;
        }
        
        // Auto fill if client is logged in
        if (state.currentUser && state.currentUser.role === "usuario") {
            fetch('/api/clients', { headers: getAuthHeaders() })
                .then(r => r.json())
                .then(clients => {
                    const clientData = clients.find(c => c.email === state.currentUser.email);
                    if (clientData) {
                        document.getElementById("client-name").value = clientData.name;
                        document.getElementById("client-rut").value = clientData.rut;
                        document.getElementById("client-email").value = clientData.email;
                        document.getElementById("client-phone").value = clientData.phone;
                        document.getElementById("logged-in-autofill-msg").style.display = "block";
                    }
                });
        } else {
            document.getElementById("logged-in-autofill-msg").style.display = "none";
        }
    }
    
    if (stepNum === 4 && bookingState.step === 3) {
        const form = document.getElementById("booking-form");
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        bookingState.client.name = document.getElementById("client-name").value;
        bookingState.client.rut = document.getElementById("client-rut").value;
        bookingState.client.email = document.getElementById("client-email").value;
        bookingState.client.phone = document.getElementById("client-phone").value;
        
        // Render Summary
        document.getElementById("sum-provider").innerText = bookingState.provider.name;
        document.getElementById("sum-service").innerText = bookingState.service.name;
        document.getElementById("sum-room").innerText = bookingState.room.name;
        document.getElementById("sum-datetime").innerText = `${bookingState.date} a las ${bookingState.timeSlot}`;
        document.getElementById("sum-patient").innerText = `${bookingState.client.name} (RUT: ${bookingState.client.rut})`;
        document.getElementById("sum-price").innerText = `$${bookingState.service.price.toLocaleString("es-CL")}`;
    }

    document.querySelectorAll(".booking-pane").forEach(pane => pane.classList.remove("active"));
    document.getElementById(`pane-step-${stepNum}`).classList.add("active");
    
    document.querySelectorAll(".step-indicator").forEach((ind, idx) => {
        ind.classList.remove("active", "completed");
        if (idx + 1 === stepNum) {
            ind.classList.add("active");
        } else if (idx + 1 < stepNum) {
            ind.classList.add("completed");
        }
    });
    
    bookingState.step = stepNum;
}

// checkDateAvailability helper — checks if any cached available spots exist for a given date
function checkDateAvailability(dateStr, providerId, serviceType, bookingIdToIgnore = null) {
    if (!bookingState.availableSpots || bookingState.availableSpots.length === 0) {
        return { available: false, reason: "Cargando disponibilidad..." };
    }

    const hasSpot = bookingState.availableSpots.some(spot => spot.date === dateStr);
    if (hasSpot) {
        return { available: true, reason: "" };
    }
    return { available: false, reason: "No hay bloques horarios disponibles para este día" };
}

// Calendar Gen
function renderCalendar() {
    const calendarMonthYear = document.getElementById("calendar-month-year");
    const calendarGrid = document.getElementById("booking-calendar");
    if (!calendarMonthYear || !calendarGrid) return;
    
    calendarMonthYear.innerText = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    calendarGrid.innerHTML = "";
    
    const headers = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
    headers.forEach(h => {
        calendarGrid.innerHTML += `<div class="calendar-day-header">${h}</div>`;
    });
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        calendarGrid.innerHTML += '<div class="calendar-cell empty"></div>';
    }
    
    const today = new Date();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(currentYear, currentMonth, day);
        let cellClass = "calendar-cell";
        let tooltipAttr = "";
        
        const monthStr = String(currentMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
        
        const isPastDate = cellDate < today && cellDate.toDateString() !== today.toDateString();
        
        if (isPastDate) {
            cellClass += " disabled";
            tooltipAttr = 'title="Fecha pasada"';
        } else {
            // Verificar disponibilidad si el profesional y servicio están seleccionados
            if (bookingState.provider && bookingState.service) {
                const availability = checkDateAvailability(dateStr, bookingState.provider.id, bookingState.service.type);
                if (!availability.available) {
                    cellClass += " disabled";
                    tooltipAttr = `title="${availability.reason}"`;
                }
            }
        }
        
        if (bookingState.date === dateStr) {
            cellClass += " selected";
        }
        
        calendarGrid.innerHTML += `<div class="${cellClass}" ${tooltipAttr} onclick="selectDate('${dateStr}', this)">${day}</div>`;
    }
}

function prevMonth() {
    const today = new Date();
    if (currentYear === today.getFullYear() && currentMonth <= today.getMonth()) {
        showToast("No puedes agendar en meses pasados", "error");
        return;
    }
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

function selectDate(dateStr, element) {
    if (element.classList.contains("disabled")) return;
    bookingState.date = dateStr;
    bookingState.timeSlot = null;
    bookingState.startTime = null;
    bookingState.endTime = null;
    bookingState.selectedSpotId = null;
    bookingState.room = null;
    document.querySelectorAll(".calendar-cell").forEach(c => c.classList.remove("selected"));
    element.classList.add("selected");
    updateSlotsView();
}

// Fetch available spots from the agenda API and render them for the selected date
async function updateSlotsView() {
    const slotsGrid = document.getElementById("booking-slots");
    const label = document.getElementById("selected-date-label");
    if (!slotsGrid || !label) return;
    
    if (!bookingState.date) {
        label.innerText = "Selecciona una fecha en el calendario";
        slotsGrid.innerHTML = "";
        return;
    }
    
    const [year, month, day] = bookingState.date.split("-");
    const dateObj = new Date(year, parseInt(month) - 1, day);
    const friendlyDate = dateObj.toLocaleDateString("es-CL", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    label.innerText = `Horas para: ${friendlyDate}`;
    
    // Fetch spots if not already loaded for this provider+service combo
    const needFetch = bookingState.availableSpots.length === 0;
    if (needFetch) {
        slotsGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--text-secondary);">Cargando horarios disponibles...</div>';
        try {
            const params = new URLSearchParams({
                providerId: bookingState.provider.id,
                serviceId: bookingState.service.id
            });
            const response = await fetch(`/api/spots/available?${params}`);
            if (!response.ok) {
                slotsGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--text-secondary);">Error al cargar disponibilidad.</div>';
                return;
            }
            bookingState.availableSpots = await response.json();
            // Re-render calendar to reflect available dates
            renderCalendar();
        } catch (e) {
            slotsGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--text-secondary);">Error de conexión al cargar disponibilidad.</div>';
            return;
        }
    }
    
    // Filter spots for the selected date
    const dateSpots = bookingState.availableSpots.filter(s => s.date === bookingState.date);
    
    if (dateSpots.length === 0) {
        slotsGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--text-secondary);">No hay horarios disponibles para este día.</div>';
        return;
    }
    
    // Sort by start_time
    dateSpots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    slotsGrid.innerHTML = "";
    
    dateSpots.forEach(spot => {
        const isSelected = bookingState.selectedSpotId === spot.id;
        const btnClass = "slot-btn" + (isSelected ? " selected" : "");
        const roomParam = JSON.stringify(spot).replace(/"/g, '&quot;');
        
        slotsGrid.innerHTML += `
            <button class="${btnClass}" onclick='selectSpot(${roomParam})'>
                ${spot.start_time}
            </button>
        `;
    });
}

function selectSpot(spot) {
    bookingState.selectedSpotId = spot.id;
    bookingState.timeSlot = `${spot.start_time}-${spot.end_time}`;
    bookingState.startTime = spot.start_time;
    bookingState.endTime = spot.end_time;
    bookingState.room = state.rooms.find(r => r.id === spot.room_id) || {
        id: spot.room_id,
        name: spot.roomName || spot.room_id
    };
    
    document.querySelectorAll(".slot-btn").forEach(b => {
        if (b.innerText.trim() === spot.start_time) {
            b.classList.add("selected");
        } else {
            b.classList.remove("selected");
        }
    });
}

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
}

// Process Payment and Book in SQLite Database via Khipu
async function processPayment() {
    showToast("Creando solicitud de agendamiento...", "info");
    
    const newBooking = {
        id: "bk-" + Date.now(),
        spot_id: bookingState.selectedSpotId,
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
        clientPhone: bookingState.client.phone
    };

    try {
        // Step 1: Create the Pending_Payment booking in backend
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(newBooking)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            showToast(result.error || "Error al registrar la reserva", "error");
            return;
        }

        const bookingId = result.id;
        
        // Step 2: Create Khipu payment intent
        showToast("Generando cobro seguro con Khipu...", "info");
        const khipuResponse = await fetch('/api/khipu/create-payment', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ bookingId })
        });
        
        const khipuResult = await khipuResponse.json();
        if (!khipuResponse.ok) {
            showToast(khipuResult.error || "Error al iniciar pasarela Khipu", "error");
            return;
        }

        const { paymentId } = khipuResult;
        
        // Step 2.5: Handle Khipu Offline Simulator fallback
        if (khipuResult.isOfflineMock) {
            showToast("Simulando portal Khipu Offline...", "info");
            setTimeout(async () => {
                try {
                    // Send mock payment notification to local webhook
                    const notifyResponse = await fetch('/api/khipu/notify', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ notification_token: paymentId })
                    });
                    
                    if (notifyResponse.ok) {
                        showToast("Pago simulado procesado localmente.", "success");
                        await pollPaymentStatus(bookingId);
                    } else {
                        showToast("Error al simular la notificación de pago local.", "error");
                    }
                } catch (errMock) {
                    showToast("Error de conexión al simular la notificación local.", "error");
                }
            }, 1500);
            return;
        }
        
        // Step 3: Launch Khipu Inside Web SDK modal
        if (typeof Khipu === 'undefined') {
            showToast("Error: SDK de Khipu no cargado. Reintentando...", "error");
            window.location.reload();
            return;
        }

        const khipu = new Khipu();
        khipu.startOperation(paymentId, (res) => {
            handleKhipuResult(res, bookingId);
        }, {
            mountElement: document.getElementById('khipu-web-root'),
            modal: true,
            modalOptions: { maxWidth: 450, maxHeight: 860 },
            options: {
                style: { primaryColor: '#bfa15f', fontFamily: 'Outfit' },
                skipExitPage: false
            }
        });
        
    } catch (e) {
        showToast("Error de conexión al procesar el pago.", "error");
    }
}

async function handleKhipuResult(result, bookingId) {
    if (result.result === 'OK') {
        showToast("Pago registrado por Khipu. Confirmando reserva...", "info");
        await pollPaymentStatus(bookingId);
    } else if (result.result === 'ERROR') {
        showToast(result.exitTitle || 'Error en el proceso de pago con Khipu.', "error");
    } else if (result.result === 'WARNING') {
        showToast(result.exitTitle || 'El pago está pendiente de confirmación.', "warning");
        await pollPaymentStatus(bookingId);
    }
}

async function pollPaymentStatus(bookingId, maxAttempts = 15, intervalMs = 2000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await fetch(`/api/bookings/${bookingId}/payment-status`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'Paid') {
                    showToast("¡Pago confirmado y cita agendada exitosamente!", "success");
                    
                    // Reset Wizard
                    bookingState = {
                        step: 1, provider: null, service: null, room: null,
                        date: null, timeSlot: null, startTime: null, endTime: null,
                        selectedSpotId: null, availableSpots: [],
                        client: { name: "", rut: "", email: "", phone: "" }
                    };
                    
                    await loadAllData();
                    initBookingWidget();
                    goToStep(1);
                    
                    if (state.currentUser) {
                        renderDashboardPanes();
                    }
                    return true;
                } else if (data.status === 'Payment_Conflict') {
                    showToast("Conflicto de horario detectado. El slot ya fue tomado por otro usuario. Por favor contacta al administrador.", "error");
                    return false;
                }
            }
        } catch (e) {
            // Silently retry on polling error
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    // Timeout
    showToast("Tu pago está siendo procesado por Khipu. Te enviaremos un correo de confirmación tan pronto sea validado.", "info");
    
    // Reset Wizard anyway
    bookingState = {
        step: 1, provider: null, service: null, room: null,
        date: null, timeSlot: null, startTime: null, endTime: null,
        selectedSpotId: null, availableSpots: [],
        client: { name: "", rut: "", email: "", phone: "" }
    };
    await loadAllData();
    initBookingWidget();
    goToStep(1);
    
    return false;
}
