export async function onRequest(context) {
  const { request } = context;
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  const apiKey = searchParams.get('apiKey');

  if (!keyword || !apiKey) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
  }

  const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

  try {
    const searchRes = await fetch(`${YT_API_BASE}/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&maxResults=50&key=${apiKey}`);
    const searchData = await searchRes.json();
    if (searchData.error) throw new Error(searchData.error.message);

    const videoIds = searchData.items.map(item => item.id.videoId);
    const detailsRes = await fetch(`${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`);
    const detailsData = await detailsRes.json();

    const videos = detailsData.items.map(item => ({
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

    // Pattern Analysis
    const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
    const avgViews = totalViews / (videos.length || 1);
    const patterns = {
        brackets: videos.filter(v => /\[.*\]|\(.*\)/.test(v.title)).length / (videos.length || 1),
        numbers: videos.filter(v => /\d+/.test(v.title)).length / (videos.length || 1),
        questionMarks: videos.filter(v => /\?/.test(v.title)).length / (videos.length || 1)
    };

    // Keyword Extraction
    const wordFreq = {};
    videos.forEach(v => {
        v.title.toLowerCase().split(/[^\w\d가-힣]+/).forEach(w => {
            if (w.length > 2) wordFreq[w] = (wordFreq[w] || 0) + 1;
        });
    });
    const trendKeywords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([keyword, count]) => ({ keyword, count }));

    return new Response(JSON.stringify({
      videos,
      analysis: { avgViews, patterns },
      trendKeywords
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
