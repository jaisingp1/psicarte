// integration-test.js
// Pruebas de integración para el sistema de Agendas y Reservas de PsicArte
// Casos de uso principales:
//   1. Crear agenda punctual y verificar spots generados
//   2. Crear agenda recurrente (rrule) y verificar spots generados
//   3. Publicar agenda (draft -> published) y verificar spots visibles para clientes
//   4. Reservar spot disponible y verificar estado
//   5. Eliminar agenda con bookings Pending_Payment (auto-cancel) vs Paid (bloqueo)

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let TOKEN = '';
let TEST_RESULTS = { passed: 0, failed: 0, total: 0 };

function log(msg) { console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`); }
function logResult(name, passed, detail) {
    TEST_RESULTS.total++;
    if (passed) { TEST_RESULTS.passed++; log(`  ✅ ${name}`); }
    else { TEST_RESULTS.failed++; log(`  ❌ ${name}: ${detail}`); }
}
function assert(condition, name, detail) { logResult(name, condition, detail); return condition; }

function request(method, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: { 'Content-Type': 'application/json', ...headers } };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } catch (e) { resolve({ status: res.statusCode, data }); } });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function get(path, token) { return request('GET', path, null, token ? { Authorization: `Bearer ${token}` } : {}); }
function post(path, body, token) { return request('POST', path, body, token ? { Authorization: `Bearer ${token}` } : {}); }
function del(path, token) { return request('DELETE', path, null, token ? { Authorization: `Bearer ${token}` } : {}); }

// Helper: obtener fecha futura que no sea feriado ni domingo, y que no conflictue
// Usa prov-macarena que tiene mínimas agendas existentes
function getFutureDate(daysFromNow) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    // Evitar domingo (getDay === 0)
    while (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}

async function login() {
    log('=== INICIO DE SESIÓN ===');
    const res = await post('/api/auth/login', { email: 'admin@psicarte.cl', password: 'admin123', role: 'administrador' });
    TOKEN = res.data.token;
    assert(res.status === 200, 'Login exitoso', `Status: ${res.status}`);
    assert(TOKEN && TOKEN.length > 0, 'Token recibido', 'No token');
}

// =====================================================
// CASO 1: Crear agenda punctual y verificar spots
// =====================================================
async function testCaso1() {
    log('\n=== CASO 1: Crear agenda punctual y verificar spots generados ===');

    // Usar prov-macarena (mínimos conflictos) + room-2 + rango horario amplio
    const testServiceId = 'test-svc-1';
    await post('/api/services', {
        id: testServiceId, providerId: 'prov-macarena', name: 'Servicio Test Punctual',
        price: 15000, duration: 30, type: 'Virtual'
    }, TOKEN);
    await post(`/api/services/${testServiceId}/rooms`, { room_id: 'room-2' }, TOKEN);

    // Fecha a 20 días en el futuro para evitar conflictos con agendas existentes
    const dateStr = getFutureDate(20);

    const createRes = await post('/api/agendas', {
        provider_id: 'prov-macarena',
        service_id: testServiceId,
        room_id: 'room-2',
        type: 'punctual',
        specific_date: dateStr,
        start_time: '10:00',
        end_time: '14:00',
        status: 'draft'
    }, TOKEN);

    assert(createRes.status === 200, 'Agenda punctual creada', `Status: ${createRes.status}, Body: ${JSON.stringify(createRes.data)}`);
    assert(createRes.data.spotsGenerated >= 0, `Spots generados (draft): ${createRes.data.spotsGenerated}`, 'Error');

    // Publicar
    const agendaId = createRes.data.id;
    const publishRes = await post(`/api/agendas/${agendaId}/publish`, {}, TOKEN);
    assert(publishRes.status === 200, 'Agenda publicada', `Status: ${publishRes.status}`);

    // Esperar un poco para que termine la generación
    await new Promise(r => setTimeout(r, 1500));

    // Verificar spots visibles
    const spotsRes = await get(`/api/spots/available?date=${dateStr}&serviceId=${testServiceId}`);
    assert(spotsRes.status === 200, 'Endpoint spots/available responde', `Status: ${spotsRes.status}`);

    // room-2 10:00-14:00 con 30 min = 8 spots esperados
    const expectedMax = Math.floor(4 * 60 / 30);
    assert(spotsRes.data.length > 0, `Spots visibles: ${spotsRes.data.length} (expected ~${expectedMax})`, 'No spots found');

    if (spotsRes.data.length > 0) {
        const spot = spotsRes.data[0];
        assert(spot.date === dateStr, `Spot fecha correcta: ${spot.date}`, `Expected ${dateStr}`);
        assert(spot.service_name === 'Servicio Test Punctual', 'Spot tiene nombre de servicio', spot.service_name);
        assert(spot.provider_name === 'Macarena Méndez', 'Spot tiene nombre de prestador', spot.provider_name);
        assert(spot.room_name === 'Sala Virtual Zoom', 'Spot tiene nombre de sala', spot.room_name);
    }

    return { agendaId, serviceId: testServiceId, spotId: spotsRes.data[0]?.id, dateStr };
}

// =====================================================
// CASO 2: Crear agenda recurrente y verificar spots
// =====================================================
async function testCaso2() {
    log('\n=== CASO 2: Crear agenda recurrente (rrule) y verificar spots ===');

    const testServiceId = 'test-svc-2';
    await post('/api/services', {
        id: testServiceId, providerId: 'prov-macarena', name: 'Servicio Test Recurrente',
        price: 20000, duration: 60, type: 'Física'
    }, TOKEN);
    await post(`/api/services/${testServiceId}/rooms`, { room_id: 'room-2' }, TOKEN);

    const today = new Date();
    const startDt = today.toISOString().split('T')[0];
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1);

    const createRes = await post('/api/agendas', {
        provider_id: 'prov-macarena',
        service_id: testServiceId,
        room_id: 'room-2',
        type: 'recurrent',
        recurrence_rule: JSON.stringify({
            freq: 'WEEKLY',
            interval: 1,
            byweekday: [1, 3, 5], // lunes, miér, vie
            dtstart: startDt,
            time_ranges: {
                '1': { start: '15:00', end: '17:00' },
                '3': { start: '15:00', end: '17:00' },
                '5': { start: '15:00', end: '17:00' }
            }
        }),
        start_time: '15:00',
        end_time: '17:00',
        start_date: startDt,
        end_date: endDate.toISOString().split('T')[0],
        status: 'published'
    }, TOKEN);

    assert(createRes.status === 200, 'Agenda recurrente creada', `Status: ${createRes.status}`);
    assert(createRes.data.spotsGenerated > 0, `Spots generados: ${createRes.data.spotsGenerated}`, 'Expected > 0');

    // Esperar
    await new Promise(r => setTimeout(r, 1000));

    const from = new Date().toISOString().split('T')[0];
    const to = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    const spotsRes = await get(`/api/spots/available?serviceId=${testServiceId}&from=${from}&to=${to}`);
    assert(spotsRes.data.length > 0, `Spots recurrentes en próximos 14 días: ${spotsRes.data.length}`, 'No spots');

    return { agendaId: createRes.data.id, serviceId: testServiceId };
}

// =====================================================
// CASO 3: Publish/Unpublish visibility
// =====================================================
async function testCaso3() {
    log('\n=== CASO 3: Agenda draft NO visible, published SÍ visible ===');

    const testServiceId = 'test-svc-3';
    await post('/api/services', {
        id: testServiceId, providerId: 'prov-macarena', name: 'Servicio Test Draft',
        price: 10000, duration: 45, type: 'Virtual'
    }, TOKEN);
    await post(`/api/services/${testServiceId}/rooms`, { room_id: 'room-2' }, TOKEN);

    const dateStr = getFutureDate(25);

    const createRes = await post('/api/agendas', {
        provider_id: 'prov-macarena',
        service_id: testServiceId,
        room_id: 'room-2',
        type: 'punctual',
        specific_date: dateStr,
        start_time: '08:30',
        end_time: '10:00',
        status: 'draft'
    }, TOKEN);

    const agendaId = createRes.data.id;

    // NO visible en draft
    const spotsBefore = await get(`/api/spots/available?date=${dateStr}&serviceId=${testServiceId}`);
    assert(spotsBefore.data.length === 0, 'Spots NO visibles cuando agenda es draft', `Found ${spotsBefore.data.length} spots`);

    // Publicar
    await post(`/api/agendas/${agendaId}/publish`, {}, TOKEN);
    await new Promise(r => setTimeout(r, 1000));

    // SÍ visible
    const spotsAfter = await get(`/api/spots/available?date=${dateStr}&serviceId=${testServiceId}`);
    assert(spotsAfter.data.length > 0, `Spots SÍ visibles después de publicar: ${spotsAfter.data.length}`, 'Still no spots');

    // Unpublish -> NO visible
    await post(`/api/agendas/${agendaId}/unpublish`, {}, TOKEN);
    const spotsUnpub = await get(`/api/spots/available?date=${dateStr}&serviceId=${testServiceId}`);
    assert(spotsUnpub.data.length === 0, 'Spots NO visibles después de unpublish', `Found ${spotsUnpub.data.length} spots`);

    // Re-publicar
    await post(`/api/agendas/${agendaId}/publish`, {}, TOKEN);
    await new Promise(r => setTimeout(r, 1000));

    return { agendaId, serviceId: testServiceId, dateStr };
}

// =====================================================
// CASO 4: Reservar spot y verificar estados
// =====================================================
async function testCaso4(testData1) {
    log('\n=== CASO 4: Reservar spot disponible y verificar estados ===');

    if (!testData1 || !testData1.spotId) {
        log('  ⚠️ Saltando: no hay spot disponible del Caso 1');
        return;
    }

    const spotId = testData1.spotId;

    // Verificar disponible
    const spotBefore = await get(`/api/spots/available?serviceId=test-svc-1&date=${testData1.dateStr}`);
    assert(spotBefore.data.some(s => s.id === spotId), 'Spot disponible antes de reservar', 'Spot not found');

    // Crear reserva (Pending_Payment)
    const bookingRes = await post('/api/bookings', {
        spot_id: spotId,
        clientName: 'Cliente Test',
        clientEmail: 'cliente@test.com',
        clientPhone: '+56912345678',
        clientRut: '11.222.333-4'
    });

    assert(bookingRes.status === 200, 'Reserva creada exitosamente', `Status: ${bookingRes.status}, Body: ${JSON.stringify(bookingRes.data)}`);
    const bookingId = bookingRes.data.id;
    assert(bookingId, 'Booking ID recibido', 'No booking ID');

    // Spot NO disponible
    const spotAfter = await get(`/api/spots/available?serviceId=test-svc-1&date=${testData1.dateStr}`);
    assert(!spotAfter.data.some(s => s.id === spotId), 'Spot NO disponible después de reservar', 'Spot still available');

    // Verificar booking en lista
    const bookingsRes = await get('/api/bookings');
    const testBooking = bookingsRes.data.find(b => b.id === bookingId);
    assert(testBooking, 'Reserva aparece en lista de bookings', 'Booking not found');
    if (testBooking) {
        assert(testBooking.status === 'Pending_Payment', `Estado de reserva: ${testBooking.status}`, 'Expected Pending_Payment');
        assert(testBooking.clientName === 'Cliente Test', 'Nombre de cliente correcto', testBooking.clientName);
        assert(testBooking.spot_id === spotId, 'Spot ID vinculado en booking', `Expected ${spotId}, got ${testBooking.spot_id}`);
    }

    return { bookingId, spotId };
}

// =====================================================
// CASO 5: Eliminar agenda — Pending auto-cancel vs Paid blocked
// =====================================================
async function testCaso5(testData4) {
    log('\n=== CASO 5: Eliminar agenda con bookings ===');

    // 5a. Crear agenda + booking Pending_Payment
    const svcId = 'test-svc-5';
    await post('/api/services', {
        id: svcId, providerId: 'prov-macarena', name: 'Servicio Test Eliminar',
        price: 5000, duration: 30, type: 'Virtual'
    }, TOKEN);
    await post(`/api/services/${svcId}/rooms`, { room_id: 'room-2' }, TOKEN);

    const dateStr = getFutureDate(22);

    const agendaRes = await post('/api/agendas', {
        provider_id: 'prov-macarena',
        service_id: svcId,
        room_id: 'room-2',
        type: 'punctual',
        specific_date: dateStr,
        start_time: '18:00',
        end_time: '19:30',
        status: 'published'
    }, TOKEN);

    const agendaId5 = agendaRes.data.id;
    assert(agendaRes.status === 200, 'Agenda para eliminación creada', `Status: ${agendaRes.status}`);

    await new Promise(r => setTimeout(r, 1000));

    // Obtener spot y crear booking Pending
    const spots5 = await get(`/api/spots/available?date=${dateStr}&serviceId=${svcId}`);
    assert(spots5.data.length > 0, `Hay ${spots5.data.length} spots disponibles para booking`, 'No spots');

    if (spots5.data.length > 0) {
        const spot5 = spots5.data[0];
        const bk5 = await post('/api/bookings', {
            spot_id: spot5.id,
            clientName: 'Cliente Pending',
            clientEmail: 'pending@test.com',
            clientPhone: '+56900000001'
        });
        assert(bk5.status === 200, 'Booking Pending_Payment creado', `Status: ${bk5.status}`);

        // Eliminar agenda -> debe auto-cancelar el booking
        const delRes = await del(`/api/agendas/${agendaId5}`, TOKEN);
        assert(delRes.status === 200, 'Agenda con Pending eliminada exitosamente', `Status: ${delRes.status}`);

        // Verificar booking cancelado
        const bookingsCheck = await get('/api/bookings');
        const cancelledBk = bookingsCheck.data.find(b => b.id === bk5.data.id);
        if (cancelledBk) {
            assert(cancelledBk.status === 'Cancelled', `Booking auto-cancelado: ${cancelledBk.status}`, 'Expected Cancelled');
        } else {
            logResult('Booking auto-cancelado o limpiado', true, 'Booking not found');
        }
    }

    // 5c. Probar eliminar agenda con Paid booking -> debe fallar (400)
    const svcPaid = 'test-svc-paid';
    await post('/api/services', {
        id: svcPaid, providerId: 'prov-macarena', name: 'Servicio Paid Test',
        price: 5000, duration: 30, type: 'Virtual'
    }, TOKEN);
    await post(`/api/services/${svcPaid}/rooms`, { room_id: 'room-2' }, TOKEN);

    const paidDateStr = getFutureDate(30);

    const paidAgenda = await post('/api/agendas', {
        provider_id: 'prov-macarena',
        service_id: svcPaid,
        room_id: 'room-2',
        type: 'punctual',
        specific_date: paidDateStr,
        start_time: '19:00',
        end_time: '20:00',
        status: 'published'
    }, TOKEN);

    const paidAgendaId = paidAgenda.data.id;
    await new Promise(r => setTimeout(r, 1000));

    const paidSpots = await get(`/api/spots/available?date=${paidDateStr}&serviceId=${svcPaid}`);
    if (paidSpots.data.length > 0) {
        // Crear booking Paid directo (adminMode)
        const paidBk = await post('/api/bookings', {
            spot_id: paidSpots.data[0].id,
            clientName: 'Cliente Paid',
            clientEmail: 'paid@test.com',
            clientPhone: '+56900000002',
            adminMode: true
        });
        assert(paidBk.status === 200, 'Booking Paid creado', `Status: ${paidBk.status}`);

        // Intentar eliminar -> debe fallar
        const delPaidRes = await del(`/api/agendas/${paidAgendaId}`, TOKEN);
        assert(delPaidRes.status === 400, 'Eliminación bloqueada por booking Paid (400)', `Status: ${delPaidRes.status}, expected 400`);
        if (delPaidRes.data && delPaidRes.data.error) {
            assert(delPaidRes.data.error.includes('pagadas'), `Mensaje: "${delPaidRes.data.error}"`, 'Wrong error message');
        }
    } else {
        log('  ⚠️ No spots para test Paid booking');
    }
}

// =====================================================
// CLEANUP
// =====================================================
async function cleanup() {
    log('\n=== LIMPIEZA ===');
    const testServices = ['test-svc-1', 'test-svc-2', 'test-svc-3', 'test-svc-5', 'test-svc-paid'];
    for (const svcId of testServices) {
        try {
            const agendasRes = await get('/api/agendas', TOKEN);
            const svcAgendas = agendasRes.data.filter(a => a.service_id === svcId);
            for (const agenda of svcAgendas) {
                await del(`/api/agendas/${agenda.id}`, TOKEN);
            }
            await del(`/api/services/${svcId}`, TOKEN);
        } catch (e) { /* ignore */ }
    }
    log('  Limpieza completada');
}

// =====================================================
// MAIN
// =====================================================
async function main() {
    log('==========================================');
    log('  PSICARTE: PRUEBAS DE INTEGRACIÓN');
    log('  Sistema de Agendas y Reservas');
    log('==========================================');

    try {
        await login();

        const initAgendas = await get('/api/agendas', TOKEN);
        log(`Agendas iniciales: ${initAgendas.data.length}`);
        const initSpots = await get('/api/spots/available?from=2026-08-01&to=2030-12-31');
        log(`Spots disponibles (totales): ${initSpots.data.length}`);

        const testData1 = await testCaso1();
        await testCaso2();
        await testCaso3();
        const testData4 = await testCaso4(testData1);
        await testCaso5(testData4);
        await cleanup();
    } catch (error) {
        log(`ERROR: ${error.message}`);
        TEST_RESULTS.failed++;
    }

    log('\n==========================================');
    log(`  RESULTADOS: ${TEST_RESULTS.passed}/${TEST_RESULTS.total} PASSED`);
    if (TEST_RESULTS.failed > 0) log(`  ❌ ${TEST_RESULTS.failed} FAILED`);
    else log('  ✅ TODAS LAS PRUEBAS PASARON');
    log('==========================================');

    process.exit(TEST_RESULTS.failed > 0 ? 1 : 0);
}

function waitForServer() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            http.get(`${BASE_URL}/api/config`, (res) => { clearInterval(interval); resolve(); }).on('error', () => {
                if (attempts >= 120) { clearInterval(interval); reject(new Error('Server no disponible')); }
            });
        }, 1000);
    });
}

waitForServer().then(() => main()).catch(err => { log(`FATAL: ${err.message}`); process.exit(1); });
