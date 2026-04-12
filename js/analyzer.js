// --- LOGIKA ANALIZATORA (analyzer.js) // MODYFIKACJA: USUNIĘTO WYKRES ---

let tokenHistory = [];

function formatMoney(num) {
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
}

// 1. Zwiększanie licznika skanowań w bazie (z animacją)
async function incrementScanCount() {
    try {
        const { data, error } = await db.from('user_settings').select('tokens_analyzed').eq('id', 1).single();
        if (!error && data) {
            let newCount = (data.tokens_analyzed || 0) + 1;
            await db.from('user_settings').update({ tokens_analyzed: newCount }).eq('id', 1);
            
            // Animacja nowego licznika ID: main-tokens-count
            if (typeof animateCounter === 'function') {
                animateCounter('main-tokens-count', newCount);
            } else {
                const counterEl = document.getElementById('main-tokens-count');
                if(counterEl) counterEl.innerText = newCount;
            }
        }
    } catch (e) { console.error("Błąd licznika:", e); }
}

// 2. Główna funkcja analizy
async function analyzeToken() {
    const addressInput = document.getElementById("tokenInput");
    if(!addressInput) return;
    const address = addressInput.value.trim();
    const resultBox = document.getElementById("analyzerResultBox");
    const idleScreen = document.getElementById("idleScreen"); // Nowy element

    if (!address) {
        if(typeof playSound === 'function') playSound('error');
        return showToast("Paste token contract CA!", "warning");
    }

    // DŹWIĘK SKANOWANIA
    if(typeof playSound === 'function') playSound('scan');

    // Ukrywamy idleScreen, pokazujemy wynik
    if(idleScreen) idleScreen.style.display = 'none';
    resultBox.style.display = "flex";
    resultBox.innerHTML = `<div style="flex:1; text-align: center; color: var(--accent-cyan); padding: 30px; border: 1px dashes var(--border-light);">
        <i class="ph ph-broadcast ph-spinScope" style="font-size: 2.5rem;"></i><br>
        AQUIRING TARGET DATA...
    </div>`;

    try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        const data = await res.json();
        const pair = data.pairs ? data.pairs[0] : null;

        if (!pair) {
            if(typeof playSound === 'function') playSound('error');
            resultBox.innerHTML = `<div style="flex:1; text-align: center; color: var(--accent-red); padding: 30px; border: 1px dashes var(--sys-red);">
                <i class="ph ph-warning-circle" style="font-size: 2.5rem;"></i><br>
                SCAN FAILED // TARGET NOT FOUND OR NO LIQUIDITY
            </div>`;
            return;
        }

        // POBIERANIE DANYCH
        const fdv = pair.fdv || 0;
        const liquidity = pair.liquidity?.usd || 0;
        const volume = pair.volume?.h24 || 0;
        const change1m = pair.priceChange?.m1 || 0;
        const created = pair.pairCreatedAt || 0;
        const age = created ? (Date.now() - created) / 60000 : 0;

        // REALNA LOGIKA PUNKTACJI (Dostosowana do 7 pkt)
        let score = 0;
        const liq_mc = fdv ? liquidity / fdv : 0;
        const vol_liq = liquidity ? volume / liquidity : 0;

        // Pobieranie filtrów z ustawień użytkownika (lub domyślnych)
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

        // POBIERANIE PROGU Z USTAWIEŃ
        let threshold = 6;
        const savedThreshold = localStorage.getItem('sniperThreshold');
        if (savedThreshold) threshold = Number(savedThreshold);
        
        const decision = score >= threshold ? "STRONG BUY" : (score >= 4 ? "SCALP" : "SKIP");
        const colorClass = score >= threshold ? "green" : (score >= 4 ? "blue" : "red");

        // DŹWIĘK SUKCESU (jeśli STRONG BUY)
        if (decision === "STRONG BUY" && typeof playSound === 'function') {
            playSound('strong_buy');
        }

        // --- RENDEROWANIE WYNIKU HUD (WYKRES USUNIĘTY) ---
        resultBox.className = `result-box hud-panel glow-border-${colorClass}`; // Dynamiczna klasa glow
        
        resultBox.innerHTML = `
            <div class="result-header">
                <div class="token-name" id="copyTokenName">
                    <i class="ph ph-unite"></i> ${pair.baseToken.name} <span class="ticker">$${pair.baseToken.symbol}</span>
                </div>
                <div class="badge ${colorClass}" id="copyDecision">${decision}</div>
            </div>
            <div class="result-body">
                <div class="score">
                    <span class="score-big" id="copyScore">${score}</span><span class="score-small">/7</span>
                </div>
                <div class="token-stats" id="copyStats">
                    <span>MC: ${formatMoney(fdv)}</span> | <span>LIQ: ${formatMoney(liquidity)}</span> | <span>VOL: ${formatMoney(volume)}</span>
                    <div class="token-meta">AGE: ${Math.round(age)}m <span class="badge blue">ONLINE</span></div>
                </div>
            </div>`;
        
        addToHistory(pair.baseToken.symbol, decision, colorClass, score); // Przekazujemy score do historii
        incrementScanCount();
        
    } catch (e) { 
        console.error(e);
        if(typeof playSound === 'function') playSound('error');
        resultBox.innerHTML = `<div style="flex:1; text-align: center; color: var(--sys-red); padding: 30px; border: 1px dashes var(--sys-red);">
            <i class="ph ph-globe" style="font-size: 2.5rem;"></i><br>
            NETWORK ERROR // CHECK CONECTION OR API STATUS
        </div>`;
    }
}

// 3. Synchronizacja statystyk z bazą (na HUD)
async function syncMainStats() {
    try {
        const { data: settings } = await db.from('user_settings').select('*').eq('id', 1).single();
        const { data: trades } = await db.from('trades').select('pnl');
        
        let startCap = settings ? parseFloat(settings.starting_capital) : 1000;
        
        if (settings) {
            let scans = settings.tokens_analyzed || 0;
            if (typeof animateCounter === 'function') animateCounter('main-tokens-count', scans);
        }

        if (trades) {
            let totalPnl = trades.reduce((sum, t) => sum + parseFloat(t.pnl), 0);
            let currentCap = startCap + totalPnl;
            
            // Animacja nowych liczników HUD
            if (typeof animateCounter === 'function') {
                animateCounter('main-total-capital', currentCap, 1500, '$', '', 2);
            }

            if (trades.length > 0) {
                let won = trades.filter(t => parseFloat(t.pnl) > 0).length;
                let winRate = Math.round((won / trades.length) * 100);
                
                if (typeof animateCounter === 'function') {
                    animateCounter('main-success-rate', winRate, 1500, '', '%');
                }
            }
        }
    } catch (e) { console.error("Błąd synchronizacji:", e); }
}

// Historia w stylu Radaru
function addToHistory(symbol, decision, colorClass, score) {
    const hList = document.getElementById("historyList");
    if(!hList) return;

    // Usuwamy wiadomość idle, jeśli jest
    const idleMsg = hList.querySelector('.radar-idle-msg');
    if(idleMsg) hList.innerHTML = '';

    // Budujemy HTML wpisu
    const item = document.createElement('div');
    item.className = 'token-list-item';
    item.innerHTML = `
        <div class="token-list-info">
            <span><i class="ph ph- scope"></i> ${symbol}</span>
            <span class="${colorClass}">${score}/7</span>
        </div>
        <div class="badge ${colorClass}">${decision}</div>`;
    
    // Dodajemy na początek
    hList.prepend(item);

    // Ograniczamy do np. 10
    if(hList.children.length > 10) hList.lastChild.remove();
}

window.copyResult = function() {
    const name = document.getElementById("copyTokenName")?.innerText.trim() || "";
    const dec = document.getElementById("copyDecision")?.innerText.trim() || "";
    const score = document.getElementById("copyScore")?.innerText.trim() || "";
    const stats = document.getElementById("copyStats")?.innerText.trim().replace(/\s*\|\s*/g, ' | ') || "";
    
    if(!name) {
        if(typeof playSound === 'function') playSound('error');
        return showToast("Nothing to copy!", "error");
    }
    
    const text = `🎯 ${name}\n🚨 Signal: ${dec}\n📊 Score: ${score}/7\n💰 ${stats}`;
    navigator.clipboard.writeText(text).then(() => showToast("Result copied!", "success"));
}

// Dodatkowe animacje CSS dla ikon
document.addEventListener("DOMContentLoaded", () => {
    syncMainStats();
    
    // Dodajemy kropkę statusu w analyzer.js
    const target Box = document.querySelector('.target-box .hp-head');
    if(target Box) {
        // ... (kropka jest już w HTML)
    }
});
