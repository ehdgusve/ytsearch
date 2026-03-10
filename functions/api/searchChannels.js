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
    const searchRes = await fetch(`${YT_API_BASE}/search?part=snippet&q=${encodeURIComponent(keyword)}&type=channel&maxResults=50&key=${apiKey}`);
    const searchData = await searchRes.json();
    
    const channelIds = searchData.items.map(item => item.id.channelId);
    const channelsRes = await fetch(`${YT_API_BASE}/channels?part=snippet,statistics&id=${channelIds.join(',')}&key=${apiKey}`);
    const channelsData = await channelsRes.json();

    const result = channelsData.items.map(item => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails.default.url,
      subscribers: parseInt(item.statistics.subscriberCount) || 0,
      totalViews: parseInt(item.statistics.viewCount) || 0,
      videoCount: parseInt(item.statistics.videoCount) || 0
    }));

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
