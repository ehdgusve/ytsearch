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
    const searchRes = await fetch(`${YT_API_BASE}/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&order=viewCount&maxResults=50&key=${apiKey}`);
    const searchData = await searchRes.json();
    
    const videoIds = searchData.items.map(item => item.id.videoId);
    const detailsRes = await fetch(`${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`);
    const detailsData = await detailsRes.json();

    const scored = detailsData.items.map(v => {
      const views = parseInt(v.statistics.viewCount) || 0;
      const likes = parseInt(v.statistics.likeCount) || 0;
      const comments = parseInt(v.statistics.commentCount) || 0;
      const publishedAt = v.snippet.publishedAt;

      const daysSincePublished = Math.max(1, (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24));
      const velocity = views / daysSincePublished;
      const engagementRate = (likes + comments) / (views || 1);
      
      return {
        id: v.id,
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        publishedAt,
        thumbnail: v.snippet.thumbnails.high?.url,
        views,
        likes,
        tags: v.snippet.tags || [],
        viralScore: (velocity * 0.0007) + (engagementRate * 100 * 0.3)
      };
    }).sort((a, b) => b.viralScore - a.viralScore);

    return new Response(JSON.stringify(scored), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
