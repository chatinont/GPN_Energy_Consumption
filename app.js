document.addEventListener('DOMContentLoaded', () => {
    initDashboard();

    const timeRangeFilter = document.getElementById('timeRangeFilter');
    const freqFilter = document.getElementById('freqFilter');
    const metricFilter = document.getElementById('metricFilter');
    const customDateInput = document.getElementById('customDateInput');

    if (metricFilter) {
        metricFilter.addEventListener('change', () => {
            if (window.globalRawRows) renderChart(window.globalRawRows);
        });
    }
    
    if (timeRangeFilter) {
        timeRangeFilter.addEventListener('change', () => {
            if (timeRangeFilter.value === 'custom_date') {
                customDateInput.style.display = 'inline-block';
                if (!customDateInput.value) {
                    let d = new Date();
                    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                    customDateInput.value = d.toISOString().slice(0, 10);
                }
            } else {
                customDateInput.style.display = 'none';
            }
            if (window.globalRawRows) renderChart(window.globalRawRows);
        });
    }
    
    if (customDateInput) {
        customDateInput.addEventListener('click', () => {
            try {
                if (typeof customDateInput.showPicker === 'function') {
                    customDateInput.showPicker();
                }
            } catch (e) {}
        });
        customDateInput.addEventListener('change', () => {
            if (window.globalRawRows) renderChart(window.globalRawRows);
        });
    }

    if (freqFilter) {
        freqFilter.addEventListener('change', () => {
            if (window.globalRawRows) renderChart(window.globalRawRows);
        });
    }

    const solarFilter = document.getElementById('solarSizeFilter');
    if (solarFilter) {
        solarFilter.addEventListener('change', () => {
            if (window.globalRawRows) {
                calculateBillingCosts(window.globalRawRows);
                renderChart(window.globalRawRows);
            }
        });
    }

    const batteryFilter = document.getElementById('batterySizeFilter');
    const dodFilter = document.getElementById('dodFilter');
    
    const updateBattery = () => {
        if (window.globalRawRows) {
            calculateBillingCosts(window.globalRawRows);
            renderChart(window.globalRawRows);
        }
    };
    
    if (batteryFilter) {
        batteryFilter.addEventListener('change', updateBattery);
        batteryFilter.addEventListener('input', updateBattery);
    }
    if (dodFilter) dodFilter.addEventListener('change', updateBattery);
    
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            if (document.body.classList.contains('light-theme')) {
                themeIcon.innerText = 'dark_mode';
            } else {
                themeIcon.innerText = 'light_mode';
            }
        });
    }
});

const GS_CSV_URL = "https://docs.google.com/spreadsheets/d/1JE-c7uCBsnEJFgG-pXQzjq7kVHDp9X1igY_7mhJro-Y/gviz/tq?tqx=out:csv&sheet=Log_15Min";

// Config from backend logic
const PRICE_PER_UNIT = 4.6;
const BILLING_DAY = 24;
const EXTRA_USAGE_EST = 0.3; // 30% increase with solar

function getSolarKW() {
    const el = document.getElementById('solarSizeFilter');
    return el ? parseFloat(el.value) : 5.0;
}

function getBatteryKWh() {
    const el = document.getElementById('batterySizeFilter');
    const val = el ? parseFloat(el.value) : 0;
    return isNaN(val) ? 0 : val;
}

async function initDashboard() {
    try {
        Papa.parse(GS_CSV_URL, {
            download: true,
            header: false,
            complete: function(results) {
                const data = results.data;
                // Exclude headers, assume headers in row 0
                // Valid rows should at least have time in col 0
                const rows = data.slice(1).filter(r => r && r[0]);
                processData(rows);
            },
            error: function(err) {
                console.error('Error fetching data', err);
                document.getElementById('loader').innerHTML = "<p>Error loading data. Make sure Google Sheet sharing is set to 'Anyone with link'.</p>";
            }
        });
    } catch (e) {
        console.error(e);
    }
}

function parseRowDate(dateStr) {
    // Expected "Wed, 01 Apr 2026 14:00:29"
    return new Date(dateStr);
}

function parseNumber(str) {
    if(!str) return 0;
    return parseFloat(str.toString().replace(/,/g, '')) || 0;
}

function processData(rows) {
    if (rows.length === 0) return;

    window.globalRawRows = rows;

    let now = new Date();
    let syncText = document.getElementById('last-sync-time');
    if (syncText) {
        syncText.innerText = `Updated ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    }

    // Get the most recent row
    const lastRow = rows[rows.length - 1];
    
    // Calculate metrics
    calculateRealtime(lastRow);
    calculateBillingCosts(rows);
    renderChart(rows);

    // Hide loader smoothly
    document.getElementById('loader').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('loader').style.display = 'none';
    }, 500);
}

function calculateRealtime(lastRow) {
    const watt = parseNumber(lastRow[4]);
    
    const uiWattVal = document.getElementById('live-watt-val');
    const uiStatusBadge = document.getElementById('power-status-badge');
    const uiStatusText = document.getElementById('power-status-text');
    const gaugeNeedle = document.getElementById('gauge-needle');

    let kw = watt / 1000;
    if (uiWattVal) uiWattVal.innerText = kw.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    if (gaugeNeedle) {
        let maxKw = 10;
        let p = kw / maxKw;
        if (p > 1) p = 1;
        if (p < 0) p = 0;
        let deg = (p * 180) - 90; 
        gaugeNeedle.style.transform = `rotate(${deg}deg)`;
    }

    if (uiStatusBadge && uiStatusText) {
        if (watt > 4000) {
            uiStatusBadge.style.background = 'rgba(248, 113, 113, 0.15)';
            uiStatusBadge.style.color = '#f87171';
            uiStatusText.innerText = "Heavy Peak";
        } else if (watt > 2000) {
            uiStatusBadge.style.background = 'rgba(251, 191, 36, 0.15)';
            uiStatusBadge.style.color = '#fbbf24';
            uiStatusText.innerText = "Consuming";
        } else {
            uiStatusBadge.style.background = 'rgba(52, 211, 153, 0.15)';
            uiStatusBadge.style.color = '#34d399';
            uiStatusText.innerText = "Eco Mode";
        }
    }
}

function calculateBillingCosts(rows) {
    const today = new Date();
    
    let startCycle = new Date(today.getFullYear(), today.getMonth(), 24);
    if (today.getDate() < 24) {
        startCycle.setMonth(startCycle.getMonth() - 1);
    }
    startCycle.setHours(0,0,0,0);

    let cycleCost = 0;
    let cycleCount = 0;
    let solarCost = 0;
    let solarPanelKw = getSolarKW();
    let batteryFullCapacity = getBatteryKWh();
    let dodEl = document.getElementById('dodFilter');
    let batteryDoD = dodEl ? parseFloat(dodEl.value) : 0.9;
    let usableBatteryCapacity = batteryFullCapacity * batteryDoD;
    let currentBattery = 0;

    let todayCost = 0;
    let todayCount = 0;
    const todayStr = new Date().toLocaleDateString('en-GB');

    for (let r of rows) {
        let rDate = parseRowDate(r[0]);
        if (rDate >= startCycle) {
            let addedKwh = parseNumber(r[2]);
            let cost = parseNumber(r[3]); 
            if (cost === 0 && addedKwh > 0) cost = addedKwh * PRICE_PER_UNIT;
            
            cycleCost += cost;
            cycleCount++;
            
            // Solar simulation replay logic
            let hour = rDate.getHours();
            let solarEff = (hour >= 7 && hour <= 17) ? Math.sin((hour - 7) * Math.PI / 10) : 0;
            let solarProduced = solarPanelKw * 0.8 * solarEff * 0.25; // 80% System Efficiency
            let usageWithExtra = (hour >= 7 && hour <= 17) ? addedKwh * (1 + EXTRA_USAGE_EST) : addedKwh;
            
            // Battery Logic
            let excessSolar = solarProduced - usageWithExtra;
            let gridImport = 0;

            if (rDate.toLocaleDateString('en-GB') === todayStr) {
                todayCost += cost;
                todayCount++;
            }

            if (excessSolar > 0) {
                // Charge Battery
                let chargeAmt = Math.min(excessSolar, usableBatteryCapacity - currentBattery);
                currentBattery += chargeAmt;
            } else {
                // Discharge Battery
                let deficit = -excessSolar;
                let dischargeAmt = Math.min(deficit, currentBattery);
                currentBattery -= dischargeAmt;
                gridImport = deficit - dischargeAmt;
            }
            
            solarCost += (gridImport * PRICE_PER_UNIT);
        }
    }

    document.getElementById('billing-cycle-date').innerText = `Billing Cycle starting ${startCycle.toLocaleDateString('en-GB')}`;
    document.getElementById('current-bill').innerText = cycleCost.toLocaleString('en-US', {maximumFractionDigits: 1});

    // Estimates calculation
    if (cycleCount > 0) {
        // Average per interval
        let avgCostPer15m = cycleCost / cycleCount;
        let estFullMonth = avgCostPer15m * 96 * 30; 
        document.getElementById('est-bill').innerText = estFullMonth.toLocaleString('en-US', {maximumFractionDigits: 0});

        let budgetWarning = document.getElementById('budget-warning');
        if (budgetWarning) {
            if (estFullMonth > 3000) {
                budgetWarning.style.display = 'block';
            } else {
                budgetWarning.style.display = 'none';
            }
        }

        let avgSolarPer15m = solarCost / cycleCount;
        let estSolarFullMonth = avgSolarPer15m * 96 * 30;
        document.getElementById('solar-est-bill').innerText = estSolarFullMonth.toLocaleString('en-US', {maximumFractionDigits: 0});
        
        let savings = estFullMonth - estSolarFullMonth;
        document.getElementById('solar-savings').innerText = `Est. ~ ${savings.toLocaleString('en-US', {maximumFractionDigits: 0})} THB/mo savings`;
    }

    if (todayCount > 0) {
        let estTodayFull = (todayCost / todayCount) * 96;
        let uiTodayInfo = document.getElementById('today-cost');
        if (uiTodayInfo) {
            let dailyBenchmark = 100; // Based on 3000 THB / 30 days
            let isOver = estTodayFull > dailyBenchmark;
            let estColor = isOver ? '#f87171' : '#34d399';
            let iconStr = isOver ? 'trending_up' : 'trending_down';
            
            uiTodayInfo.innerHTML = `Today so far: <strong style="color:var(--text-main)">${todayCost.toLocaleString('en-US', {maximumFractionDigits:1})}</strong> THB<br>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:4px;">
                    <span style="font-size: 0.85rem; font-weight: 500; color: ${estColor};">
                        <span class="material-symbols-rounded" style="font-size: 1rem; vertical-align: middle; margin-right:2px;">${iconStr}</span>
                        Est. ~${estTodayFull.toLocaleString('en-US', {maximumFractionDigits:0})} THB
                    </span>
                    <span style="font-size: 0.75rem; opacity: 0.6;">Limit: ${dailyBenchmark}฿</span>
                </div>`;
        }
    }
}

let currentChart = null;

function renderChart(rows) {
    const timeRange = document.getElementById('timeRangeFilter') ? document.getElementById('timeRangeFilter').value : 'today_yesterday';
    const freq = document.getElementById('freqFilter') ? document.getElementById('freqFilter').value : '15m';
    const metricType = document.getElementById('metricFilter') ? document.getElementById('metricFilter').value : 'power';

    const today = new Date();
    today.setHours(0,0,0,0);
    
    let rangeStart = new Date(today);
    let durationDays = 1;
    let labelBase = 'Today';
    let labelCompare = 'Yesterday';
    let offsetCompareMs = 24 * 3600 * 1000;

    if (timeRange === 'custom_date') {
        const dateInput = document.getElementById('customDateInput');
        if (dateInput && dateInput.value) {
            rangeStart = new Date(dateInput.value);
            rangeStart.setHours(0,0,0,0);
        }
        durationDays = 1;
        let formatOpts = { day: 'numeric', month: 'short' };
        labelBase = rangeStart.toLocaleDateString('en-GB', formatOpts);
        
        let pDate = new Date(rangeStart);
        pDate.setDate(pDate.getDate() - 1);
        labelCompare = pDate.toLocaleDateString('en-GB', formatOpts);
        offsetCompareMs = 24 * 3600 * 1000;
    } else if (timeRange === 'last_7_days') {
        rangeStart.setDate(today.getDate() - 6);
        durationDays = 7;
        labelBase = 'Last 7 Days';
        labelCompare = 'Prev 7 Days';
        offsetCompareMs = 7 * 24 * 3600 * 1000;
    } else if (timeRange === 'this_month') {
        let startCycle = new Date(today.getFullYear(), today.getMonth(), BILLING_DAY);
        if (today.getDate() < BILLING_DAY) {
            startCycle.setMonth(startCycle.getMonth() - 1);
        }
        startCycle.setHours(0,0,0,0);
        
        rangeStart = new Date(startCycle);
        
        let nextCycle = new Date(startCycle);
        nextCycle.setMonth(nextCycle.getMonth() + 1);
        durationDays = Math.round((nextCycle - startCycle) / (24 * 3600 * 1000));
        
        labelBase = 'Current Cycle';
        labelCompare = 'Prev Cycle';
        
        let prevCycle = new Date(startCycle);
        prevCycle.setMonth(prevCycle.getMonth() - 1);
        let daysInPrevCycle = Math.round((startCycle - prevCycle) / (24 * 3600 * 1000));
        offsetCompareMs = daysInPrevCycle * 24 * 3600 * 1000;
    }

    let bucketMs = 15 * 60000;
    if (freq === '1h') bucketMs = 60 * 60000;
    if (freq === '1d') bucketMs = 24 * 60 * 60000;

    let durationMs = durationDays * 24 * 3600 * 1000;
    let bucketCount = Math.ceil(durationMs / bucketMs);
    
    let labels = [];
    let baseData = [];
    let compareData = [];
    let batteryDataBucket = [];

    for (let i = 0; i < bucketCount; i++) {
        let bTime = new Date(rangeStart.getTime() + i * bucketMs);
        if (freq === '15m' || freq === '1h') {
            let h = bTime.getHours().toString().padStart(2, '0');
            let m = bTime.getMinutes().toString().padStart(2, '0');
            if (durationDays > 1) {
                let d = bTime.getDate().toString().padStart(2, '0');
                let mo = (bTime.getMonth() + 1).toString().padStart(2, '0');
                labels.push(`${d}/${mo} ${h}:${m}`);
            } else {
                labels.push(`${h}:${m}`);
            }
        } else {
            let d = bTime.getDate().toString().padStart(2, '0');
            let mo = (bTime.getMonth() + 1).toString().padStart(2, '0');
            labels.push(`${d}/${mo}`);
        }
        baseData.push([]);
        compareData.push([]);
        batteryDataBucket.push([]);
    }

    let solarPanelKw = getSolarKW();
    let batteryFullCapacity = getBatteryKWh();
    let dodEl = document.getElementById('dodFilter');
    let batteryDoD = dodEl ? parseFloat(dodEl.value) : 0.9;
    let usableBatteryCapacity = batteryFullCapacity * batteryDoD;
    
    let globalBatteryState = 0;
    let rowBatteryState = new Array(rows.length).fill(0);
    
    rows.forEach((r, idx) => {
        let rDate = parseRowDate(r[0]);
        let hour = rDate.getHours();
        let addedKwh = parseNumber(r[2]);
        let solarEff = (hour >= 7 && hour <= 17) ? Math.sin((hour - 7) * Math.PI / 10) : 0;
        let solarProduced = solarPanelKw * 0.8 * solarEff * 0.25; 
        let usageWithExtra = (hour >= 7 && hour <= 17) ? addedKwh * (1 + EXTRA_USAGE_EST) : addedKwh;
        
        let excessSolar = solarProduced - usageWithExtra;
        if (excessSolar > 0) {
            let chargeAmt = Math.min(excessSolar, usableBatteryCapacity - globalBatteryState);
            globalBatteryState += chargeAmt;
        } else {
            let deficit = -excessSolar;
            let dischargeAmt = Math.min(deficit, globalBatteryState);
            globalBatteryState -= dischargeAmt;
        }
        rowBatteryState[idx] = globalBatteryState;
    });

    rows.forEach((r, idx) => {
        let rDate = parseRowDate(r[0]);
        let rTime = rDate.getTime();
        
        let metricVal = 0;
        let battVal = 0;
        let stateKwh = rowBatteryState[idx];

        if (metricType === 'power') {
            metricVal = parseNumber(r[4]);
            battVal = stateKwh * 1000;
        } else {
            let addedKwh = parseNumber(r[2]);
            let rowCost = parseNumber(r[3]);
            if (rowCost === 0 && addedKwh > 0) rowCost = addedKwh * PRICE_PER_UNIT;
            metricVal = rowCost;
            battVal = stateKwh * PRICE_PER_UNIT;
        }
        
        if (rTime >= rangeStart.getTime() && rTime < rangeStart.getTime() + durationMs) {
            let bucketIdx = Math.floor((rTime - rangeStart.getTime()) / bucketMs);
            if (bucketIdx >= 0 && bucketIdx < bucketCount) {
                baseData[bucketIdx].push(metricVal);
                batteryDataBucket[bucketIdx].push(battVal);
            }
        }

        let mappedTime = rTime + offsetCompareMs;
        if (mappedTime >= rangeStart.getTime() && mappedTime < rangeStart.getTime() + durationMs) {
            let bucketIdx = Math.floor((mappedTime - rangeStart.getTime()) / bucketMs);
            if (bucketIdx >= 0 && bucketIdx < bucketCount) compareData[bucketIdx].push(metricVal);
        }
    });

    let finalBase;
    let finalCompare;
    let finalBattery;
    
    if (metricType === 'power') {
        finalBase = baseData.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0)/arr.length : null);
        finalCompare = compareData.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0)/arr.length : null);
        finalBattery = batteryDataBucket.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0)/arr.length : null);
    } else {
        finalBase = baseData.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0) : null);
        finalCompare = compareData.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0) : null);
        finalBattery = batteryDataBucket.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0) : null);
    }

    let solarData = [];
    for (let i = 0; i < bucketCount; i++) {
        let bTime = new Date(rangeStart.getTime() + i * bucketMs);
        let val = 0;
        
        if (metricType === 'power') {
            if (freq === '1d') {
                val = solarPanelKw * 1000 * 0.8 * (10 / 24) * 0.636;
            } else {
                let hourFloat = bTime.getHours() + (bTime.getMinutes() / 60);
                if (hourFloat >= 7 && hourFloat <= 17) {
                    let eff = Math.sin((hourFloat - 7) * Math.PI / 10);
                    val = solarPanelKw * 1000 * 0.8 * eff;
                }
            }
        } else {
            let bucketHours = bucketMs / (3600 * 1000);
            if (freq === '1d') {
                val = solarPanelKw * 0.8 * (10 / 24) * 0.636 * 24 * PRICE_PER_UNIT;
            } else {
                let hourFloat = bTime.getHours() + (bTime.getMinutes() / 60);
                if (hourFloat >= 7 && hourFloat <= 17) {
                    let eff = Math.sin((hourFloat - 7) * Math.PI / 10);
                    val = (solarPanelKw * 0.8 * eff) * bucketHours * PRICE_PER_UNIT;
                }
            }
        }
        solarData.push(val);
    }

    if (currentChart) {
        currentChart.destroy();
    }

    const ctx = document.getElementById('usageChart').getContext('2d');
    let gradientToday = ctx.createLinearGradient(0, 0, 0, 400);
    gradientToday.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
    gradientToday.addColorStop(1, 'rgba(56, 189, 248, 0.05)');

    let gradientSolar = ctx.createLinearGradient(0, 0, 0, 400);
    gradientSolar.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
    gradientSolar.addColorStop(1, 'rgba(251, 191, 36, 0.01)');

    let gradientBattery = ctx.createLinearGradient(0, 0, 0, 400);
    gradientBattery.addColorStop(0, 'rgba(52, 211, 153, 0.4)');
    gradientBattery.addColorStop(1, 'rgba(52, 211, 153, 0.01)');

    let chartDatasets = [
        {
            label: `Solar Gen Est. (${metricType === 'cost' ? 'THB' : 'W'})`,
            data: solarData,
            borderColor: '#fbbf24',
            backgroundColor: gradientSolar,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHitRadius: 10
        }
    ];

    if (getBatteryKWh() > 0) {
        chartDatasets.push({
            label: `Battery Level (${metricType === 'cost' ? 'THB' : 'Wh'})`,
            data: finalBattery,
            borderColor: '#34d399',
            backgroundColor: gradientBattery,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHitRadius: 10
        });
    }

    chartDatasets.push({
        label: `${labelBase} ${metricType === 'cost' ? 'Cost (THB)' : 'Power (W)'}`,
        data: finalBase,
        borderColor: '#38bdf8',
        segment: {
            borderColor: context => {
                let time = rangeStart.getTime() + context.p0DataIndex * bucketMs;
                let d = new Date(time);
                let day = d.getDay();
                let h = d.getHours();
                let isPeak = (day >= 1 && day <= 5 && h >= 9 && h < 22);
                return isPeak ? '#f87171' : '#38bdf8';
            }
        },
        backgroundColor: gradientToday,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHitRadius: 15,
        pointHoverRadius: 6
    });

    chartDatasets.push({
        label: `${labelCompare} ${metricType === 'cost' ? 'Cost (THB)' : 'Power (W)'}`,
        data: finalCompare,
        borderColor: '#475569',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHitRadius: 10
    });

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: chartDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { color: '#e2e8f0', usePointStyle: true, boxWidth: 8 } },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                let unit = metricType === 'cost' ? ' THB' : ' W';
                                label += context.parsed.y.toFixed(metricType === 'cost' ? 2 : 1) + unit;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#94a3b8', maxTicksLimit: 12 } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.06)' }, ticks: { color: '#94a3b8' }, beginAtZero: true }
            }
        }
    });
}
