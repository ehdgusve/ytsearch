export async function onRequest(context) {
  const { request } = context;
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get('regionCode');
  const videoCategoryId = searchParams.get('videoCategoryId');
  const apiKey = searchParams.get('apiKey');

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), { status: 400 });
  }

  const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

  try {
    let url = `${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&chart=mostPopular&maxResults=20&key=${apiKey}`;
    if (regionCode) url += `&regionCode=${regionCode}`;
    if (videoCategoryId) url += `&videoCategoryId=${videoCategoryId}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    const videos = data.items.map(item => ({
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

    const avgViews = videos.reduce((sum, v) => sum + v.views, 0) / (videos.length || 1);
    const avgEngagement = videos.reduce((sum, v) => sum + ((v.likes + v.comments) / (v.views || 1)), 0) / (videos.length || 1);

    return new Response(JSON.stringify({
      videos,
      stats: {
        avgViews,
        avgEngagement
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
