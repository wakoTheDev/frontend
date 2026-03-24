const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const systemRecommendations = `You are an expert agricultural consultant specializing in crop disease diagnosis and treatment. Given crop analysis metrics (time taken to scan, accuracy rate, recovery rate), provide specific, actionable treatment recommendations for farmers. 

Format your response as a clear list of recommendations, each starting with a bullet point (•). Focus on:
- Immediate treatment actions (fungicides, pesticides, organic alternatives)
- Preventive measures to stop disease spread
- Cultural practices (spacing, watering, pruning)
- Monitoring and follow-up actions
- Timeline for treatment application

Be practical, specific, and prioritize actions based on the severity indicated by the accuracy and recovery rates.`

const systemInsights = `You are an agricultural analyst with deep expertise in plant pathology and crop health. Given crop analysis metrics (time taken, accuracy rate, recovery rate), provide detailed insights about the plant's condition.

Your insights should:
- Explain what the metrics indicate about plant health
- Identify the likely disease or pest issue
- Describe the severity and stage of the problem
- Explain the potential impact if left untreated
- Provide context about recovery expectations

Write 3-5 sentences that are informative, professional, and help farmers understand their crop's condition.

When I ask you for insights, you MUST respond in strict JSON with this exact shape:
{
  "recoveryRate": <number between 0 and 100>,
  "insights": "<text, 3-5 sentences>"
}
Do not include any other keys, explanations, or markdown. JSON only.`

const systemChat = `You are CropCare Assistant, an AI agronomy and crop health assistant.

You are helping farmers and agronomists who are using the AI-Powered CropCare dashboard.

LANGUAGE:
- Detect the language of each user message.
- You MUST fully support both English and Kiswahili (Swahili).
- If the user writes in Kiswahili, answer entirely in natural Kiswahili.
- If the user writes in English, answer in English.
- If the user mixes languages, prefer Kiswahili when most of the message is Kiswahili.

CRITICAL RELIABILITY RULES (ALWAYS FOLLOW THESE):
- Base your answers ONLY on:
  - The analysis and weather context I give you
  - General, widely accepted agronomy best practices
- If the question requires information you do NOT have (for example, exact local regulations,
  product brands, or precise weather for a location you were not given), clearly say you
  don't know and suggest how the user can verify or get local advice.
- NEVER invent precise product names, chemical formulations, or dosages. Use generic
  descriptions (e.g. "dawa ya kuua fangasi iliyoidhinishwa kulingana na maelekezo ya kifurushi"
  / "a registered copper-based fungicide according to the label").
- When talking about weather, use the provided weather/forecast context and avoid
  making up exact future values you were not given.
- Remind users to confirm critical decisions with a local agronomist or extension officer.

STYLE:
- Answer clearly and practically.
- When relevant, refer back to their crop analysis metrics, crop/leaf type, recommendations,
  insights, and weather data I provide.
- If the user asks for actions, provide concrete, step-by-step advice.
- Keep responses concise but helpful.`

function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false
  }
  // OpenRouter API keys typically start with 'sk-or-v1-'
  const trimmed = apiKey.trim()
  return trimmed.startsWith('sk-or-v1-') && trimmed.length > 20
}

async function chat(system, userContent, historyMessages = []) {
  const apiKey = process.env.OPEN_ROUTER_API_KEY?.trim()
  
  if (!apiKey) {
    throw new Error('OPEN_ROUTER_API_KEY is not configured. Please set it in backend/.env file.')
  }
  
  if (!validateApiKey(apiKey)) {
    throw new Error('Invalid OpenRouter API key format. API keys should start with "sk-or-v1-" and be at least 20 characters long. Get your key at https://openrouter.ai/keys')
  }
  
  const model = process.env.OPENAI_MODEL || 'gpt-4o'
  // OpenRouter supports both 'gpt-4o' and 'openai/gpt-4o' formats
  const modelName = model.startsWith('openai/') ? model : `openai/${model}`
  
  try {
    const safeHistory =
      Array.isArray(historyMessages)
        ? historyMessages
            .filter(
              (m) =>
                m &&
                typeof m.content === 'string' &&
                (m.role === 'user' || m.role === 'assistant')
            )
            .slice(-10)
        : []

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
        'X-Title': 'AI-Powered CropCare',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: system },
          ...safeHistory,
          { role: 'user', content: userContent },
        ],
        max_tokens: 400,
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const status = response.status
      
      if (status === 401) {
        throw new Error('Invalid OpenRouter API key. Please check your OPEN_ROUTER_API_KEY in backend/.env file. Get a valid key at https://openrouter.ai/keys')
      }
      if (status === 429) {
        throw new Error('OpenRouter API quota exceeded or rate limit reached. Please check your account at https://openrouter.ai/activity')
      }
      if (status === 400) {
        throw new Error(`OpenRouter API error: ${errorData.error?.message || 'Invalid request'}`)
      }
      throw new Error(`OpenRouter API error: ${errorData.error?.message || `HTTP ${status}`}`)
    }
    
    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || 'No response.'
  } catch (err) {
    // Re-throw if it's already a formatted error
    if (err.message?.includes('OpenRouter') || err.message?.includes('API')) {
      throw err
    }
    // Handle network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Failed to connect to OpenRouter API. Please check your internet connection.')
    }
    // Re-throw other errors
    throw err
  }
}

export async function getRecommendationsFromOpenAI(analysisSummary) {
  let userContent = ''
  if (typeof analysisSummary === 'object') {
    const { timeTaken, accuracyRate, recoveryRate, cropType, imageDescription } = analysisSummary
    userContent = `Crop Analysis Results:
- Time Taken to Scan: ${timeTaken || 'N/A'} seconds
- Accuracy Rate: ${accuracyRate || 'N/A'}%
- Recovery Rate: ${recoveryRate || 'N/A'}%
${cropType ? `- Identified crop/leaf type: ${cropType}` : ''}
${imageDescription ? `- Image Description: ${imageDescription}` : ''}

Based on these metrics, provide specific treatment recommendations.`
  } else {
    userContent = `Analysis: ${String(analysisSummary || 'No data')}\n\nProvide treatment recommendations.`
  }
  return chat(systemRecommendations, userContent)
}

export async function getInsightsFromOpenAI(analysisSummary) {
  let userContent = ''
  if (typeof analysisSummary === 'object') {
    const { timeTaken, accuracyRate, recoveryRate, cropType, imageDescription } = analysisSummary
    userContent = `Crop Analysis Results:
- Time Taken to Scan: ${timeTaken || 'N/A'} seconds
- Accuracy Rate: ${accuracyRate || 'N/A'}%
- Recovery Rate: ${recoveryRate || 'N/A'}%
${cropType ? `- Identified crop/leaf type: ${cropType}` : ''}
${imageDescription ? `- Image Description: ${imageDescription}` : ''}

Provide detailed insights about what these metrics indicate about the crop's health condition.

Remember: respond ONLY with JSON: {"recoveryRate": <0-100>, "insights": "<text>"}.`
  } else {
    userContent = `Analysis: ${String(analysisSummary || 'No data')}\n\nProvide insights.

Remember: respond ONLY with JSON: {"recoveryRate": <0-100>, "insights": "<text>"}.`
  }
  const raw = await chat(systemInsights, userContent)
  try {
    const parsed = JSON.parse(raw)
    const recoveryRate =
      typeof parsed.recoveryRate === 'number' ? Math.max(0, Math.min(100, parsed.recoveryRate)) : null
    const insights = typeof parsed.insights === 'string' ? parsed.insights.trim() : raw
    return { recoveryRate, insights }
  } catch {
    // Fallback: treat whole response as insights only
    return { recoveryRate: null, insights: raw }
  }
}

// General chat for the in-app assistant. Optionally receives recent analysis, weather context, and conversation history.
export async function chatWithOpenAI(question, context = {}, history = []) {
  let userContent = ''
  try {
    const ctx = context && typeof context === 'object' ? context : {}
    const analysisSnippet =
      ctx.timeTaken || ctx.accuracyRate || ctx.recoveryRate || ctx.cropType
        ? `Here is the latest analysis context (if any):\n- Time Taken: ${
            ctx.timeTaken ?? 'N/A'
          }s\n- Accuracy: ${ctx.accuracyRate ?? 'N/A'}%\n- Recovery: ${
            ctx.recoveryRate ?? 'N/A'
          }%\n${ctx.cropType ? `- Crop/leaf type: ${ctx.cropType}\n` : ''}\n`
        : ''

    let weatherSnippet = ''
    if (ctx.weather) {
      const w = ctx.weather
      weatherSnippet = `\nLatest weather data for the user's farm:\n- Condition: ${
        w.condition ?? 'Unknown'
      }\n- Temperature: ${w.temperature ?? 'N/A'}°C (feels like ${
        w.feelsLike ?? 'N/A'
      }°C)\n- Humidity: ${w.humidity ?? 'N/A'}%\n- Wind speed: ${
        w.windSpeed ?? 'N/A'
      } m/s\n${w.description ? `- Description: ${w.description}\n` : ''}${
        w.forecastSummary ? `- Short forecast: ${w.forecastSummary}\n` : ''
      }\n`
    }

    userContent = `${analysisSnippet}${weatherSnippet}User question: ${question}`
  } catch {
    userContent = `User question: ${question}`
  }

  const safeHistory =
    Array.isArray(history)
      ? history
          .filter(
            (m) =>
              m &&
              typeof m.content === 'string' &&
              (m.role === 'user' || m.role === 'assistant')
          )
          .slice(-10)
      : []

  return chat(systemChat, userContent, safeHistory)
}
