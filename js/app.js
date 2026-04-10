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
                }, 200); // Nieco szybciej niż wcześniej (było 300)
            });
        });
    });

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

    // Event Listeners dla ustawień
    if(settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if(closeSettings) closeSettings.addEventListener('click', closeSettingsPanel);
    if(overlay) overlay.addEventListener('click', closeSettingsPanel);
});
