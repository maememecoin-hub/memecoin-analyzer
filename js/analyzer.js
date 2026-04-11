// --- LOGIKA ANALIZATORA I SUPABASE (analyzer.js) ---
let tokenHistory = [];

function formatMoney(num) {
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
}

async function incrementScanCount() {
    try {
        const { data, error } = await db.from('user_settings').select('tokens_analyzed').eq('id', 1).single();
        if (!error && data) {
            let newCount = (data.tokens_analyzed || 0) + 1;
            await db.from('user_settings').update({ tokens_analyzed: newCount }).eq('id', 1);
            if (typeof animateCounter === 'function') {
                animateCounter('main-tokens-count', newCount);
            } else {
                const counterEl = document.getElementById('main-tokens-count');
                if(counterEl) counterEl.innerText = newCount;
            }
        }
    } catch (e) { console.error("Błąd licznika:", e); }
}

async function analyzeToken() {
    const addressInput = document.getElementById("tokenInput");
    if(!addressInput) return;
    const address = addressInput.value.trim();
    const resultBox = document.getElementById("analyzerResultBox");
    
    if (!address) {
        if(typeof playSound === 'function') playSound('error');
        return showToast("Wklej adres kontraktu (CA)!", "warning");
    }

    if(typeof playSound === 'function') playSound('scan');

    resultBox.style.display = "block";
    resultBox.innerHTML = `<div style="text-align: center; color: var(--accent-blue); padding: 20px;"><i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i><br>Scanning Blockchain...</div>`;

    try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        const data = await res.json();
        const pair = data.pairs ? data.pairs[0] : null;

        if (!pair) {
            if(typeof playSound === 'function') playSound('error');
            resultBox.innerHTML = `<div style="text-align: center; color: var(--accent-red); padding: 20px;">Token not found or no liquidity!</div>`;
            return;
        }

        const fdv = pair.fdv || 0;
        const liquidity = pair.liquidity?.usd || 0;
        const volume = pair.volume?.h24 || 0;
        const change1m = pair.priceChange?.m1 || 0;
        const created = pair.pairCreatedAt || 0;
        const age = created ? (Date.now() - created) / 60000 : 0;

        // REALNA LOGIKA PUNKTACJI (POBIERANA Z USTAWIEŃ)
        let score = 0;
        const liq_mc = fdv ? liquidity / fdv : 0;
        const vol_liq = liquidity ? volume / liquidity : 0;

        // Pobieranie filtrów z ustawień użytkownika (lub wartości domyślne)
        const f_liqMc = parseFloat(localStorage.getItem('filterLiqMc') || 2) / 100;
        const f_volLiq = parseFloat(localStorage.getItem('filterVolLiq') || 5);
        const f_change = parseFloat(localStorage.getItem('filterChange') || 0.5);
        const f_vol = parseFloat(localStorage.getItem('filterVol') || 1000);
        const f_age = parseFloat(localStorage.getItem('filterAge') || 60);

        if (liq_mc > f_liqMc) score += 2;
        if (vol_liq < f_volLiq) score += 2;
        if (change1m > f_change) score += 1;
        if (volume > f_vol) score += 1;
        if (age < f_age) score += 1;

        // POBIERANIE PROGU Z NOWYCH USTAWIEŃ
        let threshold = 6;
        const savedThreshold = localStorage.getItem('sniperThreshold');
        if (savedThreshold) {
            threshold = Number(savedThreshold);
        } else {
            const thresholdInput = document.getElementById("strongBuyThreshold");
            if (thresholdInput) threshold = Number(thresholdInput.value);
        }
        
        const decision = score >= threshold ? "STRONG BUY" : (score >= 4 ? "SCALP" : "SKIP");
        const colorClass = score >= threshold ? "green" : (score >= 4 ? "blue" : "red");

        if (decision === "STRONG BUY" && typeof playSound === 'function') {
            playSound('strong_buy');
        }

        // Renderowanie statystyk ORAZ wykresu Iframe
        resultBox.innerHTML = `
            <div class="result-header">
                <div class="token-name" id="copyTokenName">
                    <i class="ph ph-diamond"></i> ${pair.baseToken.name} <span class="ticker">$${pair.baseToken.symbol}</span>
                </div>
                <div class="badge ${colorClass}" id="copyDecision">${decision}</div>
            </div>
            <div class="result-body">
                <div class="score">
                    <span class="score-big" style="color: var(--accent-${colorClass})" id="copyScore">${score}</span><span class="score-small">/7</span>
                </div>
                <div class="token-stats" id="copyStats">
                    <span>MC: ${formatMoney(fdv)}</span> | <span>LIQ: ${formatMoney(liquidity)}</span> | <span>VOL: ${formatMoney(volume)}</span>
                    <div class="token-meta">AGE: ${Math.round(age)}m <span class="badge blue">ONLINE</span></div>
                </div>
            </div>
            <div class="chart-container">
                <iframe src="https://dexscreener.com/${pair.chainId}/${pair.pairAddress}?embed=1&theme=dark&info=0" frameborder="0"></iframe>
            </div>
            `;
        
        addToHistory(pair.baseToken.symbol, decision, colorClass, "↗");
        incrementScanCount();
        
    } catch (e) { 
        console.error(e);
        if(typeof playSound === 'function') playSound('error');
        resultBox.innerHTML = `<div style="text-align: center; color: var(--accent-red); padding: 20px;">API Error. Try again.</div>`;
    }
}

async function syncMainStats() {
    try {
        const { data: settings } = await db.from('user_settings').select('*').eq('id', 1).single();
        const { data: trades } = await db.from('trades').select('pnl');
        
        let startCap = settings ? parseFloat(settings.starting_capital) : 1000;
        
        if (settings) {
            let scans = settings.tokens_analyzed || 0;
            if (typeof animateCounter === 'function') animateCounter('main-tokens-count', scans);
            else {
                const scanEl = document.getElementById('main-tokens-count');
                if(scanEl) scanEl.innerText = scans;
            }
        }

        if (trades) {
            let totalPnl = trades.reduce((sum, t) => sum + parseFloat(t.pnl), 0);
            let currentCap = startCap + totalPnl;
            
            if (typeof animateCounter === 'function') animateCounter('main-total-capital', currentCap, 1500, '$', '', 2);
            else {
                const capEl = document.getElementById('main-total-capital');
                if(capEl) capEl.innerText = `$${currentCap.toFixed(2)}`;
            }

            if (trades.length > 0) {
                let won = trades.filter(t => parseFloat(t.pnl) > 0).length;
                let winRate = Math.round((won / trades.length) * 100);
                
                if (typeof animateCounter === 'function') animateCounter('main-success-rate', winRate, 1500, '', '%');
                else {
                    const rateEl = document.getElementById('main-success-rate');
                    if(rateEl) rateEl.innerText = `${winRate}%`;
                }
            }
        }
    } catch (e) { console.error("Błąd synchronizacji:", e); }
}

function addToHistory(symbol, decision, colorClass, arrow) {
    tokenHistory.unshift({symbol, decision, colorClass, arrow});
    if(tokenHistory.length > 5) tokenHistory.pop();
    const hList = document.getElementById("historyList");
    if(hList) {
        hList.innerHTML = tokenHistory.map(t => `
            <div class="token-list-item">
                <div class="token-list-info">
                    <i class="ph ph-magnifying-glass" style="color: var(--accent-blue);"></i> ${t.symbol}
                </div>
                <div class="badge ${t.colorClass}">${t.decision}</div>
            </div>`).join("");
    }
}

window.copyResult = function() {
    const name = document.getElementById("copyTokenName")?.innerText.trim() || "";
    const dec = document.getElementById("copyDecision")?.innerText.trim() || "";
    const score = document.getElementById("copyScore")?.innerText.trim() || "";
    const stats = document.getElementById("copyStats")?.innerText.trim().replace(/\s*\|\s*/g, ' | ') || "";
    
    if(!name) {
        if(typeof playSound === 'function') playSound('error');
        return showToast("Brak danych do skopiowania!", "error");
    }
    
    const text = `🎯 ${name}\n🚨 Signal: ${dec}\n📊 Score: ${score}/7\n💰 ${stats}`;
    navigator.clipboard.writeText(text).then(() => showToast("Skopiowano wynik do schowka!", "success"));
}

document.addEventListener("DOMContentLoaded", syncMainStats);
