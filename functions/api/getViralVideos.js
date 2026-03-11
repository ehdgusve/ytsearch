export async function onRequest(context) {
  const { request } = context;
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  const apiKey = searchParams.get('apiKey');

  const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

  try {
    const searchRes = await fetch(`${YT_API_BASE}/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&order=date&maxResults=50&key=${apiKey}`);
    const searchData = await searchRes.json();
    if (searchData.error) throw new Error(searchData.error.message);
    const videoIds = searchData.items.map(item => item.id.videoId);

    const detailsRes = await fetch(`${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`);
    const detailsData = await detailsRes.json();

    const scored = detailsData.items.map(v => {
        const views = parseInt(v.statistics.viewCount) || 0;
        const likes = parseInt(v.statistics.likeCount) || 0;
        const comments = parseInt(v.statistics.commentCount) || 0;
        const hours = Math.max(1, (Date.now() - new Date(v.snippet.publishedAt).getTime()) / (1000 * 60 * 60));
        const velocity = views / hours;
        const engagementRate = (likes + comments) / (views || 1);
        const viralScore = (Math.log10(velocity + 1) * 6) + (engagementRate * 40);

        return {
            id: v.id,
            title: v.snippet.title,
            channelTitle: v.snippet.channelTitle,
            thumbnail: v.snippet.thumbnails.high?.url,
            views,
            likes,
            comments,
            publishedAt: v.snippet.publishedAt,
            velocity,
            engagementRate,
            viralScore
        };
    }).sort((a, b) => b.viralScore - a.viralScore).slice(0, 20);

    return new Response(JSON.stringify(scored), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
