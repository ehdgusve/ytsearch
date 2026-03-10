/**
 * YouTube Research Suite - Pro Analytics Logic
 */

const translations = {
    en: {
        dashboard: "Dashboard",
        videoResearch: "Video Research",
        shortsFinder: "Shorts Finder",
        channelDiscovery: "Channel Discovery",
        massChannelCollector: "Mass Channel Collector",
        shortsTrendAnalyzer: "Shorts Trend Analyzer",
        viralPredictionEngine: "Viral Prediction Engine",
        contentAnalyzer: "Content Analyzer",
        analysisList: "Analysis List",
        keywordIntel: "Keyword Intel",
        breakoutDetection: "Breakout Detection",
        searchPlaceholder: "Search keywords, channels, or URLs...",
        analyze: "Analyze",
        save: "Save",
        status: "Status",
        offline: "Offline",
        online: "Online",
        results: "Results",
        collectContacts: "Collect Contacts",
        exportCsv: "Export CSV",
        exportJson: "Export JSON",
        startSearch: "Start a search to see results",
        loading: "Analyzing YouTube Data...",
        enriching: "Enriching stats for {n} channels...",
        multiKeywordPlaceholder: "Enter keywords (one per line)...",
        collectChannels: "Collect Channels",
        quality: "Quality",
        engagement: "Engagement",
        velocity: "Velocity",
        viralScore: "Viral Score",
        viralProb: "Viral Probability",
        trendScore: "Trend Score"
    },
    ko: {
        dashboard: "대시보드",
        videoResearch: "비디오 리서치",
        shortsFinder: "쇼츠 파인더",
        channelDiscovery: "채널 디스커버리",
        massChannelCollector: "대량 채널 수집기",
        shortsTrendAnalyzer: "쇼츠 트렌드 분석기",
        viralPredictionEngine: "바이럴 예측 엔진",
        contentAnalyzer: "콘텐츠 분석기",
        analysisList: "분석 리스트",
        keywordIntel: "키워드 인텔",
        breakoutDetection: "급상승 탐지",
        searchPlaceholder: "키워드, 채널 또는 URL 검색...",
        analyze: "분석",
        save: "저장",
        status: "상태",
        offline: "오프라인",
        online: "온라인",
        results: "결과",
        collectContacts: "연락처 수집",
        exportCsv: "CSV 내보내기",
        exportJson: "JSON 내보내기",
        startSearch: "검색을 시작하여 결과를 확인하세요",
        loading: "유튜브 데이터 분석 중...",
        enriching: "{n}개 채널의 통계 분석 중...",
        multiKeywordPlaceholder: "키워드를 입력하세요 (한 줄에 하나씩)...",
        collectChannels: "채널 수집 시작",
        quality: "품질",
        engagement: "참여도",
        velocity: "조회수 속도",
        viralScore: "바이럴 점수",
        viralProb: "바이럴 확률",
        trendScore: "트렌드 점수"
    }
};

const state = {
    apiKey: localStorage.getItem('yt_api_key') || '',
    language: localStorage.getItem('yt_lang') || 'en',
    currentModule: 'dashboard',
    results: [],
    keyword: '',
    analysisList: JSON.parse(localStorage.getItem('yt_analysis_list') || '[]'),
    activeVideo: null,
    activeChannel: null,
    channelAverages: {}
};

const elements = {
    apiKeyInput: document.getElementById('api-key'),
    saveKeyBtn: document.getElementById('save-api-key'),
    keywordInput: document.getElementById('keyword-input'),
    searchBtn: document.getElementById('main-search-btn'),
    navLinks: document.querySelectorAll('.nav-links li'),
    moduleContainer: document.getElementById('module-container'),
    apiStatus: document.getElementById('api-status'),
    loader: document.getElementById('loader'),
    loaderText: document.getElementById('loader-text'),
    exportBar: document.querySelector('.export-bar'),
    resultCount: document.getElementById('result-count'),
    collectionCountBadge: document.getElementById('collection-count'),
    toggleFiltersBtn: document.getElementById('toggle-filters'),
    filterPanel: document.getElementById('advanced-filters'),
    modal: document.getElementById('detail-modal'),
    modalBody: document.getElementById('modal-body'),
    closeModal: document.querySelector('.close-modal'),
    languageSelect: document.getElementById('language-select'),
    homeLogo: document.getElementById('home-logo')
};

// Initialize
function init() {
    if (state.apiKey) {
        elements.apiKeyInput.value = state.apiKey;
        updateApiStatus(true);
    }
    elements.languageSelect.value = state.language;
    updateLanguage();
    setupEventListeners();
    updateBadge();
    renderModule();
}

function updateLanguage() {
    const t = translations[state.language];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key]) el.textContent = t[key];
    });
    elements.keywordInput.placeholder = t.searchPlaceholder;
    elements.searchBtn.textContent = t.analyze;
    elements.saveKeyBtn.textContent = t.save;
    localStorage.setItem('yt_lang', state.language);
}

function setupEventListeners() {
    elements.saveKeyBtn.addEventListener('click', () => {
        state.apiKey = elements.apiKeyInput.value.trim();
        localStorage.setItem('yt_api_key', state.apiKey);
        updateApiStatus(!!state.apiKey);
        alert('API Key Saved');
    });

    elements.languageSelect.addEventListener('change', (e) => {
        state.language = e.target.value;
        updateLanguage();
        renderModule();
    });

    elements.homeLogo.addEventListener('click', () => {
        elements.navLinks.forEach(l => l.classList.remove('active'));
        document.querySelector('[data-module="dashboard"]').classList.add('active');
        state.currentModule = 'dashboard';
        renderModule();
    });

    elements.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (!link.dataset.module) return;
            elements.navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            state.currentModule = link.dataset.module;
            renderModule();
        });
    });

    elements.searchBtn.addEventListener('click', handleSearch);
    elements.keywordInput.addEventListener('keypress', e => e.key === 'Enter' && handleSearch());
    
    elements.toggleFiltersBtn.addEventListener('click', () => {
        elements.filterPanel.classList.toggle('hidden');
    });

    elements.closeModal.addEventListener('click', () => elements.modal.classList.add('hidden'));
    window.addEventListener('click', e => e.target === elements.modal && elements.modal.classList.add('hidden'));

    document.getElementById('export-csv').addEventListener('click', () => exportData('csv'));
    document.getElementById('export-json').addEventListener('click', () => exportData('json'));
    document.getElementById('collect-contacts').addEventListener('click', collectContacts);
}

function updateApiStatus(isOnline) {
    const t = translations[state.language];
    elements.apiStatus.textContent = isOnline ? t.online : t.offline;
    elements.apiStatus.className = isOnline ? 'status-online' : 'status-offline';
}

function updateBadge() {
    elements.collectionCountBadge.textContent = state.analysisList.length;
}

// Advanced Search & Data Fetching
async function handleSearch() {
    const keyword = elements.keywordInput.value.trim();
    if (!keyword || !state.apiKey) return alert('Enter keyword and API key');
    
    state.keyword = keyword;
    const t = translations[state.language];
    showLoader(true, t.loading);

    try {
        let endpoint = '/api/searchVideos';
        let params = `?keyword=${encodeURIComponent(keyword)}&apiKey=${state.apiKey}`;

        if (state.currentModule === 'shorts-finder') {
            endpoint = '/api/searchShorts';
            params += `&period=${document.getElementById('date-range').value}`;
        } else if (state.currentModule === 'channel-discovery') {
            endpoint = '/api/searchChannels';
        } else if (state.currentModule === 'viral-prediction-engine') {
            endpoint = '/api/searchViralVideos';
        } else if (state.currentModule === 'shorts-trend-analyzer') {
            endpoint = '/api/searchShorts'; // Reuse searchShorts but with deeper analysis
        }

        const res = await fetch(endpoint + params);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        state.results = data;

        if (state.currentModule === 'viral-prediction-engine') {
            await enrichForViralPrediction();
        } else if (state.currentModule === 'shorts-trend-analyzer') {
            calculateShortsTrends();
        } else if (state.currentModule === 'channel-discovery') {
            calculateChannelScores();
        } else if (state.currentModule !== 'mass-channel-collector') {
            await enrichWithChannelStats();
            calculateProMetrics();
        }

        renderResults();
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        showLoader(false);
    }
}

async function enrichWithChannelStats() {
    const uniqueChannelIds = [...new Set(state.results.map(v => v.channelId))];
    const t = translations[state.language];
    showLoader(true, t.enriching.replace('{n}', uniqueChannelIds.length));
    
    for (const cid of uniqueChannelIds) {
        if (!state.channelAverages[cid]) {
            try {
                const res = await fetch(`/api/getChannelDetails?channelId=${cid}&apiKey=${state.apiKey}`);
                const details = await res.json();
                state.channelAverages[cid] = {
                    avgViews: details.totalViews / Math.max(1, details.videoCount),
                    subscribers: details.subscribers
                };
            } catch (e) { console.error(e); }
        }
    }
}

function calculateProMetrics() {
    state.results = state.results.map(v => {
        const chan = state.channelAverages[v.channelId] || { avgViews: v.views, subscribers: 0 };
        const contributionScore = v.views / Math.max(1, chan.avgViews);
        const performanceScore = (v.likes + (v.comments || 0)) / Math.max(1, v.views);
        
        const days = Math.max(1, (Date.now() - new Date(v.publishedAt).getTime()) / (1000*60*60*24));
        const exposureProb = (performanceScore * 100) + (10 / days);

        return {
            ...v,
            contributionScore,
            performanceScore,
            exposureProb,
            evaluation: contributionScore > 2 ? 'Great' : contributionScore > 1.2 ? 'Good' : contributionScore > 0.8 ? 'Normal' : 'Bad',
            isBreakout: contributionScore > 3
        };
    });
}

// Rendering Modules
function renderModule() {
    elements.moduleContainer.innerHTML = '';
    elements.exportBar.classList.add('hidden');

    switch (state.currentModule) {
        case 'dashboard': renderDashboard(); break;
        case 'search-videos': renderVideoGrid(); break;
        case 'shorts-finder': renderVideoGrid(); break;
        case 'channel-discovery': renderChannelGrid(); break;
        case 'mass-channel-collector': renderMassChannelCollector(); break;
        case 'shorts-trend-analyzer': renderShortsTrendAnalyzer(); break;
        case 'viral-prediction-engine': renderViralPredictionEngine(); break;
        case 'content-analyzer': renderContentAnalyzer(); break;
        case 'analysis-list': renderAnalysisList(); break;
        case 'keyword-intel': renderKeywordIntel(); break;
        case 'breakout-detector': renderBreakoutDetection(); break;
    }
}

function renderResults() {
    switch (state.currentModule) {
        case 'search-videos':
        case 'shorts-finder': renderVideoGrid(); break;
        case 'channel-discovery': renderChannelGrid(); break;
        case 'viral-prediction-engine': renderViralGrid(); break;
        case 'shorts-trend-analyzer': renderShortsTrendGrid(); break;
    }
}

// --- Mass Channel Collector ---
function renderMassChannelCollector() {
    const t = translations[state.language];
    const html = `
        <div class="card">
            <h2>${t.massChannelCollector}</h2>
            <p>${t.multiKeywordPlaceholder}</p>
            <textarea id="multi-keyword-input" rows="6" style="width:100%; margin-top:10px; padding:10px;" placeholder="${t.multiKeywordPlaceholder}"></textarea>
            <button id="collect-channels-btn" class="btn-primary" style="margin-top:10px;">${t.collectChannels}</button>
        </div>
        <div id="collector-results" style="margin-top:20px;"></div>
    `;
    elements.moduleContainer.innerHTML = html;
    document.getElementById('collect-channels-btn').addEventListener('click', handleMassChannelCollection);
    
    if (state.results && state.currentModule === 'mass-channel-collector' && state.results.length > 0) {
        renderChannelGrid('collector-results');
    }
}

async function handleMassChannelCollection() {
    const keywords = document.getElementById('multi-keyword-input').value.split('\n').map(k => k.trim()).filter(k => k);
    if (keywords.length === 0 || !state.apiKey) return alert('Enter keywords and API key');

    const t = translations[state.language];
    showLoader(true, t.loading);
    let allChannels = [];

    try {
        for (const kw of keywords) {
            const res = await fetch(`/api/searchChannels?keyword=${encodeURIComponent(kw)}&apiKey=${state.apiKey}`);
            const data = await res.json();
            if (data.error) continue;
            
            // Add keyword category
            data.forEach(c => c.keywordCategory = kw);
            allChannels = [...allChannels, ...data];
        }

        state.results = allChannels;
        calculateChannelScores();
        renderChannelGrid('collector-results');
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        showLoader(false);
    }
}

function calculateChannelScores() {
    state.results = state.results.map(c => {
        const uploadFrequency = c.videoCount / Math.max(1, (Date.now() - new Date(c.publishedAt || Date.now()).getTime()) / (1000*60*60*24*30)); // Monthly uploads
        const avgViews = c.totalViews / Math.max(1, c.videoCount);
        
        // Quality Score = (subscribers * 0.4) + (average views * 0.4) + (upload frequency * 0.2)
        // Normalized for labeling
        const qualityScore = (Math.log10(c.subscribers + 1) * 0.4) + (Math.log10(avgViews + 1) * 0.4) + (Math.min(10, uploadFrequency) * 0.02);
        
        return {
            ...c,
            qualityScore,
            evaluation: qualityScore > 5 ? 'Great' : qualityScore > 3.5 ? 'Good' : qualityScore > 2 ? 'Normal' : 'Bad'
        };
    });
}

function renderChannelGrid(targetId = null) {
    const t = translations[state.language];
    if (state.results.length === 0) {
        const target = targetId ? document.getElementById(targetId) : elements.moduleContainer;
        target.innerHTML = `<div class="card"><h3>${t.startSearch}</h3></div>`;
        return;
    }
    elements.exportBar.classList.remove('hidden');
    elements.resultCount.textContent = state.results.length;

    const html = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Thumbnail</th>
                    <th>Channel Info</th>
                    <th>Subscribers</th>
                    <th>Total Views</th>
                    <th>${t.quality}</th>
                    <th>Evaluation</th>
                </tr>
            </thead>
            <tbody>
                ${state.results.map(c => `
                    <tr>
                        <td class="thumbnail-cell"><img src="${c.thumbnail}" style="border-radius:50%; width:60px;"></td>
                        <td>
                            <strong>${c.title}</strong><br>
                            <small class="text-muted">${c.keywordCategory || ''}</small>
                        </td>
                        <td>${formatNumber(c.subscribers)}</td>
                        <td>${formatNumber(c.totalViews)}</td>
                        <td>${c.qualityScore.toFixed(1)}</td>
                        <td><span class="score-pill score-${c.evaluation.toLowerCase()}">${c.evaluation}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    const target = targetId ? document.getElementById(targetId) : elements.moduleContainer;
    target.innerHTML = html;
}

// --- Shorts Trend Analyzer ---
function calculateShortsTrends() {
    state.results = state.results.map(v => {
        const hoursSinceUpload = Math.max(1, (Date.now() - new Date(v.publishedAt).getTime()) / (1000 * 60 * 60));
        const engagementRate = (v.likes + (v.comments || 0)) / Math.max(1, v.views);
        const viewVelocity = v.views / hoursSinceUpload;
        const trendScore = (engagementRate * 100) + (viewVelocity / 100);

        return {
            ...v,
            engagementRate,
            viewVelocity,
            trendScore,
            evaluation: trendScore > 50 ? 'Great' : trendScore > 20 ? 'Good' : trendScore > 5 ? 'Normal' : 'Bad'
        };
    });
}

function renderShortsTrendAnalyzer() {
    const t = translations[state.language];
    if (state.results.length === 0 || state.currentModule !== 'shorts-trend-analyzer') {
        elements.moduleContainer.innerHTML = `<div class="card"><h2>${t.shortsTrendAnalyzer}</h2><p>${t.startSearch}</p></div>`;
        return;
    }

    // Title Pattern Analysis
    const titles = state.results.map(v => v.title.toLowerCase());
    const words = titles.join(' ').split(/\s+/).filter(w => w.length > 3);
    const wordFreq = {};
    words.forEach(w => wordFreq[w] = (wordFreq[w] || 0) + 1);
    const topWords = Object.entries(wordFreq).sort((a,b) => b[1] - a[1]).slice(0, 10);

    const html = `
        <div class="dashboard-grid">
            <div class="card">
                <h3>Top Trending Keywords</h3>
                <ul>${topWords.map(w => `<li>${w[0]} (${w[1]})</li>`).join('')}</ul>
            </div>
            <div class="card">
                <h3>Trend Distribution</h3>
                <canvas id="shortsTrendChart"></canvas>
            </div>
        </div>
        <div id="shorts-trend-grid" style="margin-top:20px;"></div>
    `;
    elements.moduleContainer.innerHTML = html;
    renderShortsTrendGrid('shorts-trend-grid');

    const ctx = document.getElementById('shortsTrendChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Great', 'Good', 'Normal', 'Bad'],
            datasets: [{
                data: [
                    state.results.filter(r => r.evaluation === 'Great').length,
                    state.results.filter(r => r.evaluation === 'Good').length,
                    state.results.filter(r => r.evaluation === 'Normal').length,
                    state.results.filter(r => r.evaluation === 'Bad').length
                ],
                backgroundColor: ['#1e8e3e', '#f9ab00', '#5f6368', '#d93025']
            }]
        }
    });
}

function renderShortsTrendGrid(targetId = null) {
    const t = translations[state.language];
    const html = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Thumbnail</th>
                    <th>Title</th>
                    <th>Views</th>
                    <th>${t.trendScore}</th>
                    <th>${t.velocity}</th>
                    <th>Evaluation</th>
                </tr>
            </thead>
            <tbody>
                ${state.results.map(v => `
                    <tr>
                        <td class="thumbnail-cell"><img src="${v.thumbnail}"></td>
                        <td><strong>${v.title}</strong><br><small>${v.channelTitle}</small></td>
                        <td>${formatNumber(v.views)}</td>
                        <td>${v.trendScore.toFixed(1)}</td>
                        <td>${v.viewVelocity.toFixed(0)}/h</td>
                        <td><span class="score-pill score-${v.evaluation.toLowerCase()}">${v.evaluation}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    const target = targetId ? document.getElementById(targetId) : elements.moduleContainer;
    target.innerHTML = html;
}

// --- Viral Prediction Engine ---
async function enrichForViralPrediction() {
    const uniqueChannelIds = [...new Set(state.results.map(v => v.channelId))];
    const t = translations[state.language];
    showLoader(true, t.enriching.replace('{n}', uniqueChannelIds.length));

    for (const cid of uniqueChannelIds) {
        if (!state.channelAverages[cid]) {
            try {
                const res = await fetch(`/api/getChannelDetails?channelId=${cid}&apiKey=${state.apiKey}`);
                const details = await res.json();
                state.channelAverages[cid] = details.subscribers;
            } catch (e) { console.error(e); }
        }
    }

    state.results = state.results.map(v => {
        const subs = state.channelAverages[v.channelId] || 0;
        const hoursSinceUpload = Math.max(1, (Date.now() - new Date(v.publishedAt).getTime()) / (1000 * 60 * 60));
        
        const engagementRate = (v.likes + (v.comments || 0)) / Math.max(1, v.views);
        const viewVelocity = v.views / hoursSinceUpload;
        const subReach = v.views / Math.max(1, subs);

        // Viral Score = (engagement rate * 0.4) + (view velocity * 0.4) + (subscriber reach * 0.2)
        // Normalized
        const viralScore = (engagementRate * 40) + (Math.log10(viewVelocity + 1) * 10) + (Math.min(10, subReach) * 2);
        
        let prob = 'Very Low';
        if (viralScore > 30) prob = 'Very High';
        else if (viralScore > 20) prob = 'High';
        else if (viralScore > 10) prob = 'Medium';
        else if (viralScore > 5) prob = 'Low';

        return {
            ...v,
            engagementRate,
            viewVelocity,
            subReach,
            viralScore,
            viralProb: prob,
            isPotentialViral: viewVelocity > (subs / 100) // Early signal rule
        };
    });
}

function renderViralPredictionEngine() {
    const t = translations[state.language];
    if (state.results.length === 0 || state.currentModule !== 'viral-prediction-engine') {
        elements.moduleContainer.innerHTML = `<div class="card"><h2>${t.viralPredictionEngine}</h2><p>${t.startSearch}</p></div>`;
        return;
    }

    const html = `
        <div class="dashboard-grid">
            <div class="card">
                <h3>Viral Probability Distribution</h3>
                <canvas id="viralProbChart"></canvas>
            </div>
            <div class="card">
                <h3>Top Viral Candidates</h3>
                <div id="viral-top-list">
                    ${state.results.slice(0, 5).map(v => `
                        <div class="stat-row">
                            <span>${v.title.substring(0, 30)}...</span>
                            <strong>${v.viralProb}</strong>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        <div id="viral-results-grid" style="margin-top:20px;"></div>
    `;
    elements.moduleContainer.innerHTML = html;
    renderViralGrid('viral-results-grid');

    const ctx = document.getElementById('viralProbChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Very High', 'High', 'Medium', 'Low', 'Very Low'],
            datasets: [{
                label: 'Videos',
                data: [
                    state.results.filter(r => r.viralProb === 'Very High').length,
                    state.results.filter(r => r.viralProb === 'High').length,
                    state.results.filter(r => r.viralProb === 'Medium').length,
                    state.results.filter(r => r.viralProb === 'Low').length,
                    state.results.filter(r => r.viralProb === 'Very Low').length
                ],
                backgroundColor: '#ff0000'
            }]
        }
    });
}

function renderViralGrid(targetId = null) {
    const t = translations[state.language];
    const html = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Thumbnail</th>
                    <th>Title</th>
                    <th>Views</th>
                    <th>${t.viralScore}</th>
                    <th>${t.viralProb}</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${state.results.map(v => `
                    <tr>
                        <td class="thumbnail-cell"><img src="${v.thumbnail}"></td>
                        <td>
                            <strong>${v.title}</strong><br>
                            <small>${v.channelTitle}</small>
                        </td>
                        <td>${formatNumber(v.views)}</td>
                        <td>${v.viralScore.toFixed(1)}</td>
                        <td><strong>${v.viralProb}</strong></td>
                        <td>
                            ${v.isPotentialViral ? '<span class="score-pill score-great">POTENTIAL VIRAL</span>' : '-'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    const target = targetId ? document.getElementById(targetId) : elements.moduleContainer;
    target.innerHTML = html;
}

// Existing Rendering Modules (Extended for I18n)
function renderVideoGrid() {
    const t = translations[state.language];
    if (state.results.length === 0) {
        elements.moduleContainer.innerHTML = `<div class="card"><h3>${t.startSearch}</h3></div>`;
        return;
    }
    elements.exportBar.classList.remove('hidden');
    elements.resultCount.textContent = state.results.length;

    const html = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Thumbnail</th>
                    <th>Video Info</th>
                    <th>Views</th>
                    <th>Scores</th>
                    <th>Evaluation</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${state.results.map(v => `
                    <tr onclick="openVideoDetail('${v.id}')">
                        <td class="thumbnail-cell"><img src="${v.thumbnail}"></td>
                        <td>
                            <strong>${highlightText(v.title, state.keyword)}</strong><br>
                            <small class="text-muted">${v.channelTitle} • ${new Date(v.publishedAt).toLocaleDateString()}</small>
                        </td>
                        <td>${formatNumber(v.views)}</td>
                        <td>
                            CS: ${v.contributionScore?.toFixed(1) || 0}x<br>
                            PS: ${(v.performanceScore * 100 || 0).toFixed(1)}%
                        </td>
                        <td><span class="score-pill score-${v.evaluation.toLowerCase()}">${v.evaluation}</span></td>
                        <td><button class="btn-outline btn-sm" onclick="addToAnalysisList(event, '${v.id}')">Add</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    elements.moduleContainer.innerHTML = html;
}

function renderDashboard() {
    const t = translations[state.language];
    if (state.results.length === 0) {
        elements.moduleContainer.innerHTML = `<h2>${t.dashboard}</h2><p>${t.startSearch}</p>`;
        return;
    }

    const html = `
        <h2>${t.dashboard}</h2>
        <div class="dashboard-grid">
            <div class="card">
                <h3>Views Distribution</h3>
                <canvas id="viewsDistChart"></canvas>
            </div>
            <div class="card">
                <h3>Engagement Ratios</h3>
                <canvas id="engagementDistChart"></canvas>
            </div>
            <div class="card">
                <h3>Top Keywords</h3>
                <div id="top-keywords-list"></div>
            </div>
        </div>
    `;
    elements.moduleContainer.innerHTML = html;

    const viewsData = state.results.map(v => v.views);
    new Chart(document.getElementById('viewsDistChart'), {
        type: 'bar',
        data: {
            labels: state.results.slice(0, 5).map(v => v.title.substring(0, 15) + '...'),
            datasets: [{ label: 'Views', data: viewsData.slice(0, 5), backgroundColor: '#ff0000' }]
        }
    });
}

// Collection Logic
function addToAnalysisList(e, videoId) {
    e.stopPropagation();
    const v = state.results.find(res => res.id === videoId);
    if (!v) return;
    
    if (!state.analysisList.find(item => item.id === videoId)) {
        state.analysisList.push(v);
        localStorage.setItem('yt_analysis_list', JSON.stringify(state.analysisList));
        updateBadge();
        alert('Added to Analysis List');
    }
}

function collectContacts() {
    const emails = [];
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    state.results.forEach(v => {
        const found = v.description?.match(emailRegex);
        if (found) found.forEach(email => emails.push({ channel: v.channelTitle, email }));
    });

    if (emails.length === 0) return alert('No emails found in descriptions.');
    
    let csv = 'Channel,Email\n' + emails.map(e => `"${e.channel}","${e.email}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_${state.keyword}.csv`;
    a.click();
}

// Helpers
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
}

function highlightText(text, keyword) {
    if (!keyword) return text;
    return text.replace(new RegExp(`(${keyword})`, 'gi'), '<span class="highlight">$1</span>');
}

function showLoader(show, text = 'Loading...') {
    elements.loader.classList.toggle('hidden', !show);
    elements.loaderText.textContent = text;
}

function exportData(format) {
    if (state.results.length === 0) return;
    const content = format === 'json' ? JSON.stringify(state.results, null, 2) : 
        Object.keys(state.results[0]).join(',') + '\n' + state.results.map(obj => Object.values(obj).map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yt_pro_analytics_${Date.now()}.${format}`;
    a.click();
}

async function openVideoDetail(videoId) {
    const v = state.results.find(res => res.id === videoId) || state.analysisList.find(res => res.id === videoId);
    if (!v) return;

    elements.modal.classList.remove('hidden');
    elements.modalBody.innerHTML = '<div class="spinner"></div>';

    try {
        const res = await fetch(`/api/getComments?videoId=${videoId}&apiKey=${state.apiKey}`);
        const comments = await res.json();

        elements.modalBody.innerHTML = `
            <div class="video-detail-grid">
                <div class="video-preview">
                    <img src="${v.thumbnail}" style="width: 100%; border-radius: 12px;">
                    <h2>${v.title}</h2>
                    <p class="text-muted">${v.description?.substring(0, 200) || ''}...</p>
                </div>
                <div class="video-stats">
                    <h3>Performance Analysis</h3>
                    <div class="stat-row"><span>Views</span><strong>${formatNumber(v.views)}</strong></div>
                    <div class="stat-row"><span>Contribution</span><strong>${v.contributionScore?.toFixed(2) || 0}x</strong></div>
                    <div class="stat-row"><span>Engagement</span><strong>${(v.performanceScore * 100 || 0).toFixed(2)}%</strong></div>
                    <canvas id="growthChart" width="400" height="200"></canvas>
                    
                    <h3>Top Comments</h3>
                    <div class="comments-list">
                        ${comments.map(c => `
                            <div class="comment">
                                <strong>${c.author} (${c.likes} likes)</strong>
                                <p>${c.text}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        const ctx = document.getElementById('growthChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Day 1', 'Day 3', 'Day 7', 'Day 14', 'Current'],
                datasets: [{
                    label: 'Estimated View Growth',
                    data: [v.views * 0.1, v.views * 0.3, v.views * 0.6, v.views * 0.8, v.views],
                    borderColor: '#ff0000',
                    tension: 0.4
                }]
            }
        });
    } catch (e) {
        elements.modalBody.innerHTML = '<p>Error loading details</p>';
    }
}

// Placeholder for missing modules (for UI completeness)
function renderContentAnalyzer() { elements.moduleContainer.innerHTML = '<h2>Content Analyzer</h2><p>Coming Soon</p>'; }
function renderAnalysisList() { renderVideoGrid(); }
function renderKeywordIntel() { elements.moduleContainer.innerHTML = '<h2>Keyword Intel</h2><p>Coming Soon</p>'; }
function renderBreakoutDetection() { elements.moduleContainer.innerHTML = '<h2>Breakout Detection</h2><p>Coming Soon</p>'; }

window.openVideoDetail = openVideoDetail;
window.addToAnalysisList = addToAnalysisList;

document.addEventListener('DOMContentLoaded', init);
