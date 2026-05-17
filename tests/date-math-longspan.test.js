/**
 * Long-span (50–60+ years) contract/date tests
 * Run: node tests/date-math-longspan.test.js
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

function shiftAdd(start, y, m, day, mode) {
    return lib.shiftEndDate(start, y, m, day, true, mode);
}

function shiftSub(end, y, m, day, mode, anchor) {
    return lib.shiftEndDate(end, y, m, day, false, mode, anchor);
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
    var ok =
        br === cal &&
        sameDay(fwd, rangeEnd) &&
        sameDay(shiftSub(rangeEnd, ymd.years, ymd.months, ymd.days, mode, rangeStart), rangeStart);
    return { ok: ok, ymd: ymd, cal: cal, br: br, fwd: fmt(fwd), want: fmt(rangeEnd) };
}

// ========== Fixed 50–60 year contract scenarios ==========
var LONG_FIXTURES = [
    { name: '50y exclusive 1975→2025', s: [1975, 5, 1], e: [2025, 5, 1], mode: 'exclusive', addY: 50 },
    { name: '50y inclusive 1975→2025', s: [1975, 5, 1], e: [2025, 4, 30], mode: 'inclusive', addY: 50 },
    { name: '60y exclusive 1965→2025', s: [1965, 0, 15], e: [2025, 0, 15], mode: 'exclusive', addY: 60 },
    { name: '60y inclusive 1965→2025', s: [1965, 0, 15], e: [2025, 0, 14], mode: 'inclusive', addY: 60 },
    { name: '55y with months 1970→2025', s: [1970, 2, 10], e: [2025, 8, 20], mode: 'inclusive' },
    { name: '52y leap span 1972→2024', s: [1972, 1, 29], e: [2024, 1, 29], mode: 'exclusive' },
    { name: '58y century 1968→2026', s: [1968, 11, 31], e: [2026, 0, 1], mode: 'inclusive' },
    { name: '50y subtract round-trip anchor', s: [1976, 6, 4], e: [2026, 6, 3], mode: 'inclusive' },
    { name: '60y contract Jan1', s: [1966, 0, 1], e: [2026, 0, 1], mode: 'exclusive', addY: 60 },
    { name: '54y mid-year', s: [1971, 5, 17], e: [2025, 5, 16], mode: 'inclusive' }
];

LONG_FIXTURES.forEach(function (fx) {
    test('FIX ' + fx.name, function () {
        var s = d(fx.s[0], fx.s[1], fx.s[2]);
        var e = d(fx.e[0], fx.e[1], fx.e[2]);
        var r = durationCheck(s, e, fx.mode || 'inclusive');
        if (!r.ok) {
            return assert(false, JSON.stringify(r));
        }
        if (fx.addY != null) {
            var end = shiftAdd(s, fx.addY, 0, 0, fx.mode === 'exclusive' ? 'exclusive' : 'inclusive');
            if (fx.mode === 'exclusive' && !sameDay(end, e)) {
                return assert(false, 'shift ' + fx.addY + 'y got ' + fmt(end) + ' want ' + fmt(e));
            }
        }
        return true;
    });
});

// ========== Pure +50 / +60 year shift ==========
test('SHIFT +50y exclusive from 1 Mar 1975', function () {
    var s = d(1975, 2, 1);
    var e = shiftAdd(s, 50, 0, 0, 'exclusive');
    return assert(sameDay(e, d(2025, 2, 1)), fmt(e));
});

test('SHIFT +60y inclusive from 15 Jan 1965', function () {
    var s = d(1965, 0, 15);
    var e = shiftAdd(s, 60, 0, 0, 'inclusive');
    return assert(sameDay(e, d(2025, 0, 14)), fmt(e));
});

test('SHIFT +55y 6m 20d inclusive round-trip', function () {
    var s = d(1970, 0, 1);
    var end = shiftAdd(s, 55, 6, 20, 'inclusive');
    var back = shiftSub(end, 55, 6, 20, 'inclusive', s);
    return assert(sameDay(back, s), fmt(back) + ' vs ' + fmt(s));
});

// ========== Fuzz: random spans 45–65 years apart ==========
function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function randomDateBetween(rng, yMin, yMax) {
    var y = yMin + Math.floor(rng() * (yMax - yMin + 1));
    var m = Math.floor(rng() * 12);
    var dim = new Date(y, m + 1, 0).getDate();
    var day = 1 + Math.floor(rng() * dim);
    return new Date(y, m, day);
}

test('FUZZ 2000 pairs span 45–65 years inclusive', function () {
    var rng = makeRng(6060);
    for (var i = 0; i < 2000; i++) {
        var y1 = 1960 + Math.floor(rng() * 40);
        var span = 45 + Math.floor(rng() * 21);
        var y2 = y1 + span;
        if (y2 > 2038) {
            continue;
        }
        var a = randomDateBetween(rng, y1, y1);
        var b = randomDateBetween(rng, y2, y2);
        var r = durationCheck(a, b, 'inclusive');
        if (!r.ok) {
            return assert(false, i + ' ' + fmt(a) + '..' + fmt(b) + ' ' + JSON.stringify(r));
        }
    }
    return true;
});

test('FUZZ 2000 pairs span 45–65 years exclusive', function () {
    var rng = makeRng(7070);
    for (var i = 0; i < 2000; i++) {
        var y1 = 1960 + Math.floor(rng() * 40);
        var span = 45 + Math.floor(rng() * 21);
        var y2 = y1 + span;
        if (y2 > 2038) {
            continue;
        }
        var a = randomDateBetween(rng, y1, y1);
        var b = randomDateBetween(rng, y2, y2);
        var r = durationCheck(a, b, 'exclusive');
        if (!r.ok) {
            return assert(false, i + ' ' + fmt(a) + '..' + fmt(b) + ' ' + JSON.stringify(r));
        }
    }
    return true;
});

// ========== Known calendar totals over ~60 years ==========
test('CAL 1965-01-01 to 2025-12-31 exclusive day count', function () {
    var s = d(1965, 0, 1);
    var e = d(2025, 11, 31);
    var ex = lib.totalDaysBetween(s, e, 'exclusive');
    var inc = lib.totalDaysBetween(s, e, 'inclusive');
    return assert(ex === 22279 && inc === 22280, 'ex=' + ex + ' inc=' + inc);
});

test('CAL 1975-06-01 to 2025-06-01 exclusive = 50 years', function () {
    var s = d(1975, 5, 1);
    var e = d(2025, 5, 1);
    var ymd = lib.computeYmdDiff(s, e, 'exclusive');
    return assert(ymd.years === 50 && ymd.months === 0 && ymd.days === 0, JSON.stringify(ymd));
});

// ========== subtract window stress (60y, no anchor) ==========
test('SUBTRACT 60y without anchor still round-trips forward', function () {
    var s = d(1965, 3, 12);
    var e = d(2025, 3, 11);
    var ymd = lib.computeYmdDiff(s, e, 'inclusive');
    var mid = shiftAdd(s, ymd.years, ymd.months, ymd.days, 'inclusive');
    var backNoAnchor = shiftSub(mid, ymd.years, ymd.months, ymd.days, 'inclusive', null);
    var again = shiftAdd(backNoAnchor, ymd.years, ymd.months, ymd.days, 'inclusive');
    return assert(sameDay(again, mid), 'back=' + fmt(backNoAnchor) + ' mid=' + fmt(mid));
});

console.log('\n========================================');
console.log('Long-span: Passed ' + pass + '  Failed ' + failures.length);
console.log('========================================');
if (failures.length) {
    failures.slice(0, 30).forEach(function (f, i) {
        console.log('  ' + (i + 1) + '. ' + f);
    });
}
process.exit(failures.length ? 1 : 0);
