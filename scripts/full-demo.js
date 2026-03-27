#!/usr/bin/env node

/**
 * HackoBot - Quick Demo Script
 * Comprehensive demonstration that makes 15+ API calls
 */

const { HackoBot } = require('../src/core/hackobot');
const chalk = require('chalk');

const banner = `
${chalk.cyan('╔════════════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.green('🤖 HACKOBOT COMPREHENSIVE DEMO')}                                     ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.dim('Demonstrating all Nansen CLI capabilities for #NansenCLI Hackathon')} ${chalk.cyan('║')}
${chalk.cyan('╚════════════════════════════════════════════════════════════════════╝')}
`;

async function main() {
  console.log(banner);

  const bot = new HackoBot();
  const results = [];

  // Helper to track progress
  const step = async (name, fn) => {
    process.stdout.write(chalk.yellow(`⏳ ${name}...`));
    try {
      const start = Date.now();
      const result = await fn();
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      console.log(chalk.green(` ✓ (${duration}s)`));
      results.push({ name, success: true, duration });
      return result;
    } catch (error) {
      console.log(chalk.red(` ✗ ${error.message}`));
      results.push({ name, success: false, error: error.message });
      return null;
    }
  };

  console.log(chalk.bold('\n📊 PHASE 1: Account & Status\n'));

  // 1. Check account status (1 call)
  await step('Checking Nansen account status', async () => {
    return await bot.nansen.getAccountStatus();
  });

  console.log(chalk.bold('\n🔍 PHASE 2: Smart Money Analysis\n'));

  // 2-4. Smart money netflows across 3 chains (3 calls)
  await step('Getting Ethereum smart money netflows', async () => {
    return await bot.nansen.getSmartMoneyNetflow('ethereum', { days: 7, limit: 10 });
  });

  await step('Getting Solana smart money netflows', async () => {
    return await bot.nansen.getSmartMoneyNetflow('solana', { days: 7, limit: 10 });
  });

  await step('Getting Base smart money netflows', async () => {
    return await bot.nansen.getSmartMoneyNetflow('base', { days: 7, limit: 10 });
  });

  // 5. Smart money DEX trades (1 call)
  await step('Getting smart money DEX trades', async () => {
    return await bot.nansen.getSmartMoneyDexTrades('ethereum', { days: 1, limit: 20 });
  });

  // 6. Smart money holdings (1 call)
  await step('Getting smart money holdings', async () => {
    return await bot.nansen.getSmartMoneyHoldings('ethereum', { limit: 20 });
  });

  console.log(chalk.bold('\n📈 PHASE 3: Token Analytics\n'));

  // 7. Token screener (1 call)
  await step('Getting token screener (24h)', async () => {
    return await bot.nansen.getTokenScreener('ethereum', { timeframe: '24h', limit: 20 });
  });

  // 8. Solana token screener (1 call)
  await step('Getting Solana token screener', async () => {
    return await bot.nansen.getTokenScreener('solana', { timeframe: '24h', limit: 20 });
  });

  console.log(chalk.bold('\n🐋 PHASE 4: Whale Discovery\n'));

  // 9. Perp leaderboard (1 call)
  await step('Getting perpetuals leaderboard', async () => {
    return await bot.nansen.getPerpLeaderboard({ timeframe: '30d', limit: 10 });
  });

  // 10. Smart money DCAs (1 call)
  await step('Getting smart money DCA patterns', async () => {
    return await bot.nansen.getSmartMoneyDCAs('solana', { limit: 10 });
  });

  console.log(chalk.bold('\n🤖 PHASE 5: AI Research Agent\n'));

  // 11. Ask AI agent about market (1 call)
  await step('Asking AI: "What are the top smart money moves today?"', async () => {
    return await bot.nansen.askAgent('What are the top smart money inflows on Ethereum today?');
  });

  // 12. AI analysis (1 call)
  await step('Asking AI: "What tokens are smart money accumulating?"', async () => {
    return await bot.nansen.askAgent('What tokens are smart money wallets accumulating on Solana?');
  });

  console.log(chalk.bold('\n💱 PHASE 6: Trading Demo\n'));

  // 13. Get trade quote (1 call)
  await step('Getting swap quote: 0.1 ETH → USDC on Base', async () => {
    return await bot.nansen.getTradeQuote('base', 'ETH', 'USDC', '100000000000000000');
  });

  // 14. Get another quote (1 call)
  await step('Getting swap quote: 1 SOL → USDC on Solana', async () => {
    return await bot.nansen.getTradeQuote('solana', 'SOL', 'USDC', '1000000000');
  });

  console.log(chalk.bold('\n📊 PHASE 7: Final Analysis\n'));

  // 15. One more AI call (1 call)
  await step('Asking AI for trading recommendations', async () => {
    return await bot.nansen.askAgent('Give me your top 3 crypto trading opportunities right now based on smart money data');
  });

  // Summary
  const totalCalls = bot.getApiCallCount();
  const successful = results.filter(r => r.success).length;

  console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold('📊 DEMO COMPLETE - SUMMARY'));
  console.log(chalk.cyan('═══════════════════════════════════════════════════════════════\n'));

  console.log(`   ${chalk.bold('Total Steps:')} ${results.length}`);
  console.log(`   ${chalk.bold('Successful:')} ${chalk.green(successful)}`);
  console.log(`   ${chalk.bold('Failed:')} ${chalk.red(results.length - successful)}`);
  console.log(`   ${chalk.bold('API Calls Made:')} ${chalk.yellow(totalCalls)}`);
  console.log(`   ${chalk.bold('Minimum Required:')} 10`);
  console.log(`   ${chalk.bold('Status:')} ${totalCalls >= 10 ? chalk.green.bold('✅ HACKATHON REQUIREMENT MET!') : chalk.red('Need more calls')}`);

  console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold('\n🏆 FEATURES DEMONSTRATED:\n'));
  console.log('   ✅ Smart Money Netflows (multi-chain)');
  console.log('   ✅ Smart Money DEX Trades');
  console.log('   ✅ Smart Money Holdings');
  console.log('   ✅ Smart Money DCA Patterns');
  console.log('   ✅ Token Screener');
  console.log('   ✅ Perpetuals Leaderboard');
  console.log('   ✅ AI Research Agent');
  console.log('   ✅ Trade Quotes');

  console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold('\n📱 SHARE ON X:\n'));
  console.log(chalk.white('   Built HackoBot - an autonomous smart money intelligence agent'));
  console.log(chalk.white('   using @nansen_ai CLI! Scans for alpha, tracks whales, and'));
  console.log(chalk.white('   uses AI for deep research. #NansenCLI'));
  console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════════\n'));

  return { totalCalls, successful, total: results.length };
}

main().catch(console.error);
