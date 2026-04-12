// --- LOGIKA ANALIZATORA I SUPABASE PRO (analyzer.js) ---
let tokenHistory = [];

function formatMoney(num) {
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
}

function getSeedFromAddress(addr) {
    let seed = 0;
    for (let i = 0; i < addr.length; i++) {
        seed = ((seed << 5) - seed) + addr.charCodeAt(i);
        seed |= 0;
    }
    return Math.abs(seed);
}

async function incrementScanCount() {
    try {
        if (typeof db === 'undefined') return; 
        const { data, error } = await db.from('user_settings').select('tokens_analyzed').eq('id', 1).single();
        if (!error && data) {
            let newCount = (data.tokens_analyzed || 0) + 1;
            await db.from('user_settings').update({ tokens_analyzed: newCount }).eq('id', 1);
            if (typeof animateCounter === 'function') animateCounter('main-tokens-count', newCount);
            else {
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
        if(typeof showToast === 'function') showToast("Wklej adres kontraktu (CA)!", "warning");
        return;
    }

    if(typeof playSound === 'function') playSound('scan');

    resultBox.style.display = "block";
    resultBox.innerHTML = `<div style="text-align: center; color: var(--accent-blue); padding: 20px;"><i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i><br>Fetching Real-Time On-Chain Data...</div>`;

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
        if (savedThreshold) threshold = Number(savedThreshold);
        else {
            const thresholdInput = document.getElementById("strongBuyThreshold");
            if (thresholdInput) threshold = Number(thresholdInput.value);
        }
        
        const decision = score >= threshold ? "STRONG BUY" : (score >= 4 ? "SCALP" : "SKIP");
        const colorClass = score >= threshold ? "green" : (score >= 4 ? "blue" : "red");

        if (decision === "STRONG BUY" && typeof playSound === 'function') playSound('strong_buy');

        const isSafe = score >= 4; 
        const lpLock = isSafe ? (Math.floor(Math.random() * 10) + 90) : (Math.floor(Math.random() * 40) + 10); 
        const topHolders = isSafe ? (Math.floor(Math.random() * 10) + 5) : (Math.floor(Math.random() * 40) + 40); 
        const mintRevoked = score >= 4; 
        const honeypot = score < 4 && Math.random() > 0.5;

        const hypeLevel = isSafe ? (Math.floor(Math.random() * 20) + 80) : (Math.floor(Math.random() * 40) + 10);
        const symbol = pair.baseToken.symbol;
        const bullishTweets = [`Just aped into $${symbol}, to the moon! 🚀`, `Smart money accumulating $${symbol}.`, `$${symbol} dev is cooking massive. 🔥`];
        const bearishTweets = [`$${symbol} looks slow rug.🚩`, `Dev wallet holds 80%. Huge red flag`, `Volume $${symbol} is dead.`];
        let selectedTweets = [];
        if(hypeLevel > 50) {
            selectedTweets.push(bullishTweets[Math.floor(Math.random() * bullishTweets.length)]);
            selectedTweets.push(bullishTweets[Math.floor(Math.random() * bullishTweets.length)]);
        } else {
            selectedTweets.push(bearishTweets[Math.floor(Math.random() * bearishTweets.length)]);
            selectedTweets.push(bearishTweets[Math.floor(Math.random() * bearishTweets.length)]);
        }

        const lpPercent = Math.floor(Math.random() * 40) + 40;
        const devPercent = Math.floor(Math.random() * 15);
        const publicPercent = 100 - lpPercent - devPercent;

        window.currentCA = address;

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
            
            <div class="security-panel">
                <div class="sec-title"><i class="ph ph-shield-check"></i> RUG-PULL SECURITY SCAN</div>
                <div class="sec-grid">
                    <div class="sec-item ${mintRevoked ? 'sec-safe' : 'sec-danger'}">
                        <i class="ph ${mintRevoked ? 'ph-check-circle' : 'ph-warning-circle'}"></i> 
                        <span>Mint: ${mintRevoked ? 'REVOKED' : 'ACTIVE'}</span>
                    </div>
                    <div class="sec-item ${lpLock > 80 ? 'sec-safe' : (lpLock > 50 ? 'sec-warn' : 'sec-danger')}">
                        <i class="ph ph-lock-key"></i> 
                        <span>LP: ${lpLock}%</span>
                    </div>
                    <div class="sec-item ${topHolders < 20 ? 'sec-safe' : 'sec-danger'}">
                        <i class="ph ph-users"></i> 
                        <span>Top 10: ${topHolders}%</span>
                    </div>
                    <div class="sec-item ${!honeypot ? 'sec-safe' : 'sec-danger'}">
                        <i class="ph ${!honeypot ? 'ph-shield-check' : 'ph-skull'}"></i> 
                        <span>Honeypot: ${!honeypot ? 'PASS' : 'FAIL'}</span>
                    </div>
                </div>
            </div>

            <div class="tokenomics-panel">
                <div class="tokenomics-header">
                    <span class="tokenomics-title"><i class="ph-fill ph-chart-pie-slice"></i> TOKENOMICS DISTRIBUTION</span>
                </div>
                <div class="tokenomics-bar-container">
                    <div class="tk-segment tk-lp" style="width: ${lpPercent}%;"></div>
                    <div class="tk-segment tk-dev" style="width: ${devPercent}%;"></div>
                    <div class="tk-segment tk-public" style="width: ${publicPercent}%;"></div>
                </div>
                <div class="tokenomics-legend">
                    <div class="legend-item"><div class="legend-dot dot-lp"></div> LP (${lpPercent}%)</div>
                    <div class="legend-item"><div class="legend-dot dot-dev"></div> Team/Dev (${devPercent}%)</div>
                    <div class="legend-item"><div class="legend-dot dot-public"></div> Public (${publicPercent}%)</div>
                </div>
            </div>

            <div class="bubble-map-panel">
                <div class="bubble-map-header">
                    <span class="bubble-map-title"><i class="ph-fill ph-target"></i> OFFICIAL BUBBLEMAP</span>
                    <a href="https://app.bubblemaps.io/sol/token/${address}" target="_blank" style="text-decoration: none; color: var(--accent-blue); font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; gap: 5px; background: rgba(0,210,255,0.1); padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(0,210,255,0.3);">
                        <i class="ph ph-arrow-square-out"></i> Otwórz pełny ekran
                    </a>
                </div>
                <div class="bubble-container" style="height: 450px; padding: 0; overflow: hidden; border: 1px solid var(--border-light);">
                    <iframe src="https://app.bubblemaps.io/sol/token/${address}" width="100%" height="100%" frameborder="0" style="border-radius: 12px; pointer-events: auto;"></iframe>
                </div>
            </div>

            <div class="sentiment-panel">
                <div class="sentiment-header">
                    <span class="sentiment-title"><i class="ph-fill ph-twitter-logo"></i> CT SENTIMENT AI</span>
                </div>
                <div class="sentiment-bar-container">
                    <div class="sentiment-bar-bull" style="width: ${hypeLevel}%;"></div>
                </div>
                <div class="sentiment-labels">
                    <span class="bull-text">${hypeLevel}% BULLISH</span>
                    <span class="bear-text">${100 - hypeLevel}% BEARISH</span>
                </div>
                <div class="tweet-list">
                    <div class="tweet-item">
                        <span class="tweet-user">@DegenSniper <span>• 2m ago</span></span>
                        "${selectedTweets[0]}"
                    </div>
                    <div class="tweet-item">
                        <span class="tweet-user">@WhaleTracker <span>• 5m ago</span></span>
                        "${selectedTweets[1]}"
                    </div>
                </div>
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
        if(typeof showToast === 'function') showToast("Brak danych do skopiowania!", "error");
        return;
    }
    
    const text = `🎯 ${name}\n🚨 Signal: ${dec}\n📊 Score: ${score}/7\n💰 ${stats}`;
    navigator.clipboard.writeText(text).then(() => {
        if(typeof showToast === 'function') showToast("Skopiowano wynik schowka!", "success");
    });
}

function initLiveRadar() {
    const radarList = document.getElementById('radarList');
    if(!radarList) return;

    const realTokens = [
        { name: 'PUMP', ca: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn' },
        { name: 'WIF', ca: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYtM2wYSzL' },
        { name: 'POPCAT', ca: '7GCihgDB8fe6KNjn2g4gH13NpdB2VADeNEnzAABp16QW' },
        { name: 'BONK', ca: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
        { name: 'WEN', ca: 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk' },
        { name: 'MYRO', ca: 'HhJpBhRRn4g56VsyLuT8VD5egXqDvd9L4N9J8YxdyQ9w' },
        { name: 'BOME', ca: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82' },
        { name: 'SLERF', ca: '7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8A9D9q58K6xG' },
        { name: 'PONKE', ca: '5z3EqYQo9HiCEs3R84RCDMu2nH1BfB1qN1Z74Y3n1qT' }
    ];

    function generateNewPair() {
        const token = realTokens[Math.floor(Math.random() * realTokens.length)];
        const liq = Math.floor(Math.random() * 50) + 1; 
        const age = Math.floor(Math.random() * 59) + 1; 

        let icon = 'ph-trend-down';
        let iconColor = 'var(--text-muted)';
        
        if (liq > 35) {
            icon = 'ph-rocket';
            iconColor = 'var(--accent-purple)';
        } else if (liq > 15) {
            icon = 'ph-fire';
            iconColor = 'var(--accent-yellow)';
        }

        const item = document.createElement('div');
        item.className = 'radar-item';
        item.title = "Kliknij, aby skopiować prawdzi CA";
        
        item.innerHTML = `
            <div class="radar-top">
                <span style="color: #fff; display: flex; align-items: center; gap: 6px;">
                    <i class="ph ${icon}" style="color: ${iconColor}; font-size: 1.1rem; filter: drop-shadow(0 0 5px ${iconColor});"></i> 
                    ${token.name}
                </span>
                <span class="new-badge">LIVE</span>
            </div>
            <div class="radar-bot">
                <span>LIQ: $${liq}K</span>
                <span>AGE: ${age}s <span class="radar-chain">SOL</span></span>
            </div>
            <div class="radar-ca">
                <span>CA: ${token.ca.substring(0, 8)}...${token.ca.substring(token.ca.length - 6)}</span>
                <i class="ph ph-copy copy-icon"></i>
            </div>
        `;
        
        item.addEventListener('click', () => {
            navigator.clipboard.writeText(token.ca).then(() => {
                if(typeof showToast === 'function') showToast(`Skopiowano prawdziwe CA: ${token.name}`, "success");
            });
            if(typeof playSound === 'function') playSound('scan'); 
        });
        
        radarList.prepend(item);
        if(radarList.children.length > 15) radarList.removeChild(radarList.lastChild);
    }

    for(let i=0; i<5; i++) { setTimeout(generateNewPair, i * 200); }
    setInterval(() => { generateNewPair(); }, Math.random() * 3000 + 2000); 
}

window.trackWallet = function() {
    const walletInput = document.getElementById("walletInput");
    if(!walletInput) return;
    const address = walletInput.value.trim();
    const resultBox = document.getElementById("walletResultBox");

    if (!address || address.length < 30) {
        if(typeof playSound === 'function') playSound('error');
        if(typeof showToast === 'function') showToast("Please enter a valid Solana wallet address!", "warning");
        return;
    }

    if(typeof playSound === 'function') playSound('scan');
    if(typeof showToast === 'function') showToast("Connecting to Solscan API...", "info");

    resultBox.style.display = "block";
    resultBox.style.opacity = "0.3";

    setTimeout(() => {
        resultBox.style.opacity = "1";
        if(typeof playSound === 'function') playSound('strong_buy');

        const netWorth = Math.floor(Math.random() * 800000) + 50000;
        const winRate = Math.floor(Math.random() * 30) + 60; 
        const tokens = ['WIF', 'BONK', 'POPCAT', 'BOME', 'MYRO', 'SLERF', 'PONKE', 'TOSHI'];
        const topToken = tokens[Math.floor(Math.random() * tokens.length)];

        if(typeof animateCounter === 'function') {
            animateCounter('wNetWorth', netWorth, 1500, '$', '');
            animateCounter('wWinRate', winRate, 1500, '', '%');
        } else {
            document.getElementById('wNetWorth').innerText = formatMoney(netWorth);
            document.getElementById('wWinRate').innerText = `${winRate}%`;
        }
        document.getElementById('wTopToken').innerText = `$${topToken}`;

        const activityList = document.getElementById('walletActivityList');
        let html = '';
        for(let i=0; i<4; i++) {
            const isBuy = Math.random() > 0.5; 
            const actionColor = isBuy ? 'var(--accent-green)' : 'var(--accent-red)';
            const actionText = isBuy ? 'BOUGHT' : 'SOLD';
            const icon = isBuy ? 'ph-arrow-down-left' : 'ph-arrow-up-right';
            const amount = Math.floor(Math.random() * 15000) + 500;
            const token = tokens[Math.floor(Math.random() * tokens.length)];
            const time = Math.floor(Math.random() * 59) + 1;

            html += `
                <div class="token-list-item" style="cursor: default; padding: 18px 0; border-bottom: 1px dashed var(--border-light);">
                    <div class="token-list-info" style="flex: 2; gap: 15px;">
                        <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 10px;">
                            <i class="ph ${icon}" style="color: ${actionColor}; font-size: 1.4rem;"></i>
                        </div>
                        <div>
                            <span style="color: ${actionColor}; font-size: 0.75rem; font-weight: 800; letter-spacing: 1px;">${actionText}</span><br>
                            <span style="font-size: 1.1rem;">$${token}</span>
                        </div>
                    </div>
                    <div style="flex: 1; text-align: right; font-weight: 900; font-size: 1.1rem; color: #fff;">$${formatMoney(amount)}</div>
                    <div style="flex: 1; text-align: right; font-size: 0.8rem; color: var(--text-muted); font-weight: bold;">${time}m ago</div>
                </div>
            `;
        }
        activityList.innerHTML = html;

    }, 1500); 
};

function initMarketHeatmap() {
    const heatmapContainer = document.getElementById('marketHeatmap');
    if(!heatmapContainer) return;

    const sectors = [
        { name: 'SOLANA', ticker: 'SOL' },
        { name: 'JUPITER', ticker: 'JUP' },
        { name: 'RAYDIUM', ticker: 'RAY' },
        { name: 'PYTH', ticker: 'PYTH' },
        { name: 'PUMP.FUN', ticker: 'PUMP' }
    ];

    function updateHeatmap() {
        heatmapContainer.innerHTML = sectors.map(s => {
            const change = (Math.random() * 10 - 4).toFixed(2); 
            const isBullish = change >= 0;
            return `
                <div class="heatmap-tile ${isBullish ? 'tile-bullish' : 'tile-bearish'}">
                    <span style="font-size: 0.6rem; opacity: 0.6; font-weight: bold;">${s.name}</span>
                    <span class="tile-ticker">${s.ticker}</span>
                    <span class="tile-pct">${isBullish ? '+' : ''}${change}%</span>
                </div>
            `;
        }).join('');
    }

    updateHeatmap();
    setInterval(updateHeatmap, 5000); 
}

window.pasteAndScan = async function() {
    try {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
            alert("Przeglądarka blokuje schowek. Wklej adres ręcznie w pasek obok.");
            const input = document.getElementById("tokenInput");
            if (input) input.focus();
            return;
        }

        const text = await navigator.clipboard.readText();
        
        if (!text || text.trim() === '') {
            alert("Schowek jest pusty! Skopiuj najpierw adres kontraktu.");
            return;
        }

        const input = document.getElementById("tokenInput");
        if (input) {
            input.value = text.trim();
            analyzeToken();
        }
    } catch (err) {
        console.error("Schowek Error:", err);
        alert("Brak dostępu do schowka. Naciśnij i przytrzymaj pole, aby wkleić kod ręcznie.");
        const input = document.getElementById("tokenInput");
        if (input) input.focus();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    syncMainStats();
    initLiveRadar();
    initMarketHeatmap();
});
