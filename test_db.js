const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'landing/.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(url, key);

async function test() {
    const { data, error } = await supabase.from('research_missions').insert({
        query: 'test',
        node_id: 'test_node',
        webhook_url: 'deprecated',
        format: 'spatial_json',
        depth: 'rapid',
        status: 'pending'
    });
    console.log('Insert Error:', error);
}
test();
