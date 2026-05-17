let currentView = 'dashboard';
let dbHistory = [];
let currentTempResult = null;
let apiReady = false;

function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(function (el) {
        el.classList.add('hidden');
    });
    document.getElementById('view-' + viewName).classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(function (el) {
        if (el.dataset.target === viewName) {
            el.classList.add('bg-rose-50', 'text-rose-600', 'dark:bg-slate-700/50', 'dark:text-rose-400');
            el.classList.remove('text-slate-800', 'dark:text-slate-200');
        } else {
            el.classList.remove('bg-rose-50', 'text-rose-600', 'dark:bg-slate-700/50', 'dark:text-rose-400');
            el.classList.add('text-slate-800', 'dark:text-slate-200');
        }
    });

    currentView = viewName;

    if (viewName === 'history') {
        loadHistory();
    } else if (viewName === 'dashboard') {
        updateDashboard();
    }
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        menu.classList.add('flex');
    } else {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
    }
}

function applyThemeUI(isDark) {
    const icon = document.getElementById('themeIcon');
    const iconMobile = document.getElementById('themeIconMobile');
    const text = document.getElementById('themeText');

    if (isDark) {
        icon.className = 'ph ph-sun text-lg text-yellow-400';
        if (iconMobile) iconMobile.className = 'ph ph-sun text-xl text-yellow-400';
        text.innerText = 'โหมดสว่าง';
    } else {
        icon.className = 'ph ph-moon text-lg';
        if (iconMobile) iconMobile.className = 'ph ph-moon text-xl';
        text.innerText = 'โหมดกลางคืน';
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    DateCalcStorage.setItem('datecalc_theme', isDark ? 'dark' : 'light');
    applyThemeUI(isDark);
}

function showToast(message, type) {
    type = type || 'success';
    const container = document.getElementById('toastContainer');

    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        info: 'info'
    };

    const el = document.createElement('div');
    el.className = colors[type] + ' text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 toast-enter font-medium text-sm';
    el.innerHTML = '<i class="ph ph-' + icons[type] + ' text-xl"></i> ' + message;
    container.appendChild(el);

    setTimeout(function () {
        el.style.opacity = '0';
        el.style.transform = 'translateY(100%)';
        el.style.transition = 'all 0.3s ease';
        setTimeout(function () {
            el.remove();
        }, 300);
    }, 3000);
}

function formatThaiDate(date) {
    if (!date) return '-';
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const d = date.getDate();
    const m = thaiMonths[date.getMonth()];
    const y = date.getFullYear() + 543;
    return d + ' ' + m + ' ' + y;
}

function initDatePickers() {
    const fpConfig = {
        locale: 'th',
        altInput: true,
        altFormat: 'Y-m-d',
        disableMobile: 'true',
        dateFormat: 'Y-m-d',
        onChange: function (selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                instance.altInput.value = formatThaiDate(selectedDates[0]);
            }
        },
        onReady: function (selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                instance.altInput.value = formatThaiDate(selectedDates[0]);
            }
        }
    };

    window.fpShiftStart = flatpickr('#shiftStartDate', Object.assign({}, fpConfig, { defaultDate: new Date() }));
    window.fpDurStart = flatpickr('#durStartDate', Object.assign({}, fpConfig, { defaultDate: new Date() }));
    window.fpDurEnd = flatpickr('#durEndDate', Object.assign({}, fpConfig, { defaultDate: new Date() }));
}

function updateLiveClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const liveDateEl = document.getElementById('liveDate');
    const liveTimeEl = document.getElementById('liveTime');

    if (liveDateEl && liveTimeEl) {
        liveDateEl.innerText = now.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        liveTimeEl.innerText = 'เวลา ' + timeStr + ' น.';
    }
}

function setQuickShift(d, m, y) {
    document.getElementById('shiftDays').value = d;
    document.getElementById('shiftMonths').value = m;
    document.getElementById('shiftYears').value = y;
}

function calculateShift() {
    const selectedDates = window.fpShiftStart.selectedDates;
    if (!selectedDates || selectedDates.length === 0) {
        showToast('กรุณาเลือกวันที่เริ่มต้น', 'error');
        return;
    }

    const startDate = new Date(selectedDates[0]);
    const op = document.getElementById('shiftOperation').value;
    const countMode = document.getElementById('shiftCountMode').value;

    const days = parseInt(document.getElementById('shiftDays').value, 10) || 0;
    const months = parseInt(document.getElementById('shiftMonths').value, 10) || 0;
    const years = parseInt(document.getElementById('shiftYears').value, 10) || 0;

    if (days === 0 && months === 0 && years === 0) {
        showToast('กรุณาระบุระยะเวลาอย่างน้อย 1 อย่าง', 'error');
        return;
    }

    let resultDate = new Date(startDate);
    const isAdd = op === 'add';
    const factor = isAdd ? 1 : -1;

    resultDate.setFullYear(resultDate.getFullYear() + years * factor);
    resultDate.setMonth(resultDate.getMonth() + months * factor);
    resultDate.setDate(resultDate.getDate() + days * factor);

    if (countMode === 'inclusive') {
        if (isAdd) {
            resultDate.setDate(resultDate.getDate() - 1);
        } else {
            resultDate.setDate(resultDate.getDate() + 1);
        }
    }

    const thaiFormatEnd = formatThaiDate(resultDate);
    const thaiFormatStart = formatThaiDate(startDate);

    document.getElementById('sumStartDate').innerText = thaiFormatStart;

    const durText = [];
    if (years > 0) durText.push(years + ' ปี');
    if (months > 0) durText.push(months + ' เดือน');
    if (days > 0) durText.push(days + ' วัน');
    document.getElementById('sumDuration').innerText = (isAdd ? 'บวกเพิ่ม' : 'ย้อนหลัง') + ' ' + durText.join(' ');

    const modeTextDetail =
        countMode === 'inclusive'
            ? 'นับตั้งแต่วันที่เลือก (รวมวันแรกเป็นวันที่ 1)'
            : 'นับถัดจากวันที่เลือก (ไม่รวมวันแรก)';
    document.getElementById('sumCondition').innerText = modeTextDetail;
    document.getElementById('sumEndDate').innerText = thaiFormatEnd;

    const dayOfWeek = resultDate.getDay();
    const warningEl = document.getElementById('weekendWarning');
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    document.getElementById('shiftResultArea').classList.remove('hidden');

    currentTempResult = {
        type: 'shift',
        label: 'คำนวณสัญญา (' + (isAdd ? 'บวก' : 'ลบ') + ')',
        detail: 'เริ่ม: ' + thaiFormatStart + ' | ' + modeTextDetail + ' | ระยะ: ' + durText.join(' '),
        result: thaiFormatEnd,
        timestamp: new Date().toISOString()
    };
}

/** แปลง ปี+เดือน+วัน จากวันเริ่มต้น เป็นจำนวนวันรวม (ปฏิทินจริง) */
function totalDaysFromBreakdown(startDate, years, months, days, countMode) {
    const from = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const to = new Date(from);
    to.setFullYear(to.getFullYear() + years);
    to.setMonth(to.getMonth() + months);
    to.setDate(to.getDate() + days);

    let total = Math.round((to.getTime() - from.getTime()) / 86400000);
    if (countMode === 'inclusive') {
        total += 1;
    }
    return total < 0 ? 0 : total;
}

function formatDurationResultText(years, months, days, totalDays, displayFormat) {
    if (displayFormat === 'days') {
        return totalDays + ' วัน';
    }
    if (displayFormat === 'months') {
        const totalMonths = years * 12 + months;
        return totalMonths + ' เดือน ' + days + ' วัน';
    }
    return years + ' ปี ' + months + ' เดือน ' + days + ' วัน';
}

function setResultBlockVisible(el, visible) {
    if (!el) return;
    if (visible) {
        el.classList.remove('hidden');
        el.style.display = '';
    } else {
        el.classList.add('hidden');
        el.style.display = 'none';
    }
}

function renderDurationDisplay(years, months, days, totalDays, displayFormat) {
    const blockYear = document.getElementById('resBlockYear');
    const blockMonth = document.getElementById('resBlockMonth');
    const blockDay = document.getElementById('resBlockDay');
    const resDay = document.getElementById('resDay');
    const dayLabel = document.getElementById('resDayLabel');

    if (!blockYear || !blockMonth || !blockDay || !resDay) {
        return;
    }

    const resultTitle = document.getElementById('durResultTitle');

    if (displayFormat === 'days') {
        setResultBlockVisible(blockYear, false);
        setResultBlockVisible(blockMonth, false);
        setResultBlockVisible(blockDay, true);
        resDay.innerText = totalDays;
        resDay.className = 'text-5xl md:text-6xl font-bold text-rose-600 dark:text-rose-400';
        if (dayLabel) dayLabel.innerText = 'วันรวม';
        if (resultTitle) {
            resultTitle.innerText =
                'รวม ' + years + ' ปี ' + months + ' เดือน ' + days + ' วัน = ' + totalDays + ' วัน';
        }
        return;
    }

    if (resultTitle) resultTitle.innerText = 'ระยะเวลาทั้งหมด';

    resDay.className = 'text-4xl font-bold text-rose-600 dark:text-rose-400';

    if (displayFormat === 'months') {
        setResultBlockVisible(blockYear, false);
        setResultBlockVisible(blockMonth, true);
        setResultBlockVisible(blockDay, true);
        document.getElementById('resMonth').innerText = years * 12 + months;
        resDay.innerText = days;
        if (dayLabel) dayLabel.innerText = 'วัน';
        return;
    }

    setResultBlockVisible(blockYear, true);
    setResultBlockVisible(blockMonth, true);
    setResultBlockVisible(blockDay, true);
    document.getElementById('resYear').innerText = years;
    document.getElementById('resMonth').innerText = months;
    resDay.innerText = days;
    if (dayLabel) dayLabel.innerText = 'วัน';
}

function calculateDuration() {
    const sd = window.fpDurStart.selectedDates;
    const ed = window.fpDurEnd.selectedDates;

    if (!sd || !ed || sd.length === 0 || ed.length === 0) {
        showToast('กรุณาเลือกวันที่ให้ครบถ้วน', 'error');
        return;
    }

    let d1 = new Date(sd[0]);
    let d2 = new Date(ed[0]);

    if (d1 > d2) {
        const temp = d1;
        d1 = d2;
        d2 = temp;
    }

    const countMode = document.getElementById('durCountMode').value;
    const originalD1 = new Date(d1);
    const originalD2 = new Date(d2);

    if (countMode === 'inclusive') {
        d2.setDate(d2.getDate() + 1);
    }

    let years = d2.getFullYear() - d1.getFullYear();
    let months = d2.getMonth() - d1.getMonth();
    let days = d2.getDate() - d1.getDate();

    if (days < 0) {
        months--;
        const tempDate = new Date(d2.getFullYear(), d2.getMonth(), 0);
        days += tempDate.getDate();
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    const displayFormat = document.getElementById('durDisplayFormat').value;
    const totalDays = totalDaysFromBreakdown(originalD1, years, months, days, countMode);

    renderDurationDisplay(years, months, days, totalDays, displayFormat);
    document.getElementById('durResultArea').classList.remove('hidden');

    const modeText = countMode === 'inclusive' ? '(นับรวมวันเริ่มต้น)' : '(ระยะห่างปกติ)';
    const formatLabels = { full: 'วันเดือนปี', months: 'วันและเดือน', days: 'วันอย่างเดียว' };
    const formatLabel = formatLabels[displayFormat] || displayFormat;

    window._lastDurationParts = {
        years: years,
        months: months,
        days: days,
        totalDays: totalDays,
        startTime: originalD1.getTime(),
        countMode: countMode
    };

    currentTempResult = {
        type: 'duration',
        label: 'หาระยะห่าง ' + modeText + ' [' + formatLabel + ']',
        detail: formatThaiDate(originalD1) + ' ถึง ' + formatThaiDate(originalD2),
        result: formatDurationResultText(years, months, days, totalDays, displayFormat),
        timestamp: new Date().toISOString()
    };
}

async function saveResult(type) {
    if (!currentTempResult) return;
    if (!apiReady) {
        showToast('API ยังไม่พร้อม — ตรวจสอบ config.js', 'error');
        return;
    }

    try {
        const saved = await DateCalcApi.saveHistory(currentTempResult);
        currentTempResult.id = saved.id;
        showToast('บันทึกข้อมูลเรียบร้อยแล้ว');
        currentTempResult = null;

        if (type === 'shift') document.getElementById('shiftResultArea').classList.add('hidden');
        if (type === 'duration') document.getElementById('durResultArea').classList.add('hidden');

        await loadHistory();
        updateDashboard();
    } catch (err) {
        showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
    }
}

async function loadHistory() {
    if (!apiReady) {
        dbHistory = [];
        renderHistory();
        return;
    }

    try {
        dbHistory = await DateCalcApi.listHistory();
        renderHistory();
        updateDashboard();
    } catch (err) {
        showToast(err.message || 'โหลดประวัติไม่สำเร็จ', 'error');
    }
}

async function deleteHistory(id) {
    if (!apiReady) return;

    try {
        await DateCalcApi.deleteHistory(id);
        await loadHistory();
        showToast('ลบรายการเรียบร้อย');
    } catch (err) {
        showToast(err.message || 'ลบไม่สำเร็จ', 'error');
    }
}

async function clearHistory() {
    if (dbHistory.length === 0) return;
    if (!apiReady) return;

    try {
        await DateCalcApi.clearHistory();
        dbHistory = [];
        renderHistory();
        updateDashboard();
        showToast('ล้างประวัติทั้งหมดแล้ว', 'info');
    } catch (err) {
        showToast(err.message || 'ล้างประวัติไม่สำเร็จ', 'error');
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderHistory() {
    const tbody = document.getElementById('historyTableBody');
    const emptyState = document.getElementById('emptyHistory');

    tbody.innerHTML = '';

    if (dbHistory.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    dbHistory.forEach(function (item) {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 dark:hover:bg-slate-700/30 transition';

        const typeIcon = item.type === 'shift' ? 'calendar-plus' : 'arrows-left-right';
        const typeColor = item.type === 'shift' ? 'text-blue-500' : 'text-emerald-500';
        const dateObj = new Date(item.timestamp);
        const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        tr.innerHTML =
            '<td class="p-4 border-t border-gray-100 dark:border-gray-800">' +
            '<div class="flex items-center gap-2">' +
            '<i class="ph ph-' + typeIcon + ' ' + typeColor + ' text-xl"></i>' +
            '<div><p class="font-medium text-sm whitespace-nowrap">' + escapeHtml(item.label) + '</p>' +
            '<p class="text-xs text-gray-400">' + timeStr + ' น.</p></div></div></td>' +
            '<td class="p-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">' +
            escapeHtml(item.detail) +
            '</td>' +
            '<td class="p-4 border-t border-gray-100 dark:border-gray-800">' +
            '<span class="inline-flex px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-full text-sm font-semibold whitespace-nowrap">' +
            escapeHtml(item.result) +
            '</span></td>' +
            '<td class="p-4 border-t border-gray-100 dark:border-gray-800 text-right">' +
            '<button type="button" data-delete-id="' +
            item.id +
            '" class="p-2 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">' +
            '<i class="ph ph-trash text-lg"></i></button></td>';

        const btn = tr.querySelector('[data-delete-id]');
        btn.addEventListener('click', function () {
            deleteHistory(item.id);
        });

        tbody.appendChild(tr);
    });
}

function updateDashboard() {
    document.getElementById('statTotalSaved').innerText = dbHistory.length;
}

function exportCSV() {
    if (dbHistory.length === 0) {
        showToast('ไม่มีข้อมูลสำหรับส่งออก', 'error');
        return;
    }

    let csvContent = '\uFEFF';
    csvContent += 'รหัส,ประเภท,รายละเอียด,ผลลัพธ์,วันที่บันทึก\n';

    dbHistory.forEach(function (item) {
        const dateStr = new Date(item.timestamp).toLocaleString('th-TH');
        const detail = '"' + String(item.detail).replace(/"/g, '""') + '"';
        const result = '"' + String(item.result).replace(/"/g, '""') + '"';
        csvContent += item.id + ',' + item.label + ',' + detail + ',' + result + ',' + dateStr + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'datecalc_export_' + new Date().getTime() + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('ดาวน์โหลดรายงาน CSV สำเร็จ');
}

function showApiBanner(message) {
    const banner = document.getElementById('apiBanner');
    const text = document.getElementById('apiBannerText');
    if (banner && text) {
        text.textContent = message;
        banner.classList.add('visible');
    }
}

function hideApiBanner() {
    const banner = document.getElementById('apiBanner');
    if (banner) banner.classList.remove('visible');
}

async function initApi() {
    try {
        if (!window.APP_CONFIG || !window.APP_CONFIG.apiUrl || window.APP_CONFIG.apiUrl.includes('YOUR_DEPLOYMENT')) {
            showApiBanner('ยังไม่ได้ตั้งค่า API: แก้ docs/js/config.js ใส่ URL จาก GAS Deploy');
            apiReady = false;
            return;
        }
        await DateCalcApi.ping();
        apiReady = true;
        hideApiBanner();
        await loadHistory();
    } catch (err) {
        apiReady = false;
        showApiBanner(err.message || 'เชื่อมต่อ API ไม่สำเร็จ — ตรวจสอบ GAS Deploy URL');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    initDatePickers();
    switchView('dashboard');
    setInterval(updateLiveClock, 1000);
    updateLiveClock();

    const savedTheme = DateCalcStorage.getItem('datecalc_theme');
    let isDark = false;
    if (savedTheme === 'dark') {
        isDark = true;
    } else if (savedTheme !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDark = true;
    }
    if (isDark) {
        document.documentElement.classList.add('dark');
    }
    applyThemeUI(isDark);

    initApi();

    const durDisplayFormat = document.getElementById('durDisplayFormat');
    if (durDisplayFormat) {
        durDisplayFormat.addEventListener('change', function () {
            const parts = window._lastDurationParts;
            const area = document.getElementById('durResultArea');
            if (!parts || !area || area.classList.contains('hidden')) {
                return;
            }
            const totalDays = totalDaysFromBreakdown(
                new Date(parts.startTime),
                parts.years,
                parts.months,
                parts.days,
                parts.countMode
            );
            parts.totalDays = totalDays;

            renderDurationDisplay(
                parts.years,
                parts.months,
                parts.days,
                totalDays,
                durDisplayFormat.value
            );
            if (currentTempResult && currentTempResult.type === 'duration') {
                const formatLabels = { full: 'วันเดือนปี', months: 'วันและเดือน', days: 'วันอย่างเดียว' };
                currentTempResult.result = formatDurationResultText(
                    parts.years,
                    parts.months,
                    parts.days,
                    totalDays,
                    durDisplayFormat.value
                );
                currentTempResult.label =
                    currentTempResult.label.replace(/\[[^\]]+\]/, '[' + (formatLabels[durDisplayFormat.value] || '') + ']');
            }
        });
    }
});
