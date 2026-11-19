// ----------------------------------------------------
// RESCHEDULE FUNCTIONALITY
// ----------------------------------------------------
let rescheduleState = {
    bookingId: null,
    booking: null,
    providerId: null,
    serviceId: null,
    date: null,
    timeSlot: null,
    startTime: null,
    endTime: null,
    roomId: null,
    roomName: null,
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(),
    monthAvailableDays: []
};

async function openRescheduleModal(bookingId) {
    const booking = state.bookings.find(b => b.id === bookingId);
    if (!booking) {
        showToast("Reserva no encontrada.", "error");
        return;
    }
    
    const provider = state.providers.find(p => p.id === booking.providerId);
    const serviceName = booking.serviceName || "Servicio";
    
    rescheduleState = {
        bookingId: booking.id,
        booking: booking,
        providerId: booking.providerId,
        serviceId: booking.serviceId,
        date: null,
        timeSlot: null,
        startTime: null,
        endTime: null,
        roomId: null,
        roomName: null,
        calendarYear: new Date().getFullYear(),
        calendarMonth: new Date().getMonth(),
        monthAvailableDays: []
    };
    
    const bookingIdInput = document.getElementById("reschedule-booking-id");
    const bookingInfo = document.getElementById("reschedule-booking-info");
    if (bookingIdInput) bookingIdInput.value = bookingId;
    if (bookingInfo) {
        bookingInfo.innerText = `${serviceName} con ${provider?.name || booking.providerName || 'Profesional'} - Actual: ${booking.date} @ ${booking.startTime || booking.timeSlot}`;
    }
    
    const slotsEl = document.getElementById("reschedule-slots");
    const labelEl = document.getElementById("reschedule-date-label");
    if (slotsEl) slotsEl.innerHTML = '';
    if (labelEl) labelEl.innerText = 'Selecciona una fecha';
    
    const modalEl = document.getElementById("reschedule-modal");
    if (modalEl) modalEl.classList.add("active");
    await loadRescheduleMonthAvailability();
}

function closeRescheduleModal() {
    const modalEl = document.getElementById("reschedule-modal");
    if (modalEl) modalEl.classList.remove("active");
    rescheduleState = {
        bookingId: null,
        booking: null,
        providerId: null,
        serviceId: null,
        date: null,
        timeSlot: null,
        startTime: null,
        endTime: null,
        roomId: null,
        roomName: null,
        calendarYear: new Date().getFullYear(),
        calendarMonth: new Date().getMonth(),
        monthAvailableDays: []
    };
}

async function loadRescheduleMonthAvailability() {
    if (!rescheduleState.serviceId) {
        renderRescheduleCalendar();
        return;
    }

    try {
        const url = `/api/availability?serviceId=${encodeURIComponent(rescheduleState.serviceId)}` +
            (rescheduleState.providerId ? `&providerId=${encodeURIComponent(rescheduleState.providerId)}` : '') +
            `&year=${rescheduleState.calendarYear}&month=${rescheduleState.calendarMonth + 1}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            rescheduleState.monthAvailableDays = data.availableDays || [];
        } else {
            rescheduleState.monthAvailableDays = [];
        }
    } catch {
        rescheduleState.monthAvailableDays = [];
    }
    renderRescheduleCalendar();
}

function renderRescheduleCalendar() {
    const monthYear = document.getElementById("reschedule-calendar-month-year");
    const grid = document.getElementById("reschedule-calendar");
    if (!monthYear || !grid) return;
    
    monthYear.innerText = `${MONTH_NAMES[rescheduleState.calendarMonth]} ${rescheduleState.calendarYear}`;
    grid.innerHTML = "";
    
    const headers = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
    headers.forEach(h => {
        grid.innerHTML += `<div class="calendar-day-header">${h}</div>`;
    });
    
    const firstDay = new Date(rescheduleState.calendarYear, rescheduleState.calendarMonth, 1).getDay();
    const daysInMonth = new Date(rescheduleState.calendarYear, rescheduleState.calendarMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += '<div class="calendar-cell empty"></div>';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(rescheduleState.calendarYear, rescheduleState.calendarMonth, day);
        let cellClass = "calendar-cell";
        let tooltipAttr = "";
        
        const monthStr = String(rescheduleState.calendarMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${rescheduleState.calendarYear}-${monthStr}-${dayStr}`;
        
        const isPastDate = cellDate < today;
        const isAvailable = rescheduleState.monthAvailableDays.includes(dateStr);
        
        if (isPastDate) {
            cellClass += " disabled";
            tooltipAttr = 'title="Fecha pasada"';
        } else if (!isAvailable) {
            cellClass += " disabled";
            tooltipAttr = 'title="Sin horarios disponibles"';
        }
        
        if (rescheduleState.date === dateStr) {
            cellClass += " selected";
        }
        
        grid.innerHTML += `<div class="${cellClass}" ${tooltipAttr} onclick="selectRescheduleDate('${dateStr}', this)">${day}</div>`;
    }
}

async function prevRescheduleMonth() {
    rescheduleState.calendarMonth--;
    if (rescheduleState.calendarMonth < 0) {
        rescheduleState.calendarMonth = 11;
        rescheduleState.calendarYear--;
    }
    await loadRescheduleMonthAvailability();
}

async function nextRescheduleMonth() {
    rescheduleState.calendarMonth++;
    if (rescheduleState.calendarMonth > 11) {
        rescheduleState.calendarMonth = 0;
        rescheduleState.calendarYear++;
    }
    await loadRescheduleMonthAvailability();
}

async function selectRescheduleDate(dateStr, element) {
    if (element && element.classList.contains("disabled")) return;
    rescheduleState.date = dateStr;
    rescheduleState.timeSlot = null;
    rescheduleState.startTime = null;
    rescheduleState.endTime = null;
    rescheduleState.roomId = null;
    rescheduleState.roomName = null;
    
    document.querySelectorAll("#reschedule-calendar .calendar-cell").forEach(c => c.classList.remove("selected"));
    if (element) {
        element.classList.add("selected");
    }
    
    await updateRescheduleSlotsView();
}

async function updateRescheduleSlotsView() {
    const slotsGrid = document.getElementById("reschedule-slots");
    const label = document.getElementById("reschedule-date-label");
    if (!slotsGrid || !label) return;
    
    if (!rescheduleState.date) {
        label.innerText = "Selecciona una fecha";
        slotsGrid.innerHTML = "";
        return;
    }
    
    const [year, month, day] = rescheduleState.date.split("-");
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    const friendlyDate = dateObj.toLocaleDateString("es-CL", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    label.innerText = `Horas para: ${friendlyDate}`;
    slotsGrid.innerHTML = '<div style="text-align: center; color: var(--text-secondary);"><i class="fa-solid fa-circle-notch fa-spin"></i> Cargando horarios disponibles...</div>';
    
    try {
        const url = `/api/availability?serviceId=${encodeURIComponent(rescheduleState.serviceId)}` +
            (rescheduleState.providerId ? `&providerId=${encodeURIComponent(rescheduleState.providerId)}` : '') +
            `&date=${encodeURIComponent(rescheduleState.date)}`;
        const res = await fetch(url);
        if (!res.ok) {
            slotsGrid.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">No fue posible cargar los horarios.</div>';
            return;
        }
        const data = await res.json();
        const spots = data.spots || [];
        spots.sort((a, b) => {
            if (a.spotStartMins != null && b.spotStartMins != null) {
                return a.spotStartMins - b.spotStartMins;
            }
            const aTime = a.startTime || a.start_time || '';
            const bTime = b.startTime || b.start_time || '';
            return aTime.localeCompare(bTime);
        });
        
        if (spots.length === 0) {
            slotsGrid.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">No hay horarios disponibles para esta fecha.</div>';
            return;
        }
        
        slotsGrid.innerHTML = "";
        spots.forEach((spot) => {
            const spotStart = spot.startTime || spot.start_time;
            const spotEnd = spot.endTime || spot.end_time;
            const spotRoomId = spot.roomId || spot.room_id;
            const spotRoomName = spot.roomName || spot.room_name;
            const spotRoomType = spot.roomType || spot.room_type;
            const isSelected = rescheduleState.startTime === spotStart && rescheduleState.roomId === spotRoomId;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `slot-btn${isSelected ? " selected" : ""}`;
            btn.innerHTML = `
                <span class="slot-time">${spotStart} - ${spotEnd}</span>
                <span class="slot-meta">${spotRoomName} (${spotRoomType})</span>
            `;
            btn.onclick = () => selectRescheduleSlot(spot, btn);
            slotsGrid.appendChild(btn);
        });
    } catch {
        slotsGrid.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">Error al conectar con el servidor.</div>';
    }
}

function selectRescheduleSlot(spot, btnElement) {
    const spotStart = spot.startTime || spot.start_time;
    const spotEnd = spot.endTime || spot.end_time;
    const spotRoomId = spot.roomId || spot.room_id;
    const spotRoomName = spot.roomName || spot.room_name;

    rescheduleState.timeSlot = `${spotStart} - ${spotEnd}`;
    rescheduleState.startTime = spotStart;
    rescheduleState.endTime = spotEnd;
    rescheduleState.roomId = spotRoomId;
    rescheduleState.roomName = spotRoomName;
    
    document.querySelectorAll("#reschedule-slots .slot-btn").forEach(b => b.classList.remove("selected"));
    if (btnElement) {
        btnElement.classList.add("selected");
    }
}

async function confirmReschedule() {
    if (!rescheduleState.date || !rescheduleState.startTime || !rescheduleState.roomId) {
        showToast("Debe seleccionar una nueva fecha, hora y sala.", "error");
        return;
    }
    
    try {
        const res = await fetch(`/api/bookings/${rescheduleState.bookingId}/reschedule`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                newDate: rescheduleState.date,
                newStartTime: rescheduleState.startTime,
                newRoomId: rescheduleState.roomId
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast("Reserva reagendada con éxito.", "success");
            closeRescheduleModal();
            await loadAllData();
            if (typeof renderDashboardPanes === 'function') {
                renderDashboardPanes();
            }
        } else {
            showToast(data.error || "Error al reagendar.", "error");
        }
    } catch {
        showToast("Error de conexión al reagendar.", "error");
    }
}
