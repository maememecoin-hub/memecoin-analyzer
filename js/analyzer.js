// --- LOGIKA ANALIZATORA I SUPABASE (analyzer.js) ---
let tokenHistory = [];

function formatMoney(num) {
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
}

// 1. Zwiększanie licznika skanowań w bazie
async function incrementScanCount() {
    try {
        if (typeof db === 'undefined') return; // Zabezpieczenie przed brakiem bazy
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

// 2. Główna funkcja analizy
async function analyzeToken() {
    const addressInput = document.getElementById("tokenInput");
    if(!addressInput) return;
    const address = addressInput.value.trim();
    const resultBox = document.getElementById("analyzerResultBox");
    
    if (!address) {
        if(typeof playSound === 'function') playSound('error');
        if(typeof showToast === 'function') {
            showToast("Wklej adres kontraktu (CA)!", "warning");
        } else {
            alert("Wklej adres kontraktu (CA)!");
        }
        return;
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

        // REALNA LOGIKA PUNKTACJI Z FILTRAMI
        let score = 0;
        const liq_mc = fdv ? liquidity / fdv : 0;
        const vol_liq = liquidity ? volume / liquidity : 0;

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

        // Czyste wyniki, bez wykresu
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
            </div>`;
        
        addToHistory(pair.baseToken.symbol, decision, colorClass, "↗");
        incrementScanCount();
        
    } catch (e) { 
        console.error(e);
        if(typeof playSound === 'function') playSound('error');
        resultBox.innerHTML = `<div style="text-align: center; color: var(--accent-red); padding: 20px;">API Error. Try again.</div>`;
    }
}

// 3. Synchronizacja statystyk z bazą
async function syncMainStats() {
    try {
        if (typeof db === 'undefined') return;
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
        if(typeof showToast === 'function') {
            showToast("Brak danych do skopiowania!", "error");
        } else {
            alert("Brak danych do skopiowania!");
        }
        return;
    }
    
    const text = `🎯 ${name}\n🚨 Signal: ${dec}\n📊 Score: ${score}/7\n💰 ${stats}`;
    navigator.clipboard.writeText(text).then(() => {
        if(typeof showToast === 'function') {
            showToast("Skopiowano wynik do schowka!", "success");
        } else {
            alert("Skopiowano wynik do schowka!");
        }
    });
}

// --- SILNIK LIVE RADAR (Z Kopiowaniem CA i Ikonami Siły) ---
function initLiveRadar() {
    const radarList = document.getElementById('radarList');
    if(!radarList) return;

    // Baza do generowania tokenów
    const chains = ['SOL', 'BASE', 'ETH', 'BSC'];
    const prefixes = ['PEPE', 'DOGE', 'FLOKI', 'SHIB', 'CAT', 'AI', 'WIF', 'BONK', 'CHAD', 'SAFE', 'NEIRO'];
    const suffixes = ['INU', 'COIN', 'AI', 'CEO', 'PEPE', 'X', 'MOON', 'MARS', 'CAT'];

    function generateNewPair() {
        const chain = chains[Math.floor(Math.random() * chains.length)];
        const name = prefixes[Math.floor(Math.random() * prefixes.length)] + suffixes[Math.floor(Math.random() * suffixes.length)];
        const liq = Math.floor(Math.random() * 50) + 1; // Od 1k do 50k
        const age = Math.floor(Math.random() * 59) + 1; // Wiek: od 1 do 59 sekund
        
        // Generowanie symulowanego CA (Contract Address)
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let ca = (chain === 'SOL') ? '' : '0x';
        const length = (chain === 'SOL') ? 43 : 40;
        for(let i=0; i<length; i++) {
            ca += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Ocena siły (Ikony i kolory)
        let icon = 'ph-trend-down'; // Słaby
        let iconColor = 'var(--text-muted)';
        
        if (liq > 35) {
            icon = 'ph-rocket'; // Bardzo mocny
            iconColor = 'var(--accent-purple)';
        } else if (liq > 15) {
            icon = 'ph-fire'; // Średni/Mocny
            iconColor = 'var(--accent-yellow)';
        }

        const item = document.createElement('div');
        item.className = 'radar-item';
        item.title = "Kliknij, aby skopiować CA";
        
        item.innerHTML = `
            <div class="radar-top">
                <span style="color: #fff; display: flex; align-items: center; gap: 6px;">
                    <i class="ph ${icon}" style="color: ${iconColor}; font-size: 1.1rem; filter: drop-shadow(0 0 5px ${iconColor});"></i> 
                    ${name} / W${chain}
                </span>
                <span class="new-badge">NEW</span>
            </div>
            <div class="radar-bot">
                <span>LIQ: $${liq}K</span>
                <span>AGE: ${age}s <span class="radar-chain">${chain}</span></span>
            </div>
            <div class="radar-ca">
                <span>CA: ${ca.substring(0, 8)}...${ca.substring(ca.length - 4)}</span>
                <i class="ph ph-copy copy-icon"></i>
            </div>
        `;
        
        // Zdarzenie kliknięcia -> kopiowanie do schowka
        item.addEventListener('click', () => {
            navigator.clipboard.writeText(ca).then(() => {
                if(typeof showToast === 'function') {
                    showToast(`Skopiowano CA: ${name}`, "success");
                }
            });
            // Opcjonalny dźwięk kliknięcia radaru
            if(typeof playSound === 'function') playSound('scan'); 
        });
        
        // Dodajemy na początek listy
        radarList.prepend(item);
        
        // Ograniczamy listę do 15 elementów
        if(radarList.children.length > 15) {
            radarList.removeChild(radarList.lastChild);
        }
    }

    // Generujemy kilka na start
    for(let i=0; i<5; i++) {
        setTimeout(generateNewPair, i * 200); 
    }

    // Nieskończona pętla (co 2-5 sekund nowy token)
    setInterval(() => {
        generateNewPair();
    }, Math.random() * 3000 + 2000); 
}

document.addEventListener("DOMContentLoaded", () => {
    syncMainStats();
    initLiveRadar();
});
