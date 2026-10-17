// Focused integration test - CORRECTED order for Case 5
require('dotenv').config();
const db = require('../server/database');
const { SpotGenerator } = require('../server/spot-generator');

const generator = new SpotGenerator(db);

async function q(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => { err ? reject(err) : resolve(rows || []); });
    });
}
async function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
    });
}
function gen(agenda) {
    return new Promise((resolve, reject) => {
        generator.generate(agenda, (result) => {
            if (result.errors && result.errors.length > 0) reject(result.errors[0]);
            else resolve(result);
        });
    });
}

async function main() {
    const SHORT_START = '2026-08-10';
    const SHORT_END = '2026-08-24';

    console.log('=== Focused Integration Tests ===\n');

    await run("DELETE FROM spots WHERE agenda_id LIKE 't%'");
    await run("DELETE FROM agendas WHERE id LIKE 't%'");
    await run("DELETE FROM bookings WHERE id LIKE 't%'");
    await run("INSERT OR IGNORE INTO services (id, providerId, name, duration) VALUES ('svc-a', 'prov-ivan', 'Svc A', 30)");
    await run("INSERT OR IGNORE INTO services (id, providerId, name, duration) VALUES ('svc-b', 'prov-ivan', 'Svc B', 60)");
    await run("INSERT OR IGNORE INTO service_rooms (id, service_id, room_id) VALUES ('sr-a1', 'svc-a', 'room-1')");
    await run("INSERT OR IGNORE INTO service_rooms (id, service_id, room_id) VALUES ('sr-b2', 'svc-b', 'room-2')");

    // === CASE 1: Tue/Thu 8-13, Wed 9-14 ===
    const a1 = {
        id: 't1', provider_id: 'prov-ivan', service_id: 'svc-a', room_id: 'room-1',
        type: 'recurrent',
        recurrence_rule: JSON.stringify({ freq: 'WEEKLY', interval: 1, byweekday: [2,4,3], dtstart: SHORT_START,
            time_ranges: { '2': {start:'08:00',end:'13:00'}, '4': {start:'08:00',end:'13:00'}, '3': {start:'09:00',end:'14:00'} }
        }),
        start_time: '08:00', end_time: '14:00', start_date: SHORT_START, end_date: SHORT_END, status: 'published'
    };
    const r1 = await gen(a1);
    console.log(`Caso 1: ${r1.spotsGenerated} spots generated`);

    let spots = await q('SELECT start_time FROM spots WHERE agenda_id=? AND date=? ORDER BY start_time', ['t1', '2026-08-13']);
    console.log(`  Thu Aug 13: ${spots.length} spots (expect 7): ${spots.map(s=>s.start_time).join(', ')}`);
    console.log(`  ${spots.length===7 ? '✓ PASS' : '✗ FAIL'}`);

    spots = await q('SELECT start_time FROM spots WHERE agenda_id=? AND date=? ORDER BY start_time', ['t1', '2026-08-12']);
    console.log(`  Wed Aug 12: ${spots.length} spots (expect 8): ${spots.map(s=>s.start_time).join(', ')}`);
    console.log(`  ${spots.length===8 ? '✓ PASS' : '✗ FAIL'}`);

    // === CASE 2: Booking conflict on room-1, Aug 13, 10:00-11:00 ===
    await run("INSERT INTO bookings (id, providerId, serviceId, roomId, date, startTime, endTime, status) VALUES ('t-bk1','prov-other','svc-b','room-1','2026-08-13','10:00','11:00','Paid')");
    await gen(a1);
    spots = await q('SELECT start_time FROM spots WHERE agenda_id=? AND date=? ORDER BY start_time', ['t1', '2026-08-13']);
    console.log(`\nCaso 2: ${spots.length} spots (expect 5): ${spots.map(s=>s.start_time).join(', ')}`);
    const noConflict = !spots.some(s => s.start_time === '10:00' || s.start_time === '10:30');
    console.log(`  10:00-11:00 omitted: ${noConflict ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Count: ${spots.length===5 ? '✓ PASS' : '✗ FAIL'}`);
    await run("DELETE FROM bookings WHERE id='t-bk1'");

    // === CASE 3: Holiday punctual (Sep 18) ===
    const a3 = { id: 't3', provider_id: 'prov-ivan', service_id: 'svc-a', room_id: 'room-1',
        type: 'punctual', specific_date: '2026-09-18', start_time: '08:30', end_time: '12:30', status: 'published' };
    const r3 = await gen(a3);
    console.log(`\nCaso 3 (holiday Sep 18): ${r3.spotsGenerated} spots (expect 0): ${r3.spotsGenerated===0 ? '✓ PASS' : '✗ FAIL'}`);

    // === CASE 4: Non-holiday punctual (Sep 17) ===
    const a4 = { id: 't4', provider_id: 'prov-ivan', service_id: 'svc-a', room_id: 'room-1',
        type: 'punctual', specific_date: '2026-09-17', start_time: '08:30', end_time: '12:30', status: 'published' };
    await gen(a4);
    spots = await q('SELECT start_time FROM spots WHERE agenda_id=? ORDER BY start_time', ['t4']);
    console.log(`\nCaso 4 (Sep 17): ${spots.length} spots (expect 7)`);
    const no12 = !spots.some(s => s.start_time === '12:00');
    console.log(`  12:00-12:30 omitted: ${no12 ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Count: ${spots.length===7 ? '✓ PASS' : '✗ FAIL'}`);

    // === CASE 5: Provider conflict — ORDER MATTERS ===
    // First: remove t1, generate t5b (claims Tuesday for prov-ivan)
    // Then: generate t1 (Tuesday blocked by t5b)
    const a5b = {
        id: 't5b', provider_id: 'prov-ivan', service_id: 'svc-b', room_id: 'room-2',
        type: 'recurrent',
        recurrence_rule: JSON.stringify({ freq: 'WEEKLY', interval: 1, byweekday: [2], dtstart: SHORT_START,
            time_ranges: { '2': {start:'08:00',end:'13:00'} } }),
        start_time: '08:00', end_time: '13:00', start_date: SHORT_START, end_date: SHORT_END, status: 'published'
    };

    // Remove t1 first so t5b can claim Tuesday
    await run("DELETE FROM spots WHERE agenda_id = 't1'");
    await run("DELETE FROM agendas WHERE id = 't1'");

    const r5b = await gen(a5b);
    console.log(`\nCaso 5 - Step 1 (t5b generated): ${r5b.spotsGenerated} spots, ${r5b.conflicts} conflicts`);

    // Now regenerate t1
    const r5a = await gen(a1);
    console.log(`Caso 5 - Step 2 (t1 regenerated): ${r5a.spotsGenerated} spots, ${r5a.conflicts} conflicts`);

    // Tue Aug 11: should be 0 for t1 (provider conflict with t5b)
    spots = await q('SELECT start_time FROM spots WHERE agenda_id=? AND date=? ORDER BY start_time', ['t1', '2026-08-11']);
    console.log(`  Tue Aug 11 (t1): ${spots.length} spots (expect 0)`);
    console.log(`  ${spots.length===0 ? '✓ PASS' : '✗ FAIL'}`);

    // Tue Aug 11: should have spots for t5b
    spots = await q('SELECT start_time FROM spots WHERE agenda_id=? AND date=? ORDER BY start_time', ['t5b', '2026-08-11']);
    console.log(`  Tue Aug 11 (t5b): ${spots.length} spots (expect >0)`);
    console.log(`  ${spots.length > 0 ? '✓ PASS' : '✗ FAIL'}`);

    // Thu Aug 13: should still work for t1
    spots = await q('SELECT start_time FROM spots WHERE agenda_id=? AND date=? ORDER BY start_time', ['t1', '2026-08-13']);
    console.log(`  Thu Aug 13 (t1): ${spots.length} spots (expect 7)`);
    console.log(`  ${spots.length===7 ? '✓ PASS' : '✗ FAIL'}`);

    // Cleanup
    await run("DELETE FROM spots WHERE agenda_id LIKE 't%'");
    await run("DELETE FROM agendas WHERE id LIKE 't%'");
    await run("DELETE FROM bookings WHERE id LIKE 't%'");
    await run("DELETE FROM service_rooms WHERE id LIKE 'sr-%'");
    await run("DELETE FROM services WHERE id LIKE 'svc-%'");

    console.log('\n=== All tests completed ===');
    process.exit(0);
}

setTimeout(() => main(), 2000);
