document.addEventListener("DOMContentLoaded", () => {
    // --- Obsługa zakładek (Tabs) ---
    const navLinks = document.querySelectorAll('.nav-links a');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetId = link.getAttribute('data-target');
            
            // Jeśli już jesteśmy na tej zakładce, nic nie rób
            if(link.classList.contains('active')) return;

            // Zmiana klas w nawigacji
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Ukrywanie starych i pokazywanie nowych zakładek
            tabContents.forEach(tab => {
                tab.style.opacity = 0;
                tab.style.transform = "translateY(10px)";
                
                setTimeout(() => {
                    tab.classList.remove('active');
                    tab.style.display = "none";
                    
                    if(tab.id === targetId) {
                        tab.style.display = "block";
                        
                        // Jeśli wracamy do analizatora, odświeżamy statystyki z bazy
                        if(targetId === 'analyzer' && typeof syncMainStats === 'function') {
                            syncMainStats();
                        }

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
    
    // --- GLOBALNA FUNKCJA TOASTÓW ---
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

    // Animacja wjazdu
    setTimeout(() => toast.classList.add('show'), 10);

    // Automatyczne usuwanie po 3 sekundach
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400); // Czekamy na koniec animacji wyjazdu
    }, 3000);
};

    // --- Obsługa panelu ustawień ---
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
        
        // Czekamy na koniec animacji wysuwania, zanim schowamy overlay całkowicie
        setTimeout(() => {
            if(overlay && !settingsPanel.classList.contains('open')){
                overlay.style.display = "none";
            }
        }, 400);
    }

    if(settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if(closeSettings) closeSettings.addEventListener('click', closeSettingsPanel);
    if(overlay) overlay.addEventListener('click', closeSettingsPanel);

    // --- LOGIKA SUWAKA (Threshold Slider) ---
    const thresholdSlider = document.getElementById('strongBuyThreshold');
    const thresholdValue = document.getElementById('thresholdValue');

    // Wczytaj zapisaną wartość z pamięci (domyślnie 6)
    const savedThreshold = localStorage.getItem('sniperThreshold') || '6';
    if(thresholdSlider && thresholdValue) {
        thresholdSlider.value = savedThreshold;
        thresholdValue.innerText = `${savedThreshold} / 7`;

        thresholdSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            thresholdValue.innerText = `${val} / 7`;
            localStorage.setItem('sniperThreshold', val); // Zapis do pamięci przeglądarki
        });
    }

    // --- LOGIKA MOTYWÓW (Theme Switcher) ---
    const themeBtns = document.querySelectorAll('.theme-btn');
    const savedTheme = localStorage.getItem('sniperTheme') || 'cyber';

    // Aplikuj zapamiętany motyw od razu po załadowaniu
    if(savedTheme !== 'cyber') {
        document.body.setAttribute('data-theme', savedTheme);
    }

    themeBtns.forEach(btn => {
        // Zaznacz odpowiedni przycisk na start
        if(btn.getAttribute('data-theme') === savedTheme) {
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }

        // Obsługa kliknięcia
        btn.addEventListener('click', () => {
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const theme = btn.getAttribute('data-theme');
            
            // Cyberpunk (domyślny) usuwa atrybut, inne go dodają
            if (theme === 'cyber') {
                document.body.removeAttribute('data-theme');
            } else {
                document.body.setAttribute('data-theme', theme);
            }
            
            localStorage.setItem('sniperTheme', theme); // Zapis do pamięci
        });
    });
});
