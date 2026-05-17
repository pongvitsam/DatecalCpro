/**
 * Comprehensive date math tests — run: node tests/date-math.test.js
 * Mirrors docs/js/app.js — update tests/date-math.lib.js when app.js changes
 */
var lib = require('./date-math.lib.js');
var startOfDay = lib.startOfDay;
var diffCalendarDays = lib.diffCalendarDays;
var totalDaysBetween = lib.totalDaysBetween;
var addYmdToDate = lib.addYmdToDate;
var computeYmdDiff = lib.computeYmdDiff;
var totalDaysFromBreakdown = lib.totalDaysFromBreakdown;
var shiftEndDate = lib.shiftEndDate;
var fmt = lib.fmt;
var sameDay = lib.sameDay;
var MS_PER_DAY = lib.MS_PER_DAY;

var failures = [];
var passCount = 0;
var failCount = 0;

function assert(cond, msg) {
    if (!cond) {
        failures.push(msg);
        return false;
    }
    return true;
}

function test(name, fn) {
    try {
        var ok = fn();
        if (ok === false) {
            failCount++;
            console.log('FAIL ' + name);
        } else {
            passCount++;
            console.log('OK  ' + name);
        }
    } catch (e) {
        failCount++;
        failures.push(name + ': ' + e.message);
        console.log('FAIL ' + name + ': ' + e.message);
    }
}

function d(y, m, day) {
    return new Date(y, m, day);
}

/** Seeded PRNG for reproducible fuzz */
function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function randomDate(rng, yMin, yMax) {
    var y = yMin + Math.floor(rng() * (yMax - yMin + 1));
    var m = Math.floor(rng() * 12);
    var dim = new Date(y, m + 1, 0).getDate();
    var day = 1 + Math.floor(rng() * dim);
    return new Date(y, m, day);
}

function orderedPair(a, b) {
    var s = startOfDay(a);
    var e = startOfDay(b);
    if (s > e) {
        return { start: e, end: s, swapped: true };
    }
    return { start: s, end: e, swapped: false };
}

// ========== A. Basic invariants ==========
test('A1 same day inclusive = 1', function () {
    return assert(totalDaysBetween(d(2026, 4, 17), d(2026, 4, 17), 'inclusive') === 1);
});

test('A2 same day exclusive = 0', function () {
    return assert(totalDaysBetween(d(2026, 4, 17), d(2026, 4, 17), 'exclusive') === 0);
});

test('A3 inclusive = exclusive + 1 when start < end', function () {
    var s = d(2026, 4, 17);
    var e = d(2027, 0, 6);
    var ex = totalDaysBetween(s, e, 'exclusive');
    var inc = totalDaysBetween(s, e, 'inclusive');
    return assert(inc === ex + 1, 'inc=' + inc + ' ex=' + ex);
});

test('A4 reversed input same as ordered', function () {
    var a = d(2027, 0, 6);
    var b = d(2026, 4, 17);
    return assert(
        totalDaysBetween(a, b, 'inclusive') === totalDaysBetween(b, a, 'inclusive'),
        'reversed mismatch'
    );
});

test('A5 diffCalendarDays antisymmetric', function () {
    var a = d(2026, 0, 1);
    var b = d(2026, 5, 15);
    return assert(diffCalendarDays(a, b) === -diffCalendarDays(b, a));
});

test('A6 startOfDay strips time', function () {
    var raw = new Date(2026, 4, 17, 23, 59, 59, 999);
    var sod = startOfDay(raw);
    return assert(sod.getHours() === 0 && sod.getMinutes() === 0 && sod.getSeconds() === 0);
});

test('A7 ISO string parses to local calendar day (not UTC drift)', function () {
    var sod = startOfDay('2026-05-17');
    return assert(sod.getFullYear() === 2026 && sod.getMonth() === 4 && sod.getDate() === 17);
});

test('A7b ISO string avoids UTC off-by-one in negative offset zones', function () {
    var sod = startOfDay('2026-01-01');
    return assert(sod.getMonth() === 0 && sod.getDate() === 1, 'got ' + sod.toString());
});

test('A8 MS_PER_DAY round-trip exact for +100 days', function () {
    var from = d(2020, 0, 1);
    var to = d(2020, 3, 10);
    return assert(diffCalendarDays(from, to) === 100);
});

// ========== B. Known contract fixtures ==========
var FIXTURES = [
    { s: [2026, 4, 17], e: [2027, 0, 6], inc: 235, ex: 234, y: 0, m: 7, d: 21 },
    { s: [2026, 0, 1], e: [2026, 11, 31], inc: 365, ex: 364, y: 1, m: 0, d: 0 },
    { s: [2024, 0, 1], e: [2024, 11, 31], inc: 366, ex: 365, y: 1, m: 0, d: 0 },
    { s: [2025, 0, 1], e: [2025, 11, 31], inc: 365, ex: 364, y: 1, m: 0, d: 0 },
    { s: [2026, 1, 28], e: [2026, 2, 1], inc: 2, ex: 1, y: 0, m: 0, d: 2 },
    { s: [2024, 1, 28], e: [2024, 2, 1], inc: 3, ex: 2, y: 0, m: 0, d: 3 },
    { s: [2026, 4, 17], e: [2026, 4, 23], inc: 7, ex: 6, y: 0, m: 0, d: 7 },
    { s: [2020, 1, 29], e: [2021, 1, 28], inc: 366, ex: 365, y: 1, m: 0, d: 0 },
    { s: [2019, 11, 31], e: [2020, 0, 1], inc: 2, ex: 1, y: 0, m: 0, d: 2 }
];

FIXTURES.forEach(function (fx, i) {
    test('B fixture #' + (i + 1) + ' calendar days', function () {
        var s = d(fx.s[0], fx.s[1], fx.s[2]);
        var e = d(fx.e[0], fx.e[1], fx.e[2]);
        var inc = totalDaysBetween(s, e, 'inclusive');
        var ex = totalDaysBetween(s, e, 'exclusive');
        return (
            assert(inc === fx.inc, 'inclusive expected ' + fx.inc + ' got ' + inc) &&
            assert(ex === fx.ex, 'exclusive expected ' + fx.ex + ' got ' + ex)
        );
    });
    test('B fixture #' + (i + 1) + ' ymd + breakdown', function () {
        var s = d(fx.s[0], fx.s[1], fx.s[2]);
        var e = d(fx.e[0], fx.e[1], fx.e[2]);
        var ymd = computeYmdDiff(s, e, 'inclusive');
        var okYmd =
            ymd.years === fx.y && ymd.months === fx.m && ymd.days === fx.d;
        var fromBreak = totalDaysFromBreakdown(s, ymd.years, ymd.months, ymd.days, 'inclusive', e);
        return (
            assert(okYmd, 'ymd ' + JSON.stringify(ymd) + ' expected ' + fx.y + '/' + fx.m + '/' + fx.d) &&
            assert(fromBreak === fx.inc, 'breakdown ' + fromBreak + ' vs ' + fx.inc)
        );
    });
    test('B fixture #' + (i + 1) + ' shift round-trip inclusive', function () {
        var s = d(fx.s[0], fx.s[1], fx.s[2]);
        var e = d(fx.e[0], fx.e[1], fx.e[2]);
        var ymd = computeYmdDiff(s, e, 'inclusive');
        var end = shiftEndDate(s, ymd.years, ymd.months, ymd.days, true, 'inclusive');
        return assert(sameDay(end, e), 'shift got ' + fmt(end) + ' want ' + fmt(e));
    });
});

// ========== C. Month-end & leap edge cases ==========
var MONTH_END_CASES = [
    { base: [2026, 0, 31], add: [0, 1, 0], expect: [2026, 2, 3] },
    { base: [2026, 0, 31], add: [0, 1, 0], sub: true, expect: [2025, 11, 31] },
    { base: [2024, 0, 31], add: [0, 1, 0], expect: [2024, 2, 2] },
    { base: [2024, 1, 29], add: [1, 0, 0], expect: [2025, 2, 1] },
    { base: [2024, 1, 29], add: [0, 12, 0], expect: [2025, 2, 1] },
    { base: [2023, 0, 31], add: [0, 1, 0], expect: [2023, 2, 3] },
    { base: [2026, 2, 31], add: [0, 0, 0], expect: [2026, 2, 31] },
    { base: [2100, 1, 28], add: [0, 0, 1], expect: [2100, 2, 1] }
];

MONTH_END_CASES.forEach(function (c, i) {
    test('C month-end #' + (i + 1), function () {
        var base = d(c.base[0], c.base[1], c.base[2]);
        var factor = c.sub ? -1 : 1;
        var r = addYmdToDate(base, c.add[0], c.add[1], c.add[2], factor);
        var exp = d(c.expect[0], c.expect[1], c.expect[2]);
        return assert(sameDay(r, exp), 'got ' + fmt(r) + ' want ' + fmt(exp));
    });
});

// ========== D. Shift operations ==========
test('D1 exclusive add 7 days May17 -> May24', function () {
    return assert(sameDay(shiftEndDate(d(2026, 4, 17), 0, 0, 7, true, 'exclusive'), d(2026, 4, 24)));
});

test('D2 inclusive add 7 days May17 -> May23', function () {
    return assert(sameDay(shiftEndDate(d(2026, 4, 17), 0, 0, 7, true, 'inclusive'), d(2026, 4, 23)));
});

test('D3 exclusive subtract 7 days from May24 -> May17', function () {
    return assert(sameDay(shiftEndDate(d(2026, 4, 24), 0, 0, 7, false, 'exclusive'), d(2026, 4, 17)));
});

test('D4 inclusive subtract 7 days from May23 -> May17', function () {
    return assert(sameDay(shiftEndDate(d(2026, 4, 23), 0, 0, 7, false, 'inclusive'), d(2026, 4, 17)));
});

test('D5 add then subtract exclusive returns start', function () {
    var s = d(2026, 4, 17);
    var mid = shiftEndDate(s, 1, 3, 15, true, 'exclusive');
    var back = shiftEndDate(mid, 1, 3, 15, false, 'exclusive');
    return assert(sameDay(back, s), 'got ' + fmt(back));
});

test('D6 add then subtract inclusive returns start', function () {
    var s = d(2026, 4, 17);
    var mid = shiftEndDate(s, 0, 7, 21, true, 'inclusive');
    var back = shiftEndDate(mid, 0, 7, 21, false, 'inclusive');
    return assert(sameDay(back, s), 'mid=' + fmt(mid) + ' back=' + fmt(back));
});

test('D7 shift 1 day inclusive add from Jan1 stays Jan1', function () {
    var s = d(2026, 0, 1);
    var end = shiftEndDate(s, 0, 0, 1, true, 'inclusive');
    return assert(sameDay(end, s), 'got ' + fmt(end));
});

test('D8 shift 1 day exclusive add Jan1 -> Jan2', function () {
    return assert(sameDay(shiftEndDate(d(2026, 0, 1), 0, 0, 1, true, 'exclusive'), d(2026, 0, 2)));
});

test('D9 only years shift 2y inclusive', function () {
    var s = d(2024, 5, 10);
    var end = shiftEndDate(s, 2, 0, 0, true, 'inclusive');
    return assert(sameDay(end, d(2026, 5, 9)));
});

test('D10 only months shift 3m exclusive', function () {
    var s = d(2026, 0, 15);
    var end = shiftEndDate(s, 0, 3, 0, true, 'exclusive');
    return assert(sameDay(end, d(2026, 3, 15)));
});

// ========== E. computeYmdDiff structure ==========
test('E1 ymd components never negative', function () {
    var rng = makeRng(42);
    for (var i = 0; i < 500; i++) {
        var a = randomDate(rng, 1990, 2035);
        var b = randomDate(rng, 1990, 2035);
        var ymd = computeYmdDiff(a, b, 'inclusive');
        if (ymd.years < 0 || ymd.months < 0 || ymd.days < 0) {
            return assert(false, 'negative at ' + fmt(a) + ' ' + fmt(b));
        }
    }
    return true;
});

test('E2 ymd months in 0..11', function () {
    var rng = makeRng(99);
    for (var i = 0; i < 500; i++) {
        var a = randomDate(rng, 2000, 2030);
        var b = randomDate(rng, 2000, 2030);
        var ymd = computeYmdDiff(a, b, 'exclusive');
        if (ymd.months > 11) {
            return assert(false, 'months=' + ymd.months);
        }
    }
    return true;
});

test('E3 ymd days within month length', function () {
    var rng = makeRng(77);
    for (var i = 0; i < 500; i++) {
        var a = randomDate(rng, 2000, 2030);
        var b = randomDate(rng, 2000, 2030);
        var ymd = computeYmdDiff(a, b, 'inclusive');
        if (ymd.days > 31) {
            return assert(false, 'days=' + ymd.days);
        }
    }
    return true;
});

// ========== F. Property / fuzz (5000 pairs × 2 modes) ==========
function runFuzzProperty(name, iterations, checkFn) {
    test(name, function () {
        var rng = makeRng(12345);
        for (var i = 0; i < iterations; i++) {
            var a = randomDate(rng, 1980, 2040);
            var b = randomDate(rng, 1980, 2040);
            var err = checkFn(a, b, i);
            if (err) {
                return assert(false, err);
            }
        }
        return true;
    });
}

runFuzzProperty('F1 fuzz: breakdown days === calendar (inclusive)', 5000, function (a, b) {
    var p = orderedPair(a, b);
    var ymd = computeYmdDiff(p.start, p.end, 'inclusive');
    var cal = totalDaysBetween(p.start, p.end, 'inclusive');
    var br = totalDaysFromBreakdown(p.start, ymd.years, ymd.months, ymd.days, 'inclusive', p.end);
    if (br !== cal) {
        return 'inclusive ' + fmt(p.start) + '..' + fmt(p.end) + ' cal=' + cal + ' br=' + br + ' ymd=' + JSON.stringify(ymd);
    }
    return null;
});

runFuzzProperty('F2 fuzz: breakdown days === calendar (exclusive)', 5000, function (a, b) {
    var p = orderedPair(a, b);
    var ymd = computeYmdDiff(p.start, p.end, 'exclusive');
    var cal = totalDaysBetween(p.start, p.end, 'exclusive');
    var br = totalDaysFromBreakdown(p.start, ymd.years, ymd.months, ymd.days, 'exclusive', p.end);
    if (br !== cal) {
        return 'exclusive ' + fmt(p.start) + '..' + fmt(p.end) + ' cal=' + cal + ' br=' + br;
    }
    return null;
});

runFuzzProperty('F3 fuzz: shift forward inclusive lands on end', 3000, function (a, b) {
    var p = orderedPair(a, b);
    if (p.start.getTime() === p.end.getTime()) {
        return null;
    }
    var ymd = computeYmdDiff(p.start, p.end, 'inclusive');
    var end = shiftEndDate(p.start, ymd.years, ymd.months, ymd.days, true, 'inclusive');
    if (!sameDay(end, p.end)) {
        return 'shift ' + fmt(p.start) + '+' + JSON.stringify(ymd) + ' -> ' + fmt(end) + ' want ' + fmt(p.end);
    }
    return null;
});

runFuzzProperty('F4 fuzz: shift subtract then add inclusive returns end', 3000, function (a, b) {
    var p = orderedPair(a, b);
    if (p.start.getTime() === p.end.getTime()) {
        return null;
    }
    var ymd = computeYmdDiff(p.start, p.end, 'inclusive');
    var back = shiftEndDate(p.end, ymd.years, ymd.months, ymd.days, false, 'inclusive');
    var again = shiftEndDate(back, ymd.years, ymd.months, ymd.days, true, 'inclusive');
    if (!sameDay(again, p.end)) {
        return (
            'round-trip via ' +
            fmt(back) +
            ' end=' +
            fmt(p.end) +
            ' got=' +
            fmt(again) +
            ' ymd=' +
            JSON.stringify(ymd)
        );
    }
    return null;
});

runFuzzProperty('F4b fuzz: shift add then subtract inclusive returns start', 3000, function (a, b) {
    var p = orderedPair(a, b);
    if (p.start.getTime() === p.end.getTime()) {
        return null;
    }
    var ymd = computeYmdDiff(p.start, p.end, 'inclusive');
    var mid = shiftEndDate(p.start, ymd.years, ymd.months, ymd.days, true, 'inclusive');
    var back = shiftEndDate(mid, ymd.years, ymd.months, ymd.days, false, 'inclusive', p.start);
    if (!sameDay(back, p.start)) {
        return 'start ' + fmt(p.start) + ' via ' + fmt(mid) + ' back ' + fmt(back);
    }
    return null;
});

runFuzzProperty('F5 fuzz: inclusive - exclusive = 1 when different days', 5000, function (a, b) {
    var p = orderedPair(a, b);
    if (p.start.getTime() === p.end.getTime()) {
        return null;
    }
    var inc = totalDaysBetween(p.start, p.end, 'inclusive');
    var ex = totalDaysBetween(p.start, p.end, 'exclusive');
    if (inc !== ex + 1) {
        return fmt(p.start) + '..' + fmt(p.end) + ' inc=' + inc + ' ex=' + ex;
    }
    return null;
});

runFuzzProperty('F6 fuzz: diffCalendarDays matches manual when ordered', 2000, function (a, b) {
    var p = orderedPair(a, b);
    var diff = diffCalendarDays(p.start, p.end);
    var manual = Math.round((p.end - p.start) / MS_PER_DAY);
    if (diff !== manual) {
        return 'diff=' + diff + ' manual=' + manual;
    }
    return null;
});

runFuzzProperty('F7 fuzz: add exclusive N days then diff = N', 2000, function (a, b, i) {
    var start = randomDate(makeRng(i + 5000), 1995, 2035);
    var n = 1 + (i % 400);
    var end = shiftEndDate(start, 0, 0, n, true, 'exclusive');
    var diff = diffCalendarDays(start, end);
    if (diff !== n) {
        return 'n=' + n + ' diff=' + diff + ' ' + fmt(start) + '->' + fmt(end);
    }
    return null;
});

// ========== G. Duration display logic (simulate calculateDuration) ==========
test('G1 days format uses calendar not breakdown', function () {
    var s = d(2026, 4, 17);
    var e = d(2027, 0, 6);
    var ymd = computeYmdDiff(s, e, 'inclusive');
    var displayFormat = 'days';
    var totalDaysCalendar = totalDaysBetween(s, e, 'inclusive');
    var totalDays =
        displayFormat === 'days'
            ? totalDaysCalendar
            : totalDaysFromBreakdown(s, ymd.years, ymd.months, ymd.days, 'inclusive', e);
    return assert(totalDays === 235 && totalDays === totalDaysCalendar);
});

test('G2 full format totalDays matches calendar', function () {
    var s = d(2026, 4, 17);
    var e = d(2027, 0, 6);
    var ymd = computeYmdDiff(s, e, 'inclusive');
    var totalDays = totalDaysFromBreakdown(s, ymd.years, ymd.months, ymd.days, 'inclusive', e);
    return assert(totalDays === totalDaysBetween(s, e, 'inclusive'));
});

// ========== H. Cross-mode consistency ==========
test('H1 duration ymd then exclusive shift matches end', function () {
    var s = d(2026, 4, 17);
    var e = d(2027, 0, 6);
    var ymd = computeYmdDiff(s, e, 'exclusive');
    var end = shiftEndDate(s, ymd.years, ymd.months, ymd.days, true, 'exclusive');
    return assert(sameDay(end, e), fmt(end) + ' vs ' + fmt(e));
});

test('H2 exclusive ymd differs from inclusive by 1 day component', function () {
    var s = d(2026, 4, 17);
    var e = d(2027, 0, 6);
    var inc = computeYmdDiff(s, e, 'inclusive');
    var ex = computeYmdDiff(s, e, 'exclusive');
    return assert(inc.days === 21 && ex.days === 20, 'inc.d=' + inc.days + ' ex.d=' + ex.days);
});

test('H3 reversed date pick uses earlier date as range start', function () {
    var late = d(2027, 0, 6);
    var early = d(2026, 4, 17);
    var ymd = computeYmdDiff(late, early, 'inclusive');
    var br = totalDaysFromBreakdown(early, ymd.years, ymd.months, ymd.days, 'inclusive', late);
    return assert(br === 235, 'breakdown from early anchor got ' + br);
});

test('H4 leap day shift round-trip inclusive', function () {
    var s = d(1988, 1, 29);
    var e = d(2003, 5, 15);
    var ymd = computeYmdDiff(s, e, 'inclusive');
    var end = shiftEndDate(s, ymd.years, ymd.months, ymd.days, true, 'inclusive');
    return assert(sameDay(end, e), fmt(end) + ' vs ' + fmt(e));
});

// ========== I. Stress / boundary years ==========
test('I1 year 1900 pair', function () {
    return assert(totalDaysBetween(d(1900, 0, 1), d(1900, 0, 2), 'inclusive') === 2);
});

test('I2 year 2099 pair', function () {
    return assert(totalDaysBetween(d(2099, 11, 30), d(2099, 11, 31), 'inclusive') === 2);
});

test('I3 century non-leap Feb 2100', function () {
    return assert(totalDaysBetween(d(2100, 1, 28), d(2100, 2, 1), 'inclusive') === 2);
});

test('I4 large shift 10 years inclusive', function () {
    var s = d(2015, 6, 4);
    var end = shiftEndDate(s, 10, 0, 0, true, 'inclusive');
    return assert(sameDay(end, d(2025, 6, 3)));
});

// ========== Summary ==========
console.log('\n========================================');
console.log('Passed: ' + passCount + '  Failed: ' + failCount);
console.log('========================================');

if (failures.length) {
    console.log('\nFailures (' + failures.length + '):');
    failures.slice(0, 50).forEach(function (f, i) {
        console.log('  ' + (i + 1) + '. ' + f);
    });
    if (failures.length > 50) {
        console.log('  ... and ' + (failures.length - 50) + ' more');
    }
}

process.exit(failures.length ? 1 : 0);
