import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests from the dashboard
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { imageBase64, mimeType } = await req.json();

        if (!imageBase64) {
            return new Response(JSON.stringify({ error: 'Missing image Base64 data' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
           return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY in Edge Function secrets. Please add it via the Supabase Dashboard.' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Strict prompt to ensure raw JSON mapping directly to our database fields
        const prompt = `You are an expert AI data parser for a food delivery platform. Extract every distinct food item and price from the attached menu image. 
Return your response EXCLUSIVELY as a raw, valid JSON array of objects. Do NOT include any markdown code block formatting (like \`\`\`json). Just the raw array.

Each object MUST have the exact following structure:
{
    "name": "String (e.g., Margherita Pizza)",
    "description": "String (any details or ingredients under the item. Empty string if none)",
    "price": Number (e.g., 12.99. Use purely numeric floats, omit currency symbols)",
    "category": "String (e.g., Starters, Mains, Drinks, or whatever header the item falls under)",
    "add_ons": [
         { "name": "String (e.g., Extra Cheese)", "price": Number (e.g., 2.50) }
    ]
}

- Parse the entire menu systematically. 
- If there are different sizes (e.g., Small $5, Large $10), create ONE "Pizza" object and put the sizes into "add_ons", OR create separate items like "Pizza - Small" and "Pizza - Large".
- Ensure all prices are converted to floats. 
- Capture any optional add-ons or toppings available for an item into the "add_ons" array. If none, leave the array empty.`;

        // Prepare the HTTP payload for Gemini 1.5 Flash Vision REST API
        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType || 'image/jpeg',
                            data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1, // extremely low temperature for deterministic parsing
                topP: 0.8,
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (data.error) {
           throw new Error(`Gemini API Error: ${data.error.message}`);
        }

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        
        // Scrub markdown code blocks safely in case the LLM ignores instructions
        const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        const menuArray = JSON.parse(cleanedJson);

        return new Response(JSON.stringify({ items: menuArray }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error scanning menu:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
