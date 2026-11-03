// ----------------------------------------------------
// COMMUNITY ACTIVITIES
// ----------------------------------------------------
function updateActivitiesVisibility() {
    const section = document.getElementById("calendario");
    const calendarLinks = document.querySelectorAll('a[href="#calendario"]');
    const hasActivities = Array.isArray(state.activities) && state.activities.length > 0;
    const hasArticles = Array.isArray(state.articles) && state.articles.length > 0;
    const shouldShowCommunity = hasActivities || hasArticles;
    
    if (section) {
        section.style.display = shouldShowCommunity ? "" : "none";
    }
    
    calendarLinks.forEach(link => {
        const parentLi = link.parentElement;
        if (parentLi && parentLi.tagName === 'LI') {
            parentLi.style.display = shouldShowCommunity ? "" : "none";
        }
    });
}

function renderCommunityCalendar() {
    updateActivitiesVisibility();

    const grid = document.getElementById("community-calendar-grid");
    const monthLabel = document.getElementById("activity-month-year");
    if (!grid || !monthLabel) return;
    
    monthLabel.innerText = `${MONTH_NAMES[activityMonth]} ${activityYear}`;
    grid.innerHTML = "";
    
    const headers = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
    headers.forEach(h => {
        grid.innerHTML += `<div class="calendar-day-header">${h}</div>`;
    });
    
    const firstDay = new Date(activityYear, activityMonth, 1).getDay();
    const daysInMonth = new Date(activityYear, activityMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += '<div class="calendar-cell empty"></div>';
    }
    
    const monthStr = String(activityMonth + 1).padStart(2, '0');
    const activitiesList = Array.isArray(state.activities) ? state.activities : [];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${activityYear}-${monthStr}-${dayStr}`;
        
        const hasActivity = activitiesList.some(a => a.date === dateStr);
        let cellClass = "calendar-cell";
        if (hasActivity) cellClass += " has-activity";
        if (selectedActivityDate === dateStr) cellClass += " active-selected";
        
        grid.innerHTML += `<div class="${cellClass}" onclick="selectActivityDate('${dateStr}')">${day}</div>`;
    }
}

function prevActivityMonth() {
    activityMonth--;
    if (activityMonth < 0) {
        activityMonth = 11;
        activityYear--;
    }
    selectedActivityDate = null;
    renderCommunityCalendar();
    renderActivities();
}

function nextActivityMonth() {
    activityMonth++;
    if (activityMonth > 11) {
        activityMonth = 0;
        activityYear++;
    }
    selectedActivityDate = null;
    renderCommunityCalendar();
    renderActivities();
}

function selectActivityDate(dateStr) {
    selectedActivityDate = selectedActivityDate === dateStr ? null : dateStr;
    renderCommunityCalendar();
    renderActivities();
}

function renderActivities() {
    const list = document.getElementById("community-activities-list");
    if (!list) return;
    if (!state.activities || state.activities.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 30px;">No hay actividades programadas por el momento.</p>';
        return;
    }
    list.innerHTML = "";
    
    const monthStr = String(activityMonth + 1).padStart(2, '0');
    let filtered = state.activities.filter(a => {
        const [y, m] = a.date.split("-");
        return y == activityYear && m === monthStr;
    });
    
    if (selectedActivityDate) {
        filtered = filtered.filter(a => a.date === selectedActivityDate);
    }
    
    filtered.sort((a, b) => a.date.localeCompare(b.date));
    
    if (!selectedActivityDate) {
        filtered = filtered.slice(0, 3);
    }
    
    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 30px;">' +
            (selectedActivityDate ? 'No hay actividades programadas para este día.' : 'No hay actividades este mes.') + '</p>';
        return;
    }
    
    filtered.forEach(act => {
        const [year, month, day] = act.date.split("-");
        const formattedDate = new Date(year, parseInt(month) - 1, day).toLocaleDateString("es-CL", { day: 'numeric', month: 'short', year: 'numeric' });
        
        const capacity = act.capacity || 0;
        const enrolled = act.enrolledCount || 0;
        const isFull = capacity > 0 && enrolled >= capacity;
        const spotsLeft = capacity > 0 ? capacity - enrolled : null;
        
        let capacityBadge = '';
        if (capacity > 0) {
            if (isFull) {
                capacityBadge = '<span class="activity-capacity-badge full"><i class="fa-solid fa-circle-xmark"></i> Cupos Agotados</span>';
            } else {
                capacityBadge = `<span class="activity-capacity-badge available"><i class="fa-solid fa-circle-check"></i> ${spotsLeft} cupo${spotsLeft !== 1 ? 's' : ''} disponible${spotsLeft !== 1 ? 's' : ''}</span>`;
            }
        }
        
        let enrollBtn = '';
        if (capacity > 0 && !isFull) {
            enrollBtn = `<button class="btn-primary activity-enroll-btn" onclick="openEnrollModal('${act.id}', '${act.title.replace(/'/g, "\\'")}')"><i class="fa-solid fa-user-plus"></i> Inscribirse</button>`;
        } else if (capacity > 0 && isFull) {
            enrollBtn = '<button class="btn-secondary activity-enroll-btn" disabled><i class="fa-solid fa-ban"></i> Sin Cupos</button>';
        }
        
        list.innerHTML += `
            <div class="activity-item">
                <div class="activity-info">
                    <h5>${act.title}</h5>
                    <p><i class="fa-solid fa-calendar-day"></i> ${formattedDate} | <i class="fa-solid fa-clock"></i> ${act.time}</p>
                    <p><i class="fa-solid fa-location-dot"></i> ${act.location}</p>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 5px;">${act.desc}</p>
                    ${capacityBadge}
                    ${enrollBtn}
                </div>
            </div>
        `;
    });
}

function openEnrollModal(activityId, activityTitle) {
    const enrollActivityId = document.getElementById("enroll-activity-id");
    const enrollActivityName = document.getElementById("enroll-activity-name");
    if (!enrollActivityId || !enrollActivityName) return;
    
    enrollActivityId.value = activityId;
    enrollActivityName.innerText = `Inscripción: ${activityTitle}`;
    
    // Auto-fill if user is logged in as client
    if (state.currentUser && state.currentUser.role === "usuario") {
        const client = state.bookings.find(b => b.clientEmail === state.currentUser.email);
        if (client) {
            document.getElementById("enroll-name").value = client.clientName;
            document.getElementById("enroll-email").value = client.clientEmail;
            document.getElementById("enroll-phone").value = client.clientPhone;
        } else {
            document.getElementById("enroll-name").value = state.currentUser.name || '';
            document.getElementById("enroll-email").value = state.currentUser.email || '';
            document.getElementById("enroll-phone").value = '';
        }
    }
    
    document.getElementById("activity-enroll-modal").classList.add("active");
}

function closeEnrollModal() {
    const modal = document.getElementById("activity-enroll-modal");
    const form = document.getElementById("enroll-form");
    if (modal) modal.classList.remove("active");
    if (form) form.reset();
}

async function submitActivityEnrollment(e) {
    e.preventDefault();
    
    const activityId = document.getElementById("enroll-activity-id").value;
    const clientName = document.getElementById("enroll-name").value;
    const clientEmail = document.getElementById("enroll-email").value;
    const clientPhone = document.getElementById("enroll-phone").value;
    
    try {
        const res = await fetch('/api/activities/enroll', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ activityId, clientName, clientEmail, clientPhone })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast("¡Inscripción exitosa! Te esperamos en la actividad.", "success");
            closeEnrollModal();
            await loadAllData();
            renderActivities();
            renderCommunityCalendar();
        } else {
            showToast(data.error || "Error al inscribirse.", "error");
        }
    } catch (e) {
        showToast("Error de conexión al inscribirse.", "error");
    }
}

function openAdminEnrollmentsModal(activityId, activityTitle) {
    const adminEnrollmentsName = document.getElementById("admin-enrollments-activity-name");
    const tbody = document.getElementById("admin-enrollments-table-body");
    const emptyMsg = document.getElementById("admin-enrollments-empty");
    
    if (!adminEnrollmentsName || !tbody || !emptyMsg) return;
    
    adminEnrollmentsName.innerText = `Inscritos: ${activityTitle}`;
    
    const enrollments = state.activityEnrollments.filter(e => e.activityId === activityId);
    
    if (enrollments.length === 0) {
        tbody.innerHTML = '';
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
        tbody.innerHTML = "";
        enrollments.forEach(enr => {
            const date = enr.created_at ? new Date(enr.created_at).toLocaleDateString("es-CL") : '-';
            tbody.innerHTML += `
                <tr>
                    <td>${enr.clientName}</td>
                    <td>${enr.clientEmail}</td>
                    <td>${enr.clientPhone}</td>
                    <td>${date}</td>
                    <td><button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="removeEnrollment('${enr.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button></td>
                </tr>
            `;
        });
    }
    
    document.getElementById("admin-view-enrollments-modal").classList.add("active");
}

function closeAdminEnrollmentsModal() {
    const modal = document.getElementById("admin-view-enrollments-modal");
    if (modal) modal.classList.remove("active");
}

async function removeEnrollment(enrollmentId) {
    if (!confirm("¿Estás seguro de eliminar esta inscripción? El cupo se liberará.")) return;
    
    try {
        const res = await fetch(`/api/activities/enrollments/${enrollmentId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast("Inscripción eliminada. Cupo liberado.", "success");
            await loadAllData();
            renderActivities();
            renderCommunityCalendar();
            renderDashboardPanes();
        }
    } catch (e) {
        showToast("Error al eliminar inscripción.", "error");
    }
}

async function addCommunityActivity(e) {
    e.preventDefault();
    const title = document.getElementById("act-title").value;
    const date = document.getElementById("act-date").value;
    const time = document.getElementById("act-time").value;
    const location = document.getElementById("act-location").value;
    const desc = document.getElementById("act-desc").value;
    const capacity = parseInt(document.getElementById("act-capacity").value) || 0;
    
    const newAct = {
        id: "act-" + Date.now(),
        title, date, time, location, desc, capacity
    };
    
    try {
        const res = await fetch('/api/activities', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(newAct)
        });
        if (res.ok) {
            showToast("Actividad comunitaria creada correctamente.", "success");
            document.getElementById("admin-activity-form").reset();
            await loadAllData();
            renderCommunityCalendar();
            renderActivities();
            renderDashboardPanes();
        }
    } catch (e) {
        showToast("Error al añadir actividad.", "error");
    }
}

async function deleteActivity(id) {
    try {
        const res = await fetch(`/api/activities/${id}`, { 
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            showToast("Actividad eliminada.", "success");
            await loadAllData();
            renderCommunityCalendar();
            renderActivities();
            renderDashboardPanes();
        }
    } catch (e) {
        showToast("Error al eliminar.", "error");
    }
}

function escapeArticleText(value) {
    const element = document.createElement('span');
    element.textContent = value || '';
    return element.innerHTML;
}

async function renderPublicArticles() {
    const list = document.getElementById('public-articles-list');
    const homeSection = document.getElementById('home-articles-section');
    const homeList = document.getElementById('home-articles-list');
    if (!list && !homeList) return;

    try {
        const response = await fetch('/api/articles');
        if (!response.ok) throw new Error('No se pudieron cargar las noticias.');
        const articles = await response.json();
        state.articles = articles;
        updateActivitiesVisibility();

        if (!articles.length) {
            if (list) list.innerHTML = '<p class="article-empty">Pronto compartiremos novedades y artículos de interés.</p>';
            if (homeSection) homeSection.style.display = 'none';
            if (homeList) homeList.innerHTML = '';
            return;
        }

        const cardsHtml = articles.slice(0, 3).map(article => `
            <article class="article-card">
                <p class="article-date">${new Date(article.published_at || article.created_at).toLocaleDateString('es-CL')}</p>
                <h4>${escapeArticleText(article.title)}</h4>
                <p class="article-summary">${escapeArticleText(article.summary)}</p>
                <details>
                    <summary>Leer artículo</summary>
                    <p class="article-body">${escapeArticleText(article.body)}</p>
                </details>
            </article>
        `).join('');

        if (list) list.innerHTML = cardsHtml;
        if (homeList) homeList.innerHTML = cardsHtml;
        if (homeSection) homeSection.style.display = 'block';
    } catch (error) {
        console.error('Error al cargar artículos:', error);
        if (list) list.innerHTML = '<p class="article-empty">No se pudieron cargar las noticias. Intenta nuevamente más tarde.</p>';
        if (homeSection) homeSection.style.display = 'none';
    }
}

async function renderArticleSubmissions() {
    const submissionsList = document.getElementById('article-submissions-list');
    const adminReview = document.getElementById('article-review-list');
    if (!submissionsList || !state.currentUser) return;

    try {
        const response = await fetch('/api/articles/submissions', { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('No se pudieron cargar tus artículos.');
        const articles = await response.json();
        const isAdmin = state.currentUser.role === 'administrador';

        submissionsList.innerHTML = articles.length
            ? articles.map(article => `
                <article class="article-submission">
                    <h4>${escapeArticleText(article.title)}</h4>
                    <p>${escapeArticleText(article.summary)}</p>
                    <span class="article-status">${article.status === 'published' ? 'Publicado' : article.status === 'rejected' ? 'No aprobado' : 'Pendiente de revisión'}</span>
                </article>
            `).join('')
            : '<p class="article-empty">Todavía no has enviado artículos.</p>';

        if (isAdmin && adminReview) {
            const reviewSection = document.getElementById('article-admin-review');
            if (reviewSection) reviewSection.style.display = 'block';
            adminReview.innerHTML = articles.length
                ? articles.map(article => `
                    <article class="article-submission">
                        <h4>${escapeArticleText(article.title)}</h4>
                        <p><strong>Autor:</strong> ${escapeArticleText(article.author_name || 'Cuenta eliminada')}</p>
                        <p>${escapeArticleText(article.summary)}</p>
                        <p class="article-body">${escapeArticleText(article.body)}</p>
                        <div class="article-review-actions">
                            <button class="btn-primary" onclick="reviewArticle('${article.id}', 'published')">Publicar</button>
                            <button class="btn-secondary" onclick="reviewArticle('${article.id}', 'rejected')">Rechazar</button>
                        </div>
                    </article>
                `).join('')
                : '<p class="article-empty">No hay artículos pendientes de revisión.</p>';
        }
    } catch (error) {
        console.error('Error al cargar artículos enviados:', error);
        submissionsList.innerHTML = '<p class="article-empty">No se pudieron cargar tus artículos.</p>';
    }
}

async function submitArticle(e) {
    e.preventDefault();
    if (!state.currentUser) {
        showToast('Inicia sesión para proponer un artículo.', 'error');
        window.location.href = 'acceso.html';
        return;
    }

    const form = document.getElementById('community-article-form');
    const payload = {
        title: document.getElementById('article-title').value,
        summary: document.getElementById('article-summary').value,
        body: document.getElementById('article-body').value
    };

    try {
        const response = await fetch('/api/articles', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo enviar el artículo.');
        form.reset();
        showToast(
            result.status === 'published'
                ? 'Artículo publicado correctamente.'
                : 'Artículo enviado para revisión editorial.',
            'success'
        );
        await Promise.all([renderArticleSubmissions(), renderPublicArticles()]);
    } catch (error) {
        showToast(error.message || 'Error al enviar el artículo.', 'error');
    }
}

async function reviewArticle(id, status) {
    try {
        const response = await fetch(`/api/articles/${id}/status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo actualizar el artículo.');
        showToast(status === 'published' ? 'Artículo publicado.' : 'Artículo rechazado.', 'success');
        await Promise.all([renderArticleSubmissions(), renderPublicArticles()]);
    } catch (error) {
        showToast(error.message || 'Error al revisar el artículo.', 'error');
    }
}
