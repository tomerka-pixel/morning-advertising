const { SYSTEM, SYSTEM_AD, buildPrompt, cors, readBody, guard } = require('./_shared');
const openai = require('./_openai');
const ENV = process['env'] || {};

/* כתיבת טקסט (פוסט או מודעה). ברירת המחדל היא OpenAI;
   אם מוגדר רק מפתח Anthropic, נופלים אחורה ל-Claude. */
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!guard(req, res)) return;

  try {
    const brief = await readBody(req);
    const system = brief.type === 'ad' ? SYSTEM_AD : SYSTEM;
    const user = buildPrompt(brief);

    if (openai.hasKey()) {
      const text = await openai.generateText(system, user);
      return res.status(200).json({ text, engine: 'openai' });
    }

    const akey = ENV.ANTHROPIC_API_KEY;
    if (!akey) throw new Error('חסר OPENAI_API_KEY בהגדרות השרת');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': akey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: ENV.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 700,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });
    const j = await r.json();
    if (!r.ok) throw new Error((j.error && j.error.message) || ('שגיאת Claude ' + r.status));
    const text = (j.content || []).map(c => c.text || '').join('').trim();
    res.status(200).json({ text, engine: 'claude' });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
