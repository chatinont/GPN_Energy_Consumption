document.addEventListener('DOMContentLoaded', () => {
    initDashboard();

    const THAI_DAYS = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
    const DAY_COLORS = ['#ef4444','#fbbf24','#f472b6','#34d399','#f97316','#38bdf8','#a78bfa'];
    function updateDayLabel(dateStr) {
        let el = document.getElementById('dayOfWeekLabel');
        if (!el || !dateStr) return;
        let d = new Date(dateStr);
        let dayIdx = d.getDay();
        el.textContent = 'วัน' + THAI_DAYS[dayIdx];
        el.style.color = DAY_COLORS[dayIdx];
    }

    const timeRangeFilter = document.getElementById('timeRangeFilter');
    const freqFilter = document.getElementById('freqFilter');
    const metricFilter = document.getElementById('metricFilter');
    const customDateInput = document.getElementById('customDateInput');

    if (metricFilter) {
        metricFilter.addEventListener('change', () => {
            if (window.globalRawRows) renderChart(window.globalRawRows);
        });
    }
    
    const customDateContainer = document.getElementById('customDateContainer');
    if (timeRangeFilter) {
        timeRangeFilter.addEventListener('change', () => {
            if (timeRangeFilter.value === 'custom_date') {
                if (customDateContainer) {
                    customDateContainer.style.display = 'flex';
                } else {
                    customDateInput.style.display = 'inline-block';
                }
                if (!customDateInput.value) {
                    let d = new Date();
                    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                    customDateInput.value = d.toISOString().slice(0, 10);
                }
                updateDayLabel(customDateInput.value);
            } else {
                if (customDateContainer) {
                    customDateContainer.style.display = 'none';
                } else {
                    customDateInput.style.display = 'none';
                }
            }
            if (window.globalRawRows) renderChart(window.globalRawRows);
        });
    }

    const prevDateBtn = document.getElementById('prevDateBtn');
    const nextDateBtn = document.getElementById('nextDateBtn');
    
    if (prevDateBtn && customDateInput) {
        prevDateBtn.addEventListener('click', () => {
            if (customDateInput.value) {
                let d = new Date(customDateInput.value);
                d.setDate(d.getDate() - 1);
                customDateInput.value = d.toISOString().slice(0, 10);
                updateDayLabel(customDateInput.value);
                if (window.globalRawRows) renderChart(window.globalRawRows);
            }
        });
    }
    
    if (nextDateBtn && customDateInput) {
        nextDateBtn.addEventListener('click', () => {
            if (customDateInput.value) {
                let d = new Date(customDateInput.value);
                d.setDate(d.getDate() + 1);
                customDateInput.value = d.toISOString().slice(0, 10);
                updateDayLabel(customDateInput.value);
                if (window.globalRawRows) renderChart(window.globalRawRows);
            }
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
            updateDayLabel(customDateInput.value);
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
const BILLING_DAY = 24;
const EXTRA_USAGE_EST = 0.3; // 30% increase with solar

// Location Config (For Solar Irradiance Weather API)
// ระบุพิกัด GPS บ้านตัวเองได้เลย (ทศนิยม 4-5 ตำแหน่ง)
const HOME_LAT = 13.937456; 
const HOME_LON = 100.486207;

// Solar Derating Factors (ตัวหักลดประสิทธิภาพโซล่าเซลล์)
const INVERTER_EFF = 0.96;    // ประสิทธิภาพ Inverter ~96%
const SOILING_LOSS = 0.96;    // ฝุ่น/คราบสกปรกบนแผง ~4% loss
const WIRING_LOSS = 0.98;     // สูญเสียในสายไฟ/ข้อต่อ ~2% loss
const MISMATCH_LOSS = 0.98;   // Module mismatch ~2% loss
const TEMP_COEFF = -0.004;    // ค่าสัมประสิทธิ์อุณหภูมิ -0.4%/°C (สำหรับ Si panels)
const NOCT_OFFSET = 25;       // อุณหภูมิแผงโซล่า = อากาศ + 25°C (บนหลังคา)
const STC_TEMP = 25;          // Standard Test Condition = 25°C

function getSolarSystemEff(ambientTemp) {
    let panelTemp = ambientTemp + NOCT_OFFSET;
    let tempFactor = 1 + TEMP_COEFF * (panelTemp - STC_TEMP);
    if (tempFactor > 1) tempFactor = 1; // ไม่ให้เกิน 100%
    if (tempFactor < 0.5) tempFactor = 0.5; // ป้องกันค่าผิดปกติ
    return INVERTER_EFF * SOILING_LOSS * WIRING_LOSS * MISMATCH_LOSS * tempFactor;
}

// MEA Rate Constants
const MEA_FT = 0.3972;
const MEA_SERVICE_NORMAL = 38.22;
const MEA_VAT = 1.07;

function calcMeaProgressive(kwh) {
    if(kwh <= 0) return 0;
    let base = 0;
    if (kwh > 400) {
        base = (150 * 3.2484) + (250 * 4.2218) + ((kwh - 400) * 4.4217);
    } else if (kwh > 150) {
        base = (150 * 3.2484) + ((kwh - 150) * 4.2218);
    } else {
        base = kwh * 3.2484;
    }
    return (base + (kwh * MEA_FT) + MEA_SERVICE_NORMAL) * MEA_VAT;
}

function calcMeaBreakdown(kwh) {
    if(kwh <= 0) return { base: 0, ft: 0, service: MEA_SERVICE_NORMAL, vat: 0, total: 0 };
    let base = 0;
    if (kwh > 400) {
        base = (150 * 3.2484) + (250 * 4.2218) + ((kwh - 400) * 4.4217);
    } else if (kwh > 150) {
        base = (150 * 3.2484) + ((kwh - 150) * 4.2218);
    } else {
        base = kwh * 3.2484;
    }
    let ft = kwh * MEA_FT;
    let service = MEA_SERVICE_NORMAL;
    let beforeVat = base + ft + service;
    let vat = beforeVat * 0.07;
    return {
        base: base,
        ft: ft,
        service: service,
        vat: vat,
        total: beforeVat + vat
    };
}

function calcMeaEnergy(kwh) {
    if(kwh <= 0) return 0;
    let base = 0;
    if (kwh > 400) {
        base = (150 * 3.2484) + (250 * 4.2218) + ((kwh - 400) * 4.4217);
    } else if (kwh > 150) {
        base = (150 * 3.2484) + ((kwh - 150) * 4.2218);
    } else {
        base = kwh * 3.2484;
    }
    return (base + (kwh * MEA_FT)) * MEA_VAT; 
}

function getBillingCycleStartMs(dObj) {
    let d = new Date(dObj.getFullYear(), dObj.getMonth(), BILLING_DAY);
    if (dObj.getDate() < BILLING_DAY) d.setMonth(d.getMonth() - 1);
    d.setHours(0,0,0,0);
    return d.getTime();
}

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
        let weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${HOME_LAT}&longitude=${HOME_LON}&hourly=shortwave_radiation,cloud_cover,temperature_2m&past_days=92&timezone=Asia%2FBangkok`;
        let weatherRes = await fetch(weatherUrl);
        let weatherJson = await weatherRes.json();
        window.meteoMap = {};
        window.meteoCloud = {};
        window.meteoTemp = {};
        window.meteoFetchTime = new Date();
        if (weatherJson && weatherJson.hourly) {
            let times = weatherJson.hourly.time;
            let rads = weatherJson.hourly.shortwave_radiation;
            let clouds = weatherJson.hourly.cloud_cover;
            let temps = weatherJson.hourly.temperature_2m;
            for(let i=0; i<times.length; i++) {
                window.meteoMap[times[i]] = rads[i];
                window.meteoCloud[times[i]] = clouds[i];
                window.meteoTemp[times[i]] = temps[i];
            }
        }
    } catch(e) {
        console.warn("Weather fetch failed, falling back to sine wave", e);
    }

    try {
        Papa.parse(GS_CSV_URL, {
            download: true,
            header: false,
            complete: function(results) {
                const data = results.data;
                const rows = data.slice(1).filter(r => r && r[0]);
                processData(rows);
            },
            error: function(err) {
                console.error('Error fetching data', err);
                document.getElementById('loader').innerHTML = "<p>Error loading data.</p>";
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

    let cycleKwh = 0;
    let cycleCount = 0;
    let cycleSolarGridKwh = 0;
    
    let solarPanelKw = getSolarKW();
    let batteryFullCapacity = getBatteryKWh();
    let dodEl = document.getElementById('dodFilter');
    let batteryDoD = dodEl ? parseFloat(dodEl.value) : 0.9;
    let usableBatteryCapacity = batteryFullCapacity * batteryDoD;
    let currentBattery = 0;

    let todayKwh = 0;
    let todayCount = 0;
    const todayStr = new Date().toLocaleDateString('en-GB');

    for (let r of rows) {
        let rDate = parseRowDate(r[0]);
        if (rDate >= startCycle) {
            let addedKwh = parseNumber(r[2]);
            cycleKwh += addedKwh;
            cycleCount++;
            
            let hour = rDate.getHours();
            let dateKey = rDate.getFullYear() + "-" + String(rDate.getMonth()+1).padStart(2,'0') + "-" + String(rDate.getDate()).padStart(2,'0') + "T" + String(hour).padStart(2,'0') + ":00";
            let rad = window.meteoMap && window.meteoMap[dateKey] !== undefined ? window.meteoMap[dateKey] : -1;
            let cloud = window.meteoCloud && window.meteoCloud[dateKey] !== undefined ? window.meteoCloud[dateKey] : 0;
            let ambTemp = window.meteoTemp && window.meteoTemp[dateKey] !== undefined ? window.meteoTemp[dateKey] : 30;
            
            let cloudFactor = 1 - (cloud * 0.007);
            let sysEff = getSolarSystemEff(ambTemp);
            let solarEff = rad >= 0 ? (rad / 1000) * cloudFactor : ((hour >= 7 && hour <= 17) ? Math.sin((hour - 7) * Math.PI / 10) : 0);
            
            let solarProduced = solarPanelKw * sysEff * solarEff * 0.25; 
            let usageWithExtra = (hour >= 7 && hour <= 17) ? addedKwh * (1 + EXTRA_USAGE_EST) : addedKwh;
            
            let excessSolar = solarProduced - usageWithExtra;
            let gridImport = 0;

            if (rDate.toLocaleDateString('en-GB') === todayStr) {
                todayKwh += addedKwh;
                todayCount++;
            }

            if (excessSolar > 0) {
                let chargeAmt = Math.min(excessSolar, usableBatteryCapacity - currentBattery);
                currentBattery += chargeAmt;
            } else {
                let deficit = -excessSolar;
                let dischargeAmt = Math.min(deficit, currentBattery);
                currentBattery -= dischargeAmt;
                gridImport = deficit - dischargeAmt;
            }
            
            cycleSolarGridKwh += gridImport;
        }
    }

    let currentBill = calcMeaProgressive(cycleKwh);
    document.getElementById('billing-cycle-date').innerText = `Billing Cycle starting ${startCycle.toLocaleDateString('en-GB')}`;
    document.getElementById('current-bill').innerText = currentBill.toLocaleString('en-US', {maximumFractionDigits: 1});

    // Current Bill card — progress bar & stats
    let cycleDaysElapsed = Math.max(1, Math.floor((today.getTime() - startCycle.getTime()) / (24*3600*1000)));
    let cycleTotalDays = 30;
    let cyclePct = Math.min(100, Math.round((cycleDaysElapsed / cycleTotalDays) * 100));
    let cbDays = document.getElementById('cb-cycle-days');
    if (cbDays) cbDays.textContent = `วันที่ ${cycleDaysElapsed} / ${cycleTotalDays}`;
    let cbPct = document.getElementById('cb-cycle-pct');
    if (cbPct) cbPct.textContent = `${cyclePct}%`;
    let cbBar = document.getElementById('cb-progress-bar');
    if (cbBar) cbBar.style.width = `${cyclePct}%`;
    let cbKwh = document.getElementById('cb-kwh');
    if (cbKwh) cbKwh.textContent = cycleKwh.toLocaleString('en-US', {maximumFractionDigits: 1});
    let cbAvg = document.getElementById('cb-avg-day');
    if (cbAvg) cbAvg.textContent = (cycleKwh / cycleDaysElapsed).toLocaleString('en-US', {maximumFractionDigits: 1});
    let cbAvgCost = document.getElementById('cb-avg-cost');
    if (cbAvgCost) cbAvgCost.textContent = (currentBill / cycleDaysElapsed).toLocaleString('en-US', {maximumFractionDigits: 0});
    
    let cbBase = document.getElementById('cb-base');
    if (cbBase) {
        let cbd = calcMeaBreakdown(cycleKwh);
        cbBase.textContent = cbd.base.toLocaleString('en-US', {maximumFractionDigits: 0});
        document.getElementById('cb-svc-ft').textContent = (cbd.service + cbd.ft).toLocaleString('en-US', {maximumFractionDigits: 0});
        document.getElementById('cb-vat').textContent = cbd.vat.toLocaleString('en-US', {maximumFractionDigits: 0});
    }

    // We store the blended cost per unit globally so the chart can use it
    window.blendedPricePerUnit = cycleKwh > 0 ? (calcMeaProgressive(cycleKwh) / cycleKwh) : 4.4;

    if (cycleCount > 0) {
        let avgKwhPer15m = cycleKwh / cycleCount;
        let estFullMonthKwh = avgKwhPer15m * 96 * 30; 
        let estFullMonthBill = calcMeaProgressive(estFullMonthKwh);
        document.getElementById('est-bill').innerText = estFullMonthBill.toLocaleString('en-US', {maximumFractionDigits: 0});

        let bdKwh = document.getElementById('bd-total-kwh');
        if (bdKwh) bdKwh.innerText = estFullMonthKwh.toLocaleString('en-US', {maximumFractionDigits: 0});

        let bdBase = document.getElementById('bd-base-cost');
        if (bdBase) {
            let breakdown = calcMeaBreakdown(estFullMonthKwh);
            bdBase.innerText = breakdown.base.toLocaleString('en-US', {maximumFractionDigits: 0});
            document.getElementById('bd-ft-cost').innerText = breakdown.ft.toLocaleString('en-US', {maximumFractionDigits: 0});
            document.getElementById('bd-svc-cost').innerText = breakdown.service.toLocaleString('en-US', {maximumFractionDigits: 1});
            document.getElementById('bd-vat-cost').innerText = breakdown.vat.toLocaleString('en-US', {maximumFractionDigits: 0});
        }

        let budgetWarning = document.getElementById('budget-warning');
        if (budgetWarning) {
            if (estFullMonthBill > 3000) {
                budgetWarning.style.display = 'block';
            } else {
                budgetWarning.style.display = 'none';
            }
        }

        let avgSolarKwhPer15m = cycleSolarGridKwh / cycleCount;
        let estSolarFullMonthKwh = avgSolarKwhPer15m * 96 * 30;
        let estSolarFullMonthBill = calcMeaProgressive(estSolarFullMonthKwh);
        document.getElementById('solar-est-bill').innerText = estSolarFullMonthBill.toLocaleString('en-US', {maximumFractionDigits: 0});
        
        let savings = estFullMonthBill - estSolarFullMonthBill;
        document.getElementById('solar-savings').innerText = `Est. ~ ${savings.toLocaleString('en-US', {maximumFractionDigits: 0})} THB/mo savings`;

        // Solar card — production stats
        let solDailyKwh = document.getElementById('sol-daily-kwh');
        if (solDailyKwh) {
            let dailySolarProd = (estFullMonthKwh - estSolarFullMonthKwh) / 30;
            let gridPct = estSolarFullMonthKwh > 0 ? Math.round((estSolarFullMonthKwh / estFullMonthKwh) * 100) : 0;
            solDailyKwh.textContent = dailySolarProd.toLocaleString('en-US', {maximumFractionDigits: 1}) + ' kWh';
            document.getElementById('sol-daily-saving').textContent = (savings / 30).toLocaleString('en-US', {maximumFractionDigits: 0}) + ' บาท';
            document.getElementById('sol-grid-pct').textContent = gridPct + '%';
        }
    }

    if (todayCount > 0) {
        let estTodayFullKwh = (todayKwh / todayCount) * 96;
        let todayCost = todayKwh * window.blendedPricePerUnit;
        let estTodayFullCost = estTodayFullKwh * window.blendedPricePerUnit;

        let uiTodayInfo = document.getElementById('today-cost');
        if (uiTodayInfo) {
            let dailyBenchmark = 100; 
            let isOver = estTodayFullCost > dailyBenchmark;
            let estColor = isOver ? '#f87171' : '#34d399';
            let iconStr = isOver ? 'trending_up' : 'trending_down';
            
            uiTodayInfo.innerHTML = `Today so far: <strong style="color:var(--text-main)">${todayCost.toLocaleString('en-US', {maximumFractionDigits:1})}</strong> THB <span style="opacity:0.5">|</span> <strong style="color: #38bdf8;">${todayKwh.toLocaleString('en-US', {maximumFractionDigits:1})}</strong> kWh<br>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:4px;">
                    <span style="font-size: 0.85rem; font-weight: 500; color: ${estColor};">
                        <span class="material-symbols-rounded" style="font-size: 1rem; vertical-align: middle; margin-right:2px;">${iconStr}</span>
                        Est. ~${estTodayFullCost.toLocaleString('en-US', {maximumFractionDigits:0})} THB
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
    let viewingDate = new Date(); // track what date the user is viewing

    if (timeRange === 'custom_date') {
        const dateInput = document.getElementById('customDateInput');
        if (dateInput && dateInput.value) {
            rangeStart = new Date(dateInput.value);
            rangeStart.setHours(0,0,0,0);
            viewingDate = new Date(rangeStart);
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
    let rowMarginalCost = new Array(rows.length).fill(0);
    let rowMarginalRate = new Array(rows.length).fill(0);
    
    let accKwhCycle = 0;
    let currCycleMs = -1;
    
    rows.forEach((r, idx) => {
        let rDate = parseRowDate(r[0]);
        let hour = rDate.getHours();
        let addedKwh = parseNumber(r[2]);
        
        let cMs = getBillingCycleStartMs(rDate);
        if (cMs !== currCycleMs) {
            currCycleMs = cMs;
            accKwhCycle = 0;
        }
        
        let costBefore = calcMeaEnergy(accKwhCycle);
        accKwhCycle += addedKwh;
        let costAfter = calcMeaEnergy(accKwhCycle);
        
        let mCost = costAfter - costBefore;
        let mRate = addedKwh > 0 ? (mCost / addedKwh) : (calcMeaEnergy(accKwhCycle + 1) - calcMeaEnergy(accKwhCycle));
        rowMarginalCost[idx] = mCost;
        rowMarginalRate[idx] = mRate;

        let h = rDate.getHours();
        let dKey = rDate.getFullYear() + "-" + String(rDate.getMonth()+1).padStart(2,'0') + "-" + String(rDate.getDate()).padStart(2,'0') + "T" + String(h).padStart(2,'0') + ":00";
        let rad = window.meteoMap && window.meteoMap[dKey] !== undefined ? window.meteoMap[dKey] : -1;
        let cloud = window.meteoCloud && window.meteoCloud[dKey] !== undefined ? window.meteoCloud[dKey] : 0;
        let ambTemp = window.meteoTemp && window.meteoTemp[dKey] !== undefined ? window.meteoTemp[dKey] : 30;
        
        let cloudFactor = 1 - (cloud * 0.007);
        let sysEff = getSolarSystemEff(ambTemp);
        let solarEff = rad >= 0 ? (rad / 1000) * cloudFactor : ((h >= 7 && h <= 17) ? Math.sin((h - 7) * Math.PI / 10) : 0);
        
        let solarProduced = solarPanelKw * sysEff * solarEff * 0.25; 
        let usageWithExtra = (h >= 7 && h <= 17) ? addedKwh * (1 + EXTRA_USAGE_EST) : addedKwh;
        
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
        let mCost = rowMarginalCost[idx];
        let mRate = rowMarginalRate[idx];

        if (metricType === 'power') {
            metricVal = parseNumber(r[4]);
            battVal = stateKwh * 1000;
        } else {
            metricVal = mCost;
            battVal = stateKwh * mRate;
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
                let avgSysEff = getSolarSystemEff(32); // ค่าเฉลี่ยอุณหภูมิกลางวันไทย
                val = solarPanelKw * 1000 * avgSysEff * (10 / 24) * 0.636;
            } else {
                let hourStr = String(bTime.getHours()).padStart(2,'0');
                let dateKey = bTime.getFullYear() + "-" + String(bTime.getMonth()+1).padStart(2,'0') + "-" + String(bTime.getDate()).padStart(2,'0') + "T" + hourStr + ":00";
                let rad = window.meteoMap && window.meteoMap[dateKey] !== undefined ? window.meteoMap[dateKey] : -1;
                let cloud = window.meteoCloud && window.meteoCloud[dateKey] !== undefined ? window.meteoCloud[dateKey] : 0;
                let ambTemp = window.meteoTemp && window.meteoTemp[dateKey] !== undefined ? window.meteoTemp[dateKey] : 30;
                
                let cloudFactor = 1 - (cloud * 0.007);
                let sysEff = getSolarSystemEff(ambTemp);
                let cEff = rad >= 0 ? (rad / 1000) * cloudFactor : ((bTime.getHours() >= 7 && bTime.getHours() <= 17) ? Math.sin((bTime.getHours() - 7) * Math.PI / 10) : 0);
                
                val = solarPanelKw * 1000 * sysEff * cEff;
            }
        } else {
            let blendedRate = window.blendedPricePerUnit || 4.2;
            let bucketHours = bucketMs / (3600 * 1000);
            if (freq === '1d') {
                let avgSysEff = getSolarSystemEff(32);
                val = solarPanelKw * avgSysEff * (10 / 24) * 0.636 * 24 * blendedRate;
            } else {
                let hourStr = String(bTime.getHours()).padStart(2,'0');
                let dateKey = bTime.getFullYear() + "-" + String(bTime.getMonth()+1).padStart(2,'0') + "-" + String(bTime.getDate()).padStart(2,'0') + "T" + hourStr + ":00";
                let rad = window.meteoMap && window.meteoMap[dateKey] !== undefined ? window.meteoMap[dateKey] : -1;
                let cloud = window.meteoCloud && window.meteoCloud[dateKey] !== undefined ? window.meteoCloud[dateKey] : 0;
                let ambTemp = window.meteoTemp && window.meteoTemp[dateKey] !== undefined ? window.meteoTemp[dateKey] : 30;
                
                let cloudFactor = 1 - (cloud * 0.007);
                let sysEff = getSolarSystemEff(ambTemp);
                let cEff = rad >= 0 ? (rad / 1000) * cloudFactor : ((bTime.getHours() >= 7 && bTime.getHours() <= 17) ? Math.sin((bTime.getHours() - 7) * Math.PI / 10) : 0);
                
                val = (solarPanelKw * sysEff * cEff) * bucketHours * blendedRate;
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

    // Update solar data badge
    let badgeIcon = document.getElementById('solar-badge-icon');
    let badgeText = document.getElementById('solar-badge-text');
    if (badgeIcon && badgeText) {
        let now = new Date();
        let threeDaysAgo = new Date(now);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        // คำนวณรอบพยากรณ์ล่าสุด (GFS runs: 00/06/12/18 UTC, available ~5hrs later)
        let utcHour = now.getUTCHours();
        let availableRunUTC = Math.floor((utcHour - 5) / 6) * 6;
        if (availableRunUTC < 0) availableRunUTC += 24;
        let runTimeBKK = (availableRunUTC + 7) % 24; // Convert UTC → Bangkok (UTC+7)
        let runStr = String(runTimeBKK).padStart(2,'0') + ':00 น.';
        
        if (viewingDate < threeDaysAgo) {
            badgeIcon.textContent = '✅';
            badgeText.innerHTML = `Solar: <strong style="color: #34d399;">ข้อมูลสภาพอากาศจริง</strong> (ERA5 Reanalysis)`;
        } else if (viewingDate > now) {
            badgeIcon.textContent = '🔮';
            badgeText.innerHTML = `Solar: <strong style="color: #fbbf24;">พยากรณ์อากาศล่วงหน้า</strong> (รอบพยากรณ์ ${runStr})`;
        } else {
            badgeIcon.textContent = '🌤️';
            badgeText.innerHTML = `Solar: <strong style="color: #38bdf8;">พยากรณ์วันนี้</strong> (รอบพยากรณ์ ${runStr})`;
        }
    }
}
