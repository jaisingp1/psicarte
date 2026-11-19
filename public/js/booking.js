// ----------------------------------------------------
// BOOKING WIDGET LOGIC (5-Minute Grid Availability)
// ----------------------------------------------------
function initBookingWidget() {
    const provSelect = document.getElementById("booking-provider");
    if (!provSelect) return;

    provSelect.innerHTML = '<option value="">Selecciona profesional...</option>';
    (state.providers || []).forEach(p => {
        provSelect.innerHTML += `<option value="${p.id}">${p.name} (${(p.specialty || p.role).split(" (")[0]})</option>`;
    });

    const servSelect = document.getElementById("booking-service");
    if (servSelect) {
        servSelect.innerHTML = '<option value="">Selecciona un profesional primero...</option>';
    }

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
    if (!servAllSelect) return;

    servAllSelect.innerHTML = '<option value="">Selecciona un servicio...</option>';
    (state.services || []).forEach(s => {
        servAllSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    const provAutoSelect = document.getElementById("booking-provider-auto");
    if (provAutoSelect) {
        provAutoSelect.innerHTML = '<option value="">Cualquier profesional disponible</option>';
    }
}

function onBookingServiceAllChange() {
    const serviceId = document.getElementById("booking-service-all").value;
    const provAutoSelect = document.getElementById("booking-provider-auto");
    if (!provAutoSelect) return;

    provAutoSelect.innerHTML = '<option value="">Cualquier profesional disponible</option>';
    if (!serviceId) return;

    const service = (state.services || []).find(s => s.id === serviceId);
    if (!service || !Array.isArray(service.providers)) return;

    service.providers.forEach(p => {
        const provUser = (state.providers || []).find(u => u.id === p.provider_id);
        const name = provUser ? provUser.name : p.provider_name || 'Profesional';
        provAutoSelect.innerHTML += `<option value="${p.provider_id}">${name} - $${Number(p.price).toLocaleString("es-CL")} (${p.duration} min)</option>`;
    });
}

function onBookingProviderChange() {
    const provId = document.getElementById("booking-provider").value;
    const servSelect = document.getElementById("booking-service");

    if (!provId) {
        servSelect.innerHTML = '<option value="">Selecciona un profesional primero...</option>';
        return;
    }

    const provider = (state.providers || []).find(p => p.id === provId);
    servSelect.innerHTML = '<option value="">Selecciona servicio...</option>';
    (provider?.services || []).forEach(s => {
        servSelect.innerHTML += `<option value="${s.service_id || s.id}">${s.name} - $${Number(s.price).toLocaleString("es-CL")} (${s.duration} min)</option>`;
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
            bookingState.service = bookingState.provider.services.find(s => (s.service_id || s.id) === servId);
            bookingState.service.id = servId;
        } else {
            const servId = document.getElementById("booking-service-all").value;
            const provId = document.getElementById("booking-provider-auto").value;

            if (!servId) {
                showToast("Por favor selecciona un servicio en el Paso 1", "error");
                return;
            }

            bookingState.service = (state.services || []).find(s => s.id === servId);
            bookingState.provider = provId ? state.providers.find(p => p.id === provId) : null;
        }

        bookingState.room = null;
        bookingState.date = null;
        bookingState.timeSlot = null;
        bookingState.startTime = null;
        bookingState.endTime = null;
        bookingState.availableDates = [];
        bookingState.daySpots = [];

        // Preview en Paso 2
        const s2Prov = document.getElementById("step2-sum-provider");
        const s2Serv = document.getElementById("step2-sum-service");
        const s2Price = document.getElementById("step2-sum-price");

        if (s2Prov) s2Prov.innerText = bookingState.provider ? bookingState.provider.name : 'Cualquiera disponible';
        if (s2Serv) s2Serv.innerText = bookingState.service ? bookingState.service.name : '-';
        if (s2Price) s2Price.innerText = bookingState.provider && bookingState.service?.price ? `$${Number(bookingState.service.price).toLocaleString("es-CL")}` : 'Según profesional';

        loadAvailabilityForStep2();
    }

    if (stepNum === 3 && bookingState.step === 2) {
        if (!bookingState.date || !bookingState.startTime || !bookingState.room) {
            showToast("Debe seleccionar una Fecha y un Bloque Horario disponible", "error");
            return;
        }

        // Preview en Paso 3
        const s3Prov = document.getElementById("step3-sum-provider");
        const s3Serv = document.getElementById("step3-sum-service");
        const s3Date = document.getElementById("step3-sum-datetime");
        const s3Price = document.getElementById("step3-sum-price");

        if (s3Prov) s3Prov.innerText = bookingState.provider?.name || '-';
        if (s3Serv) s3Serv.innerText = `${bookingState.service.name} (${bookingState.duration} min)`;

        const [y, m, d] = bookingState.date.split("-");
        const dateObj = new Date(y, parseInt(m, 10) - 1, d);
        const friendlyDate = dateObj.toLocaleDateString("es-CL", { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        if (s3Date) s3Date.innerText = `${friendlyDate} • ${bookingState.timeSlot} hrs`;
        if (s3Price) s3Price.innerText = `$${Number(bookingState.price).toLocaleString("es-CL")}`;

        // Auto-fill si está autenticado
        if (state.currentUser && state.currentUser.role === "usuario") {
            const nameEl = document.getElementById("client-name");
            const emailEl = document.getElementById("client-email");
            const rutEl = document.getElementById("client-rut");
            const phoneEl = document.getElementById("client-phone");
            if (nameEl) nameEl.value = state.currentUser.name || '';
            if (emailEl) emailEl.value = state.currentUser.email || '';
            if (rutEl) rutEl.value = state.currentUser.rut || '';
            if (phoneEl) phoneEl.value = state.currentUser.phone || '';
            const msgEl = document.getElementById("logged-in-autofill-msg");
            if (msgEl) msgEl.style.display = "block";
        }
    }

    if (stepNum === 4 && bookingState.step === 3) {
        const form = document.getElementById("booking-form");
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        bookingState.client = {
            name: document.getElementById("client-name").value,
            rut: document.getElementById("client-rut").value,
            email: document.getElementById("client-email").value,
            phone: document.getElementById("client-phone").value
        };

        // Render Summary Paso 4
        document.getElementById("sum-provider").innerText = bookingState.provider?.name || '-';
        document.getElementById("sum-service").innerText = bookingState.service.name;
        document.getElementById("sum-room").innerText = `${bookingState.room.name} (${bookingState.room.type === 'Virtual' ? 'Online' : 'Presencial'})`;
        document.getElementById("sum-datetime").innerText = `${bookingState.date} a las ${bookingState.timeSlot}`;
        document.getElementById("sum-patient").innerText = `${bookingState.client.name} (RUT: ${bookingState.client.rut})`;
        document.getElementById("sum-price").innerText = `$${Number(bookingState.price).toLocaleString("es-CL")}`;
    }

    document.querySelectorAll(".booking-pane").forEach(pane => pane.classList.remove("active"));
    const targetPane = document.getElementById(`pane-step-${stepNum}`);
    if (targetPane) targetPane.classList.add("active");

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

// Carga disponibilidad mensual para el calendario
async function loadAvailabilityForStep2() {
    if (!bookingState.service) return;

    const slotsGrid = document.getElementById("booking-slots");
    if (slotsGrid) {
        slotsGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--text-secondary); padding: 20px;">Cargando disponibilidad...</div>';
    }

    try {
        const params = new URLSearchParams({
            serviceId: bookingState.service.id,
            year: currentYear,
            month: currentMonth + 1
        });
        if (bookingState.provider?.id) {
            params.set('providerId', bookingState.provider.id);
        }

        const res = await fetch(`/api/availability?${params.toString()}`);
        if (res.ok) {
            const data = await res.json();
            bookingState.availableDates = data.availableDates || [];
        } else {
            bookingState.availableDates = [];
        }
    } catch (e) {
        console.error("Error al cargar disponibilidad:", e);
        bookingState.availableDates = [];
    }

    renderCalendar();
}

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
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let day = 1; day <= daysInMonth; day++) {
        const monthStr = String(currentMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

        let cellClass = "calendar-cell";
        let tooltipAttr = "";

        const isPastDate = dateStr < todayStr;
        const isAvailable = (bookingState.availableDates || []).includes(dateStr);

        if (isPastDate) {
            cellClass += " disabled";
            tooltipAttr = 'title="Fecha pasada"';
        } else if (!isAvailable) {
            cellClass += " disabled";
            tooltipAttr = 'title="Sin horarios disponibles"';
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
    loadAvailabilityForStep2();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    loadAvailabilityForStep2();
}

async function selectDate(dateStr, element) {
    if (element.classList.contains("disabled")) return;

    bookingState.date = dateStr;
    bookingState.timeSlot = null;
    bookingState.startTime = null;
    bookingState.endTime = null;
    bookingState.room = null;

    document.querySelectorAll(".calendar-cell").forEach(c => c.classList.remove("selected"));
    element.classList.add("selected");

    const slotsGrid = document.getElementById("booking-slots");
    const label = document.getElementById("selected-date-label");
    if (!slotsGrid || !label) return;

    const [year, month, day] = dateStr.split("-");
    const dateObj = new Date(year, parseInt(month, 10) - 1, day);
    const friendlyDate = dateObj.toLocaleDateString("es-CL", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    label.innerText = `Horas para: ${friendlyDate}`;
    slotsGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--text-secondary); padding: 15px;">Consultando spots disponibles...</div>';

    try {
        const params = new URLSearchParams({
            serviceId: bookingState.service.id,
            date: dateStr
        });
        if (bookingState.provider?.id) {
            params.set('providerId', bookingState.provider.id);
        }

        const res = await fetch(`/api/availability?${params.toString()}`);
        if (!res.ok) {
            slotsGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--text-secondary);">No se pudieron cargar los horarios.</div>';
            return;
        }

        const data = await res.json();
        bookingState.daySpots = data.spots || [];
        bookingState.daySpots.sort((a, b) => {
            if (a.spotStartMins != null && b.spotStartMins != null) {
                return a.spotStartMins - b.spotStartMins;
            }
            return (a.startTime || '').localeCompare(b.startTime || '');
        });

        if (bookingState.daySpots.length === 0) {
            slotsGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--text-secondary); padding: 15px;">No hay horarios disponibles para este día.</div>';
            return;
        }

        slotsGrid.innerHTML = "";
        bookingState.daySpots.forEach((spot, idx) => {
            const isSelected = bookingState.startTime === spot.startTime && bookingState.room?.id === spot.roomId && bookingState.provider?.id === spot.providerId;
            const btnClass = "slot-btn" + (isSelected ? " selected" : "");
            const isVirtual = spot.roomType === 'Virtual';
            const icon = isVirtual ? 'fa-wifi' : 'fa-building';
            const modLabel = isVirtual ? 'Online' : 'Presencial';

            slotsGrid.innerHTML += `
                <button class="${btnClass}" type="button" onclick="selectSpotIndex(${idx})">
                    <span class="slot-time">${spot.startTime} - ${spot.endTime}</span>
                    <span class="slot-meta">
                        <i class="fa-solid ${icon}"></i> ${modLabel} • ${spot.providerName.split(' ')[0]}
                    </span>
                    <span class="slot-meta" style="font-weight: 600;">
                        $${Number(spot.price).toLocaleString("es-CL")}
                    </span>
                </button>
            `;
        });
    } catch (e) {
        console.error("Error al obtener spots del día:", e);
        slotsGrid.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--text-secondary);">Error consultando disponibilidad.</div>';
    }
}

function selectSpotIndex(idx) {
    const spot = bookingState.daySpots?.[idx];
    if (!spot) return;

    bookingState.provider = { id: spot.providerId, name: spot.providerName };
    bookingState.room = { id: spot.roomId, name: spot.roomName, type: spot.roomType, meet_enabled: spot.roomMeetEnabled };
    bookingState.startTime = spot.startTime;
    bookingState.endTime = spot.endTime;
    bookingState.timeSlot = spot.timeSlot;
    bookingState.duration = spot.duration;
    bookingState.price = spot.price;

    document.querySelectorAll(".slot-btn").forEach((b, i) => {
        b.classList.toggle("selected", i === idx);
    });
}

// Procesa el agendamiento y pago con Khipu
async function processPayment() {
    showToast("Creando solicitud de agendamiento...", "info");

    const newBooking = {
        serviceId: bookingState.service.id,
        providerId: bookingState.provider.id,
        roomId: bookingState.room.id,
        date: bookingState.date,
        startTime: bookingState.startTime,
        clientEmail: bookingState.client.email,
        clientName: bookingState.client.name,
        clientRut: bookingState.client.rut,
        clientPhone: bookingState.client.phone
    };

    try {
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

        // Iniciar pago con Khipu
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

        if (typeof Khipu === 'undefined') {
            showToast("Error: SDK de Khipu no cargado. Reintentando...", "error");
            window.location.reload();
            return;
        }

        const mountEl = document.getElementById('khipu-web-root') || document.body;
        mountEl.innerHTML = '';

        const khipuPrimaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
        const khipu = new Khipu();
        khipu.startOperation(paymentId, (res) => {
            handleKhipuResult(res, bookingId);
        }, {
            mountElement: mountEl,
            modal: true,
            modalOptions: { maxWidth: 450, maxHeight: 860 },
            options: {
                style: { primaryColor: khipuPrimaryColor, fontFamily: 'Outfit' },
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
                    window.location.href = `/exito?bookingId=${bookingId}`;
                    return true;
                } else if (data.status === 'Payment_Conflict') {
                    window.location.href = `/exito?bookingId=${bookingId}`;
                    return false;
                }
            }
        } catch (_) {
            // Reintento silencioso
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    showToast("Tu pago está siendo procesado por Khipu. Te enviaremos un correo de confirmación tan pronto sea validado.", "info");

    bookingState = {
        step: 1, provider: null, service: null, room: null,
        date: null, timeSlot: null, startTime: null, endTime: null,
        daySpots: [], availableDates: [],
        client: { name: "", rut: "", email: "", phone: "" }
    };
    await loadAllData();
    initBookingWidget();
    goToStep(1);

    return false;
}
