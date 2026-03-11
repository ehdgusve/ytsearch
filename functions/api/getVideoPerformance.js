export async function onRequest(context) {
  const { request } = context;
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const apiKey = searchParams.get('apiKey');

  const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

  try {
    const res = await fetch(`${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const v = data.items[0];

    const views = parseInt(v.statistics.viewCount) || 0;
    const likes = parseInt(v.statistics.likeCount) || 0;
    const comments = parseInt(v.statistics.commentCount) || 0;
    const hours = Math.max(1, (Date.now() - new Date(v.snippet.publishedAt).getTime()) / (1000 * 60 * 60));
    
    return new Response(JSON.stringify({
      id: v.id,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails.high?.url,
      views,
      likes,
      comments,
      publishedAt: v.snippet.publishedAt,
      velocity: views / hours,
      engagementRate: (likes + comments) / (views || 1)
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
