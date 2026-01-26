// Integration test for Supabase DB and n8n Webhook
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://diovljzaabbfftcqmwub.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_a-uZ6gxkKGgqxGxNKed2Ng_cM4dGlTZ';
const WEBHOOK_URL = 'https://davidvanwachem.app.n8n.cloud/webhook/get-agenda-page-details';

console.log('🔍 Testing Database and Webhook Integration\n');

// Test 1: Supabase Connection
async function testSupabaseConnection() {
    console.log('1️⃣ Testing Supabase Connection...');
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        // Try a simple query
        const { data, error } = await supabase
            .from('dossiers')
            .select('id')
            .limit(1);

        if (error) {
            console.log('   ❌ Supabase Error:', error.message);
            return false;
        }

        console.log('   ✅ Supabase Connected Successfully');
        console.log('   📊 Sample data:', data);
        return true;
    } catch (err) {
        console.log('   ❌ Supabase Connection Failed:', err.message);
        return false;
    }
}

// Test 2: Webhook Connectivity
async function testWebhookConnection() {
    console.log('\n2️⃣ Testing n8n Webhook Connection...');
    try {
        const testPayload = {
            eventId: 'test_' + Date.now(),
            eventType: 'test_connection',
            timestamp: new Date().toISOString(),
            message: 'Integration test from ApartmentHub'
        };

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPayload)
        });

        if (response.ok) {
            console.log('   ✅ Webhook Connected Successfully');
            console.log('   📡 Response Status:', response.status);
            const responseText = await response.text();
            console.log('   📝 Response:', responseText || '(empty)');
            return true;
        } else {
            console.log('   ⚠️  Webhook responded with status:', response.status);
            return false;
        }
    } catch (err) {
        console.log('   ❌ Webhook Connection Failed:', err.message);
        return false;
    }
}

// Test 3: Database Schema Check
async function testDatabaseSchema() {
    console.log('\n3️⃣ Checking Database Schema...');
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        const tables = ['dossiers', 'personen', 'documenten'];
        let allOk = true;

        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);

            if (error) {
                console.log(`   ❌ Table '${table}':`, error.message);
                allOk = false;
            } else {
                console.log(`   ✅ Table '${table}': OK`);
            }
        }

        return allOk;
    } catch (err) {
        console.log('   ❌ Schema Check Failed:', err.message);
        return false;
    }
}

// Test 4: Integration Test - Save to DB and Send to Webhook
async function testIntegration() {
    console.log('\n4️⃣ Testing Full Integration (DB + Webhook)...');
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const testId = 'test_' + Date.now();

        // Create test dossier
        console.log('   📝 Creating test dossier...');
        const { data: dossier, error: dbError } = await supabase
            .from('dossiers')
            .insert({
                phone_number: '+31600000000',
                status: 'test',
                bid_amount: 2100,
                created_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (dbError) {
            console.log('   ❌ Database Insert Failed:', dbError.message);
            return false;
        }

        console.log('   ✅ Test Dossier Created:', dossier.id);

        // Send webhook
        console.log('   📡 Sending webhook...');
        const webhookPayload = {
            eventId: testId,
            eventType: 'test_integration',
            timestamp: new Date().toISOString(),
            dossierId: dossier.id,
            data: {
                phoneNumber: '+31600000000',
                bidAmount: 2100
            }
        };

        const webhookResponse = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload)
        });

        if (!webhookResponse.ok) {
            console.log('   ⚠️  Webhook send failed with status:', webhookResponse.status);
        } else {
            console.log('   ✅ Webhook Sent Successfully');
        }

        // Cleanup - delete test dossier
        console.log('   🧹 Cleaning up test data...');
        await supabase
            .from('dossiers')
            .delete()
            .eq('id', dossier.id);

        console.log('   ✅ Integration Test Complete');
        return true;

    } catch (err) {
        console.log('   ❌ Integration Test Failed:', err.message);
        return false;
    }
}

// Run all tests
async function runTests() {
    const results = {
        supabase: await testSupabaseConnection(),
        webhook: await testWebhookConnection(),
        schema: await testDatabaseSchema(),
        integration: await testIntegration()
    };

    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log('Supabase Connection:', results.supabase ? '✅ PASS' : '❌ FAIL');
    console.log('Webhook Connection: ', results.webhook ? '✅ PASS' : '❌ FAIL');
    console.log('Database Schema:    ', results.schema ? '✅ PASS' : '❌ FAIL');
    console.log('Full Integration:   ', results.integration ? '✅ PASS' : '❌ FAIL');
    console.log('='.repeat(50));

    const allPassed = Object.values(results).every(r => r === true);
    if (allPassed) {
        console.log('\n✨ All tests passed! Database and Webhook are working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the logs above.');
    }
}

runTests().catch(console.error);
