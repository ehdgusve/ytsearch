const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Helper to fetch video details in bulk
 */
async function fetchVideoDetails(videoIds, apiKey) {
    const response = await axios.get(`${YT_API_BASE}/videos`, {
        params: {
            part: 'snippet,statistics,contentDetails',
            id: videoIds.join(','),
            key: apiKey
        }
    });
    
    return response.data.items.map(item => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        tags: item.snippet.tags || [],
        views: parseInt(item.statistics.viewCount) || 0,
        likes: parseInt(item.statistics.likeCount) || 0,
        comments: parseInt(item.statistics.commentCount) || 0,
        duration: item.contentDetails.duration
    }));
}

/**
 * CORE FEATURE 2 — KEYWORD VIDEO SEARCH
 */
exports.searchVideos = functions.https.onCall(async (data, context) => {
    const { keyword, apiKey } = data;
    
    try {
        const searchRes = await axios.get(`${YT_API_BASE}/search`, {
            params: {
                part: 'snippet',
                q: keyword,
                type: 'video',
                maxResults: 50,
                key: apiKey
            }
        });

        const videoIds = searchRes.data.items.map(item => item.id.videoId);
        const details = await fetchVideoDetails(videoIds, apiKey);

        // Save to Firestore for history
        await db.collection('searches').add({
            keyword,
            type: 'general',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            count: details.length
        });

        return details;
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * MODULE 1 — SHORTS VIRAL FINDER
 */
exports.searchShorts = functions.https.onCall(async (data, context) => {
    const { keyword, apiKey, period } = data;
    const publishedAfter = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();

    try {
        const searchRes = await axios.get(`${YT_API_BASE}/search`, {
            params: {
                part: 'snippet',
                q: keyword,
                type: 'video',
                videoDuration: 'short',
                order: 'viewCount',
                publishedAfter,
                maxResults: 50,
                key: apiKey
            }
        });

        const videoIds = searchRes.data.items.map(item => item.id.videoId);
        const details = await fetchVideoDetails(videoIds, apiKey);

        // Calculate Viral Score
        // Viral Score = (views * 0.6) + (likes * 0.3) + (comments * 0.1)
        const scoredDetails = details.map(v => ({
            ...v,
            viralScore: (v.views * 0.0006) + (v.likes * 0.003) + (v.comments * 0.01) // Normalized for display
        })).sort((a, b) => b.viralScore - a.viralScore);

        return scoredDetails;
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * MODULE 3 — CHANNEL SCRAPER
 */
exports.searchChannels = functions.https.onCall(async (data, context) => {
    const { keyword, apiKey } = data;

    try {
        const searchRes = await axios.get(`${YT_API_BASE}/search`, {
            params: {
                part: 'snippet',
                q: keyword,
                type: 'channel',
                maxResults: 20,
                key: apiKey
            }
        });

        const channelIds = searchRes.data.items.map(item => item.id.channelId);
        
        const channelRes = await axios.get(`${YT_API_BASE}/channels`, {
            params: {
                part: 'snippet,statistics',
                id: channelIds.join(','),
                key: apiKey
            }
        });

        return channelRes.data.items.map(item => ({
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.default.url,
            subscribers: parseInt(item.statistics.subscriberCount) || 0,
            totalViews: parseInt(item.statistics.viewCount) || 0,
            videoCount: parseInt(item.statistics.videoCount) || 0
        }));
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * MODULE 2 — VIRAL VIDEO COLLECTOR
 */
exports.searchViralVideos = functions.https.onCall(async (data, context) => {
    const { keyword, apiKey } = data;

    try {
        // High performing videos usually have high view count relative to date
        const searchRes = await axios.get(`${YT_API_BASE}/search`, {
            params: {
                part: 'snippet',
                q: keyword,
                type: 'video',
                order: 'viewCount',
                maxResults: 50,
                key: apiKey
            }
        });

        const videoIds = searchRes.data.items.map(item => item.id.videoId);
        const details = await fetchVideoDetails(videoIds, apiKey);

        // Analysis metrics: Views-to-subscriber ratio (requires channel info)
        // For brevity in this prototype, we'll use an advanced Viral Score
        const scored = details.map(v => {
            const daysSincePublished = Math.max(1, (Date.now() - new Date(v.publishedAt).getTime()) / (1000 * 60 * 60 * 24));
            const velocity = v.views / daysSincePublished;
            const engagementRate = (v.likes + v.comments) / (v.views || 1);
            
            return {
                ...v,
                viralScore: (velocity * 0.7) + (engagementRate * 100000 * 0.3)
            };
        }).sort((a, b) => b.viralScore - a.viralScore);

        return scored;
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});
