module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Read from Vercel Environment Variables
  const API_KEY = process.env.LIVEAVATAR_API_KEY;
  const AVATAR_ID = process.env.AVATAR_ID || 'acab2901-7118-431e-881c-914992e194a6';
  const VOICE_ID = process.env.VOICE_ID || 'd06244d0-6311-46b3-a740-abc8d46ed494';
  const CONTEXT_ID = process.env.CONTEXT_ID;

  if (!API_KEY) {
    return res.status(500).json({ success: false, error: 'LIVEAVATAR_API_KEY not configured' });
  }

  if (!CONTEXT_ID) {
    return res.status(500).json({ success: false, error: 'CONTEXT_ID not configured' });
  }

  try {
    // 1. Create session token
    const tokenRes = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY
      },
      body: JSON.stringify({
        mode: 'FULL',
        avatar_id: AVATAR_ID,
        avatar_persona: {
          voice_id: VOICE_ID,
          context_id: CONTEXT_ID,
          language: 'en'
        }
      })
    });

    const tokenData = await tokenRes.json();

    if (tokenData.code !== 1000) {
      return res.status(400).json({ 
        success: false, 
        error: tokenData.message || 'Token creation failed' 
      });
    }

    // 2. Start session
    const startRes = await fetch('https://api.liveavatar.com/v1/sessions/start', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${tokenData.data.session_token}`
      }
    });

    const startData = await startRes.json();

    if (startData.code !== 1000) {
      return res.status(400).json({ 
        success: false, 
        error: startData.message || 'Session start failed' 
      });
    }

    // Return LiveKit credentials (safe to send to browser)
    return res.status(200).json({
      success: true,
      livekit_url: startData.data.livekit_url,
      livekit_client_token: startData.data.livekit_client_token
    });

  } catch (error) {
    console.error('LiveAvatar error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
