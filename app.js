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

    // Initialize custom date to today on load
    if (customDateInput && !customDateInput.value) {
        let d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        customDateInput.value = d.toISOString().slice(0, 10);
    }
    if (customDateInput) {
        updateDayLabel(customDateInput.value);
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
            if (freqFilter.value === '1d' && timeRangeFilter.value !== 'this_month') {
                timeRangeFilter.value = 'this_month';
                // Trigger change event to hide custom date container and re-render
                timeRangeFilter.dispatchEvent(new Event('change'));
            } else {
                if (window.globalRawRows) renderChart(window.globalRawRows);
            }
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
    const investmentFilter = document.getElementById('solarInvestment');
    
    // Load saved investment cost
    if (investmentFilter) {
        const savedInvestment = localStorage.getItem('solar_investment_cost');
        if (savedInvestment) investmentFilter.value = savedInvestment;
    }
    
    const updateBattery = () => {
        if (window.globalRawRows) {
            // Save investment cost when changed
            if (investmentFilter) {
                localStorage.setItem('solar_investment_cost', investmentFilter.value);
            }
            calculateBillingCosts(window.globalRawRows);
            renderChart(window.globalRawRows);
        }
    };
    
    if (batteryFilter) {
        batteryFilter.addEventListener('change', updateBattery);
        batteryFilter.addEventListener('input', updateBattery);
    }
    if (investmentFilter) {
        investmentFilter.addEventListener('change', updateBattery);
        investmentFilter.addEventListener('input', updateBattery);
    }

    // Simulation Sliders
    const daySlider = document.getElementById('day-adj-slider');
    const eveningSlider = document.getElementById('evening-adj-slider');
    const nightSlider = document.getElementById('night-adj-slider');

    const updateSliderLabels = () => {
        if (daySlider) document.getElementById('day-adj-label').textContent = (daySlider.value >= 0 ? '+' : '') + daySlider.value + '%';
        if (eveningSlider) document.getElementById('evening-adj-label').textContent = (eveningSlider.value >= 0 ? '+' : '') + eveningSlider.value + '%';
        if (nightSlider) document.getElementById('night-adj-label').textContent = (nightSlider.value >= 0 ? '+' : '') + nightSlider.value + '%';
    };

    [daySlider, eveningSlider, nightSlider].forEach(slider => {
        if (slider) {
            slider.addEventListener('input', () => {
                updateSliderLabels();
                updateBattery(); // Trigger re-calculation
            });
        }
    });

    const resetBtn = document.getElementById('reset-scenarios');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            [daySlider, eveningSlider, nightSlider].forEach(s => { if (s) s.value = 0; });
            updateSliderLabels();
            updateBattery();
        });
    }
    
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

    // Export core metrics for Chatbot Context
    window.getDashboardContext = () => {
        return {
            currentBill: document.getElementById('current-bill')?.innerText || '--',
            estBill: document.getElementById('est-bill')?.innerText || '--',
            liveWatt: document.getElementById('live-watt-val')?.innerText || '0',
            todayCost: document.getElementById('today-cost')?.innerText.split('|')[0].replace('Today so far:', '').trim() || '--',
            solarSavings: document.getElementById('solar-savings')?.innerText || '--',
            billingCycle: document.getElementById('billing-cycle-date')?.innerText || '--',
            lastSync: document.getElementById('last-sync-time')?.innerText || '--'
        };
    };

    window.getHistoricalSummary = (days = 14) => {
        if (!window.globalRawRows || window.globalRawRows.length === 0) return "No historical data available.";
        
        const summary = {};
        const now = new Date();
        const cutoff = new Date(now.getTime() - (days * 24 * 3600 * 1000));
        
        window.globalRawRows.forEach(row => {
            const date = new Date(row[0]);
            if (date < cutoff) return;
            
            const dateKey = date.toISOString().split('T')[0];
            if (!summary[dateKey]) {
                summary[dateKey] = { kwh: 0, solarKwh: 0, cost: 0 };
            }
            
            const kwh = parseFloat(row[2]) || 0;
            const solarProduced = parseFloat(row[5]) || 0; // Solar prod column
            
            summary[dateKey].kwh += kwh;
            summary[dateKey].solarKwh += solarProduced;
        });

        // Convert to string format for AI
        let text = "ประวัติการใช้น้ำมันย้อนหลัง (รายวัน):\n";
        Object.entries(summary).sort().reverse().forEach(([date, data]) => {
            const cost = (data.kwh * (window.blendedPricePerUnit || 4.4)).toFixed(0);
            text += `- ${date}: ใช้ไป ${data.kwh.toFixed(1)} kWh, ค่าไฟประมาณ ${cost} บาท (Solar ช่วยได้ ${data.solarKwh.toFixed(1)} kWh)\n`;
        });
        
        return text;
    };
});

const GS_CSV_URL = "https://docs.google.com/spreadsheets/d/1JE-c7uCBsnEJFgG-pXQzjq7kVHDp9X1igY_7mhJro-Y/gviz/tq?tqx=out:csv&sheet=Log_15Min";
const AC_CSV_URL = "https://docs.google.com/spreadsheets/d/1JE-c7uCBsnEJFgG-pXQzjq7kVHDp9X1igY_7mhJro-Y/gviz/tq?tqx=out:csv&sheet=Log_AC";
const GS_SHEET_URL = "https://docs.google.com/spreadsheets/d/1JE-c7uCBsnEJFgG-pXQzjq7kVHDp9X1igY_7mhJro-Y/edit";

// Config from backend logic
const BILLING_DAY = 24;
const BUDGET_MONTHLY = 3000; // THB/Month Goal
const BUDGET_POWER_LIMIT = 2000; // Watt Warning Threshold
const EXTRA_USAGE_EST = 0.0; 
const SOLAR_RAD_CUTOFF = 50; // W/m^2 (Inverter won't start below this)
const BATTERY_EFF = 0.90;    // 90% Round-trip efficiency

// Chart Config
const CHART_MAX_WATT = 5000; // ล็อกแกน Y ที่ 5000 W
const CHART_MAX_COST = 25;   // ล็อกแกน Y ที่ 25 THB (เมื่อดูเป็นค่าใช้จ่าย)

// Location Config (For Solar Irradiance Weather API)
// ระบุพิกัด GPS บ้านตัวเองได้เลย (ทศนิยม 4-5 ตำแหน่ง)
const HOME_LAT = 13.937456; 
const HOME_LON = 100.601234; // กลับไปใช้พิกัดเดิม

function getWeatherInterpolated(d, map) {
    if (!map) return -1;
    let t = d.getTime();
    let d0 = new Date(d); d0.setMinutes(0,0,0);
    let d1 = new Date(d0); d1.setHours(d0.getHours() + 1);
    
    let t0 = d0.getTime();
    let t1 = d1.getTime();
    
    let v0 = map[t0];
    let v1 = map[t1];
    
    if (v0 === undefined && v1 === undefined) return -1;
    if (v0 !== undefined && v1 === undefined) return v0;
    if (v0 === undefined && v1 !== undefined) return v1;
    
    // Linear Interpolation
    let ratio = (t - t0) / (t1 - t0);
    return v0 + (v1 - v0) * ratio;
}

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
const MEA_FT = 0.1623;
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

async function updateWeather(lat, lon) {
    try {
        console.log("Updating weather data...");
        let weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=shortwave_radiation,cloud_cover,temperature_2m&past_days=92&forecast_days=14&timezone=Asia%2FBangkok`;
        let weatherRes = await fetch(weatherUrl);
        let weatherJson = await weatherRes.json();
        
        if (weatherJson && weatherJson.hourly) {
            window.meteoMap = window.meteoMap || {};
            window.meteoCloud = window.meteoCloud || {};
            window.meteoTemp = window.meteoTemp || {};
            window.meteoFetchTime = new Date();
            
            let times = weatherJson.hourly.time;
            let rads = weatherJson.hourly.shortwave_radiation;
            let clouds = weatherJson.hourly.cloud_cover;
            let temps = weatherJson.hourly.temperature_2m;
            for(let i=0; i<times.length; i++) {
                // Store using timestamp (Number) for 100% reliable matching
                let ts = new Date(times[i]).getTime();
                window.meteoMap[ts] = rads[i];
                window.meteoCloud[ts] = clouds[i];
                window.meteoTemp[ts] = temps[i];
            }
            console.log(`Weather data updated. ${times.length} points loaded.`);
            return true;
        }
    } catch(e) {
        console.warn("Weather fetch failed", e);
    }
    return false;
}

async function initDashboard() {
    updateWeather(HOME_LAT, HOME_LON); // Fetch in background

    try {
        // Fetch Main Data
        Papa.parse(GS_CSV_URL, {
            download: true,
            header: false,
            complete: function(results) {
                const data = results.data;
                const rows = data.slice(1).filter(r => r && r[0]);
                
                // Fetch AC Data in parallel or sequence
                Papa.parse(AC_CSV_URL, {
                    download: true,
                    header: false,
                    complete: function(acRes) {
                        window.globalAcRows = acRes.data.slice(1).filter(r => r && r[0]);
                        processData(rows);
                    },
                    error: function() {
                        // Fallback if Log_AC doesn't exist yet
                        window.globalAcRows = [];
                        processData(rows);
                    }
                });
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
    if (rows.length === 0) {
        document.getElementById('loader').style.display = 'none';
        return;
    }

    try {
        window.globalRawRows = rows;
        let now = new Date();
        let syncText = document.getElementById('last-sync-time');
        if (syncText) {
            syncText.innerText = `Updated ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
        }

        const lastRow = rows[rows.length - 1];
        
        calculateRealtime(lastRow);
        calculateBillingCosts(rows);
        calculateHistoricalAverages(rows); // New summary from all history
        renderChart(rows);
    } catch (err) {
        console.error('Crash during processData:', err);
    } finally {
        // FORCE HIDE LOADERS regardless of success/error
        setTimeout(() => {
            const loader = document.getElementById('loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 500);
            }
        }, 800);
    }
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
    
    let startCycle = new Date(today.getFullYear(), today.getMonth(), BILLING_DAY);
    if (today.getDate() < BILLING_DAY) {
        startCycle.setMonth(startCycle.getMonth() - 1); // Fixed typo: should be getMonth()
    }
    startCycle.setHours(0,0,0,0);

    // Calculate dynamic cycle length (days in current calendar month)
    let endOfCycle = new Date(startCycle);
    endOfCycle.setMonth(endOfCycle.getMonth() + 1);
    let daysInCycle = Math.round((endOfCycle.getTime() - startCycle.getTime()) / (24*3600*1000));

    let cycleKwh = 0;       // Actual
    let cycleSimKwh = 0;    // Simulated (Actual * Scaling Sliders)
    let cycleCount = 0;
    let cycleSolarGridKwh = 0;
    
    // Scaling Factors from Sliders
    const dayScale = 1 + (parseFloat(document.getElementById('day-adj-slider')?.value || 0) / 100);
    const eveScale = 1 + (parseFloat(document.getElementById('evening-adj-slider')?.value || 0) / 100);
    const niteScale = 1 + (parseFloat(document.getElementById('night-adj-slider')?.value || 0) / 100);
    
    // Period counters
    let cycleSolarKwh = 0;   // 07:00 - 17:00
    let cycleEveningKwh = 0; // 17:00 - 22:00
    let cycleNightKwh = 0;   // 22:00 - 07:00
    
    let cycleDayGridKwh = 0;  // Net import Day
    let cycleEveGridKwh = 0;  // Net import Eve
    let cycleNiteGridKwh = 0; // Net import Nite
    
    let solarPanelKw = getSolarKW();
    let batteryFullCapacity = getBatteryKWh();
     // dodEl removed
    let batteryDoD = 0.8;
    let usableBatteryCapacity = batteryFullCapacity * batteryDoD;
    let currentBatterySim = 0;
    let currentBatteryBase = 0;

    let todayKwh = 0;
    let todayCount = 0;
    const todayStr = new Date().toLocaleDateString('en-GB');

    // --- STEP 1: Deduplication & Sorting ---
    // Tuya loggers can sometimes send duplicate rows. We use a Map to keep only the latest row per timestamp.
    let uniqueMap = new Map();
    for (let r of rows) {
        if (!r[0]) continue;
        let ts = parseRowDate(r[0]).getTime();
        uniqueMap.set(ts, r);
    }
    // Sort chronologically for simulation stability
    let sortedRows = Array.from(uniqueMap.values()).sort((a,b) => parseRowDate(a[0]) - parseRowDate(b[0]));

    // Declare globals for the loop (re-initialized each run)
    window.baselineSolarGridKwh = 0;
    window.baselineDayImport = 0;
    window.baselineEveImport = 0;
    window.baselineNiteImport = 0;
    
    // Reset Baseline Period Totals (Gross)
    window.baselineSolarKwh = 0;
    window.baselineEveKwh = 0;
    window.baselineNiteKwh = 0;
    
    // Reset Simulated Period Totals (Gross)
    window.cycleSolarSimTotal = 0;
    window.cycleEveSimTotal = 0;
    window.cycleNiteSimTotal = 0;

    for (let r of sortedRows) {
        let rDate = parseRowDate(r[0]);
        if (rDate >= startCycle) {
            let addedKwh = parseNumber(r[2]);
            cycleKwh += addedKwh;
            cycleCount++;
            
            let hour = rDate.getHours();
            
            // Get Scaling Factor for this record
            let currentScale = niteScale;
            if (hour >= 7 && hour < 17) currentScale = dayScale;
            else if (hour >= 17 && hour < 22) currentScale = eveScale;

            let simulatedAddedKwh = addedKwh * currentScale;
            cycleSimKwh += simulatedAddedKwh;

            // Tracking Simulated Totals for Period Breakdown UI (Gross)
            if (hour >= 7 && hour < 17) {
                window.cycleSolarSimTotal = (window.cycleSolarSimTotal || 0) + simulatedAddedKwh;
                window.baselineSolarKwh = (window.baselineSolarKwh || 0) + addedKwh;
            } else if (hour >= 17 && hour < 22) {
                window.cycleEveSimTotal = (window.cycleEveSimTotal || 0) + simulatedAddedKwh;
                window.baselineEveKwh = (window.baselineEveKwh || 0) + addedKwh;
            } else {
                window.cycleNiteSimTotal = (window.cycleNiteSimTotal || 0) + simulatedAddedKwh;
                window.baselineNiteKwh = (window.baselineNiteKwh || 0) + addedKwh;
            }

            // Refined Periods (Tracking Actual for UI metrics)
            if (hour >= 7 && hour < 17) {
                cycleSolarKwh += addedKwh;
            } else if (hour >= 17 && hour < 22) {
                cycleEveningKwh += addedKwh;
            } else {
                cycleNightKwh += addedKwh;
            }
            // Get interpolated values
            let rad = getWeatherInterpolated(rDate, window.meteoMap);
            let cloud = getWeatherInterpolated(rDate, window.meteoCloud);
            if (cloud < 0) cloud = 0;
            
            let tempTS = new Date(rDate).setMinutes(0, 0, 0);
            let ambTemp = window.meteoTemp && window.meteoTemp[tempTS] !== undefined ? window.meteoTemp[tempTS] : 30;
            
            let cloudFactor = 1 - (cloud * 0.007);
            let sysEff = getSolarSystemEff(ambTemp);
            
            // Per-period grid import tracking for accurate simulation UI
            let isDay = (hour >= 7 && hour < 17);
            let isEve = (hour >= 17 && hour < 22);
            let isNite = !isDay && !isEve;
            
            // Solar Cutoff logic: If irradiance is below cutoff, production is zero
            let solarEff = 0;
            if (rad >= SOLAR_RAD_CUTOFF) {
                // Open-Meteo rad already includes cloud effects. Do NOT multiply by cloudFactor again.
                solarEff = (rad / 1000); 
            } else if (rad < 0) {
                // Fallback for missing weather data if it's daytime - apply cloudFactor here as SIN is ideal
                solarEff = (hour >= 7 && hour <= 17) ? (Math.sin((hour - 7) * Math.PI / 10) * cloudFactor) : 0;
            }
            
            let solarProduced = solarPanelKw * sysEff * solarEff * 0.25; 
            // Simulation is based on simulated usage
            let usageWithExtra = simulatedAddedKwh * (1 + EXTRA_USAGE_EST); 
            
            let excessSolar = solarProduced - usageWithExtra;
            let gridImport = 0;

            if (rDate.toLocaleDateString('en-GB') === todayStr) {
                todayKwh += addedKwh;
                todayCount++;
            }

            // --- Path A: Simulation (with sliders) ---
            let gridImportSim = 0;
            if (excessSolar > 0) {
                let chargeAmt = Math.min(excessSolar * BATTERY_EFF, usableBatteryCapacity - currentBatterySim);
                currentBatterySim += chargeAmt;
            } else {
                let deficit = -excessSolar;
                let dischargeAmt = Math.min(deficit, currentBatterySim * BATTERY_EFF);
                currentBatterySim -= (dischargeAmt / BATTERY_EFF);
                gridImportSim = deficit - dischargeAmt;
            }
            cycleSolarGridKwh += gridImportSim;
            if (isDay) cycleDayGridKwh = (cycleDayGridKwh || 0) + gridImportSim;
            else if (isEve) cycleEveGridKwh = (cycleEveGridKwh || 0) + gridImportSim;
            else cycleNiteGridKwh = (cycleNiteGridKwh || 0) + gridImportSim;

            // --- Path B: Baseline (0% scales) ---
            let excessSolarBase = solarProduced - addedKwh;
            let gridImportBase = 0;
            if (excessSolarBase > 0) {
                let chargeAmt = Math.min(excessSolarBase * BATTERY_EFF, usableBatteryCapacity - currentBatteryBase);
                currentBatteryBase += chargeAmt;
            } else {
                let deficit = -excessSolarBase;
                let dischargeAmt = Math.min(deficit, currentBatteryBase * BATTERY_EFF);
                currentBatteryBase -= (dischargeAmt / BATTERY_EFF);
                gridImportBase = deficit - dischargeAmt;
            }
            window.baselineSolarGridKwh = (window.baselineSolarGridKwh || 0) + gridImportBase;
            window.baselineDayImport = (window.baselineDayImport || 0) + (isDay ? gridImportBase : 0);
            window.baselineEveImport = (window.baselineEveImport || 0) + (isEve ? gridImportBase : 0);
            window.baselineNiteImport = (window.baselineNiteImport || 0) + (isNite ? gridImportBase : 0);
        }
    }

    let currentBill = calcMeaProgressive(cycleKwh);
    // Use pro-rated service charge for marginal pricing estimation
    let cycleDaysElapsed = Math.max(1, Math.floor((today.getTime() - startCycle.getTime()) / (24*3600*1000)));
    let proRateFactor = Math.min(1, cycleDaysElapsed / daysInCycle);
    
    // blendedPricePerUnit is for estimating daily costs - exclude fixed service charge to keep it realistic
    window.blendedPricePerUnit = cycleKwh > 0 ? (calcMeaEnergy(cycleKwh) / cycleKwh) : 4.4;

    document.getElementById('billing-cycle-date').innerText = `Billing Cycle starting ${startCycle.toLocaleDateString('en-GB')}`;
    document.getElementById('current-bill').innerText = currentBill.toLocaleString('en-US', {maximumFractionDigits: 1});
    let cycleTotalDays = daysInCycle;
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
        
        // Update Refined Period UI
        let solarPct = cycleKwh > 0 ? Math.round((cycleSolarKwh / cycleKwh) * 100) : 0;
        let eveningPct = cycleKwh > 0 ? Math.round((cycleEveningKwh / cycleKwh) * 100) : 0;
        let nightPct = cycleKwh > 0 ? Math.round((cycleNightKwh / cycleKwh) * 100) : 0;
        
        document.getElementById('cb-solar-val').textContent = `${cycleSolarKwh.toFixed(1)} kWh (${solarPct}%)`;
        document.getElementById('cb-evening-val').textContent = `${cycleEveningKwh.toFixed(1)} kWh (${eveningPct}%)`;
        document.getElementById('cb-night-val').textContent = `${cycleNightKwh.toFixed(1)} kWh (${nightPct}%)`;
    }

    // Removed redundant blendedPricePerUnit calculation

    if (cycleCount > 0) {
        // Estimation Accuracy Fix: Use fractional days elapsed instead of row counts
        let msElapsed = Math.max(1, today.getTime() - startCycle.getTime());
        let exactDaysElapsed = msElapsed / (24*3600*1000);
        
        // Estimate uses SIMULATED GRID IMPORT (Net)
        let estFullMonthKwhActual = (cycleSimKwh / exactDaysElapsed) * daysInCycle; // Total needed
        let estFullMonthKwhImport = (cycleSolarGridKwh / exactDaysElapsed) * daysInCycle; // Actually paid to grid
        
        let estFullMonthBillBase = calcMeaProgressive(estFullMonthKwhActual);
        let estFullMonthBillNet = calcMeaProgressive(estFullMonthKwhImport);
        
        // UI REVERT: Show Gross Bill in center
        let ebEl = document.getElementById('est-bill');
        if (ebEl) ebEl.innerText = estFullMonthBillBase.toLocaleString('en-US', {maximumFractionDigits: 0});

        let estKwhEl = document.getElementById('est-kwh');
        if (estKwhEl) {
            // Stats Alignment - Show GROSS usage for center card
            document.getElementById('est-kwh').textContent = estFullMonthKwhActual.toLocaleString('en-US', {maximumFractionDigits: 0});
            document.getElementById('est-avg-day').textContent = (estFullMonthKwhActual / daysInCycle).toFixed(1);
            document.getElementById('est-avg-cost').textContent = (estFullMonthBillBase / daysInCycle).toFixed(0);

            // Budget Progress based on GROSS Bill
            let budgetPct = Math.round((estFullMonthBillBase / BUDGET_MONTHLY) * 100);
            document.getElementById('est-budget-pct').textContent = `${budgetPct}%`;
            document.getElementById('est-budget-bar').style.width = `${Math.min(100, budgetPct)}%`;
            if (budgetPct > 100) document.getElementById('est-budget-bar').style.background = 'var(--glow-red)';
            
            
            // Project Full Month Gross per period using simulated totals
            let estSolarGross = (window.cycleSolarSimTotal / exactDaysElapsed) * daysInCycle;
            let estEveningGross = (window.cycleEveSimTotal / exactDaysElapsed) * daysInCycle;
            let estNightGross = (window.cycleNiteSimTotal / exactDaysElapsed) * daysInCycle;

            document.getElementById('est-solar-val').textContent = `${estSolarGross.toFixed(0)} kWh`;
            document.getElementById('est-evening-val').textContent = `${estEveningGross.toFixed(0)} kWh`;
            document.getElementById('est-night-val').textContent = `${estNightGross.toFixed(0)} kWh`;

            // Unify Baseline tracking (ensure identical simulated path at 0% vs baseline path)
            // For kWh deltas, we compare Projected Gross Sim vs Projected Gross Baseline
            const dayBaseGrossProj = ((window.baselineSolarKwh || 0) / exactDaysElapsed) * daysInCycle;
            const eveBaseGrossProj = ((window.baselineEveKwh || 0) / exactDaysElapsed) * daysInCycle;
            const niteBaseGrossProj = ((window.baselineNiteKwh || 0) / exactDaysElapsed) * daysInCycle;

            const updateDeltaLabel = (id, currentVal, baseVal) => {
                let el = document.getElementById(id);
                if (!el) return;
                let diff = currentVal - baseVal;
                if (Math.abs(diff) < 0.1) {
                    el.textContent = "";
                } else {
                    let sign = diff > 0 ? "+" : "";
                    el.textContent = `${sign}${diff.toFixed(1)} kWh`;
                    el.style.color = diff > 0 ? "var(--glow-red)" : "#34d399";
                    el.style.opacity = "1";
                }
            };

            // Single update point for period deltas (Comparing Gross vs Gross)
            updateDeltaLabel('day-adj-cost', estSolarGross, dayBaseGrossProj);
            updateDeltaLabel('evening-adj-cost', estEveningGross, eveBaseGrossProj);
            updateDeltaLabel('night-adj-cost', estNightGross, niteBaseGrossProj);

            // Update Header Deltas (Net changes)
            const updateHeaderDelta = (id, currentVal, baseVal) => {
                let el = document.getElementById(id);
                if (!el) return;
                let diff = currentVal - baseVal;
                if (Math.abs(diff) < 2) {
                    el.textContent = "";
                } else {
                    let sign = diff > 0 ? "+" : "";
                    el.textContent = `(${sign}${Math.round(diff).toLocaleString()} ฿)`;
                    el.style.color = diff > 0 ? "var(--glow-red)" : "#34d399";
                }
            };

            // Compare Simulated Gross vs Original Baseline Gross (actual raw data)
            const estBaselineGrossKwh = (cycleKwh / exactDaysElapsed) * daysInCycle;
            const baselineGrossBill = calcMeaProgressive(estBaselineGrossKwh);
            updateHeaderDelta('est-bill-delta', estFullMonthBillBase, baselineGrossBill);
            
            // Compare Simulated Net vs Baseline Net (0% adjustment)
            const estBaselineNetKwh = (window.baselineSolarGridKwh / exactDaysElapsed) * daysInCycle;
            const baselineNetBill = calcMeaProgressive(estBaselineNetKwh);
            updateHeaderDelta('solar-bill-delta', estFullMonthBillNet, baselineNetBill);
        }

        let bdBase = document.getElementById('bd-base-total');
        if (bdBase) {
            let breakdown = calcMeaBreakdown(estFullMonthKwhActual);
            bdBase.innerText = breakdown.base.toLocaleString('en-US', {maximumFractionDigits: 0});
            document.getElementById('bd-svc-ft-total').innerText = (breakdown.service + breakdown.ft).toLocaleString('en-US', {maximumFractionDigits: 0});
            document.getElementById('bd-vat-total').innerText = breakdown.vat.toLocaleString('en-US', {maximumFractionDigits: 0});
        }

        let budgetWarning = document.getElementById('budget-warning');
        if (budgetWarning) {
            if (estFullMonthBillBase > 3000) {
                budgetWarning.style.display = 'block';
            } else {
                budgetWarning.style.display = 'none';
            }
        }

        // Right Card (ROI) Updates
        document.getElementById('solar-est-bill').innerText = estFullMonthBillNet.toLocaleString('en-US', {maximumFractionDigits: 0});
        
        let savings = estFullMonthBillBase - estFullMonthBillNet;
        
        // Payback Calculation
        const investmentIn = document.getElementById('solarInvestment');
        let investment = investmentIn ? parseFloat(investmentIn.value) : 0;
        let paybackEl = document.getElementById('payback-years');
        
        if (paybackEl) {
            if (savings > 0 && investment > 0) {
                let yearlySavings = savings * 12;
                let years = investment / yearlySavings;
                paybackEl.innerText = years.toFixed(1) + " ปี";
            } else {
                paybackEl.innerText = "-- ปี";
            }
        }

        // Solar card — production stats (True Monthly Totals)
        let solDailyKwh = document.getElementById('sol-daily-kwh');
        let solDailySaving = document.getElementById('sol-daily-saving');
        let solGridPct = document.getElementById('sol-grid-pct');
        
        if (solDailyKwh) {
            let monthlySolarProd = (estFullMonthKwhActual - estFullMonthKwhImport); 
            solDailyKwh.textContent = monthlySolarProd.toLocaleString('en-US', {maximumFractionDigits: 0}) + ' kWh';
        }
        if (solDailySaving) {
            solDailySaving.textContent = savings.toLocaleString('en-US', {maximumFractionDigits: 0}) + ' บาท';
        }
        if (solGridPct) {
            let gridPct = estFullMonthKwhActual > 0 ? Math.round((estFullMonthKwhImport / estFullMonthKwhActual) * 100) : 0;
            solGridPct.textContent = gridPct + '%';
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

function calculateHistoricalAverages(rows) {
    if (!rows || rows.length === 0) return;

    let dayTotals = {}; // { '2026-03-01': { solar: 0, eve: 0, nite: 0 } }
    
    rows.forEach(r => {
        let rDate = parseRowDate(r[0]);
        if (isNaN(rDate.getTime())) return;
        
        let dateKey = rDate.toISOString().split('T')[0];
        if (!dayTotals[dateKey]) {
            dayTotals[dateKey] = { solar: 0, eve: 0, nite: 0 };
        }
        
        let kwh = parseNumber(r[2]);
        let hour = rDate.getHours();
        
        if (hour >= 7 && hour < 17) {
            dayTotals[dateKey].solar += kwh;
        } else if (hour >= 17 && hour < 22) {
            dayTotals[dateKey].eve += kwh;
        } else {
            dayTotals[dateKey].nite += kwh;
        }
    });
    
    let uniqueDays = Object.keys(dayTotals).length;
    if (uniqueDays === 0) return;
    
    let grandSolar = 0, grandEve = 0, grandNite = 0;
    Object.values(dayTotals).forEach(day => {
        grandSolar += day.solar;
        grandEve += day.eve;
        grandNite += day.nite;
    });
    
    let avgSolar = grandSolar / uniqueDays;
    let avgEve = grandEve / uniqueDays;
    let avgNite = grandNite / uniqueDays;
    
    const setAvg = (id, val) => {
        let el = document.getElementById(id);
        if (el) el.textContent = val.toFixed(1) + ' kWh';
    };
    
    setAvg('hist-solar-avg', avgSolar);
    setAvg('hist-eve-avg', avgEve);
    setAvg('hist-nite-avg', avgNite);
}

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
    let powerColorDataBucket = [];
    let compareColorDataBucket = [];

    for (let i = 0; i < bucketCount; i++) {
        baseData.push([]);
        compareData.push([]);
        batteryDataBucket.push([]);
        powerColorDataBucket.push([]);
        compareColorDataBucket.push([]);
        
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
    }

    let solarPanelKw = getSolarKW();
    let batteryFullCapacity = getBatteryKWh();
     // dodEl removed
    let batteryDoD = 0.8;
    let usableBatteryCapacity = batteryFullCapacity * batteryDoD;
    
    let globalBatteryState = 0;
    let rowBatteryState = new Array(rows.length).fill(0);
    let rowMarginalCost = new Array(rows.length).fill(0);
    let rowMarginalRate = new Array(rows.length).fill(0);
    
    let accKwhCycle = 0;
    let currCycleMs = -1;
    
    // Process AC Data into a map for quick lookup
    let acLookup = {};
    if (window.globalAcRows && window.globalAcRows.length > 0) {
        window.globalAcRows.forEach(r => {
            let d = new Date(r[0]);
            let bucketKey = Math.floor(d.getTime() / bucketMs);
            if (!acLookup[bucketKey]) acLookup[bucketKey] = [];
            acLookup[bucketKey].push(parseNumber(r[1])); // Column 1 is Watt
        });
    }

    rows.forEach((r, idx) => {
        let rDate = parseRowDate(r[0]);
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

        let weatherTS = new Date(rDate).setMinutes(0, 0, 0);
        let rad = getWeatherInterpolated(rDate, window.meteoMap);
        let cloud = getWeatherInterpolated(rDate, window.meteoCloud);
        if (cloud < 0) cloud = 0;

        let tempTS = new Date(rDate).setMinutes(0, 0, 0);
        let ambTemp = window.meteoTemp && window.meteoTemp[tempTS] !== undefined ? window.meteoTemp[tempTS] : 30;
        
        let cloudFactor = 1 - (cloud * 0.007);
        let sysEff = getSolarSystemEff(ambTemp);
        let solarEff = rad >= 0 ? (rad / 1000) * cloudFactor : ((rDate.getHours() >= 7 && rDate.getHours() <= 17) ? Math.sin((rDate.getHours() - 7) * Math.PI / 10) : 0);
        
        let solarProduced = solarPanelKw * sysEff * solarEff * 0.25; 
        let usageWithExtra = (rDate.getHours() >= 7 && rDate.getHours() <= 17) ? addedKwh * (1 + EXTRA_USAGE_EST) : addedKwh;
        
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
                powerColorDataBucket[bucketIdx].push(parseNumber(r[4]));
            }
        }

        let mappedTime = rTime + offsetCompareMs;
        if (mappedTime >= rangeStart.getTime() && mappedTime < rangeStart.getTime() + durationMs) {
            let bucketIdx = Math.floor((mappedTime - rangeStart.getTime()) / bucketMs);
            if (bucketIdx >= 0 && bucketIdx < bucketCount) {
                compareData[bucketIdx].push(metricVal);
                compareColorDataBucket[bucketIdx].push(parseNumber(r[4]));
            }
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

    let baseWatts = powerColorDataBucket.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0)/arr.length : 0);
    let compareWatts = compareColorDataBucket.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0)/arr.length : 0);

    let solarData = [];
    for (let i = 0; i < bucketCount; i++) {
        let bTime = new Date(rangeStart.getTime() + i * bucketMs);
        let val = 0;
        
        if (metricType === 'power') {
            if (freq === '1d') {
                let avgSysEff = getSolarSystemEff(32); // ค่าเฉลี่ยอุณหภูมิกลางวันไทย
                val = solarPanelKw * 1000 * avgSysEff * (10 / 24) * 0.636;
            } else {
                let rad = getWeatherInterpolated(bTime, window.meteoMap);
                let cloud = getWeatherInterpolated(bTime, window.meteoCloud);
                if (cloud < 0) cloud = 0;

                let tempTS = new Date(bTime).setMinutes(0,0,0);
                let ambTemp = window.meteoTemp && window.meteoTemp[tempTS] !== undefined ? window.meteoTemp[tempTS] : 30;
                
                let cloudFactor = 1 - (cloud * 0.007);
                let sysEff = getSolarSystemEff(ambTemp);
                let solarEff = rad >= 0 ? (rad / 1000) * cloudFactor : ((bTime.getHours() >= 7 && bTime.getHours() <= 17) ? Math.sin((bTime.getHours() - 7) * Math.PI / 10) : 0);
                
                val = solarPanelKw * 1000 * sysEff * solarEff;
            }
        } else {
            let blendedRate = window.blendedPricePerUnit || 4.2;
            let bucketHours = bucketMs / (3600 * 1000);
            if (freq === '1d') {
                let avgSysEff = getSolarSystemEff(32);
                val = solarPanelKw * avgSysEff * (10 / 24) * 0.636 * 24 * blendedRate;
            } else {
                let rad = getWeatherInterpolated(bTime, window.meteoMap);
                let cloud = getWeatherInterpolated(bTime, window.meteoCloud);
                if (cloud < 0) cloud = 0;

                let tempTS = new Date(bTime).setMinutes(0,0,0);
                let ambTemp = window.meteoTemp && window.meteoTemp[tempTS] !== undefined ? window.meteoTemp[tempTS] : 30;
                
                let cloudFactor = 1 - (cloud * 0.007);
                let sysEff = getSolarSystemEff(ambTemp);
                let solarEff = rad >= 0 ? (rad / 1000) * cloudFactor : ((bTime.getHours() >= 7 && bTime.getHours() <= 17) ? Math.sin((bTime.getHours() - 7) * Math.PI / 10) : 0);
                
                val = (solarPanelKw * sysEff * solarEff) * bucketHours * blendedRate;
            }
        }
        solarData.push(val);
    }

    // Prepare AC final data buckets
    let acFinalData = [];
    for (let i = 0; i < bucketCount; i++) {
        let bTime = new Date(rangeStart.getTime() + i * bucketMs);
        let bucketKey = Math.floor(bTime.getTime() / bucketMs);
        let vals = acLookup[bucketKey] || [];
        if (vals.length > 0) {
            let avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            acFinalData.push(metricType === 'cost' ? (avg * window.blendedPricePerUnit / 1000) : avg);
        } else {
            acFinalData.push(null);
        }
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

    // Add AC Power series
    if (window.globalAcRows && window.globalAcRows.length > 0) {
        console.log(`Rendering AC data: ${window.globalAcRows.length} rows found.`);
        chartDatasets.push({
            label: `AC Power (${metricType === 'cost' ? 'THB' : 'W'})`,
            data: acFinalData,
            borderColor: '#a78bfa', // Purple
            borderWidth: 3,
            fill: false,
            tension: 0.4,
            pointRadius: 0
        });
    } else {
        console.warn("No AC data found in globalAcRows.");
    }

    chartDatasets.push({
        type: 'bar',
        label: `${labelBase} ${metricType === 'cost' ? 'Cost (THB)' : 'Power (W)'}`,
        data: finalBase,
        backgroundColor: context => {
            let watt = baseWatts[context.dataIndex];
            if (watt > 2000) return '#f87171'; // 🔴 Red (High)
            if (watt >= 920) return '#fbbf24'; // 🟡 Yellow (Medium)
            if (watt > 0) return '#34d399';    // 🟢 Green (Normal/Save)
            return '#b6d7a8';                 // 🌲 Dark Green (Free/Net 0)
        },
        borderRadius: 4,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
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

    // Add Budget/Limit Reference Line
    let budgetLimit = 0;
    if (metricType === 'cost') {
        let dailyGoal = BUDGET_MONTHLY / 30;
        if (freq === '1d') budgetLimit = dailyGoal;
        else if (freq === '1h') budgetLimit = dailyGoal / 24;
        else budgetLimit = dailyGoal / 96;
    } else {
        budgetLimit = BUDGET_POWER_LIMIT;
    }

    if (budgetLimit > 0) {
        chartDatasets.push({
            label: `Ref Limit (${budgetLimit.toFixed(1)} ${metricType === 'cost' ? 'THB' : 'W'})`,
            data: new Array(bucketCount).fill(budgetLimit),
            borderColor: 'rgba(248, 113, 113, 0.8)', // Modern Red
            borderWidth: 1.5,
            borderDash: [10, 5],
            fill: false,
            pointRadius: 0,
            pointHitRadius: 0,
            order: -1 // Behind bars if possible, actually lines go above bars usually
        });
    }

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
                y: { 
                    grid: { color: 'rgba(255, 255, 255, 0.06)' }, 
                    ticks: { color: '#94a3b8' }, 
                    beginAtZero: true,
                    min: 0,
                    max: metricType === 'cost' ? (freq === '1d' ? 200 : CHART_MAX_COST) : CHART_MAX_WATT
                }
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

// --- Interactive Keyboard Control for Sliders (Focus on Hover) ---
document.querySelectorAll('.adj-slider').forEach(slider => {
    slider.addEventListener('mouseenter', () => {
        slider.focus();
    });
    // Optional: Blur on leave if you want to release keyboard control
    slider.addEventListener('mouseleave', () => {
        slider.blur();
    });
});
