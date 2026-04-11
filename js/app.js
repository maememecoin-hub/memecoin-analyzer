// --- NARZĘDZIA GLOBALNE ---

// 1. Toasty (Powiadomienia)
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

// 2. Animowane Liczniki (Nowość!)
window.animateCounter = function(elementId, endValue, duration = 1500, prefix = '', suffix = '', decimals = 0) {
    const obj = document.getElementById(elementId);
    if (!obj) return;
    
    // Próbujemy wyciągnąć obecną wartość (żeby animacja startowała od tego, co już jest na ekranie)
    let start = 0;
    const currentText = obj.innerText.replace(/[^\d.-]/g, '');
    if(currentText && !isNaN(currentText)) start = parseFloat(currentText);
    
    // Jeśli nie ma zmiany, nie animujemy
    if (start === endValue) {
        obj.innerText = prefix + endValue.toFixed(decimals) + suffix;
        return;
    }

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // Efekt zwalniania na końcu (ease-out expo)
        const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = start + (endValue - start) * easeOut;
        
        // Zapobiega "minusowemu zeru" itp.
        let displayValue = current;
        if(Math.abs(displayValue) < 0.01) displayValue = 0;

        obj.innerText = prefix + displayValue.toFixed(decimals) + suffix;
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerText = prefix + endValue.toFixed(decimals) + suffix; // Gwarancja precyzji na końcu
        }
    };
    window.requestAnimationFrame(step);
};

// --- LOGIKA INTERFEJSU (UI) ---
document.addEventListener("DOMContentLoaded", () => {
    
    // Obsługa zakładek (Tabs)
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

    // Obsługa panelu ustawień
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

    // Suwak Threshold
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

    // Motywy (Theme Switcher)
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
});
