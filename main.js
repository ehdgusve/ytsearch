/**
 * YouTube Research Suite - Pro Analytics Logic
 */

const state = {
    apiKey: localStorage.getItem('yt_api_key') || '',
    currentModule: 'dashboard',
    results: [],
    keyword: '',
    analysisList: JSON.parse(localStorage.getItem('yt_analysis_list') || '[]'),
    activeVideo: null,
    activeChannel: null,
    channelAverages: {} // Store channel stats for Contribution Score
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
    closeModal: document.querySelector('.close-modal')
};

// Initialize
function init() {
    if (state.apiKey) {
        elements.apiKeyInput.value = state.apiKey;
        updateApiStatus(true);
    }
    setupEventListeners();
    updateBadge();
    renderModule();
}

function setupEventListeners() {
    elements.saveKeyBtn.addEventListener('click', () => {
        state.apiKey = elements.apiKeyInput.value.trim();
        localStorage.setItem('yt_api_key', state.apiKey);
        updateApiStatus(!!state.apiKey);
        alert('API Key Saved');
    });

    elements.navLinks.forEach(link => {
        link.addEventListener('click', () => {
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
    elements.apiStatus.textContent = isOnline ? 'Online' : 'Offline';
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
    showLoader(true, 'Fetching data from YouTube...');

    try {
        let endpoint = '/api/searchVideos';
        let params = `?keyword=${encodeURIComponent(keyword)}&apiKey=${state.apiKey}`;

        if (state.currentModule === 'shorts-finder') {
            endpoint = '/api/searchShorts';
            params += `&period=${document.getElementById('date-range').value}`;
        } else if (state.currentModule === 'channel-discovery') {
            endpoint = '/api/searchChannels';
        }

        const res = await fetch(endpoint + params);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        state.results = data;

        // Enrich with Channel Averages for Contribution Score
        if (state.currentModule !== 'channel-discovery') {
            await enrichWithChannelStats();
        }

        calculateProMetrics();
        renderResults();
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        showLoader(false);
    }
}

async function enrichWithChannelStats() {
    const uniqueChannelIds = [...new Set(state.results.map(v => v.channelId))];
    showLoader(true, `Enriching stats for ${uniqueChannelIds.length} channels...`);
    
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
        const chan = state.channelAverages[v.channelId] || { avgViews: v.views };
        const contributionScore = v.views / Math.max(1, chan.avgViews);
        const performanceScore = (v.likes + (v.comments || 0)) / Math.max(1, v.views);
        
        // Exposure Probability (Engagement + Recency)
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
        case 'content-analyzer': renderContentAnalyzer(); break;
        case 'analysis-list': renderAnalysisList(); break;
        case 'keyword-intel': renderKeywordIntel(); break;
        case 'breakout-detector': renderBreakoutDetection(); break;
    }
}

function renderVideoGrid() {
    if (state.results.length === 0) {
        elements.moduleContainer.innerHTML = '<div class="card"><h3>Start a search to see results</h3></div>';
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
                            CS: ${v.contributionScore.toFixed(1)}x<br>
                            PS: ${(v.performanceScore * 100).toFixed(1)}%
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
                    <p class="text-muted">${v.description.substring(0, 200)}...</p>
                </div>
                <div class="video-stats">
                    <h3>Performance Analysis</h3>
                    <div class="stat-row"><span>Views</span><strong>${formatNumber(v.views)}</strong></div>
                    <div class="stat-row"><span>Contribution</span><strong>${v.contributionScore.toFixed(2)}x</strong></div>
                    <div class="stat-row"><span>Engagement</span><strong>${(v.performanceScore * 100).toFixed(2)}%</strong></div>
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
        renderGrowthChart(v.views);
    } catch (e) {
        elements.modalBody.innerHTML = '<p>Error loading details</p>';
    }
}

function renderGrowthChart(views) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 3', 'Day 7', 'Day 14', 'Current'],
            datasets: [{
                label: 'Estimated View Growth',
                data: [views * 0.1, views * 0.3, views * 0.6, views * 0.8, views],
                borderColor: '#ff0000',
                tension: 0.4
            }]
        }
    });
}

function renderDashboard() {
    if (state.results.length === 0) {
        elements.moduleContainer.innerHTML = '<h2>Dashboard</h2><p>Search first to see analytics.</p>';
        return;
    }

    const html = `
        <h2>Pro Analytics Dashboard</h2>
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

    // Charts
    const viewsData = state.results.map(v => v.views);
    new Chart(document.getElementById('viewsDistChart'), {
        type: 'bar',
        data: {
            labels: state.results.slice(0, 5).map(v => v.title.substring(0, 15) + '...'),
            datasets: [{ label: 'Views', data: viewsData.slice(0, 5), backgroundColor: '#ff0000' }]
        }
    });

    const engagementData = state.results.map(v => v.performanceScore * 100);
    new Chart(document.getElementById('engagementDistChart'), {
        type: 'radar',
        data: {
            labels: state.results.slice(0, 5).map(v => v.title.substring(0, 10)),
            datasets: [{ label: 'Engagement Rate %', data: engagementData.slice(0, 5), borderColor: '#065fd4' }]
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

// Expose functions for inline onclick handlers
window.openVideoDetail = openVideoDetail;
window.addToAnalysisList = addToAnalysisList;

document.addEventListener('DOMContentLoaded', init);
