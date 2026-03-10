export async function onRequest(context) {
  const { request } = context;
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  const apiKey = searchParams.get('apiKey');
  const period = searchParams.get('period') || '30';

  if (!keyword || !apiKey) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
  }

  const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
  const publishedAfter = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();

  try {
    const searchRes = await fetch(`${YT_API_BASE}/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&videoDuration=short&order=viewCount&publishedAfter=${publishedAfter}&maxResults=50&key=${apiKey}`);
    const searchData = await searchRes.json();
    
    const videoIds = searchData.items.map(item => item.id.videoId);
    const detailsRes = await fetch(`${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`);
    const detailsData = await detailsRes.json();

    const scoredDetails = detailsData.items.map(item => {
      const views = parseInt(item.statistics.viewCount) || 0;
      const likes = parseInt(item.statistics.likeCount) || 0;
      const comments = parseInt(item.statistics.commentCount) || 0;
      
      return {
        id: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails.high?.url,
        views,
        likes,
        tags: item.snippet.tags || [],
        viralScore: (views * 0.0006) + (likes * 0.003) + (comments * 0.01)
      };
    }).sort((a, b) => b.viralScore - a.viralScore);

    return new Response(JSON.stringify(scoredDetails), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
