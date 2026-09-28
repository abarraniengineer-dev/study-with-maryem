// Bloom AI secure endpoint (Netlify Function). The AI key never reaches the client.
// Set BLOOM_API_KEY + BLOOM_API_URL (optional, defaults to OpenAI-compatible) in Netlify env.
export default async (req: Request) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (req.method === 'OPTIONS') return new Response('', { headers: cors })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors })

  try {
    const body = (await req.json()) as { question?: string; context?: string; history?: Array<{ role: string; content: string }> }
    const question = (body.question ?? '').toString().slice(0, 2000)
    if (!question.trim()) return new Response(JSON.stringify({ error: 'Empty question' }), { status: 400, headers: cors })

    const key = Netlify.env.get('BLOOM_API_KEY')
    if (!key) {
      return new Response(JSON.stringify({ error: 'Bloom AI is not configured yet' }), { status: 503, headers: cors })
    }

    const system = [
      'You are Bloom, the warm, encouraging study assistant inside the app “Study With Maryem” for a student named Maryem.',
      'Explain concepts simply, help plan study time, organize tasks and offer supportive motivation.',
      'NEVER create quizzes, tests, multiple-choice questions, flashcard drills or exam simulations — explain instead.',
      'If study context is provided, use it to personalize advice. Keep answers concise and kind.',
    ].join(' ')

    const messages = [
      { role: 'system', content: system + (body.context ? `\n\nMaryem’s current study context:\n${body.context.slice(0, 3000)}` : '') },
      ...(body.history ?? []).slice(-8),
      { role: 'user', content: question },
    ]

    const apiUrl = Netlify.env.get('BLOOM_API_URL') ?? 'https://api.openai.com/v1/chat/completions'
    const model = Netlify.env.get('BLOOM_API_MODEL') ?? 'gpt-4o-mini'
    const r = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, max_tokens: 700, temperature: 0.6 }),
    })
    if (!r.ok) return new Response(JSON.stringify({ error: 'AI service error' }), { status: 502, headers: cors })
    const data = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const reply = data.choices?.[0]?.message?.content?.trim()
    if (!reply) return new Response(JSON.stringify({ error: 'Empty reply' }), { status: 502, headers: cors })
    return new Response(JSON.stringify({ reply }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500, headers: cors })
  }
}
