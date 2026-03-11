export async function onRequest(context) {
  const { request } = context;
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');
  const apiKey = searchParams.get('apiKey');

  const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

  try {
    const channelRes = await fetch(`${YT_API_BASE}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`);
    const channelData = await channelRes.json();
    if (channelData.error) throw new Error(channelData.error.message);
    const channel = channelData.items[0];

    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
    const playlistRes = await fetch(`${YT_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=20&key=${apiKey}`);
    const playlistData = await playlistRes.json();
    const videoIds = playlistData.items.map(v => v.contentDetails.videoId);

    const detailsRes = await fetch(`${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`);
    const detailsData = await detailsRes.json();

    const videoDetails = detailsData.items.map(v => ({
      id: v.id,
      title: v.snippet.title,
      channelTitle: v.snippet.channelTitle,
      publishedAt: v.snippet.publishedAt,
      views: parseInt(v.statistics.viewCount) || 0,
      likes: parseInt(v.statistics.likeCount) || 0,
      comments: parseInt(v.statistics.commentCount) || 0,
      thumbnail: v.snippet.thumbnails.high?.url || v.snippet.thumbnails.default?.url
    }));

    const avgViews = videoDetails.reduce((sum, v) => sum + v.views, 0) / (videoDetails.length || 1);
    const avgEngagement = videoDetails.reduce((sum, v) => sum + ((v.likes + v.comments) / (v.views || 1)), 0) / (videoDetails.length || 1);

    return new Response(JSON.stringify({
      channel: {
        id: channel.id,
        title: channel.snippet.title,
        subscribers: parseInt(channel.statistics.subscriberCount) || 0,
        totalViews: parseInt(channel.statistics.viewCount) || 0,
        videoCount: parseInt(channel.statistics.videoCount) || 0,
        thumbnail: channel.snippet.thumbnails.default.url
      },
      stats: {
        avgViews,
        avgEngagement,
        recentVideos: videoDetails
      }
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
