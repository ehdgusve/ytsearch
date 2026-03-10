/**
 * YouTube Research Suite - Cloudflare Optimized
 */

// State Management
const state = {
    apiKey: localStorage.getItem('yt_api_key') || '',
    currentModule: 'dashboard',
    results: [],
    keyword: ''
};

// DOM Elements
const elements = {
    apiKeyInput: document.getElementById('api-key'),
    saveKeyBtn: document.getElementById('save-api-key'),
    keywordInput: document.getElementById('keyword-input'),
    searchBtn: document.getElementById('main-search-btn'),
    navLinks: document.querySelectorAll('.nav-links li'),
    moduleContainer: document.getElementById('module-container'),
    apiStatus: document.getElementById('api-status'),
    loader: document.getElementById('loader'),
    exportBar: document.querySelector('.export-bar'),
    resultCount: document.getElementById('result-count'),
    exportCsv: document.getElementById('export-csv'),
    exportJson: document.getElementById('export-json')
};

// Initialize App
function init() {
    if (state.apiKey) {
        elements.apiKeyInput.value = state.apiKey;
        updateApiStatus(true);
    }
    setupEventListeners();
}

function setupEventListeners() {
    elements.saveKeyBtn.addEventListener('click', () => {
        const key = elements.apiKeyInput.value.trim();
        if (key) {
            state.apiKey = key;
            localStorage.setItem('yt_api_key', key);
            updateApiStatus(true);
            alert('API Key saved successfully!');
        }
    });

    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            elements.navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            state.currentModule = link.dataset.module;
            renderModule();
        });
    });

    elements.searchBtn.addEventListener('click', handleSearch);
    elements.keywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    elements.exportCsv.addEventListener('click', () => exportData('csv'));
    elements.exportJson.addEventListener('click', () => exportData('json'));
}

function updateApiStatus(isOnline) {
    elements.apiStatus.textContent = isOnline ? 'Online' : 'Offline';
    elements.apiStatus.className = isOnline ? 'status-online' : 'status-offline';
}

async function handleSearch() {
    const keyword = elements.keywordInput.value.trim();
    if (!keyword) return alert('Please enter a keyword');
    if (!state.apiKey) return alert('Please enter and save your API Key first');

    state.keyword = keyword;
    showLoader(true);

    try {
        let endpoint = '/api/searchVideos';
        let params = `?keyword=${encodeURIComponent(keyword)}&apiKey=${state.apiKey}`;

        switch (state.currentModule) {
            case 'shorts-finder':
                endpoint = '/api/searchShorts';
                const period = document.getElementById('shorts-period')?.value || '30';
                params += `&period=${period}`;
                break;
            case 'channel-scraper':
                endpoint = '/api/searchChannels';
                break;
            case 'viral-collector':
                endpoint = '/api/searchViralVideos';
                break;
        }
        
        const response = await fetch(endpoint + params);
        if (!response.ok) throw new Error('API request failed');
        
        state.results = await response.json();
        renderResults();
    } catch (error) {
        console.error('Search failed:', error);
        alert('Error fetching data. Check console for details.');
    } finally {
        showLoader(false);
    }
}

function showLoader(show) {
    if (show) {
        elements.loader.classList.remove('hidden');
        document.querySelector('.module-view')?.classList.add('hidden');
    } else {
        elements.loader.classList.add('hidden');
        document.querySelector('.module-view')?.classList.remove('hidden');
    }
}

// Module Rendering
function renderModule() {
    const container = document.getElementById('module-container');
    const views = container.querySelectorAll('.module-view');
    views.forEach(v => v.classList.add('hidden'));

    let moduleHtml = '';
    switch (state.currentModule) {
        case 'dashboard':
            moduleHtml = `
                <div id="dashboard" class="module-view">
                    <h2>YouTube Research Dashboard</h2>
                    <p>Enter a keyword and search to begin analysis.</p>
                    <div id="results-display"></div>
                </div>`;
            break;
        case 'shorts-finder':
            moduleHtml = `
                <div id="shorts-finder" class="module-view">
                    <h2>Shorts Viral Finder</h2>
                    <div class="filter-bar">
                        <select id="shorts-period">
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 90 Days</option>
                        </select>
                    </div>
                    <div id="results-display"></div>
                </div>`;
            break;
        case 'channel-scraper':
            moduleHtml = `
                <div id="channel-scraper" class="module-view">
                    <h2>Channel Scraper</h2>
                    <p>Discover top channels in this niche.</p>
                    <div id="results-display"></div>
                </div>`;
            break;
        case 'tag-analyzer':
            moduleHtml = `
                <div id="tag-analyzer" class="module-view">
                    <h2>Tag Database Analyzer</h2>
                    <div id="tag-report-container">
                        ${renderTagAnalyzer()}
                    </div>
                </div>`;
            break;
        case 'viral-collector':
            moduleHtml = `
                <div id="viral-collector" class="module-view">
                    <h2>Viral Video Collector</h2>
                    <p>High-performing videos based on viral algorithms.</p>
                    <div id="results-display"></div>
                </div>`;
            break;
    }

    const existing = document.getElementById(state.currentModule);
    if (existing) {
        existing.classList.remove('hidden');
    } else {
        const div = document.createElement('div');
        div.innerHTML = moduleHtml;
        container.appendChild(div.firstElementChild);
    }
    
    if (state.results.length > 0) renderResults();
}

function renderResults() {
    const display = document.querySelector('.module-view:not(.hidden) #results-display');
    if (!display) return;

    elements.exportBar.classList.remove('hidden');
    elements.resultCount.textContent = state.results.length;

    display.innerHTML = state.currentModule === 'channel-scraper' 
        ? renderChannelTable(state.results) 
        : renderVideoTable(state.results);
}

function renderVideoTable(videos) {
    return `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Thumbnail</th>
                    <th>Title</th>
                    <th>Channel</th>
                    <th>Views</th>
                    <th>Likes</th>
                    <th>Date</th>
                    ${state.currentModule === 'shorts-finder' || state.currentModule === 'viral-collector' ? '<th>Score</th>' : ''}
                    <th>Links</th>
                </tr>
            </thead>
            <tbody>
                ${videos.map(v => `
                    <tr>
                        <td class="thumbnail-cell"><img src="${v.thumbnail}" alt="thumb"></td>
                        <td>${highlightText(v.title, state.keyword)}</td>
                        <td>${v.channelTitle}</td>
                        <td>${formatNumber(v.views)}</td>
                        <td>${formatNumber(v.likes)}</td>
                        <td>${new Date(v.publishedAt).toLocaleDateString()}</td>
                        ${v.viralScore ? `<td><strong>${v.viralScore.toFixed(1)}</strong></td>` : ''}
                        <td><a href="https://youtube.com/watch?v=${v.id}" target="_blank">View</a></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderChannelTable(channels) {
    return `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Thumbnail</th>
                    <th>Channel Name</th>
                    <th>Subscribers</th>
                    <th>Total Views</th>
                    <th>Videos</th>
                </tr>
            </thead>
            <tbody>
                ${channels.map(c => `
                    <tr>
                        <td class="thumbnail-cell"><img src="${c.thumbnail}" style="width: 50px; border-radius: 50%;"></td>
                        <td>${c.title}</td>
                        <td>${formatNumber(c.subscribers)}</td>
                        <td>${formatNumber(c.totalViews)}</td>
                        <td>${formatNumber(c.videoCount)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderTagAnalyzer() {
    if (state.results.length === 0) return '<p>Search first to analyze tags.</p>';
    const tags = {};
    state.results.forEach(v => v.tags?.forEach(t => tags[t] = (tags[t] || 0) + 1));
    const sortedTags = Object.entries(tags).sort((a,b) => b[1] - a[1]).slice(0, 30);
    return `<h3>Top 30 Tags</h3><div class="tag-cloud">${sortedTags.map(([tag, count]) => `<span class="tag">${tag} (${count})</span>`).join('')}</div>`;
}

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

function exportData(format) {
    if (state.results.length === 0) return;
    const content = format === 'json' ? JSON.stringify(state.results, null, 2) : 
        Object.keys(state.results[0]).join(',') + '\n' + state.results.map(obj => Object.values(obj).map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yt_research_${state.keyword}_${Date.now()}.${format}`;
    a.click();
}

document.addEventListener('DOMContentLoaded', init);
