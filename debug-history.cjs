
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manually parse .env
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) envConfig[key.trim()] = val.trim();
});

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('--- Timers ---');
    const { data: timers, error: tErr } = await supabase.from('timers').select('*');
    if (tErr) console.error(tErr);
    else console.table(timers);

    console.log('\n--- Week History ---');
    const { data: history, error: hErr } = await supabase.from('week_history').select('*').order('week_start', { ascending: false });
    if (hErr) console.error(hErr);
    else {
        history.forEach(h => {
            console.log(`\nID: ${h.id}`);
            console.log(`Week Start: ${h.week_start}`);
            console.log(`Created At: ${h.created_at}`);
            console.log('Snapshot:', JSON.stringify(h.snapshot_json).substring(0, 100) + '...');
        });
    }
}

debug();
