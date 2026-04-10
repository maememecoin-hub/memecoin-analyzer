// --- LOGIKA DZIENNIKA (journal.js) ---
let startingCapital = 1000;
let trades = [];

const startingCapitalInput = document.getElementById('startingCapital');
const currentCapitalDisplay = document.getElementById('currentCapital');
const totalPnlDisplay = document.getElementById('totalPnl');
const pnlCard = document.getElementById('pnlCard');
const journalList = document.getElementById('journalList');

// Zapisywanie Starting Capital do bazy przy zmianie
if(startingCapitalInput) {
    startingCapitalInput.addEventListener('change', async (e) => {
        const newVal = parseFloat(e.target.value);
        if (isNaN(newVal)) return;

        const { error } = await db.from('user_settings').update({ starting_capital: newVal }).eq('id', 1);
        if(!error) {
            startingCapital = newVal;
            updateJournalStats();
            // Odśwież też statystyki na stronie głównej jeśli funkcja istnieje
            if(typeof syncMainStats === 'function') syncMainStats();
        }
    });
}

function updateJournalStats() {
    if(!currentCapitalDisplay) return;
    
    let totalPnl = 0;
    let won = 0;
    let lost = 0;

    trades.forEach(trade => {
        totalPnl += trade.pnl;
        if (trade.pnl > 0) won++;
        else if (trade.pnl < 0) lost++;
    });

    let currentCapital = startingCapital + totalPnl;
    currentCapitalDisplay.innerText = `$${currentCapital.toFixed(2)}`;
    
    if (totalPnl >= 0) {
        totalPnlDisplay.innerText = `+$${totalPnl.toFixed(2)}`;
        totalPnlDisplay.style.color = 'var(--accent-green)';
        if(pnlCard) pnlCard.className = 'stat-card glow-green';
    } else {
        totalPnlDisplay.innerText = `-$${Math.abs(totalPnl).toFixed(2)}`;
        totalPnlDisplay.style.color = 'var(--accent-red)';
        if(pnlCard) pnlCard.className = 'stat-card glow-red';
    }
    
    let totalClosed = won + lost;
    let winRate = totalClosed > 0 ? Math.round((won / totalClosed) * 100) : 0;
    
    const winRateEl = document.getElementById('winRate');
    const winLossEl = document.getElementById('winLossCount');
    if(winRateEl) winRateEl.innerText = `${winRate}%`;
    if(winLossEl) winLossEl.innerText = `${won}W / ${lost}L`;

    renderTradesList();
}

// RENDEROWANIE LISTY
function renderTradesList() {
    if(!journalList) return;
    
    if (trades.length === 0) {
        journalList.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">Brak zapisanych transakcji.</div>`;
        return;
    }

    journalList.innerHTML = trades.map(trade => `
        <div class="journal-item" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="flex: 2; display: flex; align-items: center; gap: 12px;">
                <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px; display: flex; align-items: center;">
                    <i class="ph ${trade.pnl >= 0 ? 'ph-trend-up' : 'ph-trend-down'}" style="font-size: 1.2rem; color: ${trade.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};"></i>
                </div>
                <div>
                    <div style="font-weight: bold; font-size: 0.95rem;">${trade.token}</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">${trade.date}</div>
                </div>
            </div>
            
            <div style="flex: 1; text-align: right; font-weight: bold; color: ${trade.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">
                ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}
            </div>
            
            <div style="flex: 1; text-align: right; display: flex; justify-content: flex-end; align-items: center; gap: 15px;">
                <span class="badge" style="background: rgba(255,255,255,0.05); font-size: 0.6rem;">CLOSED</span>
                <button onclick="deleteTrade('${trade.id}')" class="trash-btn">
                    <i class="ph ph-trash"></i>
                </button>
            </div>
        </div>
    `).join("");
}

// FUNKCJA USUWANIA
window.deleteTrade = async function(id) {
    if(!confirm("Usuń transakcję z historii?")) return;

    const { error } = await db.from('trades').delete().eq('id', id);

    if (error) {
        alert("Błąd usuwania: " + error.message);
    } else {
        await loadTradesFromSupabase();
        if(typeof syncMainStats === 'function') syncMainStats();
    }
}

// FUNKCJA DODAWANIA
window.addNewTrade = async function() {
    const tokenName = prompt("Nazwa tokena (np. PEPE):");
    if (!tokenName) return;

    const pnlInput = prompt("PnL w USD (np. 150 lub -50):");
    if (pnlInput === null || pnlInput === "" || isNaN(pnlInput)) {
        alert("Podaj poprawną liczbę!");
        return;
    }

    const pnl = parseFloat(pnlInput);
    const date = new Date().toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const { error } = await db.from('trades').insert([
        { token_name: tokenName.toUpperCase(), pnl: pnl, formatted_date: date }
    ]);

    if (error) {
        alert("Błąd zapisu: " + error.message);
    } else {
        await loadTradesFromSupabase();
        if(typeof syncMainStats === 'function') syncMainStats();
    }
}

async function loadTradesFromSupabase() {
    try {
        // Pobierz Starting Capital
        const { data: settings } = await db.from('user_settings').select('starting_capital').eq('id', 1).single();
        if (settings) {
            startingCapital = parseFloat(settings.starting_capital);
            if(startingCapitalInput) startingCapitalInput.value = startingCapital;
        }

        // Pobierz Tradery
        const { data, error } = await db.from('trades').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            trades = data.map(d => ({ 
                id: d.id,
                token: d.token_name, 
                pnl: parseFloat(d.pnl), 
                date: d.formatted_date 
            }));
            updateJournalStats();
        }
    } catch (e) {
        console.error("Błąd ładowania danych:", e);
    }
}

document.addEventListener("DOMContentLoaded", loadTradesFromSupabase);
