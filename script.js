document.addEventListener("DOMContentLoaded", () => {
    
    // --- OBSŁUGA ZAKŁADEK (TABS) ---
    const navLinks = document.querySelectorAll('.nav-links a');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Usunięcie klasy active ze wszystkich linków i dodanie do klikniętego
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Pobranie celu zakładki
            const targetId = link.getAttribute('data-target');

            // Animacja ukrywania obecnych zakładek
            tabContents.forEach(tab => {
                tab.style.opacity = 0;
                tab.style.transform = "translateY(10px)";
                
                // Po zakończeniu animacji opacity, ukryj z DOM i pokaż nową
                setTimeout(() => {
                    tab.classList.remove('active');
                    tab.style.display = "none";
                    
                    if(tab.id === targetId) {
                        tab.style.display = "block";
                        // Krótkie opóźnienie przed animacją wejścia dla płynności
                        setTimeout(() => {
                            tab.classList.add('active');
                            tab.style.opacity = 1;
                            tab.style.transform = "translateY(0)";
                        }, 50);
                    }
                }, 300); // Czas trwania dopasowany do transition w CSS (0.4s ale ucinamy lekko dla responsywności)
            });
        });
    });

    // --- OBSŁUGA WYSUWANYCH USTAWIEŃ ---
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettings = document.getElementById('close-settings');
    const settingsPanel = document.getElementById('settings-panel');
    const overlay = document.getElementById('overlay');

    function openSettings() {
        settingsPanel.classList.add('open');
        overlay.classList.add('active');
    }

    function closeSettingsPanel() {
        settingsPanel.classList.remove('open');
        overlay.classList.remove('active');
        // Usunięcie nakładki po zakończeniu animacji CSS
        setTimeout(() => {
            if(!settingsPanel.classList.contains('open')){
                overlay.style.display = "none";
            }
        }, 300);
    }

    settingsBtn.addEventListener('click', () => {
        overlay.style.display = "block";
        setTimeout(openSettings, 10);
    });

    closeSettings.addEventListener('click', closeSettingsPanel);
    overlay.addEventListener('click', closeSettingsPanel);
});
