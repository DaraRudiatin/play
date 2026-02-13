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
    const { subjectId, se, ep, detailPath } = req.query;
    
    if (!subjectId || !detailPath) {
      return res.status(400).json({ error: 'Missing subjectId or detailPath' });
    }

    const playUrl = `https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/play?subjectId=${subjectId}&se=${se || '0'}&ep=${ep || '0'}&detailPath=${encodeURIComponent(detailPath)}`;
    
    const headers = {
      'accept': 'application/json',
      'accept-language': 'en-US,en;q=0.9,id;q=0.8',
      'priority': 'u=1, i',
      'referer': `https://themoviebox.org/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`,
      'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      'x-client-info': '{"timezone":"Asia/Jakarta"}',
      'x-source': '',
      'Cookie': 'mb_token=%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjU3MTE1NTI3MjA4MTc1ODY0NCwiYXRwIjozLCJleHQiOiIxNzcwNTk4MzIzIiwiZXhwIjoxNzc4Mzc0MzIzLCJpYXQiOjE3NzA1OTgwMjN9.SZ0lmOj426RgrU1R1dksiP_DtY1cCoC4s4r2YwpD-0c%22; _ga=GA1.1.2070951048.1770598325; i18n_lang=en; _ga_W2B5L06SGP=GS2.1.s1770839122$o5$g1$t1770839568$j5$l0$h0'
    };

    console.log(`📡 Vercel API request: ${playUrl}`);
    
    const response = await fetch(playUrl, {
      method: 'GET',
      headers: headers,
      timeout: 45000
    });

    const data = await response.json();
    
    console.log(`📥 API Response:`, {
      status: response.status,
      code: data.code,
      streamsCount: data.data?.streams?.length || 0,
      hasResource: data.data?.hasResource
    });

    if (data && data.code === 0 && data.data && data.data.streams) {
      res.json({
        success: true,
        streams: data.data.streams,
        title: data.data.title || 'Video Player'
      });
    } else {
      res.status(400).json({ 
        error: 'No streams available', 
        apiResponse: data 
      });
    }
    
  } catch (error) {
    console.error('❌ Vercel API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error: ' + error.message 
    });
  }
}