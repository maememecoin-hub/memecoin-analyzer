document.addEventListener("DOMContentLoaded", () => {
    // --- Obsługa zakładek (Tabs) ---
    const navLinks = document.querySelectorAll('.nav-links a');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetId = link.getAttribute('data-target');

            tabContents.forEach(tab => {
                tab.style.opacity = 0;
                tab.style.transform = "translateY(10px)";
                
                setTimeout(() => {
                    tab.classList.remove('active');
                    tab.style.display = "none";
                    
                    if(tab.id === targetId) {
                        tab.style.display = "block";
                        setTimeout(() => {
                            tab.classList.add('active');
                            tab.style.opacity = 1;
                            tab.style.transform = "translateY(0)";
                        }, 50);
                    }
                }, 300);
            });
        });
    });

    // --- Obsługa panelu ustawień ---
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
        setTimeout(() => {
            if(!settingsPanel.classList.contains('open')){
                overlay.style.display = "none";
            }
        }, 300);
    }

    if(settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            overlay.style.display = "block";
            setTimeout(openSettings, 10);
        });
    }

    if(closeSettings) closeSettings.addEventListener('click', closeSettingsPanel);
    if(overlay) overlay.addEventListener('click', closeSettingsPanel);
});
