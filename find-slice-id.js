const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf16le');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Failed to load env vars from .env (UTF-16LE)");
    process.exit(1);
}

const headers = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
};

async function find() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/restaurants?name=eq.Chicken%20Slice&select=id`, { headers });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch error:", e.message);
    }
}

find();
