const { cors, readBody, guard } = require('./_shared');
const ENV = process['env'] || {};

const HF_BASE = 'https://api.higgsfield.ai';
/* נתיב המודל. ברירת המחדל היא Soul (עובד בוודאות). ל-GPT Image 2 יש להגדיר
   את משתנה הסביבה HF_MODEL_PATH לנתיב המדויק של gpt image (נאמת מול החשבון). */
const HF_MODEL_PATH = ENV.HF_MODEL_PATH || '/higgsfield-ai/soul/v2/standard';

/* יצירת מודעת תמונה עם היגספילד (REST): שליחה, ואז polling עד לסיום. */
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!guard(req, res)) return;

  const id = ENV.HF_API_KEY_ID, secret = ENV.HF_API_KEY_SECRET;
  if (!id || !secret) return res.status(500).json({ error: 'חסרים מפתחות היגספילד בהגדרות השרת' });
  const auth = `Key ${id}:${secret}`;

  try {
    const b = await readBody(req);
    if (b.kind && b.kind !== 'image') throw new Error('נתמכת יצירת מודעת תמונה בלבד');
    const t0 = Date.now();

    const sub = await fetch(HF_BASE + HF_MODEL_PATH, {
      method: 'POST',
      headers: { Authorization: auth, 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: b.prompt || '' })
    });
    const sj = await sub.json().catch(() => ({}));
    if (!sub.ok) throw new Error(sj.detail || sj.error || ('שגיאת היגספילד ' + sub.status));
    const reqId = sj.request_id || sj.id;
    if (!reqId) throw new Error('לא התקבל request_id מהיגספילד');

    let url = null;
    for (let i = 0; i < 55 && !url; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const st = await fetch(`${HF_BASE}/requests/${reqId}/status`, { headers: { Authorization: auth } });
      const stj = await st.json().catch(() => ({}));
      if (stj.status === 'completed') { url = stj.images && stj.images[0] && stj.images[0].url; break; }
      if (['failed', 'nsfw', 'canceled'].includes(stj.status)) throw new Error('היצירה נכשלה בהיגספילד: ' + stj.status);
    }
    if (!url) throw new Error('תם הזמן הקצוב ליצירת התמונה');
    res.status(200).json({ kind: 'image', url, took: Math.round((Date.now() - t0) / 1000) });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
