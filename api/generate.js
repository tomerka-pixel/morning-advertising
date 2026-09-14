const { cors, readBody, guard } = require('./_shared');
const { generateImage } = require('./_openai');

/* יצירת מודעת תמונה עם OpenAI (GPT Image 2.5). */
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!guard(req, res)) return;

  try {
    const b = await readBody(req);
    if (b.kind && b.kind !== 'image') throw new Error('נתמכת יצירת מודעת תמונה בלבד');
    const out = await generateImage({ prompt: b.prompt, format: b.format, quality: b.quality, model: b.model });
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
