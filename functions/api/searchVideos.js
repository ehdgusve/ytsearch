export async function onRequest(context) {
  const { request, env } = context;
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  const apiKey = searchParams.get('apiKey');

  if (!keyword || !apiKey) {
    return new Response(JSON.stringify({ error: 'Missing keyword or API key' }), { status: 400 });
  }

  const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

  try {
    const searchRes = await fetch(`${YT_API_BASE}/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&maxResults=50&key=${apiKey}`);
    const searchData = await searchRes.json();

    if (searchData.error) throw new Error(searchData.error.message);

    const videoIds = searchData.items.map(item => item.id.videoId);
    
    // Bulk fetch video details
    const detailsRes = await fetch(`${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`);
    const detailsData = await detailsRes.json();

    const details = detailsData.items.map(item => ({
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

    return new Response(JSON.stringify(details), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
