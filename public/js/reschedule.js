// ----------------------------------------------------
// RESCHEDULE FUNCTIONALITY
// ----------------------------------------------------
function openRescheduleModal(bookingId) {
    const booking = state.bookings.find(b => b.id === bookingId);
    if (!booking) {
        showToast("Reserva no encontrada.", "error");
        return;
    }
    
    const provider = state.providers.find(p => p.id === booking.providerId);
    const serviceName = booking.serviceName;
    
    rescheduleState = {
        bookingId: booking.id,
        providerId: booking.providerId,
        serviceType: provider?.services.find(s => s.id === booking.serviceId)?.type || 'Virtual',
        date: null,
        timeSlot: null,
        startTime: null,
        endTime: null,
        room: null,
        calendarYear: new Date().getFullYear(),
        calendarMonth: new Date().getMonth()
    };
    
    document.getElementById("reschedule-booking-id").value = bookingId;
    document.getElementById("reschedule-booking-info").innerText = 
        `${serviceName} con ${provider?.name || 'Profesional'} - Actual: ${booking.date} @ ${booking.timeSlot}`;
    
    renderRescheduleCalendar();
    document.getElementById("reschedule-slots").innerHTML = '';
    document.getElementById("reschedule-date-label").innerText = 'Selecciona una fecha';
    
    document.getElementById("reschedule-modal").classList.add("active");
}

function closeRescheduleModal() {
    document.getElementById("reschedule-modal").classList.remove("active");
    rescheduleState = {
        bookingId: null,
        providerId: null,
        serviceType: null,
        date: null,
        timeSlot: null,
        startTime: null,
        endTime: null,
        room: null,
        calendarYear: new Date().getFullYear(),
        calendarMonth: new Date().getMonth()
    };
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
    
    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(rescheduleState.calendarYear, rescheduleState.calendarMonth, day);
        let cellClass = "calendar-cell";
        let tooltipAttr = "";
        
        const monthStr = String(rescheduleState.calendarMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${rescheduleState.calendarYear}-${monthStr}-${dayStr}`;
        
        const isPastDate = cellDate < today && cellDate.toDateString() !== today.toDateString();
        
        if (isPastDate) {
            cellClass += " disabled";
            tooltipAttr = 'title="Fecha pasada"';
        } else {
            // Verificar disponibilidad si el profesional y servicio tipo están configurados
            if (rescheduleState.providerId && rescheduleState.serviceType) {
                const availability = checkDateAvailability(dateStr, rescheduleState.providerId, rescheduleState.serviceType, rescheduleState.bookingId);
                if (!availability.available) {
                    cellClass += " disabled";
                    tooltipAttr = `title="${availability.reason}"`;
                }
            }
        }
        
        if (rescheduleState.date === dateStr) {
            cellClass += " selected";
        }
        
        grid.innerHTML += `<div class="${cellClass}" ${tooltipAttr} onclick="selectRescheduleDate('${dateStr}', this)">${day}</div>`;
    }
}

function prevRescheduleMonth() {
    rescheduleState.calendarMonth--;
    if (rescheduleState.calendarMonth < 0) {
        rescheduleState.calendarMonth = 11;
        rescheduleState.calendarYear--;
    }
    renderRescheduleCalendar();
}

function nextRescheduleMonth() {
    rescheduleState.calendarMonth++;
    if (rescheduleState.calendarMonth > 11) {
        rescheduleState.calendarMonth = 0;
        rescheduleState.calendarYear++;
    }
    renderRescheduleCalendar();
}

function selectRescheduleDate(dateStr, element) {
    if (element.classList.contains("disabled")) return;
    rescheduleState.date = dateStr;
    rescheduleState.timeSlot = null;
    rescheduleState.startTime = null;
    rescheduleState.endTime = null;
    rescheduleState.room = null;
    
    document.querySelectorAll("#reschedule-calendar .calendar-cell").forEach(c => c.classList.remove("selected"));
    element.classList.add("selected");
    
    updateRescheduleSlotsView();
}

function updateRescheduleSlotsView() {
    const slotsGrid = document.getElementById("reschedule-slots");
    const label = document.getElementById("reschedule-date-label");
    if (!slotsGrid || !label) return;
    
    if (!rescheduleState.date) {
        label.innerText = "Selecciona una fecha";
        slotsGrid.innerHTML = "";
        return;
    }
    
    const [year, month, day] = rescheduleState.date.split("-");
    const dateObj = new Date(year, parseInt(month) - 1, day);
    const dayOfWeekIdx = dateObj.getDay();
    const friendlyDate = dateObj.toLocaleDateString("es-CL", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    label.innerText = `Horas para: ${friendlyDate}`;
    
    const provider = state.providers.find(p => p.id === rescheduleState.providerId);
    if (!provider) {
        slotsGrid.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">Error: profesional no encontrado.</div>';
        return;
    }
    
    const dayShifts = provider.blocks[dayOfWeekIdx] || [];
    
    if (dayShifts.length === 0) {
        slotsGrid.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">El profesional no atiende este día.</div>';
        return;
    }
    
    slotsGrid.innerHTML = "";
    
    dayShifts.forEach(slot => {
        const [slotStart, slotEnd] = slot.split("-");
        const slotStartMin = timeToMinutes(slotStart);
        const slotEndMin = timeToMinutes(slotEnd);
        
        const matchingRooms = state.rooms.filter(r => r.type === rescheduleState.serviceType);
        
        let isAvailable = false;
        let selectedRoomForSlot = null;
        let blockReason = "No hay salas de este tipo disponibles";
        
        const sicknessBlock = state.sicknessBlocks.find(sb => 
            sb.providerId === rescheduleState.providerId && 
            sb.date === rescheduleState.date && 
            (sb.timeSlot === "all" || sb.timeSlot === slot)
        );
        
        const overlappingBooking = state.bookings.find(bk => {
            if (bk.providerId !== rescheduleState.providerId || bk.date !== rescheduleState.date || bk.status === "Cancelled" || bk.id === rescheduleState.bookingId) {
                return false;
            }
            const bkStart = timeToMinutes(bk.startTime);
            const bkEnd = timeToMinutes(bk.endTime);
            return (slotStartMin < bkEnd && bkStart < slotEndMin);
        });
        
        if (sicknessBlock) {
            isAvailable = false;
            blockReason = "Prestador no disponible (Licencia/Enfermedad)";
        } else if (overlappingBooking) {
            isAvailable = false;
            blockReason = "Prestador ocupado en otra sala";
        } else {
            for (const room of matchingRooms) {
                const roomOpenMin = timeToMinutes(room.openTime);
                const roomCloseMin = timeToMinutes(room.closeTime);
                
                if (slotStartMin < roomOpenMin || slotEndMin > roomCloseMin) {
                    blockReason = "Sala cerrada";
                    continue;
                }
                
                const roomConflict = state.bookings.find(bk => {
                    if (bk.roomId !== room.id || bk.date !== rescheduleState.date || bk.status === "Cancelled" || bk.id === rescheduleState.bookingId) {
                        return false;
                    }
                    const bkStart = timeToMinutes(bk.startTime);
                    const bkEnd = timeToMinutes(bk.endTime);
                    return (slotStartMin < bkEnd && bkStart < slotEndMin);
                });
                
                if (roomConflict) {
                    blockReason = "Sala ocupada";
                    continue;
                }
                
                isAvailable = true;
                selectedRoomForSlot = room;
                break;
            }
        }
        
        const btnClass = isAvailable ? "slot-btn" : "slot-btn disabled";
        const titleAttr = isAvailable ? "" : `title="${blockReason}"`;
        const selectedClass = rescheduleState.timeSlot === slot ? " selected" : "";
        
        slotsGrid.innerHTML += `
            <button class="${btnClass}${selectedClass}" ${titleAttr} onclick="selectRescheduleSlot('${slot}', '${slotStart}', '${slotEnd}', ${isAvailable}, ${JSON.stringify(selectedRoomForSlot).replace(/"/g, '&quot;')})">
                ${slotStart}
            </button>
        `;
    });
}

function selectRescheduleSlot(slot, start, end, isAvailable, roomObj) {
    if (!isAvailable) {
        showToast("Este bloque horario no está disponible.", "error");
        return;
    }
    rescheduleState.timeSlot = slot;
    rescheduleState.startTime = start;
    rescheduleState.endTime = end;
    rescheduleState.room = roomObj;
    
    document.querySelectorAll("#reschedule-slots .slot-btn").forEach(b => {
        if (b.innerText.trim() === start) {
            b.classList.add("selected");
        } else {
            b.classList.remove("selected");
        }
    });
}

async function confirmReschedule() {
    if (!rescheduleState.date || !rescheduleState.timeSlot || !rescheduleState.room) {
        showToast("Debe seleccionar una nueva fecha, hora y sala.", "error");
        return;
    }
    
    try {
        const res = await fetch(`/api/bookings/${rescheduleState.bookingId}/reschedule`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                newDate: rescheduleState.date,
                newTimeSlot: rescheduleState.timeSlot,
                newStartTime: rescheduleState.startTime,
                newEndTime: rescheduleState.endTime,
                newRoomId: rescheduleState.room.id,
                newRoomName: rescheduleState.room.name
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast("Reserva reagendada con éxito.", "success");
            closeRescheduleModal();
            await loadAllData();
            renderDashboardPanes();
            updateSlotsView();
        } else {
            showToast(data.error || "Error al reagendar.", "error");
        }
    } catch (e) {
        showToast("Error de conexión al reagendar.", "error");
    }
}
