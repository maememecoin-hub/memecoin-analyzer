// --- LOGIKA DZIENNIKA I KAPITAŁU ---
let startingCapital = 1000;
let trades = []; // Tu wpadają zakończone pozycje

const startingCapitalInput = document.getElementById('startingCapital');
const currentCapitalDisplay = document.getElementById('currentCapital');
const totalPnlDisplay = document.getElementById('totalPnl');
const pnlCard = document.getElementById('pnlCard');
const pnlIcon = document.getElementById('pnlIcon');

if(startingCapitalInput) {
    // Kiedy zmieniasz wartość kapitału startowego, przelicz wszystko
    startingCapitalInput.addEventListener('input', (e) => {
        startingCapital = Number(e.target.value) || 0;
        updateJournalStats();
    });
}

// Funkcja przeliczająca matematykę
function updateJournalStats() {
    if(!currentCapitalDisplay) return; // Zapobiega błędom, jeśli elementu nie ma

    let totalPnl = 0;
    let won = 0;
    let lost = 0;

    // Zliczamy PnL z każdej transakcji
    trades.forEach(trade => {
        let pnl = trade.returned - trade.invested;
        totalPnl += pnl;
        
        if (pnl > 0) won++;
        else if (pnl < 0) lost++;
    });

    // Aktualny kapitał to Baza + Zysk/Strata
    let currentCapital = startingCapital + totalPnl;

    // --- Aktualizacja Wyglądu ---
    currentCapitalDisplay.innerText = `$${currentCapital.toFixed(2)}`;
    
    if (totalPnl >= 0) {
        totalPnlDisplay.innerText = `+$${totalPnl.toFixed(2)}`;
        totalPnlDisplay.style.color = 'var(--accent-green)';
        if(pnlCard) pnlCard.className = 'stat-card glow-green';
        if(pnlIcon) {
            pnlIcon.className = 'stat-icon green';
            pnlIcon.innerHTML = '<i class="ph ph-trend-up"></i>';
        }
    } else {
        totalPnlDisplay.innerText = `-$${Math.abs(totalPnl).toFixed(2)}`;
        totalPnlDisplay.style.color = 'var(--accent-red)';
        if(pnlCard) pnlCard.className = 'stat-card glow-red';
        if(pnlIcon) {
            pnlIcon.className = 'stat-icon red';
            pnlIcon.innerHTML = '<i class="ph ph-trend-down"></i>';
        }
    }
    
    // Win Rate
    let totalClosed = won + lost;
    let winRate = totalClosed > 0 ? Math.round((won / totalClosed) * 100) : 0;
    
    const winRateEl = document.getElementById('winRate');
    const winLossEl = document.getElementById('winLossCount');
    
    if(winRateEl) winRateEl.innerText = `${winRate}%`;
    if(winLossEl) winLossEl.innerText = `${won}W / ${lost}L`;
}

// Testowa funkcja dodająca pozycję (podpięta pod guzik ADD NEW TRADE)
function addNewTrade() {
    let investedInput = prompt("Ile $ zainwestowałeś w token?");
    if (investedInput === null || investedInput === "") return;
    
    let returnedInput = prompt("Ile $ z tego wyjąłeś? (Wpisz 0 jeśli rugpull, wpisz więcej jeśli zysk)");
    if (returnedInput === null || returnedInput === "") return;

    let invested = Number(investedInput);
    let returned = Number(returnedInput);

    if (isNaN(invested) || isNaN(returned)) {
        alert("Proszę wpisać poprawne liczby!");
        return;
    }

    // Dodaj do pamięci i przelicz
    trades.push({ invested: invested, returned: returned });
    updateJournalStats();
}

// Odpalenie obliczeń przy starcie strony (jeśli elementy istnieją)
document.addEventListener("DOMContentLoaded", () => {
    updateJournalStats();
});
