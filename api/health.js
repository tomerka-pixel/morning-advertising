const { cors } = require('./_shared');
const ENV = process['env'] || {};

module.exports = (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const claude = !!ENV.ANTHROPIC_API_KEY;
  const image = !!(ENV.HF_API_KEY_ID && ENV.HF_API_KEY_SECRET);
  res.status(200).json({ live: claude || image, engine: 'hosted', claude, image });
};
