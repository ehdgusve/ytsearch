const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const { 
    fetchVideoDetails, 
    calculateEngagementRate, 
    calculateViewVelocity, 
    calculateViralScore, 
    extractTrendKeywords, 
    analyzePatterns, 
    calculateSimilarity,
    YT_API_BASE
} = require('./utils');

admin.initializeApp();
const db = admin.firestore();

/**
 * 1, 2, 3 - Region & Category Trend Analysis
 */
exports.getTrendVideos = functions.https.onCall(async (data, context) => {
    const { regionCode, videoCategoryId, apiKey } = data;
    
    try {
        const params = {
            part: 'snippet,statistics,contentDetails',
            chart: 'mostPopular',
            maxResults: 20,
            key: apiKey
        };
        if (regionCode) params.regionCode = regionCode;
        if (videoCategoryId) params.videoCategoryId = videoCategoryId;

        const response = await axios.get(`${YT_API_BASE}/videos`, { params });
        const videos = response.data.items.map(item => ({
            id: item.id,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            views: parseInt(item.statistics.viewCount) || 0,
            likes: parseInt(item.statistics.likeCount) || 0,
            comments: parseInt(item.statistics.commentCount) || 0,
            categoryId: item.snippet.categoryId,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url
        }));

        const avgViews = videos.reduce((sum, v) => sum + v.views, 0) / videos.length;
        const avgEngagement = videos.reduce((sum, v) => sum + calculateEngagementRate(v.likes, v.comments, v.views), 0) / videos.length;

        return {
            videos,
            stats: {
                avgViews,
                avgEngagement
            }
        };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * 4, 5, 8 - Keyword Search Analysis & Patterns
 */
exports.analyzeKeyword = functions.https.onCall(async (data, context) => {
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

        const analysis = analyzePatterns(details);
        const trendKeywords = extractTrendKeywords(details.map(v => v.title));

        return {
            videos: details,
            analysis,
            trendKeywords
        };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * 6 - Recommendation Estimation
 */
exports.getRecommendations = functions.https.onCall(async (data, context) => {
    const { videoId, apiKey } = data;
    
    try {
        // Get target video details
        const targetDetails = await fetchVideoDetails([videoId], apiKey);
        if (targetDetails.length === 0) throw new Error('Video not found');
        const target = targetDetails[0];

        // Search for similar videos by keyword/tags
        const searchRes = await axios.get(`${YT_API_BASE}/search`, {
            params: {
                part: 'snippet',
                q: target.title,
                type: 'video',
                maxResults: 20,
                key: apiKey
            }
        });

        const videoIds = searchRes.data.items.map(item => item.id.videoId).filter(id => id !== videoId);
        const candidates = await fetchVideoDetails(videoIds, apiKey);

        const recommendations = candidates.map(v => ({
            ...v,
            similarityScore: calculateSimilarity(target, v)
        })).sort((a, b) => b.similarityScore - a.similarityScore);

        return recommendations;
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * 7 - Viral Video Detection (Enhanced)
 */
exports.getViralVideos = functions.https.onCall(async (data, context) => {
    const { keyword, apiKey } = data;

    try {
        const searchRes = await axios.get(`${YT_API_BASE}/search`, {
            params: {
                part: 'snippet',
                q: keyword,
                type: 'video',
                order: 'date', // Recent videos
                maxResults: 50,
                key: apiKey
            }
        });

        const videoIds = searchRes.data.items.map(item => item.id.videoId);
        const details = await fetchVideoDetails(videoIds, apiKey);

        const scored = details.map(v => {
            const velocity = calculateViewVelocity(v.views, v.publishedAt);
            const engagementRate = calculateEngagementRate(v.likes, v.comments, v.views);
            const viralScore = calculateViralScore(velocity, engagementRate);
            
            return {
                ...v,
                velocity,
                engagementRate,
                viralScore
            };
        }).sort((a, b) => b.viralScore - a.viralScore).slice(0, 20);

        return scored;
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * 9 - Channel Analysis
 */
exports.getChannelAnalysis = functions.https.onCall(async (data, context) => {
    const { channelId, apiKey } = data;

    try {
        const channelRes = await axios.get(`${YT_API_BASE}/channels`, {
            params: {
                part: 'snippet,statistics,contentDetails',
                id: channelId,
                key: apiKey
            }
        });

        if (channelRes.data.items.length === 0) throw new Error('Channel not found');
        const channel = channelRes.data.items[0];

        // Get recent videos
        const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
        const playlistRes = await axios.get(`${YT_API_BASE}/playlistItems`, {
            params: {
                part: 'snippet',
                playlistId: uploadsPlaylistId,
                maxResults: 20,
                key: apiKey
            }
        });

        const videoIds = playlistRes.data.items.map(item => item.snippet.resourceId.videoId);
        const videoDetails = await fetchVideoDetails(videoIds, apiKey);

        const avgViews = videoDetails.reduce((sum, v) => sum + v.views, 0) / videoDetails.length;
        const avgEngagement = videoDetails.reduce((sum, v) => sum + calculateEngagementRate(v.likes, v.comments, v.views), 0) / videoDetails.length;

        return {
            channel: {
                id: channel.id,
                title: channel.snippet.title,
                subscribers: parseInt(channel.statistics.subscriberCount) || 0,
                totalViews: parseInt(channel.statistics.viewCount) || 0,
                videoCount: parseInt(channel.statistics.videoCount) || 0,
                thumbnail: channel.snippet.thumbnails.default.url
            },
            stats: {
                avgViews,
                avgEngagement,
                recentVideos: videoDetails
            }
        };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * 10 - Video Performance Analysis
 */
exports.getVideoPerformance = functions.https.onCall(async (data, context) => {
    const { videoId, apiKey } = data;

    try {
        const details = await fetchVideoDetails([videoId], apiKey);
        if (details.length === 0) throw new Error('Video not found');
        const v = details[0];

        const velocity = calculateViewVelocity(v.views, v.publishedAt);
        const engagementRate = calculateEngagementRate(v.likes, v.comments, v.views);

        return {
            ...v,
            velocity,
            engagementRate
        };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Maintain existing functions but they can be refactored to use utils if needed
exports.searchVideos = functions.https.onCall(async (data, context) => {
    const { keyword, apiKey } = data;
    try {
        const searchRes = await axios.get(`${YT_API_BASE}/search`, {
            params: { part: 'snippet', q: keyword, type: 'video', maxResults: 50, key: apiKey }
        });
        const videoIds = searchRes.data.items.map(item => item.id.videoId);
        return await fetchVideoDetails(videoIds, apiKey);
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

exports.searchChannels = functions.https.onCall(async (data, context) => {
    const { keyword, apiKey } = data;
    try {
        const searchRes = await axios.get(`${YT_API_BASE}/search`, {
            params: { part: 'snippet', q: keyword, type: 'channel', maxResults: 20, key: apiKey }
        });
        const channelIds = searchRes.data.items.map(item => item.id.channelId);
        const channelRes = await axios.get(`${YT_API_BASE}/channels`, {
            params: { part: 'snippet,statistics', id: channelIds.join(','), key: apiKey }
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
