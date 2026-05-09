/**
 * Gift Ideas Service
 * Generates personalized gift ideas via DeepSeek API.
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const FALLBACK_IDEAS = [
    'подарочный сертификат',
    'набор косметики',
    'книга-бестселлер',
    'умная колонка',
    'настольная игра',
];

/**
 * @param {object} params
 * @param {string} params.relation  - кто этот человек (мама, друг, коллега…)
 * @param {string|number} params.age      - возраст (необязательно)
 * @param {string} params.interests - интересы через запятую
 * @param {string} params.budget    - бюджет (например "до 3000 руб")
 * @returns {Promise<string[]>}     - массив из 3–5 идей подарков
 */
export async function generateGiftIdeas({ relation, age, interests, budget }) {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
        console.warn('[giftIdeasService] DEEPSEEK_API_KEY not set, using fallback ideas');
        return FALLBACK_IDEAS.slice(0, 5);
    }

    const prompt = buildPrompt({ relation, age, interests, budget });

    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content:
                            'Ты помощник по выбору подарков. ' +
                            'Отвечай ТОЛЬКО списком подарков — по одному на строку, без нумерации, без пояснений, без лишних слов. ' +
                            'Подарки должны быть реальными товарами, которые можно найти на маркетплейсах (Ozon, Wildberries, Яндекс Маркет). ' +
                            'Отвечай только на русском языке.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 300,
            }),
        });

        if (!response.ok) {
            throw new Error(`DeepSeek HTTP error: ${response.status}`);
        }

        const data = await response.json();
        const rawText = data.choices?.[0]?.message?.content?.trim() ?? '';

        return parseIdeasFromText(rawText);

    } catch (error) {
        console.error('[giftIdeasService] Error calling DeepSeek:', error.message);
        return FALLBACK_IDEAS.slice(0, 5);
    }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function buildPrompt({ relation, age, interests, budget }) {
    const parts = [
        'Предложи 5 реальных подарков, которые можно купить на маркетплейсах.',
        '',
        'Контекст:',
        `- отношения: ${relation || 'не указано'}`,
        `- возраст: ${age || 'не указан'}`,
        `- интересы: ${interests || 'не указаны'}`,
        `- бюджет: ${budget || 'не указан'}`,
        '',
        'Верни только список подарков без пояснений.',
    ];
    return parts.join('\n');
}

/**
 * Parses a newline-separated list from the model response.
 * Strips leading numbers/bullets, empty lines and deduplicates.
 * @param {string} text
 * @returns {string[]}
 */
function parseIdeasFromText(text) {
    const lines = text
        .split('\n')
        .map(line => line.replace(/^[\d\.\-\*\•\s]+/, '').trim())
        .filter(line => line.length > 2);

    // Deduplicate, keep order
    const seen = new Set();
    const unique = [];
    for (const line of lines) {
        const key = line.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(line);
        }
    }

    // Return 3–5 ideas; fallback if model returned nothing useful
    const result = unique.slice(0, 5);
    return result.length >= 3 ? result : FALLBACK_IDEAS.slice(0, 5);
}
