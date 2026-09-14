const { cors } = require('./_shared');
const { hasKey, IMAGE_MODEL, TEXT_MODEL } = require('./_openai');
const ENV = process['env'] || {};

module.exports = (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const openai = hasKey();
  res.status(200).json({
    live: openai || !!ENV.ANTHROPIC_API_KEY,
    engine: 'hosted',
    openai,
    image: openai,
    text: openai ? 'openai' : (ENV.ANTHROPIC_API_KEY ? 'claude' : null),
    imageModel: openai ? IMAGE_MODEL : null,
    textModel: openai ? TEXT_MODEL : null,
    version: 'v8-openai'
  });
};
