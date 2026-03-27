import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function cleanHtml(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<svg[\s\S]*?<\/svg>/gi, '')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function normalizeLazyImages(html: string): string {
    return html
        .replace(/data-src="/gi, 'src="')
        .replace(/data-lazy-src="/gi, 'src="')
        .replace(/data-original="/gi, 'src="');
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { imageBase64, mimeType, url } = body;

        if (!imageBase64 && !url) {
            return new Response(JSON.stringify({ error: 'Provide imageBase64 or url' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY secret' }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const systemPrompt = `You are an expert AI data parser for a food delivery platform. Extract EVERY food or drink item from the menu data provided. Be exhaustive.

Return ONLY a raw valid JSON array of objects — no markdown, no explanation.

Each object structure:
{
  "name": "String",
  "description": "String (empty if none)",
  "price": Number (float, 0 if unknown),
  "category": "String (section header)",
  "image_url": "String (absolute URL from src= attributes, or empty string)",
  "add_ons": [{ "name": "String", "price": Number }]
}

Rules: Extract every item. Strip currency from prices. For image_url look for img src= attributes near the item. Leave as "" if not found.`;

        let messages: any[];

        if (url) {
            let finalUrl = url.trim();
            if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;

            let fetchedHtml = '';
            try {
                const websiteRes = await fetch(finalUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html,application/xhtml+xml',
                    }
                });
                fetchedHtml = await websiteRes.text();
            } catch (err: any) {
                return new Response(JSON.stringify({ error: 'Failed to fetch URL: ' + err.message }), {
                    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            // Memory optimization: slice the HTML FIRST before memory-heavy regex work
            const htmlChunk = fetchedHtml.substring(0, 100000);
            const normalized = normalizeLazyImages(htmlChunk);
            const rawSnippet = normalized.substring(0, 40000);
            const cleanedText = cleanHtml(normalized).substring(0, 40000);

            messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Website: ${finalUrl}\n\n[RAW HTML for images]\n${rawSnippet}\n\n[CLEAN TEXT for menu items]\n${cleanedText}` }
            ];
        } else {
            const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
            messages = [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Extract all menu items from this image. Use empty string for image_url.' },
                        { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${base64Data}`, detail: 'high' } }
                    ]
                }
            ];
        }

        const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.1, max_tokens: 4096 })
        });

        if (!openaiRes.ok) {
            const errText = await openaiRes.text();
            throw new Error(`OpenAI Error (${openaiRes.status}): ${errText}`);
        }

        const data = await openaiRes.json();
        if (data.error) throw new Error(`OpenAI: ${data.error.message}`);

        const rawText = data.choices?.[0]?.message?.content || '[]';
        const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const menuArray = JSON.parse(cleanedJson);

        return new Response(JSON.stringify({ items: menuArray }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('scan-menu-ai error:', err);
        return new Response(JSON.stringify({ error: String(err?.message || err) }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
