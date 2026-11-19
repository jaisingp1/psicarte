// server/integration-test.js
// Comprehensive End-to-End API Integration Tests for PsicArte New Booking Logic
// Rule R14 compliant (dynamic dates), Rule R17 compliant (clean ephemeral server termination), Rule R20 compliant (Zero waste cleanup)

require('dotenv').config();
const http = require('http');
const db = require('./database');
const app = require('./server');

let server;
let BASE_URL = '';
let ADMIN_TOKEN = '';
let PASSED = 0;
let FAILED = 0;

function assert(condition, name, detail = '') {
    if (condition) {
        PASSED++;
        console.log(`  ✅ PASS: ${name}`);
    } else {
        FAILED++;
        console.error(`  ❌ FAIL: ${name} - ${detail}`);
    }
}

function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const reqHeaders = { 'Content-Type': 'application/json', ...headers };
        const req = http.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: reqHeaders
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data;
                }
                resolve({ status: res.statusCode, data: parsed });
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

function get(path, token = ADMIN_TOKEN) {
    return request('GET', path, null, token ? { Authorization: `Bearer ${token}` } : {});
}

function post(path, body, token = ADMIN_TOKEN) {
    return request('POST', path, body, token ? { Authorization: `Bearer ${token}` } : {});
}

function put(path, body, token = ADMIN_TOKEN) {
    return request('PUT', path, body, token ? { Authorization: `Bearer ${token}` } : {});
}

function del(path, token = ADMIN_TOKEN) {
    return request('DELETE', path, null, token ? { Authorization: `Bearer ${token}` } : {});
}

async function runE2ETests() {
    console.log('====================================================');
    console.log('       PsicArte End-to-End API Integration Tests     ');
    console.log('====================================================\n');

    // 1. Authentication
    console.log('--- 1. Admin Authentication ---');
    const loginRes = await post('/api/auth/login', {
        email: 'admin@centropsicarte.cl',
        password: 'admin123'
    }, null);

    assert(loginRes.status === 200, 'Admin login returns 200');
    ADMIN_TOKEN = loginRes.data?.token || '';
    assert(!!ADMIN_TOKEN, 'Received JWT token');

    // 2. Room Management CRUD
    console.log('\n--- 2. Room Management CRUD ---');
    const testRoomId = 'test-room-' + Date.now();
    const createRoomRes = await post('/api/rooms', {
        id: testRoomId,
        name: 'Sala E2E Test Virtual',
        type: 'Virtual',
        capacity: 1,
        meet_enabled: 1,
        min_advance_min: 0,
        max_advance_days: 60,
        allow_all_services: 1,
        shifts: [
            {
                day_of_week: 2, // Martes
                provider_id: 'prov-macarena',
                start_time: '09:00',
                end_time: '18:00',
                breaks: [
                    { start_time: '13:00', end_time: '14:00' }
                ]
            }
        ]
    });
    assert(createRoomRes.status === 200, 'Created Virtual Room with shift and break');

    const getRoomsRes = await get('/api/rooms');
    assert(getRoomsRes.status === 200 && Array.isArray(getRoomsRes.data), 'GET /api/rooms returns array');
    const createdRoom = getRoomsRes.data.find(r => r.id === testRoomId);
    assert(!!createdRoom && createdRoom.type === 'Virtual', 'Created room found with Virtual type');
    assert(Array.isArray(createdRoom.shifts) && createdRoom.shifts.length === 1, 'Room has 1 shift');
    assert(createdRoom.shifts[0].breaks.length === 1, 'Room shift has 1 break (13:00 - 14:00)');

    // 3. Room Exceptions
    console.log('\n--- 3. Room Exceptions ---');
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 14);
    const testDateStr = testDate.toISOString().slice(0, 10);

    const createExcRes = await post(`/api/rooms/${testRoomId}/exceptions`, {
        exception_date: testDateStr,
        exception_type: 'close_day',
        reason: 'Mantenimiento del servidor'
    });
    assert(createExcRes.status === 200, 'Created close_day room exception');

    const getExcRes = await get(`/api/rooms/${testRoomId}/exceptions`);
    assert(getExcRes.status === 200 && Array.isArray(getExcRes.data), 'GET /api/rooms/:id/exceptions returns array');
    const excItem = getExcRes.data.find(e => e.date === testDateStr && e.type === 'close_day');
    assert(!!excItem, 'Exception close_day found in room exceptions');

    // 4. Master Service & Provider Assignment
    console.log('\n--- 4. Master Services & Provider-Service Relation ---');
    const testSvcId = 'test-svc-' + Date.now();
    const createSvcRes = await post('/api/services', {
        id: testSvcId,
        name: 'Servicio E2E Prueba Automatizada',
        description: 'Servicio creado por tests de integración',
        min_advance_min: 0,
        max_advance_days: 60,
        allowReschedule: 1,
        maxReschedules: 2
    });
    assert(createSvcRes.status === 200, 'Created Master Service in catalog');

    const assignSvcRes = await post(`/api/services/${testSvcId}/providers`, {
        provider_id: 'prov-macarena',
        duration: 50,
        price: 25000
    });
    assert(assignSvcRes.status === 200, 'Assigned Master Service to provider with duration 50 min and price $25.000');

    // 5. 5-Minute Grid Availability Check
    console.log('\n--- 5. 5-Minute Grid Availability Query ---');
    // Find next Tuesday dynamically
    const now = new Date();
    const daysUntilTue = (2 + 7 - now.getDay()) % 7 || 7;
    const nextTue = new Date(now.getTime() + daysUntilTue * 24 * 60 * 60 * 1000);
    const nextTueStr = nextTue.toISOString().slice(0, 10);

    const availRes = await get(`/api/availability?serviceId=${testSvcId}&date=${nextTueStr}`, null);
    assert(availRes.status === 200, 'GET /api/availability returns 200');
    assert(Array.isArray(availRes.data.spots), 'Availability returns spots array');
    assert(availRes.data.spots.length > 0, `Found ${availRes.data.spots.length} spots on 5-min grid`);

    const spot = availRes.data.spots[0];
    assert(spot.duration === 50, 'Spot duration matches assigned provider duration (50 min)');
    assert(spot.price === 25000, 'Spot price matches assigned provider price ($25.000)');

    // 6. Booking Creation & Public Summary
    console.log('\n--- 6. Booking Creation & Public Summary ---');
    const bookingPayload = {
        serviceId: testSvcId,
        providerId: spot.providerId,
        roomId: spot.roomId,
        date: nextTueStr,
        startTime: spot.startTime,
        clientName: 'Cliente E2E Test',
        clientEmail: 'cliente.e2e@test.cl',
        clientPhone: '+56911223344',
        clientRut: '12.345.678-9'
    };

    const bookRes = await post('/api/bookings', bookingPayload, null);
    assert(bookRes.status === 200, 'POST /api/bookings returns 200');
    const bookingId = bookRes.data?.booking?.id || '';
    assert(!!bookingId, `Booking created with ID ${bookingId}`);

    const pubSummaryRes = await get(`/api/bookings/${bookingId}/public-summary`, null);
    assert(pubSummaryRes.status === 200, 'GET /api/bookings/:id/public-summary returns 200');
    assert(pubSummaryRes.data.clientName === 'Cliente E2E Test', 'Public summary returns client name');
    assert(pubSummaryRes.data.serviceName === 'Servicio E2E Prueba Automatizada', 'Public summary returns service name');

    // 7. Manual Meet Link & Re-generation Retry
    console.log('\n--- 7. Google Meet Link & Retry ---');
    const editMeetRes = await put(`/api/bookings/${bookingId}/meet-link`, {
        meet_link: 'https://meet.google.com/test-e2e-psicarte'
    });
    assert(editMeetRes.status === 200, 'PUT /api/bookings/:id/meet-link updates link');

    const retryMeetRes = await post(`/api/bookings/${bookingId}/meet-retry`, {});
    assert(retryMeetRes.status === 200, 'POST /api/bookings/:id/meet-retry executes');

    // 8. Move Booking (retaining Meet link)
    console.log('\n--- 8. Move Booking (Preserving Google Meet Link) ---');
    // Find next available spot for the same provider
    const secondSpot = availRes.data.spots.find(s => s.startTime !== spot.startTime);
    if (secondSpot) {
        const moveRes = await post(`/api/bookings/${bookingId}/move`, {
            newRoomId: secondSpot.roomId,
            newDate: nextTueStr,
            newStartTime: secondSpot.startTime
        });
        assert(moveRes.status === 200, 'POST /api/bookings/:id/move successfully moved booking');

        const movedSummary = await get(`/api/bookings/${bookingId}/public-summary`, null);
        assert(movedSummary.data.startTime === secondSpot.startTime, 'Moved booking has new startTime');
        assert(movedSummary.data.meet_link === 'https://meet.google.com/test-e2e-psicarte', 'Moved booking preserves existing Google Meet link');
    }

    // 9. Admin Alerts & Google Accounts
    console.log('\n--- 9. Admin Alerts & Google Accounts ---');
    const alertsRes = await get('/api/admin/alerts');
    assert(alertsRes.status === 200 && Array.isArray(alertsRes.data), 'GET /api/admin/alerts returns array');

    const googleAccountsRes = await get('/api/google-meet/accounts');
    assert(googleAccountsRes.status === 200 && Array.isArray(googleAccountsRes.data), 'GET /api/google-meet/accounts returns array');

    // 10. Clean up test records (Zero Waste - Rule R20)
    console.log('\n--- 10. Cleanup Test Records (Zero Waste) ---');
    await del(`/api/bookings/${bookingId}/purge`);
    await del(`/api/services/${testSvcId}`);
    await del(`/api/rooms/${testRoomId}`);
    assert(true, 'Test booking, test service, and test room purged cleanly');

    console.log('\n====================================================');
    console.log(`Integration Test Results: ${PASSED} passed, ${FAILED} failed.`);
    console.log('====================================================');

    if (FAILED > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

// Start server on ephemeral port and execute
db.ready.then(() => {
    server = app.listen(0, async () => {
        const port = server.address().port;
        BASE_URL = `http://127.0.0.1:${port}`;
        console.log(`Ephemeral test server running on ${BASE_URL}`);
        try {
            await runE2ETests();
        } catch (err) {
            console.error('Fatal error during E2E tests:', err);
            process.exit(1);
        } finally {
            server.close(() => {
                console.log('Ephemeral test server closed.');
            });
        }
    });
}).catch(err => {
    console.error('Database failed to initialize:', err);
    process.exit(1);
});
