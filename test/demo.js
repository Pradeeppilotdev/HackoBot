#!/usr/bin/env node

/**
 * HackoBot Demo Test
 * Tests basic functionality and ensures minimum API call requirements
 */

const { HackoBot } = require('../src/core/hackobot');

async function runTest() {
  console.log('🧪 HackoBot Demo Test\n');
  console.log('='.repeat(50));

  const bot = new HackoBot();

  try {
    // Test 1: Initialize
    console.log('\n📋 Test 1: Initialize & Check Account');
    const init = await bot.initialize();
    console.log(`   Result: ${init.success ? '✅ Connected' : '❌ Failed'}`);
    console.log(`   API Calls: ${bot.getApiCallCount()}`);

    // Test 2: Scan for alpha
    console.log('\n🔍 Test 2: Alpha Scan');
    const scan = await bot.scan();
    console.log(`   Signals Found: ${scan.totalSignals}`);
    console.log(`   Top Signals: ${scan.topSignals.length}`);
    console.log(`   API Calls: ${bot.getApiCallCount()}`);

    // Test 3: Discover whales
    console.log('\n🐋 Test 3: Whale Discovery');
    const whales = await bot.discoverWhales('ethereum', { limit: 5 });
    console.log(`   Whales Found: ${whales.length}`);
    console.log(`   API Calls: ${bot.getApiCallCount()}`);

    // Test 4: Market Analysis
    console.log('\n📊 Test 4: AI Market Analysis');
    const analysis = await bot.analyzeMarket('ethereum');
    console.log(`   Analysis Length: ${analysis.analysis?.length || 0} chars`);
    console.log(`   API Calls: ${bot.getApiCallCount()}`);

    // Final Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(50));

    const totalCalls = bot.getApiCallCount();
    console.log(`\n   Total API Calls: ${totalCalls}`);
    console.log(`   Minimum Required: 10`);
    console.log(`   Status: ${totalCalls >= 10 ? '✅ PASSED' : '⚠️ Need more calls'}`);

    console.log('\n' + '='.repeat(50));

    return { success: true, apiCalls: totalCalls };

  } catch (error) {
    console.error(`\n❌ Test Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

runTest()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
