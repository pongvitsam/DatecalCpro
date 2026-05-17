/**
 * Century-span (~80–100 years) contract/date tests
 * Run: node tests/date-math-century.test.js
 */
var lib = require('./date-math.lib.js');
var d = function (y, m, day) {
    return new Date(y, m, day);
};
var fmt = lib.fmt;
var sameDay = lib.sameDay;

var failures = [];
var pass = 0;

function assert(cond, msg) {
    if (!cond) {
        failures.push(msg);
        return false;
    }
    return true;
}

function test(name, fn) {
    try {
        if (fn() !== false) {
            pass++;
            console.log('OK  ' + name);
        } else {
            console.log('FAIL ' + name);
        }
    } catch (e) {
        failures.push(name + ': ' + e.message);
        console.log('FAIL ' + name + ': ' + e.message);
    }
}

function durationCheck(start, end, mode) {
    var rangeStart = start;
    var rangeEnd = end;
    if (rangeStart > rangeEnd) {
        rangeStart = end;
        rangeEnd = start;
    }
    var ymd = lib.computeYmdDiff(rangeStart, rangeEnd, mode);
    var cal = lib.totalDaysBetween(rangeStart, rangeEnd, mode);
    var br = lib.totalDaysFromBreakdown(rangeStart, ymd.years, ymd.months, ymd.days, mode, rangeEnd);
    var fwd = lib.shiftEndDate(rangeStart, ymd.years, ymd.months, ymd.days, true, mode, rangeEnd);
    var back = lib.shiftEndDate(rangeEnd, ymd.years, ymd.months, ymd.days, false, mode, rangeStart);
    var ok = br === cal && sameDay(fwd, rangeEnd) && sameDay(back, rangeStart);
    return {
        ok: ok,
        ymd: ymd,
        cal: cal,
        br: br,
        fwd: fmt(fwd),
        back: fmt(back),
        wantEnd: fmt(rangeEnd),
        wantStart: fmt(rangeStart)
    };
}

// ========== Fixed ~100 year scenarios ==========
var CENTURY_FIXTURES = [
    { name: '100y exclusive 15 Jan 1926→1927', s: [1926, 0, 15], e: [2026, 0, 15], mode: 'exclusive', addY: 100 },
    { name: '100y inclusive 1 Jan 1926→31 Dec 2025', s: [1926, 0, 1], e: [2025, 11, 31], mode: 'inclusive' },
    { name: '99y exclusive mid-year', s: [1927, 5, 20], e: [2026, 5, 20], mode: 'exclusive', addY: 99 },
    { name: '100y leap 29 Feb 1928→1928', s: [1928, 1, 29], e: [2028, 1, 28], mode: 'exclusive' },
    { name: '90y with months 1935→2025', s: [1935, 2, 5], e: [2025, 10, 15], mode: 'inclusive' },
    { name: '100y century boundary 31 Dec', s: [1925, 11, 31], e: [2025, 11, 30], mode: 'inclusive' },
    { name: '85y month-end Jun30', s: [1940, 5, 30], e: [2025, 5, 29], mode: 'inclusive' },
    { name: '100y shift only years', s: [1926, 3, 12], e: [2026, 3, 11], mode: 'inclusive', addY: 100 },
    { name: '95y exclusive contract', s: [1931, 8, 1], e: [2026, 8, 1], mode: 'exclusive', addY: 95 },
    { name: '80y span 1946→2026', s: [1946, 0, 1], e: [2026, 0, 1], mode: 'exclusive', addY: 80 }
];

CENTURY_FIXTURES.forEach(function (fx) {
    test('FIX ' + fx.name, function () {
        var s = d(fx.s[0], fx.s[1], fx.s[2]);
        var e = d(fx.e[0], fx.e[1], fx.e[2]);
        var r = durationCheck(s, e, fx.mode || 'inclusive');
        if (!r.ok) {
            return assert(false, JSON.stringify(r));
        }
        if (fx.addY != null) {
            var end = lib.shiftEndDate(s, fx.addY, 0, 0, true, fx.mode || 'inclusive', e);
            if (!sameDay(end, e)) {
                return assert(false, 'shift +' + fx.addY + 'y got ' + fmt(end) + ' want ' + fmt(e));
            }
        }
        return true;
    });
});

// ========== Pure +100 year shift ==========
test('SHIFT +100y exclusive 1 Mar 1926', function () {
    var s = d(1926, 2, 1);
    var e = lib.shiftEndDate(s, 100, 0, 0, true, 'exclusive', d(2026, 2, 1));
    return assert(sameDay(e, d(2026, 2, 1)), fmt(e));
});

test('SHIFT +100y inclusive 15 Jan 1926', function () {
    var s = d(1926, 0, 15);
    var want = d(2026, 0, 14);
    var e = lib.shiftEndDate(s, 100, 0, 0, true, 'inclusive', want);
    return assert(sameDay(e, want), fmt(e));
});

test('SHIFT +100y 3m 15d round-trip', function () {
    var s = d(1926, 6, 4);
    var end = lib.shiftEndDate(s, 100, 3, 15, true, 'inclusive');
    var back = lib.shiftEndDate(end, 100, 3, 15, false, 'inclusive', s);
    return assert(sameDay(back, s), fmt(back) + ' vs ' + fmt(s));
});

// ========== Calendar totals over a century ==========
test('CAL 1926-01-01 to 2025-12-31 exclusive', function () {
    var s = d(1926, 0, 1);
    var e = d(2025, 11, 31);
    var ex = lib.totalDaysBetween(s, e, 'exclusive');
    var inc = lib.totalDaysBetween(s, e, 'inclusive');
    return assert(ex === 36524 && inc === 36525, 'ex=' + ex + ' inc=' + inc);
});

test('CAL 100y component 15 Jan 1926→2026 exclusive', function () {
    var s = d(1926, 0, 15);
    var e = d(2026, 0, 15);
    var ymd = lib.computeYmdDiff(s, e, 'exclusive');
    return assert(ymd.years === 100 && ymd.months === 0 && ymd.days === 0, JSON.stringify(ymd));
});

// ========== Fuzz 80–100 year spans (1925–2038) ==========
function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function randomDateInYear(rng, year) {
    var m = Math.floor(rng() * 12);
    var dim = new Date(year, m + 1, 0).getDate();
    return new Date(year, m, 1 + Math.floor(rng() * dim));
}

test('FUZZ 3000 pairs span 80–100 years inclusive', function () {
    var rng = makeRng(1925100);
    var fails = 0;
    for (var i = 0; i < 3000; i++) {
        var y1 = 1925 + Math.floor(rng() * 55);
        var span = 80 + Math.floor(rng() * 21);
        var y2 = y1 + span;
        if (y2 > 2038) {
            continue;
        }
        var a = randomDateInYear(rng, y1);
        var b = randomDateInYear(rng, y2);
        var r = durationCheck(a, b, 'inclusive');
        if (!r.ok) {
            failures.push('inc #' + i + ' ' + fmt(a) + '..' + fmt(b) + ' ' + JSON.stringify(r));
            fails++;
            if (fails >= 5) {
                return false;
            }
        }
    }
    return fails === 0;
});

test('FUZZ 3000 pairs span 80–100 years exclusive', function () {
    var rng = makeRng(2026100);
    var fails = 0;
    for (var i = 0; i < 3000; i++) {
        var y1 = 1925 + Math.floor(rng() * 55);
        var span = 80 + Math.floor(rng() * 21);
        var y2 = y1 + span;
        if (y2 > 2038) {
            continue;
        }
        var a = randomDateInYear(rng, y1);
        var b = randomDateInYear(rng, y2);
        var r = durationCheck(a, b, 'exclusive');
        if (!r.ok) {
            failures.push('ex #' + i + ' ' + fmt(a) + '..' + fmt(b) + ' ' + JSON.stringify(r));
            fails++;
            if (fails >= 5) {
                return false;
            }
        }
    }
    return fails === 0;
});

test('FUZZ every 10th year anchor 1926–2026 (+100y inclusive)', function () {
    for (var y = 1926; y <= 1926; y += 10) {
        if (y + 100 > 2038) {
            break;
        }
        var s = d(y, 6, 15);
        var e = d(y + 100, 6, 14);
        var r = durationCheck(s, e, 'inclusive');
        if (!r.ok) {
            return assert(false, y + ': ' + JSON.stringify(r));
        }
    }
    for (var y2 = 1926; y2 <= 2026; y2 += 10) {
        if (y2 + 100 > 2038) {
            break;
        }
        var s2 = d(y2, 6, 15);
        var e2 = d(y2 + 100, 6, 14);
        var r2 = durationCheck(s2, e2, 'inclusive');
        if (!r2.ok) {
            return assert(false, y2 + ': ' + JSON.stringify(r2));
        }
    }
    return true;
});

console.log('\n========================================');
console.log('Century-span: Passed ' + pass + '  Failed ' + failures.length);
console.log('========================================');
if (failures.length) {
    failures.slice(0, 20).forEach(function (f, i) {
        console.log('  ' + (i + 1) + '. ' + f);
    });
}
process.exit(failures.length ? 1 : 0);
