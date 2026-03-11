export async function onRequest(context) {
  const { request } = context;
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const apiKey = searchParams.get('apiKey');

  const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

  try {
    const videoRes = await fetch(`${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`);
    const videoData = await videoRes.json();
    const target = videoData.items[0];

    const searchRes = await fetch(`${YT_API_BASE}/search?part=snippet&q=${encodeURIComponent(target.snippet.title)}&type=video&maxResults=20&key=${apiKey}`);
    const searchData = await searchRes.json();
    const videoIds = searchData.items.map(item => item.id.videoId).filter(id => id !== videoId);

    const detailsRes = await fetch(`${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`);
    const detailsData = await detailsRes.json();

    const recommendations = detailsData.items.map(v => {
        // Similarity score calculation
        let score = 0;
        if (v.snippet.categoryId === target.snippet.categoryId) score += 0.3;
        const words1 = new Set(v.snippet.title.toLowerCase().split(/\s+/));
        const words2 = new Set(target.snippet.title.toLowerCase().split(/\s+/));
        const intersect = new Set([...words1].filter(x => words2.has(x)));
        score += (intersect.size / Math.max(1, words1.size)) * 0.7;

        return {
            id: v.id,
            title: v.snippet.title,
            channelTitle: v.snippet.channelTitle,
            thumbnail: v.snippet.thumbnails.high?.url,
            views: parseInt(v.statistics.viewCount) || 0,
            similarityScore: score
        };
    }).sort((a, b) => b.similarityScore - a.similarityScore);

    return new Response(JSON.stringify(recommendations), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
