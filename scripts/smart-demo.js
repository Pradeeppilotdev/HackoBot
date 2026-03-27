#!/usr/bin/env node

/**
 * HackoBot - Credit-Aware Demo
 * Works within free tier limits while showcasing all features
 */

const { HackoBot } = require('../src/core/hackobot');
const chalk = require('chalk');

const banner = `
${chalk.cyan('╔════════════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.green('🤖 HACKOBOT - SMART MONEY INTELLIGENCE AGENT')}                       ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.dim('Built for #NansenCLI Hackathon | @nansen_ai')}                         ${chalk.cyan('║')}
${chalk.cyan('╚════════════════════════════════════════════════════════════════════╝')}
`;

const formatResponse = (data) => {
  if (!data) return chalk.dim('No data');
  if (data.success === false) {
    return chalk.red(`Error: ${data.error || 'Unknown error'}`);
  }
  if (typeof data === 'string') return data;
  if (data.data) {
    // Has nested data
    const items = Array.isArray(data.data) ? data.data : [data.data];
    return items.slice(0, 3).map(item => {
      if (typeof item === 'object') {
        const keys = Object.keys(item).slice(0, 4);
        return keys.map(k => `${k}: ${item[k]}`).join(' | ');
      }
      return String(item);
    }).join('\n   ');
  }
  return JSON.stringify(data, null, 2).slice(0, 500);
};

async function main() {
  console.log(banner);

  const bot = new HackoBot();
  const apiCalls = [];
  let totalCreditsUsed = 0;

  // Helper function
  const runStep = async (name, emoji, fn) => {
    process.stdout.write(chalk.yellow(`${emoji} ${name}... `));
    const start = Date.now();
    try {
      const result = await fn();
      const duration = ((Date.now() - start) / 1000).toFixed(1);

      // Check if it was successful
      if (result && result.success === false) {
        console.log(chalk.red(`✗ ${result.error || 'Failed'}`));
        apiCalls.push({ name, success: false, error: result.error });
      } else {
        console.log(chalk.green(`✓ (${duration}s)`));
        apiCalls.push({ name, success: true, duration });

        // Show preview of data
        if (result?.data || (result && typeof result === 'object' && !result.error)) {
          console.log(chalk.dim(`   ${formatResponse(result).split('\n').slice(0, 2).join('\n   ')}`));
        }
      }
      return result;
    } catch (error) {
      console.log(chalk.red(`✗ ${error.message}`));
      apiCalls.push({ name, success: false, error: error.message });
      return null;
    }
  };

  // STEP 1: Check credits (FREE)
  console.log(chalk.bold('\n📊 PHASE 1: Account Status\n'));

  const account = await runStep('Checking account & credits', '💳', async () => {
    return await bot.nansen.getAccountStatus();
  });

  const credits = account?.data?.credits_remaining ?? 0;
  const plan = account?.data?.plan ?? 'unknown';

  console.log(chalk.cyan(`\n   Plan: ${plan.toUpperCase()} | Credits: ${credits}`));

  if (credits === 0) {
    console.log(chalk.yellow('\n⚠️  No credits remaining. Showing architecture demo...\n'));
    showArchitectureDemo();
    return;
  }

  // STEP 2: Smart Money Analysis (if credits available)
  console.log(chalk.bold('\n🔍 PHASE 2: Smart Money Analysis\n'));

  await runStep('Getting smart money netflows (Ethereum)', '📈', async () => {
    return await bot.nansen.getSmartMoneyNetflow('ethereum', { days: 7, limit: 5 });
  });

  // Check credits again
  const creditsAfter = (await bot.nansen.getAccountStatus())?.data?.credits_remaining ?? 0;

  if (creditsAfter > 0) {
    await runStep('Getting smart money holdings', '💰', async () => {
      return await bot.nansen.getSmartMoneyHoldings('ethereum', { limit: 5 });
    });
  }

  if (creditsAfter > 50) {
    await runStep('Getting token screener', '🔎', async () => {
      return await bot.nansen.getTokenScreener('ethereum', { timeframe: '24h', limit: 5 });
    });
  }

  // Final summary
  const successful = apiCalls.filter(c => c.success).length;
  const failed = apiCalls.filter(c => !c.success).length;

  console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold('📊 DEMO SUMMARY'));
  console.log(chalk.cyan('═══════════════════════════════════════════════════════════════\n'));

  console.log(`   ${chalk.bold('API Calls Made:')} ${chalk.green(successful)} successful, ${chalk.red(failed)} failed`);
  console.log(`   ${chalk.bold('Credits Used:')} ~${successful * 50} (estimated)`);
  console.log(`   ${chalk.bold('Hackathon Requirement:')} ${successful >= 10 ? chalk.green('✓ MET (10+ calls)') : chalk.yellow(`${successful}/10 calls`)}`);

  console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold('\n🏗️  HACKOBOT ARCHITECTURE:'));
  console.log(chalk.cyan('═══════════════════════════════════════════════════════════════\n'));

  console.log('   ' + chalk.green('✓') + ' Alpha Scanner - Detects smart money accumulation patterns');
  console.log('   ' + chalk.green('✓') + ' Whale Tracker - Discovers & profiles top wallets');
  console.log('   ' + chalk.green('✓') + ' AI Researcher - Natural language research via Nansen AI');
  console.log('   ' + chalk.green('✓') + ' Copy Trader - Follow smart money wallets');
  console.log('   ' + chalk.green('✓') + ' Trade Engine - Quote & execute swaps');

  console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold('\n📱 SHARE ON X:\n'));
  console.log(chalk.white('   Built HackoBot - an AI-powered smart money agent using'));
  console.log(chalk.white('   @nansen_ai CLI! Tracks whales, scans for alpha, and'));
  console.log(chalk.white('   copies smart money trades. #NansenCLI'));
  console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════════\n'));
}

function showArchitectureDemo() {
  console.log(chalk.cyan('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold('🏗️  HACKOBOT FEATURES (Architecture Demo)'));
  console.log(chalk.cyan('═══════════════════════════════════════════════════════════════\n'));

  const features = [
    { name: 'Alpha Scanner', desc: 'Multi-chain smart money flow detection', cmds: ['smart-money netflow', 'smart-money dex-trades', 'token screener'] },
    { name: 'Whale Tracker', desc: 'Discover & profile smart money wallets', cmds: ['profiler balance', 'profiler pnl', 'perp leaderboard'] },
    { name: 'AI Researcher', desc: 'Natural language onchain research', cmds: ['agent "query"', '--expert mode'] },
    { name: 'Copy Trader', desc: 'Follow and copy whale trades', cmds: ['trade quote', 'trade execute'] },
    { name: 'Alert System', desc: 'Real-time smart money alerts', cmds: ['alerts create', 'alerts list'] }
  ];

  for (const f of features) {
    console.log(chalk.green.bold(`   ✓ ${f.name}`));
    console.log(chalk.dim(`     ${f.desc}`));
    console.log(chalk.dim(`     Commands: ${f.cmds.join(', ')}\n`));
  }

  console.log(chalk.cyan('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold('\n📁 PROJECT STRUCTURE:\n'));
  console.log(chalk.white(`
   hackobot/
   ├── src/
   │   ├── index.js           # CLI interface
   │   ├── core/hackobot.js   # Main orchestrator
   │   ├── modules/
   │   │   ├── alpha-scanner.js
   │   │   ├── whale-tracker.js
   │   │   ├── ai-researcher.js
   │   │   └── copy-trader.js
   │   └── utils/nansen.js    # Nansen CLI wrapper
   └── scripts/               # Demo scripts
  `));

  console.log(chalk.cyan('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.yellow('\n💡 Get more credits at https://agents.nansen.ai to run full demo!\n'));
}

main().catch(console.error);
