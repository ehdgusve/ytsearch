const axios = require('axios');

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Fetch video details in bulk
 */
async function fetchVideoDetails(videoIds, apiKey) {
    if (!videoIds || videoIds.length === 0) return [];
    
    const response = await axios.get(`${YT_API_BASE}/videos`, {
        params: {
            part: 'snippet,statistics,contentDetails,topicDetails',
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
        categoryId: item.snippet.categoryId,
        views: parseInt(item.statistics.viewCount) || 0,
        likes: parseInt(item.statistics.likeCount) || 0,
        comments: parseInt(item.statistics.commentCount) || 0,
        duration: item.contentDetails.duration,
        topicIds: item.topicDetails?.topicIds || []
    }));
}

/**
 * Calculate engagement rate
 */
function calculateEngagementRate(likes, comments, views) {
    if (!views) return 0;
    return (likes + comments) / views;
}

/**
 * Calculate view velocity (views per hour)
 */
function calculateViewVelocity(views, publishedAt) {
    const hoursSincePublished = Math.max(1, (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60));
    return views / hoursSincePublished;
}

/**
 * Calculate Viral Score
 */
function calculateViralScore(velocity, engagementRate) {
    // Viral Score = (Growth Velocity * 0.6) + (Engagement Rate * 0.4)
    // We normalize velocity for the score
    const normalizedVelocity = Math.log10(velocity + 1) * 10;
    const normalizedEngagement = engagementRate * 100;
    return (normalizedVelocity * 0.6) + (normalizedEngagement * 0.4);
}

/**
 * Extract trend keywords from titles
 */
function extractTrendKeywords(titles) {
    const wordFreq = {};
    const stopWords = new Set(['the', 'and', 'a', 'to', 'in', 'is', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'with', 'as', 'I', 'his', 'they', 'be', 'at', 'one', 'have', 'this', 'from', 'or', 'had', 'by', 'hot', 'but', 'some', 'what', 'there', 'we', 'can', 'out', 'other', 'were', 'all', 'your', 'when', 'up', 'use', 'word', 'how', 'said', 'an', 'each', 'she', 'which', 'do', 'their', 'time', 'if', 'will', 'way', 'about', 'many', 'then', 'them', 'write', 'would', 'like', 'so', 'these', 'her', 'long', 'make', 'thing', 'see', 'him', 'two', 'has', 'look', 'more', 'day', 'could', 'go', 'come', 'did', 'number', 'sound', 'no', 'most', 'people', 'my', 'over', 'know', 'water', 'than', 'call', 'first', 'who', 'may', 'down', 'side', 'been', 'now', 'find']);
    
    titles.forEach(title => {
        const words = title.toLowerCase().split(/[^\w\d가-힣]+/).filter(w => w.length > 1 && !stopWords.has(w));
        words.forEach(w => {
            wordFreq[w] = (wordFreq[w] || 0) + 1;
        });
    });

    return Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([keyword, count]) => ({ keyword, count }));
}

/**
 * Analyze search patterns
 */
function analyzePatterns(videos) {
    if (videos.length === 0) return null;

    const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
    const avgViews = totalViews / videos.length;
    const avgEngagement = videos.reduce((sum, v) => sum + calculateEngagementRate(v.likes, v.comments, v.views), 0) / videos.length;
    
    // Title patterns (e.g., use of brackets, question marks, numbers)
    const patterns = {
        brackets: videos.filter(v => /\[.*\]|\(.*\)/.test(v.title)).length / videos.length,
        questionMarks: videos.filter(v => /\?/.test(v.title)).length / videos.length,
        numbers: videos.filter(v => /\d+/.test(v.title)).length / videos.length,
        listicle: videos.filter(v => /^\d+/.test(v.title)).length / videos.length
    };

    return {
        avgViews,
        avgEngagement,
        patterns
    };
}

/**
 * Simple similarity score for recommendation estimation
 */
function calculateSimilarity(v1, v2) {
    let score = 0;
    
    // Title keyword overlap
    const words1 = new Set(v1.title.toLowerCase().split(/\s+/));
    const words2 = new Set(v2.title.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    score += (intersection.size / Math.max(1, words1.size)) * 0.5;

    // Category match
    if (v1.categoryId === v2.categoryId) score += 0.3;

    // Tag overlap
    const tags1 = new Set(v1.tags);
    const tags2 = new Set(v2.tags);
    const tagIntersection = new Set([...tags1].filter(x => tags2.has(x)));
    score += (tagIntersection.size / Math.max(1, tags1.size)) * 0.2;

    return score;
}

module.exports = {
    fetchVideoDetails,
    calculateEngagementRate,
    calculateViewVelocity,
    calculateViralScore,
    extractTrendKeywords,
    analyzePatterns,
    calculateSimilarity,
    YT_API_BASE
};
