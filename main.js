/**
 * YouTube Research Suite - Core Logic
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
    // API Key Save
    elements.saveKeyBtn.addEventListener('click', () => {
        const key = elements.apiKeyInput.value.trim();
        if (key) {
            state.apiKey = key;
            localStorage.setItem('yt_api_key', key);
            updateApiStatus(true);
            alert('API Key saved successfully!');
        }
    });

    // Navigation
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            elements.navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            state.currentModule = link.dataset.module;
            renderModule();
        });
    });

    // Search
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.keywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Export
    elements.exportCsv.addEventListener('click', () => exportData('csv'));
    elements.exportJson.addEventListener('click', () => exportData('json'));
}

function updateApiStatus(isOnline) {
    if (isOnline) {
        elements.apiStatus.textContent = 'Online';
        elements.apiStatus.className = 'status-online';
    } else {
        elements.apiStatus.textContent = 'Offline';
        elements.apiStatus.className = 'status-offline';
    }
}

async function handleSearch() {
    const keyword = elements.keywordInput.value.trim();
    if (!keyword) return alert('Please enter a keyword');
    if (!state.apiKey) return alert('Please enter and save your API Key first');

    state.keyword = keyword;
    showLoader(true);

    try {
        let data;
        switch (state.currentModule) {
            case 'shorts-finder':
                data = await fetchShorts(keyword);
                break;
            case 'channel-scraper':
                data = await fetchChannels(keyword);
                break;
            case 'viral-collector':
                data = await fetchViralVideos(keyword);
                break;
            default:
                data = await fetchGeneralSearch(keyword);
        }
        
        state.results = data;
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
    // Keep loader
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
                        <input type="number" id="min-views" placeholder="Min Views (e.g. 10000)">
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

    // Replace or update content area
    // Simplified for now: append a new div if it doesn't exist
    const existing = document.getElementById(state.currentModule);
    if (existing) {
        existing.classList.remove('hidden');
    } else {
        const div = document.createElement('div');
        div.innerHTML = moduleHtml;
        container.appendChild(div.firstElementChild);
    }
    
    // Reset results view if switching modules
    if (state.results.length > 0) {
        renderResults();
    }
}

// Result Rendering
function renderResults() {
    const display = document.querySelector('.module-view:not(.hidden) #results-display');
    if (!display) return;

    elements.exportBar.classList.remove('hidden');
    elements.resultCount.textContent = state.results.length;

    let html = '';
    if (state.currentModule === 'channel-scraper') {
        html = renderChannelTable(state.results);
    } else {
        html = renderVideoTable(state.results);
    }
    
    display.innerHTML = html;
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
                    <th>Action</th>
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
                        <td><button onclick="analyzeChannel('${c.id}')" class="btn-outline">Analyze Latest</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderTagAnalyzer() {
    if (state.results.length === 0) return '<p>Search first to analyze tags.</p>';
    
    const tags = {};
    state.results.forEach(v => {
        if (v.tags) {
            v.tags.forEach(t => {
                tags[t] = (tags[t] || 0) + 1;
            });
        }
    });

    const sortedTags = Object.entries(tags).sort((a,b) => b[1] - a[1]).slice(0, 30);

    return `
        <h3>Top 30 Tags</h3>
        <div class="tag-cloud">
            ${sortedTags.map(([tag, count]) => `<span class="tag">${tag} (${count})</span>`).join('')}
        </div>
    `;
}

// Helper Functions
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
}

function highlightText(text, keyword) {
    if (!keyword) return text;
    const re = new RegExp(`(${keyword})`, 'gi');
    return text.replace(re, '<span class="highlight">$1</span>');
}

// Firebase Configuration (Replace with your own project config if needed)
// Usually, Firebase Studio provides these as environment variables or auto-config
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const functions = firebase.functions();

// Use emulator if running locally
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // functions.useEmulator("localhost", 5001);
}

// API Fetching (Proxied via Firebase Functions)
async function callFirebaseFunction(name, data) {
    console.log(`Calling Firebase Function: ${name}`, data);
    try {
        const fn = functions.httpsCallable(name);
        const result = await fn(data);
        return result.data;
    } catch (error) {
        console.error(`Error in ${name}:`, error);
        // Fallback to mock for development if functions are not yet deployed
        if (error.code === 'not-found' || error.code === 'unavailable') {
            console.warn('Functions not found, using mock data.');
            return getMockData(name, data);
        }
        throw error;
    }
}

function getMockData(name, data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const results = [];
            for (let i = 0; i < 10; i++) {
                results.push({
                    id: 'vid' + i,
                    title: `Sample ${name} Result ${i} for ${data.keyword}`,
                    channelTitle: 'Elite Creator',
                    views: Math.floor(Math.random() * 5000000),
                    likes: Math.floor(Math.random() * 100000),
                    comments: Math.floor(Math.random() * 5000),
                    thumbnail: 'https://via.placeholder.com/120x90',
                    publishedAt: new Date().toISOString(),
                    tags: ['marketing', 'seo', 'youtube', 'viral'],
                    viralScore: Math.random() * 100
                });
            }
            resolve(results);
        }, 1000);
    });
}

function exportData(format) {
    if (state.results.length === 0) return;
    
    let content = '';
    let mimeType = '';
    let fileName = `yt_research_${state.keyword}_${new Date().getTime()}`;

    if (format === 'json') {
        content = JSON.stringify(state.results, null, 2);
        mimeType = 'application/json';
        fileName += '.json';
    } else {
        const headers = Object.keys(state.results[0]).join(',');
        const rows = state.results.map(obj => Object.values(obj).map(val => `"${val}"`).join(',')).join('\n');
        content = headers + '\n' + rows;
        mimeType = 'text/csv';
        fileName += '.csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
