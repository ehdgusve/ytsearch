export async function onRequest(context) {
  const { request } = context;
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');
  const apiKey = searchParams.get('apiKey');

  if (!channelId || !apiKey) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
  }

  const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

  try {
    const channelRes = await fetch(`${YT_API_BASE}/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${channelId}&key=${apiKey}`);
    const channelData = await channelRes.json();

    if (!channelData.items || channelData.items.length === 0) throw new Error('Channel not found');

    const channel = channelData.items[0];
    const stats = channel.statistics;
    
    // Get latest videos
    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
    const playlistRes = await fetch(`${YT_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=10&key=${apiKey}`);
    const playlistData = await playlistRes.json();

    const videoIds = playlistData.items.map(v => v.contentDetails.videoId);
    const videosRes = await fetch(`${YT_API_BASE}/videos?part=snippet,statistics&id=${videoIds.join(',')}&key=${apiKey}`);
    const videosData = await videosRes.json();

    const latestVideos = videosData.items.map(v => ({
      id: v.id,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails.high?.url,
      views: parseInt(v.statistics.viewCount) || 0,
      likes: parseInt(v.statistics.likeCount) || 0,
      comments: parseInt(v.statistics.commentCount) || 0,
      publishedAt: v.snippet.publishedAt
    }));

    return new Response(JSON.stringify({
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnail: channel.snippet.thumbnails.high?.url,
      publishedAt: channel.snippet.publishedAt,
      country: channel.snippet.country,
      subscribers: parseInt(stats.subscriberCount) || 0,
      totalViews: parseInt(stats.viewCount) || 0,
      videoCount: parseInt(stats.videoCount) || 0,
      latestVideos
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
