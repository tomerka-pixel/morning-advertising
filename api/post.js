const { SYSTEM, SYSTEM_AD, buildPrompt, cors, readBody, guard } = require('./_shared');
const ENV = process['env'] || {};

/* יצירת טקסט (פוסט או מודעה) עם Claude דרך Anthropic API. */
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!guard(req, res)) return;

  const key = ENV.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'חסר ANTHROPIC_API_KEY בהגדרות השרת' });

  try {
    const brief = await readBody(req);
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: ENV.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 700,
        system: brief.type === 'ad' ? SYSTEM_AD : SYSTEM,
        messages: [{ role: 'user', content: buildPrompt(brief) }]
      })
    });
    const j = await r.json();
    if (!r.ok) throw new Error((j.error && j.error.message) || ('שגיאת Claude ' + r.status));
    const text = (j.content || []).map(c => c.text || '').join('').trim();
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
