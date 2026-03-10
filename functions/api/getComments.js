export async function onRequest(context) {
  const { request } = context;
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const apiKey = searchParams.get('apiKey');

  if (!videoId || !apiKey) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
  }

  const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

  try {
    const response = await fetch(`${YT_API_BASE}/commentThreads?part=snippet&videoId=${videoId}&maxResults=10&order=relevance&key=${apiKey}`);
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    const comments = data.items.map(item => ({
      author: item.snippet.topLevelComment.snippet.authorDisplayName,
      text: item.snippet.topLevelComment.snippet.textDisplay,
      likes: item.snippet.topLevelComment.snippet.likeCount,
      publishedAt: item.snippet.topLevelComment.snippet.publishedAt
    }));

    return new Response(JSON.stringify(comments), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
