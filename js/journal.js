// --- LOGIKA DZIENNIKA I KAPITAŁU ---
let startingCapital = 1000;
let trades = []; // Tu wpadają zakończone pozycje z bazy

const startingCapitalInput = document.getElementById('startingCapital');
const currentCapitalDisplay = document.getElementById('currentCapital');
const totalPnlDisplay = document.getElementById('totalPnl');
const pnlCard = document.getElementById('pnlCard');
const pnlIcon = document.getElementById('pnlIcon');
const journalList = document.getElementById('journalList');

if(startingCapitalInput) {
    // Kiedy zmieniasz wartość kapitału startowego, przelicz wszystko
    startingCapitalInput.addEventListener('input', (e) => {
        startingCapital = Number(e.target.value) || 0;
        updateJournalStats();
    });
}

// Funkcja przeliczająca matematykę i renderująca listę
function updateJournalStats() {
    if(!currentCapitalDisplay) return;

    let totalPnl = 0;
    let won = 0;
    let lost = 0;

    // Zliczamy PnL z każdej transakcji pobranej z bazy
    trades.forEach(trade => {
        totalPnl += trade.pnl;
        if (trade.pnl > 0) won++;
        else if (trade.pnl < 0) lost++;
    });

    // Matematyka kapitału
    let currentCapital = startingCapital + totalPnl;

    // --- Aktualizacja UI Statystyk ---
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

    renderTradesList();
}

function renderTradesList() {
    if(!journalList) return;
    
    if(trades.length === 0) {
        journalList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">Brak zapisanych transakcji w bazie.</div>`;
        return;
    }

    journalList.innerHTML = trades.map(trade => {
        let isProfit = trade.pnl >= 0;
        let colorClass = isProfit ? 'var(--accent-green)' : 'var(--accent-red)';
        let sign = isProfit ? '+' : '';
        let icon = isProfit ? 'ph-rocket' : 'ph-ghost';
        let iconColor = isProfit ? 'var(--accent-blue)' : 'var(--text-muted)';

        return `
        <div class="journal-item" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="flex: 2; display: flex; align-items: center; gap: 10px;">
                <i class="ph ${icon}" style="color: ${iconColor}; font-size: 1.5rem;"></i>
                <div>
                    <div style="font-weight: bold;">${trade.token}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${trade.date}</div>
                </div>
            </div>
            <div class="j-col" style="flex: 1; text-align: right; color: var(--text-muted);">--</div>
            <div class="j-col" style="flex: 1; text-align: right; color: var(--text-muted);">--</div>
            <div class="j-col" style="flex: 1; text-align: right; color: var(--text-muted);">--</div>
            <div class="j-col" style="flex: 1; text-align: right; font-weight: bold; color: ${colorClass};">${sign}$${trade.pnl}</div>
            <div style="flex: 1; text-align: right;"><span class="badge" style="background: rgba(255,255,255,0.1); color: var(--text-muted);">CLOSED</span></div>
        </div>
        `;
    }).join("");
}

// Funkcja dodająca pozycję do bazy Supabase
async function addNewTrade() {
    let tokenName = prompt("Podaj nazwę tokena (np. SHIBA):");
    if (!tokenName) return;
    
    let pnlInput = prompt("Ile $ zyskałeś lub straciłeś? (Wpisz np. 150 lub -50):");
    if (pnlInput === null || pnlInput === "") return;

    let pnl = Number(pnlInput);
    if (isNaN(pnl)) return alert("Błędna liczba!");

    let date = new Date();
    let formattedDate = date.toLocaleDateString('pl-PL') + ' ' + date.toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'});

    // WYŚLIJ DO SUPABASE (Używamy zmiennej 'db'!)
    const { data, error } = await db
        .from('trades')
        .insert([
            { token_name: tokenName.toUpperCase(), pnl: pnl, formatted_date: formattedDate }
        ]);

    if (error) {
        console.error("Błąd zapisu:", error);
        alert("Błąd bazy danych: " + error.message);
    } else {
        // Po sukcesie odśwież dane z bazy
        loadTradesFromSupabase();
    }
}

// Funkcja do pobierania danych przy starcie strony
async function loadTradesFromSupabase() {
    // Używamy zmiennej 'db'!
    const { data, error } = await db
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false });

    if (!error && data) {
        trades = data.map(d => ({
            token: d.token_name,
            pnl: parseFloat(d.pnl),
            date: d.formatted_date
        }));
        updateJournalStats();
    } else if (error) {
        console.error("Błąd pobierania:", error);
    }
}

// Inicjalizacja przy ładowaniu
document.addEventListener("DOMContentLoaded", () => {
    loadTradesFromSupabase();
});
