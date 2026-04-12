// --- SILNIK DŹWIĘKOWY (Web Audio API) ---
window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

window.playSound = function(type) {
    // Przeglądarki wymagają interakcji użytkownika przed odtworzeniem dźwięku
    if(window.audioCtx.state === 'suspended') window.audioCtx.resume();
    
    const osc = window.audioCtx.createOscillator();
    const gainNode = window.audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(window.audioCtx.destination);
    
    const now = window.audioCtx.currentTime;
    
    if (type === 'scan') {
        // Krótki, hakerski "skan"
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now); // Głośność
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'strong_buy') {
        // Podwójny, agresywny alarm sukcesu
        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.setValueAtTime(1500, now + 0.15);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.setValueAtTime(0, now + 0.1);
        gainNode.gain.setValueAtTime(0.05, now + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'error') {
        // Głuchy dźwięk błędu
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
};

// --- NARZĘDZIA GLOBALNE ---
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ph-info';
    if(type === 'success') icon = 'ph-check-circle';
    if(type === 'error') icon = 'ph-warning-circle';
    if(type === 'warning') icon = 'ph-warning';

    toast.innerHTML = `<i class="ph ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); 
    }, 3000);
};

window.animateCounter = function(elementId, endValue, duration = 1500, prefix = '', suffix = '', decimals = 0) {
    const obj = document.getElementById(elementId);
    if (!obj) return;
    
    let start = 0;
    const currentText = obj.innerText.replace(/[^\d.-]/g, '');
    if(currentText && !isNaN(currentText)) start = parseFloat(currentText);
    
    if (start === endValue) {
        obj.innerText = prefix + endValue.toFixed(decimals) + suffix;
        return;
    }

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = start + (endValue - start) * easeOut;
        
        let displayValue = current;
        if(Math.abs(displayValue) < 0.01) displayValue = 0;

        obj.innerText = prefix + displayValue.toFixed(decimals) + suffix;
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerText = prefix + endValue.toFixed(decimals) + suffix; 
        }
    };
    window.requestAnimationFrame(step);
};

// --- LOGIKA INTERFEJSU (UI) ---
document.addEventListener("DOMContentLoaded", () => {
    
    const navLinks = document.querySelectorAll('.nav-links a');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            if(link.classList.contains('active')) return;

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            tabContents.forEach(tab => {
                tab.style.opacity = 0;
                tab.style.transform = "translateY(10px)";
                
                setTimeout(() => {
                    tab.classList.remove('active');
                    tab.style.display = "none";
                    
                    if(tab.id === targetId) {
                        tab.style.display = "block";
                        if(targetId === 'analyzer' && typeof syncMainStats === 'function') syncMainStats();

                        setTimeout(() => {
                            tab.classList.add('active');
                            tab.style.opacity = 1;
                            tab.style.transform = "translateY(0)";
                        }, 50);
                    }
                }, 200); 
            });
        });
    });

    const settingsBtn = document.getElementById('settings-btn');
    const closeSettings = document.getElementById('close-settings');
    const settingsPanel = document.getElementById('settings-panel');
    const overlay = document.getElementById('overlay');

    function openSettings() {
        if(overlay) overlay.style.display = "block";
        setTimeout(() => {
            if(settingsPanel) settingsPanel.classList.add('open');
            if(overlay) overlay.classList.add('active');
        }, 10);
    }

    function closeSettingsPanel() {
        if(settingsPanel) settingsPanel.classList.remove('open');
        if(overlay) overlay.classList.remove('active');
        setTimeout(() => {
            if(overlay && !settingsPanel.classList.contains('open')) overlay.style.display = "none";
        }, 400);
    }

    if(settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if(closeSettings) closeSettings.addEventListener('click', closeSettingsPanel);
    if(overlay) overlay.addEventListener('click', closeSettingsPanel);

    const thresholdSlider = document.getElementById('strongBuyThreshold');
    const thresholdValue = document.getElementById('thresholdValue');
    const savedThreshold = localStorage.getItem('sniperThreshold') || '6';
    
    if(thresholdSlider && thresholdValue) {
        thresholdSlider.value = savedThreshold;
        thresholdValue.innerText = `${savedThreshold} / 7`;

        thresholdSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            thresholdValue.innerText = `${val} / 7`;
            localStorage.setItem('sniperThreshold', val);
        });
    }
    
    // --- Zaawansowane Filtry Skanera ---
    const filters = ['filterLiqMc', 'filterVolLiq', 'filterChange', 'filterVol', 'filterAge'];
    const defaultFilters = { filterLiqMc: 2, filterVolLiq: 5, filterChange: 0.5, filterVol: 1000, filterAge: 60 };

    filters.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            // Załaduj z pamięci lub użyj domyślnej
            el.value = localStorage.getItem(id) || defaultFilters[id];
            
            // Zapisz przy każdej zmianie
            el.addEventListener('change', (e) => {
                localStorage.setItem(id, e.target.value);
                if(typeof showToast === 'function') showToast("Zaktualizowano filtr skanera.", "success");
            });
        }
    });

    const themeBtns = document.querySelectorAll('.theme-btn');
    const savedTheme = localStorage.getItem('sniperTheme') || 'cyber';

    if(savedTheme !== 'cyber') document.body.setAttribute('data-theme', savedTheme);

    themeBtns.forEach(btn => {
        if(btn.getAttribute('data-theme') === savedTheme) {
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }

        btn.addEventListener('click', () => {
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const theme = btn.getAttribute('data-theme');
            if (theme === 'cyber') document.body.removeAttribute('data-theme');
            else document.body.setAttribute('data-theme', theme);
            
            localStorage.setItem('sniperTheme', theme); 
        });
    });

    // --- COMPACT / MOBILE VIEW LOGIC ---
    const mobileToggle = document.getElementById('forceMobileToggle');
    const floatingSettingsBtn = document.getElementById('floating-settings');
    const savedMobileView = localStorage.getItem('sniperMobileView') === 'true';

    function applyMobileView(isMobile) {
        if (isMobile) {
            document.body.classList.add('force-mobile');
        } else {
            document.body.classList.remove('force-mobile');
        }
        if(mobileToggle) mobileToggle.checked = isMobile;
    }

    applyMobileView(savedMobileView);

    if (mobileToggle) {
        mobileToggle.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            localStorage.setItem('sniperMobileView', isChecked);
            applyMobileView(isChecked);
        });
    }

    if (floatingSettingsBtn) {
        floatingSettingsBtn.addEventListener('click', openSettings);
    }
});
