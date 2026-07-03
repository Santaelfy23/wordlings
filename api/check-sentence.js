// Vercel serverless function.
// Lives at /api/check-sentence.js -> automatically served at POST /api/check-sentence
//
// This is the ONLY place the real Anthropic API key should ever appear.
// Set it in Vercel: Project Settings -> Environment Variables -> ANTHROPIC_API_KEY
// It is never sent to, or visible from, the browser.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ feedback: 'Sentence checking is not set up yet. Keep practising \u2014 that still helps!' });
    return;
  }

  var body = req.body || {};
  var word = typeof body.word === 'string' ? body.word.slice(0, 60) : '';
  var pos = typeof body.pos === 'string' ? body.pos.slice(0, 30) : '';
  var meaning = typeof body.meaning === 'string' ? body.meaning.slice(0, 300) : '';
  var sentence = typeof body.sentence === 'string' ? body.sentence.slice(0, 400) : '';

  if (!word || !sentence) {
    res.status(400).json({ error: 'Missing word or sentence' });
    return;
  }

  var promptText =
    'You are a warm encouraging English teacher helping an 11-year-old Chinese native speaker prepare for top London independent school exams. She just spelled "' + word + '" correctly.\n\n' +
    'Word: "' + word + '" (' + pos + ')\nMeaning: ' + meaning + '\n\n' +
    'Her sentence: "' + sentence + '"\n\n' +
    'Check if she understands the PRECISE meaning. For Chinese native speakers: English words carry specific nuance that Chinese equivalents do not. Does her sentence capture that?\n\n' +
    'If good: start with "\u2705" and praise in 2 sentences.\n' +
    'If not quite: start with "\uD83D\uDCAD" and give ONE specific kind hint. Be warm and brief.';

  try {
    var anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: promptText }]
      })
    });

    if (!anthropicResp.ok) {
      res.status(200).json({ feedback: 'Could not check your sentence right now. Keep practising \u2014 the more you use the word the better it sticks!' });
      return;
    }

    var data = await anthropicResp.json();
    var feedback = (data.content && data.content[0] && data.content[0].text) ? data.content[0].text : 'Good effort!';
    res.status(200).json({ feedback: feedback });
  } catch (err) {
    res.status(200).json({ feedback: 'Could not check your sentence right now. Keep practising \u2014 the more you use the word the better it sticks!' });
  }
};
