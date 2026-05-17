/**
 * Mirror of docs/js/app.js date helpers — keep in sync with app.js
 */
var MS_PER_DAY = 86400000;

function startOfDay(date) {
    var d = date instanceof Date ? date : new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffCalendarDays(fromDate, toDate) {
    var from = startOfDay(fromDate);
    var to = startOfDay(toDate);
    return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function totalDaysBetween(startDate, endDate, countMode) {
    var start = startOfDay(startDate);
    var end = startOfDay(endDate);
    if (start > end) {
        var tmp = start;
        start = end;
        end = tmp;
    }
    var total = diffCalendarDays(start, end);
    if (countMode === 'inclusive') {
        total += 1;
    }
    return total < 0 ? 0 : total;
}

function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * บวก/ลบ ปี-เดือน-วัน แบบปฏิทิน (สอดคล้องกับ computeYmdDiff)
 * ไม่ใช้ setMonth ของ JS ที่เลื่อนเดือนเมื่อวันเกิน (เช่น 29 ก.พ. → 1 มี.ค.)
 */
/** ถอน addCalendarYmd — หา S ที่ add(S) === endCalc (ชอบวันที่ใกล้ preferNear ถ้าระบุ) */
function subtractCalendarYmd(endCalcDate, years, months, days, preferNear) {
    var target = startOfDay(endCalcDate).getTime();
    var approxMs =
        target - Math.round((years * 365.25 + months * 30 + days) * MS_PER_DAY);
    var approx = preferNear != null ? startOfDay(preferNear) : startOfDay(new Date(approxMs));

    var best = null;
    var bestDist = Infinity;
    var windowDays = 120;

    for (var delta = -windowDays; delta <= windowDays; delta++) {
        var tryDate = startOfDay(new Date(approx.getTime() + delta * MS_PER_DAY));
        if (addCalendarYmd(tryDate, years, months, days, 1).getTime() === target) {
            var dist = Math.abs(tryDate.getTime() - approx.getTime());
            if (dist < bestDist) {
                bestDist = dist;
                best = tryDate;
            }
        }
    }

    if (best != null) {
        return best;
    }

    var guess = startOfDay(endCalcDate);
    guess.setFullYear(guess.getFullYear() - years - 1);
    guess.setMonth(guess.getMonth() - months - 1);
    guess.setDate(guess.getDate() - days - 14);
    var lo = Math.max(new Date(1900, 0, 1).getTime(), guess.getTime());
    var hi = target;
    var answer = null;

    while (lo <= hi) {
        var mid = lo + Math.floor((hi - lo) / (2 * MS_PER_DAY)) * MS_PER_DAY;
        var forward = addCalendarYmd(startOfDay(new Date(mid)), years, months, days, 1).getTime();
        if (forward === target) {
            answer = mid;
            hi = mid - MS_PER_DAY;
        } else if (forward < target) {
            lo = mid + MS_PER_DAY;
        } else {
            hi = mid - MS_PER_DAY;
        }
    }

    if (answer != null) {
        return startOfDay(new Date(answer));
    }
    return startOfDay(new Date(lo));
}

function addCalendarYmd(baseDate, years, months, days, factor) {
    var f = factor || 1;
    if (f < 0) {
        return subtractCalendarYmd(baseDate, years, months, days);
    }

    var base = startOfDay(baseDate);
    var y = base.getFullYear() + years;
    var m = base.getMonth() + months;
    var day = base.getDate() + days;

    while (m < 0) {
        m += 12;
        y -= 1;
    }
    while (m > 11) {
        m -= 12;
        y += 1;
    }

    while (day > daysInMonth(y, m)) {
        day -= daysInMonth(y, m);
        m += 1;
        if (m > 11) {
            m = 0;
            y += 1;
        }
    }
    while (day < 1) {
        m -= 1;
        if (m < 0) {
            m = 11;
            y -= 1;
        }
        day += daysInMonth(y, m);
    }

    return startOfDay(new Date(y, m, day));
}

/** @deprecated alias — ใช้ addCalendarYmd สำหรับ shift/duration */
function addYmdToDate(baseDate, years, months, days, factor) {
    return addCalendarYmd(baseDate, years, months, days, factor);
}

function computeYmdDiff(startDate, endDate, countMode) {
    var d1 = startOfDay(startDate);
    var d2 = startOfDay(endDate);
    if (d1 > d2) {
        var tmp = d1;
        d1 = d2;
        d2 = tmp;
    }
    var endCalc = new Date(d2);
    if (countMode === 'inclusive') {
        endCalc.setDate(endCalc.getDate() + 1);
    }
    var years = endCalc.getFullYear() - d1.getFullYear();
    var months = endCalc.getMonth() - d1.getMonth();
    var days = endCalc.getDate() - d1.getDate();
    if (days < 0) {
        months--;
        days += new Date(endCalc.getFullYear(), endCalc.getMonth(), 0).getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    return {
        years: years < 0 ? 0 : years,
        months: months < 0 ? 0 : months,
        days: days < 0 ? 0 : days
    };
}

function totalDaysFromBreakdown(startDate, years, months, days, countMode, endDate) {
    if (endDate != null) {
        return totalDaysBetween(startDate, endDate, countMode);
    }
    var from = startOfDay(startDate);
    var to = addCalendarYmd(from, years, months, days, 1);
    if (countMode === 'inclusive') {
        to.setDate(to.getDate() - 1);
    }
    return totalDaysBetween(from, to, countMode);
}

function shiftEndDate(start, years, months, days, isAdd, countMode, subtractAnchor) {
    var base = startOfDay(start);
    if (isAdd) {
        var result = addCalendarYmd(base, years, months, days, 1);
        if (countMode === 'inclusive') {
            result.setDate(result.getDate() - 1);
        }
        return startOfDay(result);
    }
    var endCalc = base;
    if (countMode === 'inclusive') {
        endCalc = new Date(base);
        endCalc.setDate(endCalc.getDate() + 1);
        endCalc = startOfDay(endCalc);
    }
    return subtractCalendarYmd(endCalc, years, months, days, subtractAnchor);
}

function fmt(d) {
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

function sameDay(a, b) {
    return fmt(startOfDay(a)) === fmt(startOfDay(b));
}

module.exports = {
    MS_PER_DAY: MS_PER_DAY,
    startOfDay: startOfDay,
    diffCalendarDays: diffCalendarDays,
    totalDaysBetween: totalDaysBetween,
    daysInMonth: daysInMonth,
    addCalendarYmd: addCalendarYmd,
    subtractCalendarYmd: subtractCalendarYmd,
    addYmdToDate: addYmdToDate,
    computeYmdDiff: computeYmdDiff,
    totalDaysFromBreakdown: totalDaysFromBreakdown,
    shiftEndDate: shiftEndDate,
    fmt: fmt,
    sameDay: sameDay
};
