// --- LOGIKA DZIENNIKA (journal.js) ---
var startingCapital = 1000;
var trades = [];

const startingCapitalInput = document.getElementById('startingCapital');
const currentCapitalDisplay = document.getElementById('currentCapital');
const totalPnlDisplay = document.getElementById('totalPnl');
const pnlCard = document.getElementById('pnlCard');
const journalList = document.getElementById('journalList');

// Zapisywanie Starting Capital do bazy przy zmianie
if(startingCapitalInput) {
    startingCapitalInput.addEventListener('change', async (e) => {
        const newVal = parseFloat(e.target.value);
        const { error } = await db.from('user_settings').update({ starting_capital: newVal }).eq('id', 1);
        if(!error) {
            startingCapital = newVal;
            updateJournalStats();
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
    document.getElementById('winRate').innerText = `${winRate}%`;
    document.getElementById('winLossCount').innerText = `${won}W / ${lost}L`;

    renderTradesList();
}

function renderTradesList() {
    if(!journalList) return;
    journalList.innerHTML = trades.map(trade => `
        <div class="journal-item" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="flex: 2; display: flex; align-items: center; gap: 10px;">
                <i class="ph ${trade.pnl >= 0 ? 'ph-rocket' : 'ph-ghost'}" style="font-size: 1.5rem; color: ${trade.pnl >= 0 ? 'var(--accent-blue)' : 'var(--text-muted)'};"></i>
                <div>
                    <div style="font-weight: bold;">${trade.token}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${trade.date}</div>
                </div>
            </div>
            <div style="flex: 1; text-align: right; font-weight: bold; color: ${trade.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">${trade.pnl >= 0 ? '+' : ''}$${trade.pnl}</div>
            <div style="flex: 1; text-align: right;"><span class="badge">CLOSED</span></div>
        </div>
    `).join("");
}

async function addNewTrade() {
    let tokenName = prompt("Nazwa tokena:");
    let pnlInput = prompt("PnL (np. 150 lub -50):");
    if (!tokenName || pnlInput === null) return;

    let pnl = Number(pnlInput);
    let date = new Date().toLocaleString('pl-PL');

    const { error } = await db.from('trades').insert([
        { token_name: tokenName.toUpperCase(), pnl: pnl, formatted_date: date }
    ]);

    if (error) alert("Błąd zapisu: " + error.message);
    else loadTradesFromSupabase();
}

async function loadTradesFromSupabase() {
    // Pobierz Starting Capital
    const { data: settings } = await db.from('user_settings').select('starting_capital').eq('id', 1).single();
    if (settings) {
        startingCapital = parseFloat(settings.starting_capital);
        if(startingCapitalInput) startingCapitalInput.value = startingCapital;
    }

    // Pobierz Trady
    const { data, error } = await db.from('trades').select('*').order('created_at', { ascending: false });
    if (!error && data) {
        trades = data.map(d => ({ token: d.token_name, pnl: parseFloat(d.pnl), date: d.formatted_date }));
        updateJournalStats();
    }
}

document.addEventListener("DOMContentLoaded", loadTradesFromSupabase);
