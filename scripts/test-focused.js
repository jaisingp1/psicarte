// scripts/test-focused.js
// Focused automated domain tests for PsicArte's 5-minute availability engine & booking rules
// Rule R14 compliant (all dates computed dynamically)

require('dotenv').config();
const db = require('../server/database');
const {
    timeToMinutes,
    minutesToTime,
    getDayOfWeek,
    getEffectiveRoomShiftsForDate,
    buildContiguousWindows,
    checkBreakRule,
    isProviderOnVacation,
    checkAdvanceLimits,
    calculateProviderMetricsForDay,
    getAvailableSpots,
    validateBookingSlot
} = require('../server/availability-engine');

let PASSED = 0;
let FAILED = 0;

function assert(condition, testName, detail = '') {
    if (condition) {
        PASSED++;
        console.log(`  ✅ PASS: ${testName}`);
    } else {
        FAILED++;
        console.error(`  ❌ FAIL: ${testName} - ${detail}`);
    }
}

async function runTests() {
    console.log('====================================================');
    console.log('   PsicArte 5-Min Availability Engine Domain Tests   ');
    console.log('====================================================\n');

    // 1. Time conversion helpers
    console.log('--- 1. Time Conversion Helpers ---');
    assert(timeToMinutes('09:00') === 540, '09:00 -> 540 min');
    assert(timeToMinutes('12:40') === 760, '12:40 -> 760 min');
    assert(minutesToTime(540) === '09:00', '540 min -> 09:00');
    assert(minutesToTime(760) === '12:40', '760 min -> 12:40');

    // 2. Break rule verification
    console.log('\n--- 2. Break Rule Verification ---');
    // Rule: break 12:30 - 13:30 (750 to 810).
    // Can end at most 10 min into break (up to 12:40 = 760).
    // Cannot start inside break.
    const testBreaks = [{
        start_time: '12:30',
        end_time: '13:30',
        startMins: 750,
        endMins: 810
    }];

    // Spot ending exactly when break starts (11:40 - 12:30)
    assert(checkBreakRule(700, 750, testBreaks) === true, 'Spot ending exactly at break start (11:40 - 12:30) is compliant');

    // Spot ending 10 minutes into break (11:50 - 12:40) -> Allowed by +10 min tolerance
    assert(checkBreakRule(710, 760, testBreaks) === true, 'Spot ending 10 min into break (11:50 - 12:40) is compliant');

    // Spot ending 15 minutes into break (11:55 - 12:45) -> Disallowed (> 10 min)
    assert(checkBreakRule(715, 765, testBreaks) === false, 'Spot ending 15 min into break (11:55 - 12:45) is rejected');

    // Spot starting inside break (12:30 - 13:20) -> Disallowed
    assert(checkBreakRule(750, 800, testBreaks) === false, 'Spot starting at break start (12:30 - 13:20) is rejected');

    // Spot starting at 12:35 (755) inside break -> Disallowed
    assert(checkBreakRule(755, 805, testBreaks) === false, 'Spot starting inside break (12:35) is rejected');

    // Spot starting at break end (13:30 - 14:20) -> Allowed
    assert(checkBreakRule(810, 860, testBreaks) === true, 'Spot starting exactly at break end (13:30 - 14:20) is compliant');

    // 3. Contiguous Shifts Window Merging
    console.log('\n--- 3. Contiguous Shifts Window Merging ---');
    const shiftsToMerge = [
        {
            roomId: 'room-1',
            providerId: 'prov-macarena',
            startTime: '09:00',
            endTime: '13:00',
            startMins: 540,
            endMins: 780,
            breaks: [{ start_time: '12:30', end_time: '13:00', startMins: 750, endMins: 780 }]
        },
        {
            roomId: 'room-1',
            providerId: 'prov-macarena',
            startTime: '13:00',
            endTime: '17:00',
            startMins: 780,
            endMins: 1020,
            breaks: []
        },
        {
            roomId: 'room-2',
            providerId: 'prov-cristian',
            startTime: '10:00',
            endTime: '14:00',
            startMins: 600,
            endMins: 840,
            breaks: []
        }
    ];

    const mergedWindows = buildContiguousWindows(shiftsToMerge);
    assert(mergedWindows.length === 2, 'Contiguous shifts for prov-macarena merged into 1 window, total 2 windows');
    const macarenaWindow = mergedWindows.find(w => w.providerId === 'prov-macarena');
    assert(macarenaWindow && macarenaWindow.startTime === '09:00' && macarenaWindow.endTime === '17:00', 'Merged window spans 09:00 to 17:00');
    assert(macarenaWindow.breaks.length === 1, 'Merged window preserves breaks');

    // 4. Vacation Checks
    console.log('\n--- 4. Provider Vacations Verification ---');
    const macarenaVacations = [
        {
            provider_id: 'prov-macarena',
            start_date: '2026-12-01',
            end_date: '2026-12-05',
            start_time: null,
            end_time: null
        }
    ];
    const cristianVacations = [
        {
            provider_id: 'prov-cristian',
            start_date: '2026-12-10',
            end_date: '2026-12-10',
            start_time: '14:00',
            end_time: '18:00'
        }
    ];

    assert(isProviderOnVacation(macarenaVacations, '2026-12-03', 600, 650) === true, 'All-day vacation blocks spot');
    assert(isProviderOnVacation(macarenaVacations, '2026-12-06', 600, 650) === false, 'Date outside vacation is not blocked');
    assert(isProviderOnVacation(cristianVacations, '2026-12-10', 600, 650) === false, 'Morning spot (10:00) before partial vacation (14:00) is allowed');
    assert(isProviderOnVacation(cristianVacations, '2026-12-10', 870, 920) === true, 'Afternoon spot (14:30) during partial vacation is blocked');

    // 5. Dynamic Next Weekday Availability Query
    console.log('\n--- 5. Dynamic Availability on Seeded DB ---');
    const serviceRows = await new Promise((res, rej) => db.all('SELECT * FROM services LIMIT 1', (e, r) => e ? rej(e) : res(r)));
    const testService = serviceRows[0];
    assert(!!testService, `Found seeded service for testing: ${testService?.name}`);

    // Find next Tuesday dynamically
    const now = new Date();
    const daysUntilTue = (2 + 7 - now.getDay()) % 7 || 7;
    const nextTue = new Date(now.getTime() + daysUntilTue * 24 * 60 * 60 * 1000);
    const nextTueStr = nextTue.toISOString().slice(0, 10);

    const spots = await getAvailableSpots(db, {
        serviceId: testService.id,
        date: nextTueStr
    });

    assert(Array.isArray(spots), 'getAvailableSpots returns an array');
    assert(spots.length > 0, `Spots found on next Tuesday (${nextTueStr}): ${spots.length}`);

    // Verify 5-minute grid alignment
    const all5MinAligned = spots.every(s => {
        const sm = timeToMinutes(s.startTime);
        const em = timeToMinutes(s.endTime);
        return sm % 5 === 0 && em % 5 === 0;
    });
    assert(all5MinAligned, 'All generated spots are aligned to the 5-minute grid');

    // Verify separation by provider
    const providersFound = new Set(spots.map(s => s.providerId));
    console.log(`  Spots offered across ${providersFound.size} providers: ${[...providersFound].join(', ')}`);
    assert(providersFound.size >= 1, 'Spots include provider IDs');

    // 6. Strict Slot Validation (validateBookingSlot)
    console.log('\n--- 6. Strict Slot Validation ---');
    if (spots.length > 0) {
        const spotToTest = spots[0];
        const valRes = await validateBookingSlot(db, {
            serviceId: spotToTest.serviceId,
            providerId: spotToTest.providerId,
            roomId: spotToTest.roomId,
            date: nextTueStr,
            startTime: spotToTest.startTime
        });
        assert(valRes.valid === true, `validateBookingSlot accepts valid spot at ${spotToTest.startTime}`);

        // Invalid time out of shift bounds (e.g. 03:00 AM)
        const invalidRes = await validateBookingSlot(db, {
            serviceId: spotToTest.serviceId,
            providerId: spotToTest.providerId,
            roomId: spotToTest.roomId,
            date: nextTueStr,
            startTime: '03:00'
        });
        assert(invalidRes.valid === false, 'validateBookingSlot rejects 03:00 AM spot out of bounds');
    }

    console.log('\n====================================================');
    console.log(`Results: ${PASSED} passed, ${FAILED} failed.`);
    console.log('====================================================');

    if (FAILED > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error('Fatal error running focused tests:', err);
    process.exit(1);
});
