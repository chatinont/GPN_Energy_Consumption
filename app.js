document.addEventListener('DOMContentLoaded', () => {
    function getLocalDateString(date) {
        let d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 10);
    }
    window.getLocalDateString = getLocalDateString;

    function parseLocalDate(dateStr) {
        if (!dateStr) return new Date();
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
        }
        return new Date(dateStr);
    }
    window.parseLocalDate = parseLocalDate;

    initDashboard();

    const THAI_DAYS = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
    const DAY_COLORS = ['#ef4444','#fbbf24','#f472b6','#34d399','#f97316','#38bdf8','#a78bfa'];
    function updateDayLabel(dateStr) {
        let el = document.getElementById('dayOfWeekLabel');
        if (!el || !dateStr) return;
        let d = parseLocalDate(dateStr);
        let dayIdx = d.getDay();
        el.textContent = 'วัน' + THAI_DAYS[dayIdx];
        el.style.color = DAY_COLORS[dayIdx];
    }

    window.dashboardMode = 'billing';
    window.selectedDashboardDate = new Date();
    window.selectedDashboardDate.setHours(0,0,0,0);


    function updateDashboardDayLabel(date) {
        let el = document.getElementById('dashboardDayOfWeekLabel');
        if (!el || !date) return;
        let dayIdx = date.getDay();
        el.textContent = 'วัน' + THAI_DAYS[dayIdx];
        el.style.color = DAY_COLORS[dayIdx];
    }
    window.updateDashboardDayLabel = updateDashboardDayLabel;

    const timeRangeFilter = document.getElementById('timeRangeFilter');
    const freqFilter = document.getElementById('freqFilter');
    const metricFilter = document.getElementById('metricFilter');
    const customDateInput = document.getElementById('customDateInput');
    const dashboardDateInput = document.getElementById('dashboardDateInput');
    const modeBillingBtn = document.getElementById('modeBillingBtn');
    const modeDailyBtn = document.getElementById('modeDailyBtn');
    const billingCycleSelectorContainer = document.getElementById('billingCycleSelectorContainer');
    const dailyDateSelectorContainer = document.getElementById('dailyDateSelectorContainer');

    if (modeBillingBtn && modeDailyBtn) {
        modeBillingBtn.addEventListener('click', () => {
            window.dashboardMode = 'billing';
            modeBillingBtn.classList.add('active');
            modeDailyBtn.classList.remove('active');
            modeBillingBtn.style.background = 'var(--card-bg)';
            modeBillingBtn.style.color = 'var(--text-main)';
            modeBillingBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
            modeDailyBtn.style.background = 'transparent';
            modeDailyBtn.style.color = 'var(--text-muted)';
            modeDailyBtn.style.boxShadow = 'none';

            if (billingCycleSelectorContainer) billingCycleSelectorContainer.style.display = 'flex';
            if (dailyDateSelectorContainer) dailyDateSelectorContainer.style.display = 'none';

            document.getElementById('card-bill-title').textContent = "Current Bill So Far";
            document.getElementById('card-est-title').textContent = "Estimated Final Bill";
            document.getElementById('cb-avg-day-container').style.display = '';
            document.getElementById('cb-avg-cost-container').style.display = '';
            document.getElementById('est-avg-day-container').style.display = '';
            document.getElementById('est-avg-cost-container').style.display = '';
            document.getElementById('sol-daily-kwh-label').textContent = "☀️ ผลิตได้/เดือน";
            document.getElementById('sol-daily-saving-label').textContent = "💰 ประหยัด/เดือน";
            
            if (timeRangeFilter) {
                timeRangeFilter.value = 'this_month';
                timeRangeFilter.dispatchEvent(new Event('change'));
            }

            if (window.globalRawRows) {
                calculateBillingCosts(window.globalRawRows);
            }
        });

        modeDailyBtn.addEventListener('click', () => {
            window.dashboardMode = 'daily';
            modeDailyBtn.classList.add('active');
            modeBillingBtn.classList.remove('active');
            modeDailyBtn.style.background = 'var(--card-bg)';
            modeDailyBtn.style.color = 'var(--text-main)';
            modeDailyBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
            modeBillingBtn.style.background = 'transparent';
            modeBillingBtn.style.color = 'var(--text-muted)';
            modeBillingBtn.style.boxShadow = 'none';

            if (billingCycleSelectorContainer) billingCycleSelectorContainer.style.display = 'none';
            if (dailyDateSelectorContainer) dailyDateSelectorContainer.style.display = 'flex';

            document.getElementById('card-bill-title').textContent = "Selected Day Cost";
            document.getElementById('card-est-title').textContent = "Simulated Daily Cost";
            document.getElementById('cb-avg-day-container').style.display = 'none';
            document.getElementById('cb-avg-cost-container').style.display = 'none';
            document.getElementById('est-avg-day-container').style.display = 'none';
            document.getElementById('est-avg-cost-container').style.display = 'none';
            document.getElementById('sol-daily-kwh-label').textContent = "☀️ ผลิตได้/วัน";
            document.getElementById('sol-daily-saving-label').textContent = "💰 ประหยัด/วัน";

            if (dashboardDateInput && dashboardDateInput.value) {
                window.selectedDashboardDate = parseLocalDate(dashboardDateInput.value);
                if (customDateInput) {
                    customDateInput.value = dashboardDateInput.value;
                    updateDayLabel(customDateInput.value);
                }
            }
            if (timeRangeFilter) {
                timeRangeFilter.value = 'custom_date';
                timeRangeFilter.dispatchEvent(new Event('change'));
            }

            if (window.globalRawRows) {
                calculateBillingCosts(window.globalRawRows);
            }
        });
    }

    const dashPrevDateBtn = document.getElementById('dashPrevDateBtn');
    const dashNextDateBtn = document.getElementById('dashNextDateBtn');

    if (dashPrevDateBtn && dashboardDateInput) {
        dashPrevDateBtn.addEventListener('click', () => {
            if (dashboardDateInput.value) {
                let d = parseLocalDate(dashboardDateInput.value);
                d.setDate(d.getDate() - 1);
                dashboardDateInput.value = getLocalDateString(d);
                window.selectedDashboardDate = d;
                updateDashboardDayLabel(d);
                
                if (customDateInput) {
                    customDateInput.value = dashboardDateInput.value;
                    updateDayLabel(customDateInput.value);
                }

                if (window.globalRawRows) {
                    calculateBillingCosts(window.globalRawRows);
                    renderChart(window.globalRawRows);
                }
            }
        });
    }

    if (dashNextDateBtn && dashboardDateInput) {
        dashNextDateBtn.addEventListener('click', () => {
            if (dashboardDateInput.value) {
                let d = parseLocalDate(dashboardDateInput.value);
                d.setDate(d.getDate() + 1);
                dashboardDateInput.value = getLocalDateString(d);
                window.selectedDashboardDate = d;
                updateDashboardDayLabel(d);
                
                if (customDateInput) {
                    customDateInput.value = dashboardDateInput.value;
                    updateDayLabel(customDateInput.value);
                }

                if (window.globalRawRows) {
                    calculateBillingCosts(window.globalRawRows);
                    renderChart(window.globalRawRows);
                }
            }
        });
    }

    if (dashboardDateInput) {
        dashboardDateInput.addEventListener('click', () => {
            try {
                if (typeof dashboardDateInput.showPicker === 'function') {
                    dashboardDateInput.showPicker();
                }
            } catch (e) {}
        });
        dashboardDateInput.addEventListener('change', () => {
            let d = parseLocalDate(dashboardDateInput.value);
            window.selectedDashboardDate = d;
            updateDashboardDayLabel(d);
            
            if (customDateInput) {
                customDateInput.value = dashboardDateInput.value;
                updateDayLabel(customDateInput.value);
            }

            if (window.globalRawRows) {
                calculateBillingCosts(window.globalRawRows);
                renderChart(window.globalRawRows);
            }
        });
    }

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
                let d = parseLocalDate(customDateInput.value);
                d.setDate(d.getDate() - 1);
                customDateInput.value = getLocalDateString(d);
                updateDayLabel(customDateInput.value);
                
                if (window.dashboardMode === 'daily' && dashboardDateInput) {
                    dashboardDateInput.value = customDateInput.value;
                    let dDash = parseLocalDate(customDateInput.value);
                    window.selectedDashboardDate = dDash;
                    if (window.updateDashboardDayLabel) window.updateDashboardDayLabel(dDash);
                    if (window.globalRawRows) calculateBillingCosts(window.globalRawRows);
                }

                if (window.globalRawRows) renderChart(window.globalRawRows);
            }
        });
    }
    
    if (nextDateBtn && customDateInput) {
        nextDateBtn.addEventListener('click', () => {
            if (customDateInput.value) {
                let d = parseLocalDate(customDateInput.value);
                d.setDate(d.getDate() + 1);
                customDateInput.value = getLocalDateString(d);
                updateDayLabel(customDateInput.value);

                if (window.dashboardMode === 'daily' && dashboardDateInput) {
                    dashboardDateInput.value = customDateInput.value;
                    let dDash = parseLocalDate(customDateInput.value);
                    window.selectedDashboardDate = dDash;
                    if (window.updateDashboardDayLabel) window.updateDashboardDayLabel(dDash);
                    if (window.globalRawRows) calculateBillingCosts(window.globalRawRows);
                }

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
            
            if (window.dashboardMode === 'daily' && dashboardDateInput) {
                dashboardDateInput.value = customDateInput.value;
                let d = parseLocalDate(customDateInput.value);
                window.selectedDashboardDate = d;
                if (window.updateDashboardDayLabel) window.updateDashboardDayLabel(d);
                if (window.globalRawRows) calculateBillingCosts(window.globalRawRows);
            }

            if (window.globalRawRows) renderChart(window.globalRawRows);
        });
    }

    if (freqFilter) {
        freqFilter.addEventListener('change', () => {
            if (freqFilter.value === '1m') {
                if (timeRangeFilter) timeRangeFilter.style.display = 'none';
                if (customDateContainer) customDateContainer.style.display = 'none';
                if (window.globalRawRows) renderChart(window.globalRawRows);
            } else {
                if (timeRangeFilter) {
                    timeRangeFilter.style.display = '';
                    if (freqFilter.value === '1d' && timeRangeFilter.value !== 'this_month') {
                        timeRangeFilter.value = 'this_month';
                    }
                    // Trigger change event to show/hide custom date container and re-render
                    timeRangeFilter.dispatchEvent(new Event('change'));
                } else {
                    if (window.globalRawRows) renderChart(window.globalRawRows);
                }
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
            // Save settings when changed
            if (investmentFilter) localStorage.setItem('solar_investment_cost', investmentFilter.value);
            const meterFilter = document.getElementById('meterTypeFilter');
            if (meterFilter) localStorage.setItem('meter_type', meterFilter.value);

            calculateBillingCosts(window.globalRawRows);
            renderChart(window.globalRawRows);
        }
    };

    const meterFilter = document.getElementById('meterTypeFilter');
    if (meterFilter) {
        let savedMeter = localStorage.getItem('meter_type');
        // Force 'normal' as default since user does not use TOU
        if (!savedMeter || savedMeter === 'tou') {
            savedMeter = 'normal';
            localStorage.setItem('meter_type', 'normal');
        }
        meterFilter.value = savedMeter;
        meterFilter.addEventListener('change', updateBattery);
    }
    
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
            document.body.classList.toggle('dark-theme');
            if (document.body.classList.contains('dark-theme')) {
                themeIcon.innerText = 'light_mode';
            } else {
                themeIcon.innerText = 'dark_mode';
            }
            // Re-render chart to apply new theme text & grid colors
            if (window.globalRawRows) {
                renderChart(window.globalRawRows);
            }
        });
    }

    const infoToggle = document.getElementById('info-toggle');
    const infoModal = document.getElementById('info-modal');
    const closeInfo = document.getElementById('close-info');

    if (infoToggle && infoModal && closeInfo) {
        infoToggle.addEventListener('click', () => {
            infoModal.classList.remove('hidden');
        });

        closeInfo.addEventListener('click', () => {
            infoModal.classList.add('hidden');
        });

        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) {
                infoModal.classList.add('hidden');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !infoModal.classList.contains('hidden')) {
                infoModal.classList.add('hidden');
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

const GS_CSV_URL = "https://docs.google.com/spreadsheets/d/1JE-c7uCBsnEJFgG-pXQzjq7kVHDp9X1igY_7mhJro-Y/gviz/tq?tqx=out:csv&sheet=Log_15Min&cachebuster=" + Date.now();
const AC_CSV_URL = "https://docs.google.com/spreadsheets/d/1JE-c7uCBsnEJFgG-pXQzjq7kVHDp9X1igY_7mhJro-Y/gviz/tq?tqx=out:csv&sheet=Log_AC&cachebuster=" + Date.now();
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

// MEA Rate Constants (Normal)
const MEA_FT = 0.1623;
const MEA_SERVICE_NORMAL = 38.22;
const MEA_VAT = 1.07;

// MEA TOU Rates (Residential 1.2)
const MEA_TOU_ON_PEAK = 5.7982;
const MEA_TOU_OFF_PEAK = 2.6369;
const MEA_SERVICE_TOU = 24.62;

function isTouOnPeak(date) {
    const day = date.getDay(); // 0 = Sun, 6 = Sat
    const hour = date.getHours();
    
    // Sat & Sun are always Off-Peak
    if (day === 0 || day === 6) return false;
    
    // Mon-Fri: On-Peak is 09:00-22:00
    if (hour >= 9 && hour < 22) return true;
    
    return false;
}

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

function calcMeaTou(onPeak, offPeak) {
    const kwh = onPeak + offPeak;
    if (kwh <= 0) return 0;
    const base = (onPeak * MEA_TOU_ON_PEAK) + (offPeak * MEA_TOU_OFF_PEAK);
    return (base + (kwh * MEA_FT) + MEA_SERVICE_TOU) * MEA_VAT;
}

function calcMeaTouEnergyOnly(onPeak, offPeak) {
    const kwh = onPeak + offPeak;
    if (kwh <= 0) return 0;
    const base = (onPeak * MEA_TOU_ON_PEAK) + (offPeak * MEA_TOU_OFF_PEAK);
    return (base + (kwh * MEA_FT)) * MEA_VAT;
}

function calcMeaTouBreakdown(onPeak, offPeak) {
    const kwh = onPeak + offPeak;
    if (kwh <= 0) return { base: 0, ft: 0, service: MEA_SERVICE_TOU, vat: 0, total: 0 };
    const base = (onPeak * MEA_TOU_ON_PEAK) + (offPeak * MEA_TOU_OFF_PEAK);
    const ft = kwh * MEA_FT;
    const service = MEA_SERVICE_TOU;
    const beforeVat = base + ft + service;
    const vat = beforeVat * 0.07;
    return {
        base: base,
        ft: ft,
        service: service,
        vat: vat,
        total: beforeVat + vat
    };
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

        if (lastRow && lastRow[0]) {
            let lastRowDate = parseRowDate(lastRow[0]);
            let logicalDate = new Date(lastRowDate.getTime() - 7 * 3600 * 1000);
            const dashboardDateInput = document.getElementById('dashboardDateInput');
            if (dashboardDateInput && !dashboardDateInput.value) {
                let dateStr = getLocalDateString(logicalDate);
                dashboardDateInput.value = dateStr;
                window.selectedDashboardDate = parseLocalDate(dateStr);
                if (window.updateDashboardDayLabel) window.updateDashboardDayLabel(window.selectedDashboardDate);
            }
        }
        
        // Compile and populate billing cycles dropdown dynamically
        let uniqueMap = new Map();
        for (let r of rows) {
            if (!r[0]) continue;
            let ts = parseRowDate(r[0]).getTime();
            uniqueMap.set(ts, r);
        }
        let sortedRows = Array.from(uniqueMap.values()).sort((a,b) => parseRowDate(a[0]) - parseRowDate(b[0]));
        populateBillingCyclesDropdown(sortedRows);
        
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
    const dropdown = document.getElementById('billingCycleFilter');
    
    let startCycle;
    let endOfCycle;
    
    let selectedDate = window.selectedDashboardDate || new Date();
    if (window.dashboardMode === 'daily') {
        let startMs = getBillingCycleStartMs(selectedDate);
        startCycle = new Date(startMs);
        endOfCycle = new Date(startCycle);
        endOfCycle.setMonth(endOfCycle.getMonth() + 1);
    } else {
        if (dropdown && dropdown.value) {
            let startMs = parseInt(dropdown.value);
            startCycle = new Date(startMs);
            endOfCycle = new Date(startCycle);
            endOfCycle.setMonth(endOfCycle.getMonth() + 1);
        } else {
            startCycle = new Date(today.getFullYear(), today.getMonth(), BILLING_DAY);
            if (today.getDate() < BILLING_DAY) {
                startCycle.setMonth(startCycle.getMonth() - 1);
            }
            startCycle.setHours(0,0,0,0);
            endOfCycle = new Date(startCycle);
            endOfCycle.setMonth(endOfCycle.getMonth() + 1);
        }
    }

    // Calculate dynamic cycle length
    let daysInCycle = Math.round((endOfCycle.getTime() - startCycle.getTime()) / (24*3600*1000));
    let isPastCycle = (endOfCycle < today);

    const meterType = document.getElementById('meterTypeFilter')?.value || 'normal';

    // Scaling Factors from Sliders
    const dayScale = 1 + (parseFloat(document.getElementById('day-adj-slider')?.value || 0) / 100);
    const eveScale = 1 + (parseFloat(document.getElementById('evening-adj-slider')?.value || 0) / 100);
    const niteScale = 1 + (parseFloat(document.getElementById('night-adj-slider')?.value || 0) / 100);
    
    // Accumulators for the billing cycle
    let cycleKwh = 0;       // Actual Gross
    let cycleOnPeakKwh = 0;
    let cycleOffPeakKwh = 0;
    
    let cycleSimKwh = 0;    // Simulated Gross (Actual * Scaling Sliders)
    let cycleOnPeakSimKwh = 0;
    let cycleOffPeakSimKwh = 0;
    
    let cycleCount = 0;
    let cycleSolarGridKwh = 0; // Simulated Net
    let cycleOnPeakGridKwh = 0;
    let cycleOffPeakGridKwh = 0;
    
    // Period counters
    let cycleSolarKwh = 0;   // 07:00 - 17:00
    let cycleEveningKwh = 0; // 17:00 - 22:00
    let cycleNightKwh = 0;   // 22:00 - 07:00
    
    let cycleDayGridKwh = 0;  // Net import Day
    let cycleEveGridKwh = 0;  // Net import Eve
    let cycleNiteGridKwh = 0; // Net import Nite

    // Daily accumulators (used in Daily View)
    let dayKwh = 0;
    let dayOnPeakKwh = 0;
    let dayOffPeakKwh = 0;
    let daySimKwh = 0;
    let dayOnPeakSimKwh = 0;
    let dayOffPeakSimKwh = 0;
    let daySolarGridKwh = 0;
    let dayOnPeakGridKwh = 0;
    let dayOffPeakGridKwh = 0;
    let daySolarKwh = 0;
    let dayEveningKwh = 0;
    let dayNightKwh = 0;
    let daySolarSimTotal = 0;
    let dayEveSimTotal = 0;
    let dayNiteSimTotal = 0;
    let daySolarProduced = 0;
    
    let dayBaselineSolarGridKwh = 0;
    let dayBaselineDayImport = 0;
    let dayBaselineEveImport = 0;
    let dayBaselineNiteImport = 0;
    let dayBaselineOnPeakImport = 0;
    let dayBaselineOffPeakImport = 0;
    
    let dayBaselineSolarKwh = 0;
    let dayBaselineEveKwh = 0;
    let dayBaselineNiteKwh = 0;
    let dayBaselineOnPeakKwh = 0;
    let dayBaselineOffPeakKwh = 0;
    
    let solarPanelKw = getSolarKW();
    let batteryFullCapacity = getBatteryKWh();
    let batteryDoD = 0.8;
    let usableBatteryCapacity = batteryFullCapacity * batteryDoD;
    let currentBatterySim = 0;
    let currentBatteryBase = 0;

    let todayKwh = 0;
    let todayCount = 0;
    const todayStr = new Date().toLocaleDateString('en-GB');

    // --- STEP 1: Deduplication & Sorting ---
    let uniqueMap = new Map();
    for (let r of rows) {
        if (!r[0]) continue;
        let ts = parseRowDate(r[0]).getTime();
        uniqueMap.set(ts, r);
    }
    let sortedRows = Array.from(uniqueMap.values()).sort((a,b) => parseRowDate(a[0]) - parseRowDate(b[0]));

    // Declare globals for the loop (re-initialized each run)
    window.baselineSolarGridKwh = 0;
    window.baselineDayImport = 0;
    window.baselineEveImport = 0;
    window.baselineNiteImport = 0;
    window.baselineOnPeakImport = 0;
    window.baselineOffPeakImport = 0;
    
    // Reset Baseline Period Totals (Gross)
    window.baselineSolarKwh = 0;
    window.baselineEveKwh = 0;
    window.baselineNiteKwh = 0;
    window.baselineOnPeakKwh = 0;
    window.baselineOffPeakKwh = 0;
    
    // Reset Simulated Period Totals (Gross)
    window.cycleSolarSimTotal = 0;
    window.cycleEveSimTotal = 0;
    window.cycleNiteSimTotal = 0;

    for (let r of sortedRows) {
        let rDate = parseRowDate(r[0]);
        let checkDate = rDate;
        if (window.dashboardMode === 'daily') {
            checkDate = new Date(rDate.getTime() - 7 * 3600 * 1000);
        }
        if (checkDate >= startCycle && checkDate < endOfCycle) {
            let addedKwh = parseNumber(r[2]);
            cycleKwh += addedKwh;
            cycleCount++;
            
            let hour = rDate.getHours();
            let isSelDay = (window.dashboardMode === 'daily') ? (checkDate.toDateString() === selectedDate.toDateString()) : (rDate.toDateString() === selectedDate.toDateString());

            if (isSelDay) {
                dayKwh += addedKwh;
            }
            
            // Get Scaling Factor for this record
            let currentScale = niteScale;
            if (hour >= 7 && hour < 17) currentScale = dayScale;
            else if (hour >= 17 && hour < 22) currentScale = eveScale;

            let simulatedAddedKwh = addedKwh * currentScale;
            cycleSimKwh += simulatedAddedKwh;
            if (isSelDay) {
                daySimKwh += simulatedAddedKwh;
            }

            const isTouPeak = isTouOnPeak(rDate);
            if (isTouPeak) {
                cycleOnPeakKwh += addedKwh;
                cycleOnPeakSimKwh += simulatedAddedKwh;
                window.baselineOnPeakKwh = (window.baselineOnPeakKwh || 0) + addedKwh;
                if (isSelDay) {
                    dayOnPeakKwh += addedKwh;
                    dayOnPeakSimKwh += simulatedAddedKwh;
                    dayBaselineOnPeakKwh += addedKwh;
                }
            } else {
                cycleOffPeakKwh += addedKwh;
                cycleOffPeakSimKwh += simulatedAddedKwh;
                window.baselineOffPeakKwh = (window.baselineOffPeakKwh || 0) + addedKwh;
                if (isSelDay) {
                    dayOffPeakKwh += addedKwh;
                    dayOffPeakSimKwh += simulatedAddedKwh;
                    dayBaselineOffPeakKwh += addedKwh;
                }
            }

            // Tracking Simulated Totals for Period Breakdown UI (Gross)
            if (hour >= 7 && hour < 17) {
                window.cycleSolarSimTotal = (window.cycleSolarSimTotal || 0) + simulatedAddedKwh;
                window.baselineSolarKwh = (window.baselineSolarKwh || 0) + addedKwh;
                if (isSelDay) {
                    daySolarSimTotal += simulatedAddedKwh;
                    dayBaselineSolarKwh += addedKwh;
                }
            } else if (hour >= 17 && hour < 22) {
                window.cycleEveSimTotal = (window.cycleEveSimTotal || 0) + simulatedAddedKwh;
                window.baselineEveKwh = (window.baselineEveKwh || 0) + addedKwh;
                if (isSelDay) {
                    dayEveSimTotal += simulatedAddedKwh;
                    dayBaselineEveKwh += addedKwh;
                }
            } else {
                window.cycleNiteSimTotal = (window.cycleNiteSimTotal || 0) + simulatedAddedKwh;
                window.baselineNiteKwh = (window.baselineNiteKwh || 0) + addedKwh;
                if (isSelDay) {
                    dayNiteSimTotal += simulatedAddedKwh;
                    dayBaselineNiteKwh += addedKwh;
                }
            }

            // Refined Periods (Tracking Actual for UI metrics)
            if (hour >= 7 && hour < 17) {
                cycleSolarKwh += addedKwh;
                if (isSelDay) daySolarKwh += addedKwh;
            } else if (hour >= 17 && hour < 22) {
                cycleEveningKwh += addedKwh;
                if (isSelDay) dayEveningKwh += addedKwh;
            } else {
                cycleNightKwh += addedKwh;
                if (isSelDay) dayNightKwh += addedKwh;
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
                solarEff = (rad / 1000); 
            } else if (rad < 0) {
                solarEff = (hour >= 7 && hour <= 17) ? (Math.sin((hour - 7) * Math.PI / 10) * cloudFactor) : 0;
            }
            
            let solarProduced = solarPanelKw * sysEff * solarEff * 0.25; 
            if (isSelDay) {
                daySolarProduced += solarProduced;
            }
            // Simulation is based on simulated usage
            let usageWithExtra = simulatedAddedKwh * (1 + EXTRA_USAGE_EST); 
            
            let excessSolar = solarProduced - usageWithExtra;

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
            if (isTouPeak) cycleOnPeakGridKwh += gridImportSim;
            else cycleOffPeakGridKwh += gridImportSim;

            if (isDay) cycleDayGridKwh = (cycleDayGridKwh || 0) + gridImportSim;
            else if (isEve) cycleEveGridKwh = (cycleEveGridKwh || 0) + gridImportSim;
            else cycleNiteGridKwh = (cycleNiteGridKwh || 0) + gridImportSim;

            if (isSelDay) {
                daySolarGridKwh += gridImportSim;
                if (isTouPeak) dayOnPeakGridKwh += gridImportSim;
                else dayOffPeakGridKwh += gridImportSim;
            }

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
            if (isTouPeak) window.baselineOnPeakImport = (window.baselineOnPeakImport || 0) + gridImportBase;
            else window.baselineOffPeakImport = (window.baselineOffPeakImport || 0) + gridImportBase;

            if (isSelDay) {
                dayBaselineSolarGridKwh += gridImportBase;
                if (isTouPeak) dayBaselineOnPeakImport += gridImportBase;
                else dayBaselineOffPeakImport += gridImportBase;
            }
        }
    }

    const cycleBill = (meterType === 'tou') ? calcMeaTou(cycleOnPeakKwh, cycleOffPeakKwh) : calcMeaProgressive(cycleKwh);
    const cycleCbd = (meterType === 'tou') ? calcMeaTouBreakdown(cycleOnPeakKwh, cycleOffPeakKwh) : calcMeaBreakdown(cycleKwh);

    let currentBill;
    let cbd;
    if (window.dashboardMode === 'daily') {
        if (cycleKwh > 0) {
            let ratio = dayKwh / cycleKwh;
            currentBill = ratio * cycleBill;
            cbd = {
                base: ratio * cycleCbd.base,
                ft: ratio * cycleCbd.ft,
                service: ratio * cycleCbd.service,
                vat: ratio * cycleCbd.vat,
                total: ratio * cycleCbd.total
            };
        } else {
            currentBill = 0;
            cbd = { base: 0, ft: 0, service: 0, vat: 0, total: 0 };
        }
    } else {
        currentBill = cycleBill;
        cbd = cycleCbd;
    }

    let cycleDaysElapsed = isPastCycle ? daysInCycle : Math.max(1, Math.floor((today.getTime() - startCycle.getTime()) / (24*3600*1000)));
    let proRateFactor = Math.min(1, cycleDaysElapsed / daysInCycle);
    
    window.blendedPricePerUnit = cycleKwh > 0 ? ((meterType === 'tou' ? calcMeaTouEnergyOnly(cycleOnPeakKwh, cycleOffPeakKwh) : calcMeaEnergy(cycleKwh)) / cycleKwh) : 4.4;

    document.getElementById('billing-cycle-date').innerText = `Billing Cycle starting ${startCycle.toLocaleDateString('en-GB')}`;
    document.getElementById('current-bill').innerText = currentBill.toLocaleString('en-US', {maximumFractionDigits: 1});
    let cycleTotalDays = daysInCycle;
    let cyclePct = Math.min(100, Math.round((cycleDaysElapsed / cycleTotalDays) * 100));
    let cbDays = document.getElementById('cb-cycle-days');
    if (cbDays) {
        if (window.dashboardMode === 'daily') {
            cbDays.textContent = selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
        } else {
            cbDays.textContent = `วันที่ ${cycleDaysElapsed} / ${cycleTotalDays}`;
        }
    }
    let cbPct = document.getElementById('cb-cycle-pct');
    if (cbPct) {
        if (window.dashboardMode === 'daily') {
            cbPct.textContent = '100%';
        } else {
            cbPct.textContent = `${cyclePct}%`;
        }
    }
    let cbBar = document.getElementById('cb-progress-bar');
    if (cbBar) {
        if (window.dashboardMode === 'daily') {
            cbBar.style.width = '100%';
        } else {
            cbBar.style.width = `${cyclePct}%`;
        }
    }
    let cbKwh = document.getElementById('cb-kwh');
    if (cbKwh) {
        let kwhVal = (window.dashboardMode === 'daily') ? dayKwh : cycleKwh;
        cbKwh.textContent = kwhVal.toLocaleString('en-US', {maximumFractionDigits: 1});
    }
    let cbAvg = document.getElementById('cb-avg-day');
    if (cbAvg && window.dashboardMode !== 'daily') cbAvg.textContent = (cycleKwh / cycleDaysElapsed).toLocaleString('en-US', {maximumFractionDigits: 1});
    let cbAvgCost = document.getElementById('cb-avg-cost');
    if (cbAvgCost && window.dashboardMode !== 'daily') cbAvgCost.textContent = (currentBill / cycleDaysElapsed).toLocaleString('en-US', {maximumFractionDigits: 0});
    
    let cbBase = document.getElementById('cb-base');
    if (cbBase) {
        cbBase.textContent = cbd.base.toLocaleString('en-US', {maximumFractionDigits: 0});
        document.getElementById('cb-svc-ft').textContent = (cbd.service + cbd.ft).toLocaleString('en-US', {maximumFractionDigits: 0});
        document.getElementById('cb-vat').textContent = cbd.vat.toLocaleString('en-US', {maximumFractionDigits: 0});
        
        // Update Refined Period UI
        let activeSolarVal = (window.dashboardMode === 'daily') ? daySolarKwh : cycleSolarKwh;
        let activeEveningVal = (window.dashboardMode === 'daily') ? dayEveningKwh : cycleEveningKwh;
        let activeNightVal = (window.dashboardMode === 'daily') ? dayNightKwh : cycleNightKwh;
        let activeTotalVal = (window.dashboardMode === 'daily') ? dayKwh : cycleKwh;
        
        let solarPct = activeTotalVal > 0 ? Math.round((activeSolarVal / activeTotalVal) * 100) : 0;
        let eveningPct = activeTotalVal > 0 ? Math.round((activeEveningVal / activeTotalVal) * 100) : 0;
        let nightPct = activeTotalVal > 0 ? Math.round((activeNightVal / activeTotalVal) * 100) : 0;
        
        document.getElementById('cb-solar-val').textContent = `${activeSolarVal.toFixed(1)} kWh (${solarPct}%)`;
        document.getElementById('cb-evening-val').textContent = `${activeEveningVal.toFixed(1)} kWh (${eveningPct}%)`;
        document.getElementById('cb-night-val').textContent = `${activeNightVal.toFixed(1)} kWh (${nightPct}%)`;
    }

    if (cycleCount > 0) {
        let exactDaysElapsed = isPastCycle ? daysInCycle : (Math.max(1, today.getTime() - startCycle.getTime()) / (24*3600*1000));
        
        let estFullMonthKwhActual = (cycleSimKwh / exactDaysElapsed) * daysInCycle; 
        let estFullMonthKwhImport = (cycleSolarGridKwh / exactDaysElapsed) * daysInCycle; 

        let estFullMonthOnPeakGross = (cycleOnPeakSimKwh / exactDaysElapsed) * daysInCycle;
        let estFullMonthOffPeakGross = (cycleOffPeakSimKwh / exactDaysElapsed) * daysInCycle;
        
        let estFullMonthOnPeakImport = (cycleOnPeakGridKwh / exactDaysElapsed) * daysInCycle;
        let estFullMonthOffPeakImport = (cycleOffPeakGridKwh / exactDaysElapsed) * daysInCycle;
        
        let estFullMonthBillBase = (meterType === 'tou') ? calcMeaTou(estFullMonthOnPeakGross, estFullMonthOffPeakGross) : calcMeaProgressive(estFullMonthKwhActual);
        let estFullMonthBillNet = (meterType === 'tou') ? calcMeaTou(estFullMonthOnPeakImport, estFullMonthOffPeakImport) : calcMeaProgressive(estFullMonthKwhImport);
        
        const estBaselineGrossKwh = (cycleKwh / exactDaysElapsed) * daysInCycle;
        const estBaselineOnPeakGross = (cycleOnPeakKwh / exactDaysElapsed) * daysInCycle;
        const estBaselineOffPeakGross = (cycleOffPeakKwh / exactDaysElapsed) * daysInCycle;
        const baselineGrossBill = (meterType === 'tou') ? calcMeaTou(estBaselineOnPeakGross, estBaselineOffPeakGross) : calcMeaProgressive(estBaselineGrossKwh);

        const estBaselineOnPeakNet = (window.baselineOnPeakImport / exactDaysElapsed) * daysInCycle;
        const estBaselineOffPeakNet = (window.baselineOffPeakImport / exactDaysElapsed) * daysInCycle;
        const estBaselineNetKwh = (window.baselineSolarGridKwh / exactDaysElapsed) * daysInCycle;
        const baselineNetBill = (meterType === 'tou') ? calcMeaTou(estBaselineOnPeakNet, estBaselineOffPeakNet) : calcMeaProgressive(estBaselineNetKwh);

        let activeEstBill;
        let activeEstKwh;
        let activeSolarVal;
        let activeEveningVal;
        let activeNightVal;
        
        let activeSolarBase;
        let activeEveningBase;
        let activeNightBase;

        let breakdownSim = { base: 0, ft: 0, service: 0, vat: 0, total: 0 };

        if (window.dashboardMode === 'daily') {
            const cycleSimBill = (meterType === 'tou') ? calcMeaTou(cycleOnPeakSimKwh, cycleOffPeakSimKwh) : calcMeaProgressive(cycleSimKwh);
            const cycleCbdSim = (meterType === 'tou') ? calcMeaTouBreakdown(cycleOnPeakSimKwh, cycleOffPeakSimKwh) : calcMeaBreakdown(cycleSimKwh);
            if (cycleSimKwh > 0) {
                let ratio = daySimKwh / cycleSimKwh;
                activeEstBill = ratio * cycleSimBill;
                breakdownSim = {
                    base: ratio * cycleCbdSim.base,
                    ft: ratio * cycleCbdSim.ft,
                    service: ratio * cycleCbdSim.service,
                    vat: ratio * cycleCbdSim.vat,
                    total: ratio * cycleCbdSim.total
                };
            } else {
                activeEstBill = 0;
            }
            activeEstKwh = daySimKwh;
            activeSolarVal = daySolarSimTotal;
            activeEveningVal = dayEveSimTotal;
            activeNightVal = dayNiteSimTotal;
            
            activeSolarBase = daySolarKwh;
            activeEveningBase = dayEveningKwh;
            activeNightBase = dayNightKwh;
        } else {
            activeEstBill = estFullMonthBillBase;
            activeEstKwh = estFullMonthKwhActual;
            activeSolarVal = (window.cycleSolarSimTotal / exactDaysElapsed) * daysInCycle;
            activeEveningVal = (window.cycleEveSimTotal / exactDaysElapsed) * daysInCycle;
            activeNightVal = (window.cycleNiteSimTotal / exactDaysElapsed) * daysInCycle;
            
            activeSolarBase = ((window.baselineSolarKwh || 0) / exactDaysElapsed) * daysInCycle;
            activeEveningBase = ((window.baselineEveKwh || 0) / exactDaysElapsed) * daysInCycle;
            activeNightBase = ((window.baselineNiteKwh || 0) / exactDaysElapsed) * daysInCycle;
        }

        let ebEl = document.getElementById('est-bill');
        if (ebEl) ebEl.innerText = activeEstBill.toLocaleString('en-US', {maximumFractionDigits: 0});

        let estKwhEl = document.getElementById('est-kwh');
        if (estKwhEl) {
            document.getElementById('est-kwh').textContent = activeEstKwh.toLocaleString('en-US', {maximumFractionDigits: 0});
            if (window.dashboardMode !== 'daily') {
                document.getElementById('est-avg-day').textContent = (activeEstKwh / daysInCycle).toFixed(1);
                document.getElementById('est-avg-cost').textContent = (activeEstBill / daysInCycle).toFixed(0);
            }
            
            document.getElementById('est-solar-val').textContent = `${activeSolarVal.toFixed(0)} kWh`;
            document.getElementById('est-evening-val').textContent = `${activeEveningVal.toFixed(0)} kWh`;
            document.getElementById('est-night-val').textContent = `${activeNightVal.toFixed(0)} kWh`;

            const updateDeltaLabel = (id, currentVal, baseVal) => {
                let el = document.getElementById(id);
                if (!el) return;
                let diff = currentVal - baseVal;
                if (Math.abs(diff) < 0.1) {
                    el.textContent = "";
                } else {
                    let sign = diff > 0 ? "+" : "";
                    el.textContent = `${sign}${diff.toFixed(1)} kWh`;
                    el.style.color = diff > 0 ? "var(--glow-red)" : "var(--glow-green)";
                    el.style.opacity = "1";
                }
            };

            updateDeltaLabel('day-adj-cost', activeSolarVal, activeSolarBase);
            updateDeltaLabel('evening-adj-cost', activeEveningVal, activeEveningBase);
            updateDeltaLabel('night-adj-cost', activeNightVal, activeNightBase);

            const updateHeaderDelta = (id, currentVal, baseVal) => {
                let el = document.getElementById(id);
                if (!el) return;
                let diff = currentVal - baseVal;
                if (Math.abs(diff) < 2) {
                    el.textContent = "";
                } else {
                    let sign = diff > 0 ? "+" : "";
                    el.textContent = `(${sign}${Math.round(diff).toLocaleString()} ฿)`;
                    el.style.color = diff > 0 ? "var(--glow-red)" : "var(--glow-green)";
                }
            };

            if (window.dashboardMode === 'daily') {
                updateHeaderDelta('est-bill-delta', activeEstBill, currentBill);
            } else {
                updateHeaderDelta('est-bill-delta', estFullMonthBillBase, baselineGrossBill);
            }
            
            let dayNetBill = 0;
            if (window.dashboardMode === 'daily') {
                const cycleNetBill = (meterType === 'tou') ? calcMeaTou(cycleOnPeakGridKwh, cycleOffPeakGridKwh) : calcMeaProgressive(cycleSolarGridKwh);
                if (cycleSolarGridKwh > 0) {
                    dayNetBill = (daySolarGridKwh / cycleSolarGridKwh) * cycleNetBill;
                }
                
                let dayBaselineNetBill = 0;
                const cycleBaselineNetBill = (meterType === 'tou') ? calcMeaTou(window.baselineOnPeakImport, window.baselineOffPeakImport) : calcMeaProgressive(window.baselineSolarGridKwh);
                if (window.baselineSolarGridKwh > 0) {
                    dayBaselineNetBill = (dayBaselineSolarGridKwh / window.baselineSolarGridKwh) * cycleBaselineNetBill;
                }
                
                updateHeaderDelta('solar-bill-delta', dayNetBill, dayBaselineNetBill);
            } else {
                updateHeaderDelta('solar-bill-delta', estFullMonthBillNet, baselineNetBill);
            }
        }

        let bdBase = document.getElementById('bd-base-total');
        if (bdBase) {
            let breakdownSimActive;
            if (window.dashboardMode === 'daily') {
                breakdownSimActive = breakdownSim;
            } else {
                const estFullMonthOnPeakSim = (cycleOnPeakSimKwh / exactDaysElapsed) * daysInCycle;
                const estFullMonthOffPeakSim = (cycleOffPeakSimKwh / exactDaysElapsed) * daysInCycle;
                breakdownSimActive = (meterType === 'tou') ? calcMeaTouBreakdown(estFullMonthOnPeakSim, estFullMonthOffPeakSim) : calcMeaBreakdown(estFullMonthKwhActual);
            }
            bdBase.innerText = breakdownSimActive.base.toLocaleString('en-US', {maximumFractionDigits: 0});
            document.getElementById('bd-svc-ft-total').innerText = (breakdownSimActive.service + breakdownSimActive.ft).toLocaleString('en-US', {maximumFractionDigits: 0});
            document.getElementById('bd-vat-total').innerText = breakdownSimActive.vat.toLocaleString('en-US', {maximumFractionDigits: 0});
        }

        let budgetWarning = document.getElementById('budget-warning');
        if (budgetWarning) {
            let limit = (window.dashboardMode === 'daily') ? 100 : 3000;
            if (activeEstBill > limit) {
                budgetWarning.style.display = 'block';
            } else {
                budgetWarning.style.display = 'none';
            }
        }

        let limit = (window.dashboardMode === 'daily') ? 100 : BUDGET_MONTHLY;
        let budgetPct = Math.round((activeEstBill / limit) * 100);
        document.getElementById('est-budget-pct').textContent = `${budgetPct}%`;
        document.getElementById('est-budget-bar').style.width = `${Math.min(100, budgetPct)}%`;
        if (budgetPct > 100) {
            document.getElementById('est-budget-bar').style.background = 'var(--glow-red)';
        } else {
            document.getElementById('est-budget-bar').style.background = 'linear-gradient(90deg, var(--color-solar), #818cf8)';
        }

        // Right Card (ROI) Updates
        let activeNetBill;
        if (window.dashboardMode === 'daily') {
            activeNetBill = dayNetBill;
        } else {
            activeNetBill = estFullMonthBillNet;
        }
        document.getElementById('solar-est-bill').innerText = activeNetBill.toLocaleString('en-US', {maximumFractionDigits: 0});
        
        let cycleSavings = estFullMonthBillBase - estFullMonthBillNet;
        
        // Payback Calculation
        const investmentIn = document.getElementById('solarInvestment');
        let investment = investmentIn ? parseFloat(investmentIn.value) : 0;
        let paybackEl = document.getElementById('payback-years');
        
        if (paybackEl) {
            if (cycleSavings > 0 && investment > 0) {
                let yearlySavings = cycleSavings * 12;
                let years = investment / yearlySavings;
                paybackEl.innerText = years.toFixed(1) + " ปี";
            } else {
                paybackEl.innerText = "-- ปี";
            }
        }

        let solDailyKwh = document.getElementById('sol-daily-kwh');
        let solDailySaving = document.getElementById('sol-daily-saving');
        let solGridPct = document.getElementById('sol-grid-pct');
        
        let activeSolarProduced = (window.dashboardMode === 'daily') ? daySolarProduced : (estFullMonthKwhActual - estFullMonthKwhImport);
        if (solDailyKwh) {
            solDailyKwh.textContent = activeSolarProduced.toLocaleString('en-US', {maximumFractionDigits: 0}) + ' kWh';
        }
        let activeSavings = (window.dashboardMode === 'daily') ? (activeEstBill - activeNetBill) : (estFullMonthBillBase - estFullMonthBillNet);
        if (solDailySaving) {
            solDailySaving.textContent = activeSavings.toLocaleString('en-US', {maximumFractionDigits: 0}) + ' บาท';
        }
        if (solGridPct) {
            let activeGridPct = 0;
            if (window.dashboardMode === 'daily') {
                activeGridPct = daySimKwh > 0 ? Math.round((daySolarGridKwh / daySimKwh) * 100) : 0;
            } else {
                activeGridPct = estFullMonthKwhActual > 0 ? Math.round((estFullMonthKwhImport / estFullMonthKwhActual) * 100) : 0;
            }
            solGridPct.textContent = activeGridPct + '%';
        }
    }

    let uiTodayInfo = document.getElementById('today-cost');
    if (uiTodayInfo) {
        if (window.dashboardMode === 'daily') {
            uiTodayInfo.innerHTML = `Selected Day: <strong style="color:var(--text-main)">${currentBill.toLocaleString('en-US', {maximumFractionDigits:1})}</strong> THB <span style="opacity:0.5">|</span> <strong style="color: var(--color-solar);">${dayKwh.toLocaleString('en-US', {maximumFractionDigits:1})}</strong> kWh`;
        } else if (todayCount > 0) {
            let estTodayFullKwh = (todayKwh / todayCount) * 96;
            let todayCost = todayKwh * window.blendedPricePerUnit;
            let estTodayFullCost = estTodayFullKwh * window.blendedPricePerUnit;
            let dailyBenchmark = 100; 
            let isOver = estTodayFullCost > dailyBenchmark;
            let estColor = isOver ? 'var(--glow-red)' : 'var(--glow-green)';
            let iconStr = isOver ? 'trending_up' : 'trending_down';
            
            uiTodayInfo.innerHTML = `Today so far: <strong style="color:var(--text-main)">${todayCost.toLocaleString('en-US', {maximumFractionDigits:1})}</strong> THB <span style="opacity:0.5">|</span> <strong style="color: var(--color-solar);">${todayKwh.toLocaleString('en-US', {maximumFractionDigits:1})}</strong> kWh<br>
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
        
        let checkDate = new Date(rDate.getTime() - 7 * 3600 * 1000);
        let y = checkDate.getFullYear();
        let m = String(checkDate.getMonth() + 1).padStart(2, '0');
        let d = String(checkDate.getDate()).padStart(2, '0');
        let dateKey = `${y}-${m}-${d}`;

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
    
    const setAvg = (id, val, pctId, pctVal) => {
        let el = document.getElementById(id);
        if (el) el.textContent = val.toFixed(1) + ' kWh';
        let pctEl = document.getElementById(pctId);
        if (pctEl) pctEl.textContent = `(${pctVal}%)`;
    };
    
    let totalAvg = avgSolar + avgEve + avgNite;
    let solarPct = totalAvg > 0 ? Math.round((avgSolar / totalAvg) * 100) : 0;
    let evePct = totalAvg > 0 ? Math.round((avgEve / totalAvg) * 100) : 0;
    let nitePct = totalAvg > 0 ? Math.round((avgNite / totalAvg) * 100) : 0;
    
    setAvg('hist-solar-avg', avgSolar, 'hist-solar-pct', solarPct);
    setAvg('hist-eve-avg', avgEve, 'hist-eve-pct', evePct);
    setAvg('hist-nite-avg', avgNite, 'hist-nite-pct', nitePct);
    
    let elTotal = document.getElementById('hist-total-avg');
    if (elTotal) elTotal.textContent = totalAvg.toFixed(1) + ' kWh';
}

function renderChart(rows) {
    const timeRange = document.getElementById('timeRangeFilter') ? document.getElementById('timeRangeFilter').value : 'today_yesterday';
    const freq = document.getElementById('freqFilter') ? document.getElementById('freqFilter').value : '15m';
    const metricType = document.getElementById('metricFilter') ? document.getElementById('metricFilter').value : 'power';
    const meterType = document.getElementById('meterTypeFilter')?.value || 'normal';
    
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
            rangeStart = parseLocalDate(dateInput.value);
            if (window.dashboardMode === 'daily') {
                rangeStart.setHours(7,0,0,0);
            } else {
                rangeStart.setHours(0,0,0,0);
            }
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
    let accOnPeakCycle = 0;
    let accOffPeakCycle = 0;
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
        
        let mCost = 0;
        let mRate = 0;

        if (meterType === 'tou') {
            const isPeak = isTouOnPeak(rDate);
            const rate = isPeak ? MEA_TOU_ON_PEAK : MEA_TOU_OFF_PEAK;
            mCost = (addedKwh * rate + addedKwh * MEA_FT) * MEA_VAT;
            mRate = (rate + MEA_FT) * MEA_VAT;
            
            if (isPeak) accOnPeakCycle += addedKwh;
            else accOffPeakCycle += addedKwh;
        } else {
            let costBefore = calcMeaEnergy(accKwhCycle);
            accKwhCycle += addedKwh;
            let costAfter = calcMeaEnergy(accKwhCycle);
            
            mCost = costAfter - costBefore;
            mRate = addedKwh > 0 ? (mCost / addedKwh) : (calcMeaEnergy(accKwhCycle + 1) - calcMeaEnergy(accKwhCycle));
        }
        
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

    let finalBase;
    let finalCompare;
    let finalBattery;
    let baseWatts = [];
    let compareWatts = [];
    let solarData = [];
    let acFinalData = [];

    if (freq === '1m') {
        let uniqueMonthsMap = new Map();
        
        let acLookup15m = {};
        if (window.globalAcRows && window.globalAcRows.length > 0) {
            window.globalAcRows.forEach(r => {
                let d = new Date(r[0]);
                let bucketKey = Math.floor(d.getTime() / (15 * 60000));
                if (!acLookup15m[bucketKey]) acLookup15m[bucketKey] = [];
                acLookup15m[bucketKey].push(parseNumber(r[1]));
            });
        }

        rows.forEach((r, idx) => {
            let rDate = parseRowDate(r[0]);
            
            // Group by Billing Cycle (24th of previous month to 23rd of current month)
            let cycleDate = new Date(rDate);
            if (cycleDate.getDate() >= BILLING_DAY) {
                // Dates on or after the 24th belong to the next billing cycle month
                cycleDate.setMonth(cycleDate.getMonth() + 1);
            }
            let cYear = cycleDate.getFullYear();
            let cMonth = cycleDate.getMonth();
            let key = `${cYear}-${String(cMonth + 1).padStart(2, '0')}`;
            
            if (!uniqueMonthsMap.has(key)) {
                const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                
                // Get cycle start month/year BE
                let sMonthIdx = cMonth - 1;
                let sYear = cYear;
                if (sMonthIdx < 0) {
                    sMonthIdx = 11;
                    sYear = cYear - 1;
                }
                let sBE = (sYear + 543) % 100;
                let eBE = (cYear + 543) % 100;
                let rangeLabel = `รอบ 24 ${THAI_MONTHS[sMonthIdx]} ${sBE} - 23 ${THAI_MONTHS[cMonth]} ${eBE}`;
                
                uniqueMonthsMap.set(key, {
                    label: rangeLabel,
                    powerVals: [],
                    addedKwhVals: [],
                    costVals: [],
                    solarPowerVals: [],
                    solarKwhVals: [],
                    solarCostVals: [],
                    batteryPowerVals: [],
                    batteryCostVals: [],
                    acPowerVals: [],
                    acKwhVals: [],
                    acCostVals: [],
                    rawPowerVals: []
                });
            }
            
            let mData = uniqueMonthsMap.get(key);
            
            let watt = parseNumber(r[4]);
            let addedKwh = parseNumber(r[2]);
            let cost = rowMarginalCost[idx];
            let stateKwh = rowBatteryState[idx];
            let mRate = rowMarginalRate[idx];
            
            let rad = getWeatherInterpolated(rDate, window.meteoMap);
            let cloud = getWeatherInterpolated(rDate, window.meteoCloud);
            if (cloud < 0) cloud = 0;
            let tempTS = new Date(rDate).setMinutes(0, 0, 0);
            let ambTemp = window.meteoTemp && window.meteoTemp[tempTS] !== undefined ? window.meteoTemp[tempTS] : 30;
            let cloudFactor = 1 - (cloud * 0.007);
            let sysEff = getSolarSystemEff(ambTemp);
            let solarEff = rad >= 0 ? (rad / 1000) * cloudFactor : ((rDate.getHours() >= 7 && rDate.getHours() <= 17) ? Math.sin((rDate.getHours() - 7) * Math.PI / 10) : 0);
            let solarProducedKwh = solarPanelKw * sysEff * solarEff * 0.25; 
            
            let solarW = solarProducedKwh * 4000;
            let solarCost = solarProducedKwh * (window.blendedPricePerUnit || 4.2);
            
            let battWh = stateKwh * 1000;
            let battCost = stateKwh * mRate;
            
            let key15m = Math.floor(rDate.getTime() / (15 * 60000));
            let acVals = acLookup15m[key15m] || [];
            let acW = acVals.length > 0 ? acVals.reduce((a,b)=>a+b,0)/acVals.length : null;
            let acKwh = acW !== null ? (acW / 1000 * 0.25) : null;
            let acCost = acW !== null ? (acW * (window.blendedPricePerUnit || 4.2) / 1000 * 0.25) : null;
            
            mData.powerVals.push(watt);
            mData.addedKwhVals.push(addedKwh);
            mData.costVals.push(cost);
            mData.solarPowerVals.push(solarW);
            mData.solarKwhVals.push(solarProducedKwh);
            mData.solarCostVals.push(solarCost);
            mData.batteryPowerVals.push(battWh);
            mData.batteryCostVals.push(battCost);
            if (acW !== null) mData.acPowerVals.push(acW);
            if (acKwh !== null) mData.acKwhVals.push(acKwh);
            if (acCost !== null) mData.acCostVals.push(acCost);
            mData.rawPowerVals.push(watt);
        });
        
        let sortedKeys = Array.from(uniqueMonthsMap.keys()).sort();
        
        labels = [];
        finalBase = [];
        finalCompare = [];
        finalBattery = [];
        acFinalData = [];
        baseWatts = [];
        compareWatts = [];
        solarData = [];
        bucketCount = sortedKeys.length;
        
        sortedKeys.forEach(key => {
            let mData = uniqueMonthsMap.get(key);
            labels.push(mData.label);
            
            if (metricType === 'power') {
                finalBase.push(mData.addedKwhVals.length > 0 ? mData.addedKwhVals.reduce((a,b)=>a+b,0) : null);
                solarData.push(mData.solarKwhVals.length > 0 ? mData.solarKwhVals.reduce((a,b)=>a+b,0) : null);
                finalBattery.push(mData.batteryPowerVals.length > 0 ? mData.batteryPowerVals.reduce((a,b)=>a+b,0)/mData.batteryPowerVals.length : null);
                acFinalData.push(mData.acKwhVals.length > 0 ? mData.acKwhVals.reduce((a,b)=>a+b,0) : null);
            } else {
                finalBase.push(mData.costVals.length > 0 ? mData.costVals.reduce((a,b)=>a+b,0) : null);
                solarData.push(mData.solarCostVals.length > 0 ? mData.solarCostVals.reduce((a,b)=>a+b,0) : null);
                finalBattery.push(mData.batteryCostVals.length > 0 ? mData.batteryCostVals.reduce((a,b)=>a+b,0) : null);
                acFinalData.push(mData.acCostVals.length > 0 ? mData.acCostVals.reduce((a,b)=>a+b,0) : null);
            }
            baseWatts.push(mData.rawPowerVals.length > 0 ? mData.rawPowerVals.reduce((a,b)=>a+b,0)/mData.rawPowerVals.length : 0);
            finalCompare.push(null);
            compareWatts.push(0);
        });
    } else {
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

        if (metricType === 'power') {
            finalBase = baseData.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0)/arr.length : null);
            finalCompare = compareData.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0)/arr.length : null);
            finalBattery = batteryDataBucket.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0)/arr.length : null);
        } else {
            finalBase = baseData.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0) : null);
            finalCompare = compareData.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0) : null);
            finalBattery = batteryDataBucket.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0) : null);
        }

        baseWatts = powerColorDataBucket.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0)/arr.length : 0);
        compareWatts = compareColorDataBucket.map(arr => arr.length > 0 ? arr.reduce((a,b)=>a+b,0)/arr.length : 0);

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
        label: `${labelBase} ${metricType === 'cost' ? 'Cost (THB)' : (freq === '1m' ? 'Energy (kWh)' : 'Power (W)')}`,
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

    if (freq !== '1m') {
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
    }

    // Add Budget/Limit Reference Line
    let budgetLimit = 0;
    if (metricType === 'cost') {
        if (freq === '1m') {
            budgetLimit = BUDGET_MONTHLY;
        } else {
            let dailyGoal = BUDGET_MONTHLY / 30;
            if (freq === '1d') budgetLimit = dailyGoal;
            else if (freq === '1h') budgetLimit = dailyGoal / 24;
            else budgetLimit = dailyGoal / 96;
        }
    } else {
        if (freq === '1m') {
            budgetLimit = BUDGET_MONTHLY / (window.blendedPricePerUnit || 4.4);
        } else {
            budgetLimit = BUDGET_POWER_LIMIT;
        }
    }

    if (budgetLimit > 0) {
        chartDatasets.push({
            label: `Ref Limit (${budgetLimit.toFixed(1)} ${metricType === 'cost' ? 'THB' : (freq === '1m' ? 'kWh' : 'W')})`,
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

    const isDark = document.body.classList.contains('dark-theme');
    const chartLabelColor = isDark ? '#a39587' : '#7c7267';
    const chartTextColor = isDark ? '#f5f1e9' : '#2b2520';
    const chartTooltipBg = isDark ? 'rgba(30, 26, 22, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const chartTooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(139, 115, 85, 0.15)';
    const gridColorX = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(139, 115, 85, 0.05)';
    const gridColorY = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(139, 115, 85, 0.08)';

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
                legend: { position: 'top', labels: { color: chartTextColor, usePointStyle: true, boxWidth: 8, font: { family: 'Inter', weight: '600' } } },
                tooltip: {
                    backgroundColor: chartTooltipBg,
                    titleColor: chartTextColor,
                    bodyColor: chartTextColor,
                    borderColor: chartTooltipBorder,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                let unit = metricType === 'cost' ? ' THB' : (freq === '1m' ? ' kWh' : ' W');
                                label += context.parsed.y.toFixed(metricType === 'cost' ? 2 : 1) + unit;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: gridColorX }, ticks: { color: chartLabelColor, maxTicksLimit: 12, font: { family: 'Inter', weight: '500' } } },
                y: { 
                    grid: { color: gridColorY }, 
                    ticks: { color: chartLabelColor, font: { family: 'Inter', weight: '500' } }, 
                    beginAtZero: true,
                    min: 0,
                    max: freq === '1m' ? undefined : (metricType === 'cost' ? (freq === '1d' ? 200 : CHART_MAX_COST) : CHART_MAX_WATT)
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
            badgeText.innerHTML = `Solar: <strong style="color: var(--glow-green);">ข้อมูลสภาพอากาศจริง</strong> (ERA5 Reanalysis)`;
        } else if (viewingDate > now) {
            badgeIcon.textContent = '🔮';
            badgeText.innerHTML = `Solar: <strong style="color: var(--glow-yellow);">พยากรณ์อากาศล่วงหน้า</strong> (รอบพยากรณ์ ${runStr})`;
        } else {
            badgeIcon.textContent = '🌤️';
            badgeText.innerHTML = `Solar: <strong style="color: var(--color-solar);">พยากรณ์วันนี้</strong> (รอบพยากรณ์ ${runStr})`;
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

function populateBillingCyclesDropdown(sortedRows) {
    const dropdown = document.getElementById('billingCycleFilter');
    if (!dropdown) return;

    // If already populated, don't rebuild unless the length changed
    if (dropdown.options.length > 0) return;

    const cyclesMap = new Map(); // startCycleMs -> { start: Date, end: Date, label: String }
    const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    sortedRows.forEach(r => {
        let rDate = parseRowDate(r[0]);
        let startMs = getBillingCycleStartMs(rDate);
        if (!cyclesMap.has(startMs)) {
            let start = new Date(startMs);
            
            // Calculate cycle end (23rd of the next month)
            let end = new Date(start);
            end.setMonth(end.getMonth() + 1);
            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            
            // Generate BE labels
            let cMonth = end.getMonth();
            let cYear = end.getFullYear();
            let sMonthIdx = start.getMonth();
            let sYear = start.getFullYear();
            
            let sBE = (sYear + 543) % 100;
            let eBE = (cYear + 543) % 100;
            
            let label = `รอบ 24 ${THAI_MONTHS[sMonthIdx]} ${sBE} - 23 ${THAI_MONTHS[cMonth]} ${eBE}`;
            cyclesMap.set(startMs, {
                start: start,
                end: end,
                label: label
            });
        }
    });

    // Sort cycles chronologically descending (latest first)
    const sortedCycles = Array.from(cyclesMap.entries()).sort((a, b) => b[0] - a[0]);

    dropdown.innerHTML = '';
    
    // Determine what is the current cycle of today
    let todayStartMs = getBillingCycleStartMs(new Date());
    
    sortedCycles.forEach(([startMs, info]) => {
        const option = document.createElement('option');
        option.value = startMs;
        
        let label = info.label;
        if (startMs === todayStartMs) {
            label += ' (รอบปัจจุบัน)';
        }
        option.textContent = label;
        
        if (startMs === todayStartMs) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });

    dropdown.addEventListener('change', () => {
        calculateBillingCosts(window.globalRawRows);
    });
}
