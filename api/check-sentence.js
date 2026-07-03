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
    'Do TWO separate checks and reply in EXACTLY this format, nothing else before or after it:\n\n' +
    'MEANING: <your answer here>\n' +
    'GRAMMAR: <your answer here>\n\n' +
    'For MEANING: check if her sentence shows she understands the PRECISE meaning. For Chinese native speakers, English words carry specific nuance that Chinese equivalents do not \u2014 does her sentence capture that? If good, start with "\u2705" and praise in 2 sentences. If not quite, start with "\uD83D\uDCAD" and give ONE specific kind hint. Be warm and brief.\n\n' +
    'For GRAMMAR: check her sentence for grammar and punctuation mistakes (capitalisation, full stops, tense, subject-verb agreement, etc.), completely separate from the meaning check above. If it is already correct, start with "\uD83C\uDF89" and specifically praise what she did right. If there is a mistake, start with "\uD83D\uDCA1", gently show the corrected sentence, and briefly explain the fix in one warm, encouraging sentence \u2014 like a kind teacher, never like a red pen. Keep it brief either way.';

  function parseSentenceCheckResponse(raw) {
    raw = raw || '';
    var meaningMatch = raw.match(/MEANING:\s*([\s\S]*?)(?:\n\s*GRAMMAR:|$)/i);
    var grammarMatch = raw.match(/GRAMMAR:\s*([\s\S]*)$/i);
    var main = meaningMatch ? meaningMatch[1].trim() : raw.trim();
    var grammar = grammarMatch ? grammarMatch[1].trim() : '';
    if (!main) main = raw.trim();
    return { main: main, grammar: grammar };
  }

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
    var raw = (data.content && data.content[0] && data.content[0].text) ? data.content[0].text : 'Good effort!';
    var parsed = parseSentenceCheckResponse(raw);
    res.status(200).json({ feedback: parsed.main, grammarNote: parsed.grammar });
  } catch (err) {
    res.status(200).json({ feedback: 'Could not check your sentence right now. Keep practising \u2014 the more you use the word the better it sticks!' });
  }
};
