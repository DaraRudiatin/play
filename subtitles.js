import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subjectId, detailPath, id = '1274577250519862264' } = req.query;
    
    if (!subjectId || !detailPath) {
      return res.json({ captions: [] });
    }

    const subUrl = `https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/caption?format=MP4&id=${id}&subjectId=${subjectId}&detailPath=${encodeURIComponent(detailPath)}`;
    
    const headers = {
      'accept': 'application/json',
      'accept-language': 'en-US,en;q=0.9,id;q=0.8',
      'origin': 'https://themoviebox.org',
      'referer': `https://themoviebox.org/movies/${detailPath}`,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      'x-client-info': '{"timezone":"Asia/Jakarta"}'
    };

    console.log(`🎬 Vercel Fetching subtitles: ${subUrl}`);
    
    const response = await fetch(subUrl, {
      method: 'GET',
      headers: headers,
      timeout: 45000
    });

    const data = await response.json();

    if (data && data.code === 0 && data.data && data.data.captions) {
      res.json({
        captions: data.data.captions.map(c => ({
          language: c.lanName,
          url: c.url,
          lan: c.lan
        }))
      });
    } else {
      res.json({ captions: [] });
    }
    
  } catch (error) {
    console.error('❌ Vercel Subtitles Error:', error);
    res.json({ captions: [] });
  }
}