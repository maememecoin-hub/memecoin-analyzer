// --- LOGIKA ANALIZATORA I SUPABASE (analyzer.js) ---
let tokenHistory = [];

function formatMoney(num) {
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
}

// 1. Zwiększanie licznika skanowań
async function incrementScanCount() {
    try {
        const { data, error } = await db.from('user_settings').select('tokens_analyzed').eq('id', 1).single();
        if (!error && data) {
            let newCount = data.tokens_analyzed + 1;
            await db.from('user_settings').update({ tokens_analyzed: newCount }).eq('id', 1);
            const counterEl = document.getElementById('main-tokens-count');
            if(counterEl) counterEl.innerText = newCount;
        }
    } catch (e) { console.error(e); }
}

// 2. Główna funkcja analizy
async function analyzeToken() {
    const addressInput = document.getElementById("tokenInput");
    if(!addressInput) return;
    const address = addressInput.value.trim();
    const resultBox = document.getElementById("analyzerResultBox");
    if (!address) return alert("Paste token CA!");

    resultBox.style.display = "block";
    resultBox.innerHTML = `<div style="text-align: center; color: var(--accent-blue); padding: 20px;"><i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i><br>Scanning...</div>`;

    try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        const data = await res.json();
        const pair = data.pairs ? data.pairs[0] : null;

        if (pair) {
            const fdv = pair.fdv || 0;
            const liquidity = pair.liquidity?.usd || 0;
            const volume = pair.volume?.h24 || 0;
            const change1m = pair.priceChange?.m1 || 0;
            const score = Math.floor(Math.random() * 4) + 3; // Tutaj Twoja logika score

            const decision = score >= 6 ? "STRONG BUY" : (score >= 4 ? "SCALP" : "SKIP");
            const colorClass = score >= 6 ? "green" : (score >= 4 ? "blue" : "red");

            resultBox.innerHTML = `
                <div class="result-header">
                    <div class="token-name"><i class="ph ph-diamond"></i> ${pair.baseToken.name} <span>$${pair.baseToken.symbol}</span></div>
                    <div class="badge ${colorClass}">${decision}</div>
                </div>
                <div class="result-body">
                    <div class="score"><span class="score-big" style="color: var(--accent-${colorClass})">${score}</span>/7</div>
                    <div class="token-stats">MC: ${formatMoney(fdv)} | LIQ: ${formatMoney(liquidity)} | VOL: ${formatMoney(volume)}</div>
                </div>`;
            
            addToHistory(pair.baseToken.symbol, decision, colorClass, "↗");
            incrementScanCount();
        }
    } catch (e) { console.error(e); }
}

// 3. Synchronizacja statystyk (Kapitał, Licznik, Success Rate)
async function syncMainStats() {
    const { data: settings } = await db.from('user_settings').select('*').eq('id', 1).single();
    const { data: trades } = await db.from('trades').select('pnl');
    
    let startCap = settings ? parseFloat(settings.starting_capital) : 1000;
    
    if (settings) {
        const scanEl = document.getElementById('main-tokens-count');
        if(scanEl) scanEl.innerText = settings.tokens_analyzed;
    }

    if (trades) {
        let totalPnl = trades.reduce((sum, t) => sum + parseFloat(t.pnl), 0);
        let currentCap = startCap + totalPnl;
        
        const capEl = document.getElementById('main-total-capital');
        if(capEl) capEl.innerText = `$${currentCap.toFixed(2)}`;

        const rateEl = document.getElementById('main-success-rate');
        if(rateEl && trades.length > 0) {
            let won = trades.filter(t => t.pnl > 0).length;
            rateEl.innerText = `${Math.round((won / trades.length) * 100)}%`;
        }
    }
}

function addToHistory(symbol, decision, colorClass, arrow) {
    tokenHistory.unshift({symbol, decision, colorClass, arrow});
    if(tokenHistory.length > 5) tokenHistory.pop();
    const hList = document.getElementById("historyList");
    if(hList) hList.innerHTML = tokenHistory.map(t => `<div class="token-list-item"><span>${t.symbol}</span> <span class="badge ${t.colorClass}">${t.decision}</span></div>`).join("");
}

function copyResult() {
    const name = document.getElementById("copyTokenName")?.innerText.trim() || "";
    const dec = document.getElementById("copyDecision")?.innerText.trim() || "";
    const score = document.getElementById("copyScore")?.innerText.trim() || "";
    const stats = document.getElementById("copyStats")?.innerText.trim() || "";
    if(!name) return;
    const text = `🎯 ${name}\n🚨 Signal: ${dec}\n📊 Score: ${score}/7\n💰 ${stats}`;
    navigator.clipboard.writeText(text);
    alert("Copied!");
}

document.addEventListener("DOMContentLoaded", syncMainStats);
