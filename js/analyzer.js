// --- LOGIKA ANALIZATORA I SUPABASE ---
let tokenHistory = [];

function formatMoney(num) {
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
}

// 1. Zwiększanie licznika skanowań w bazie (id=1)
async function incrementScanCount() {
    const { data, error } = await db.from('user_settings').select('tokens_analyzed').eq('id', 1).single();
    if (!error && data) {
        let newCount = data.tokens_analyzed + 1;
        await db.from('user_settings').update({ tokens_analyzed: newCount }).eq('id', 1);
        const counterEl = document.getElementById('main-tokens-count');
        if(counterEl) counterEl.innerText = newCount;
    }
}

// 2. Główna funkcja analizy
async function analyzeToken() {
    const addressInput = document.getElementById("tokenInput");
    if(!addressInput) return;
    
    const address = addressInput.value.trim();
    const resultBox = document.getElementById("analyzerResultBox");
    
    if (!address) {
        alert("Paste token contract address!");
        return;
    }

    resultBox.style.display = "block";
    resultBox.innerHTML = `<div style="text-align: center; color: var(--accent-blue); padding: 20px;"><i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i><br>Scanning Blockchain...</div>`;

    let data;
    try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        data = await res.json();
    } catch (err) {
        console.error(err);
        data = null;
    }

    let pair, fdv, liquidity, volume, change1m, created, age;

    if (!data || !data.pairs || data.pairs.length === 0) {
        pair = { baseToken: { name: "UNKNOWN", symbol: address.substring(0,6).toUpperCase() } };
        fdv = liquidity = volume = change1m = age = 0;
    } else {
        pair = data.pairs[0];
        fdv = pair.fdv || 0;
        liquidity = pair.liquidity?.usd || 0;
        volume = pair.volume?.h24 || 0;
        change1m = pair.priceChange?.m1 || 0;
        created = pair.pairCreatedAt || 0;
        age = created ? (Date.now() - created) / 60000 : 0;
    }

    const liq_mc = fdv ? liquidity / fdv : 0;
    const vol_liq = liquidity ? volume / liquidity : 0;

    let score = 0;
    if (liq_mc > 0.02) score += 2;
    if (vol_liq < 5) score += 2;
    if (change1m > 0.5) score += 1;
    if (volume > 1000) score += 1;
    if (age < 60) score += 1;

    const thresholdInput = document.getElementById("strongBuyThreshold");
    const strongBuyThreshold = thresholdInput ? Number(thresholdInput.value) : 6;
    
    let decision = "SKIP";
    let colorClass = "red";
    let arrow = "↘";
    let borderColor = "rgba(255, 51, 102, 0.4)";

    if(score >= strongBuyThreshold) {
        decision = "STRONG BUY";
        colorClass = "green";
        arrow = "↗";
        borderColor = "rgba(0, 230, 118, 0.4)";
    } else if(score >= 4) {
        decision = "SCALP";
        colorClass = "blue";
        arrow = "→";
        borderColor = "rgba(0, 210, 255, 0.4)";
    }

    resultBox.style.border = `1px solid ${borderColor}`;
    resultBox.style.boxShadow = `inset 0 0 20px ${borderColor.replace('0.4', '0.05')}, 0 0 20px ${borderColor.replace('0.4', '0.1')}`;

    resultBox.innerHTML = `
        <div class="result-header">
            <div class="token-name" id="copyTokenName">
                <i class="ph ph-diamond"></i> ${pair.baseToken.name} <span class="ticker">$${pair.baseToken.symbol}</span>
            </div>
            <div class="badge ${colorClass}" id="copyDecision">${decision} ${arrow}</div>
        </div>
        <div class="result-body">
            <div class="score">
                <span class="score-big" style="color: var(--accent-${colorClass});" id="copyScore">${score}</span><span class="score-small">/7</span>
                <span class="fire-text" style="color: var(--accent-${colorClass});"><i class="ph ph-fire"></i> ${decision}</span>
            </div>
            <div class="token-stats" id="copyStats">
                <span>MC: ${formatMoney(fdv)}</span> | <span>LIQ: ${formatMoney(liquidity)}</span> | <span>VOL: ${formatMoney(volume)}</span>
                <div class="token-meta">AGE: ${Math.round(age)}m <span class="badge blue">ONLINE</span></div>
            </div>
        </div>
    `;

    addToHistory(pair.baseToken.symbol, decision, colorClass, arrow);
    
    // Zwiększ licznik w bazie po udanej analizie
    incrementScanCount();
}

// 3. Synchronizacja wszystkich statystyk (Kapitał, Licznik, Success Rate)
async function syncMainStats() {
    // Pobierz ustawienia (Starting Capital i Licznik)
    const { data: settings, error: setErr } = await db.from('user_settings').select('*').eq('id', 1).single();
    
    let startCap = settings ? parseFloat(settings.starting_capital) : 1000;
    
    // Aktualizacja licznika skanów na ekranie
    if(settings) {
        const counterEl = document.getElementById('main-tokens-count');
        if(counterEl) counterEl.innerText = settings.tokens_analyzed;
    }

    // Pobierz wszystkie trady, aby wyliczyć PnL i Win Rate
    const { data: trades, error: tradesErr } = await db.from('trades').select('pnl');
    
    if (!tradesErr && trades) {
        let totalPnl = trades.reduce((sum, trade) => sum + parseFloat(trade.pnl), 0);
        let currentCap = startCap + totalPnl;
        
        // Wyświetl Kapitał
        const capDisplay = document.getElementById('main-total-capital');
        if(capDisplay) capDisplay.innerText = `$${currentCap.toFixed(2)}`;

        // Wyświetl Success Rate
        const won = trades.filter(t => parseFloat(t.pnl) > 0).length;
        const rate = trades.length > 0 ? Math.round((won / trades.length) * 100) : 0;
        const rateDisplay = document.getElementById('main-success-rate');
        if(rateDisplay) rateDisplay.innerText = `${rate}%`;
    }
}

// Reszta funkcji pomocniczych
function addToHistory(symbol, decision, colorClass, arrow) {
    if(tokenHistory.length > 0 && tokenHistory[0].symbol === symbol) return;
    tokenHistory.unshift({symbol, decision, colorClass, arrow});
    if(tokenHistory.length > 5) tokenHistory.pop();
    const historyList = document.getElementById("historyList");
    if(historyList) {
        historyList.innerHTML = tokenHistory.map(t => `
            <div class="token-list-item">
                <div class="token-list-info">
                    <i class="ph ph-magnifying-glass" style="color: var(--accent-blue);"></i> ${t.symbol}
                </div>
                <div class="badge ${t.colorClass}">${t.decision} ${t.arrow}</div>
            </div>
        `).join("");
    }
}

function copyResult() {
    const name = document.getElementById("copyTokenName")?.innerText.trim() || "";
    const dec = document.getElementById("copyDecision")?.innerText.trim() || "";
    const score = document.getElementById("copyScore")?.innerText.trim() || "";
    const stats = document.getElementById("copyStats")?.innerText.trim().replace(/\s+\|\s+/g, ' | ') || "";
    if(!name) { alert("Nothing to copy!"); return; }
    const textToCopy = `🎯 ${name}\n🚨 Signal: ${dec}\n📊 Score: ${score}/7\n💰 ${stats}`;
    navigator.clipboard.writeText(textToCopy);
    alert("Wynik skopiowany!");
}

setInterval(() => {
    const input = document.getElementById("tokenInput");
    if(input && input.value.trim()) analyzeToken();
}, 30000);

// Inicjalizacja przy starcie
document.addEventListener("DOMContentLoaded", syncMainStats);
