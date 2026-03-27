#!/usr/bin/env node

/**
 * HackoBot CLI - Interactive Terminal Interface
 * Beautiful terminal UI for smart money intelligence
 */

const { program } = require('commander');
const { HackoBot } = require('./core/hackobot');
const { GhostNet } = require('./modules/ghostnet');
const chalk = require('chalk');

// ASCII Art Banner
const banner = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.green('██╗  ██╗ █████╗  ██████╗██╗  ██╗ ██████╗ ██████╗  ██████╗ ████████╗')} ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.green('██║  ██║██╔══██╗██╔════╝██║ ██╔╝██╔═══██╗██╔══██╗██╔═══██╗╚══██╔══╝')} ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.green('███████║███████║██║     █████╔╝ ██║   ██║██████╔╝██║   ██║   ██║   ')} ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.green('██╔══██║██╔══██║██║     ██╔═██╗ ██║   ██║██╔══██╗██║   ██║   ██║   ')} ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.green('██║  ██║██║  ██║╚██████╗██║  ██╗╚██████╔╝██████╔╝╚██████╔╝   ██║   ')} ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.green('╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝    ╚═╝   ')} ${chalk.cyan('║')}
${chalk.cyan('╠═══════════════════════════════════════════════════════════════════╣')}
${chalk.cyan('║')}        ${chalk.yellow('🤖 Autonomous Smart Money Intelligence Agent')}                   ${chalk.cyan('║')}
${chalk.cyan('║')}        ${chalk.dim('Powered by Nansen CLI • Built for #NansenCLI Hackathon')}        ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════════════╝')}
`;

const bot = new HackoBot();

// Utility functions for pretty output
const formatUSD = (value) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

const formatScore = (score) => {
  if (score >= 80) return chalk.green.bold(`${score}/100 🔥`);
  if (score >= 60) return chalk.yellow(`${score}/100 ⚡`);
  return chalk.dim(`${score}/100`);
};

// Format any value for display (handles objects, arrays, strings)
const formatResponse = (value) => {
  if (value === null || value === undefined) return chalk.dim('No data');
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    // Check for error responses
    if (value.error) {
      return chalk.red(`Error: ${value.error}`);
    }
    // Check for success: false
    if (value.success === false) {
      return chalk.red(`API Error: ${value.error || value.message || 'Unknown error'}`);
    }
    // Format data nicely
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

const printSignal = (signal, index) => {
  const typeColors = {
    ACCUMULATION: chalk.green,
    SMART_MONEY_BUYING: chalk.cyan,
    VOLUME_BREAKOUT: chalk.magenta,
    DCA_CONVICTION: chalk.blue
  };

  const color = typeColors[signal.type] || chalk.white;

  console.log(chalk.dim(`─────────────────────────────────────────────────`));
  console.log(`${chalk.bold(`#${index + 1}`)} ${color.bold(signal.type)}`);
  console.log(`   ${chalk.bold('Token:')} ${chalk.white(signal.token || 'Unknown')} ${chalk.dim(`on ${signal.chain}`)}`);
  console.log(`   ${chalk.bold('Score:')} ${formatScore(signal.score)}`);

  if (signal.metrics) {
    const metrics = Object.entries(signal.metrics)
      .map(([k, v]) => `${k}: ${typeof v === 'number' ? formatUSD(v) : v}`)
      .join(' | ');
    console.log(`   ${chalk.dim(metrics)}`);
  }
};

const printWhale = (whale, index) => {
  console.log(chalk.dim(`─────────────────────────────────────────────────`));
  console.log(`${chalk.bold(`#${index + 1}`)} ${chalk.cyan(whale.label || 'Smart Money')}`);
  console.log(`   ${chalk.bold('Address:')} ${chalk.dim(whale.address?.slice(0, 10) + '...' + whale.address?.slice(-8) || 'Unknown')}`);
  console.log(`   ${chalk.bold('Chain:')} ${whale.chain}`);
  if (whale.metrics) {
    if (whale.metrics.pnl) console.log(`   ${chalk.bold('PnL:')} ${formatUSD(whale.metrics.pnl)}`);
    if (whale.metrics.winRate) console.log(`   ${chalk.bold('Win Rate:')} ${whale.metrics.winRate}%`);
  }
};

// CLI Commands
program
  .name('hackobot')
  .description('🤖 HackoBot - Autonomous Smart Money Intelligence Agent')
  .version('1.0.0');

program
  .command('demo')
  .description('Run a complete demo of HackoBot capabilities')
  .action(async () => {
    console.log(banner);
    console.log(chalk.yellow('\n🚀 Running full demonstration...\n'));

    try {
      const results = await bot.runDemo();

      console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.bold('📊 Demo Results Summary'));
      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

      for (const step of results.steps) {
        console.log(`✅ ${chalk.bold(step.name)}: ${chalk.green('Completed')}`);
      }

      console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(`📡 ${chalk.bold('Total Nansen API Calls:')} ${chalk.yellow(results.apiCalls)}`);
      console.log(`⏱️  ${chalk.bold('Duration:')} ${chalk.yellow((results.duration / 1000).toFixed(1) + 's')}`);
      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

program
  .command('scan')
  .description('Scan for alpha opportunities across chains')
  .option('-c, --chain <chain>', 'Specific chain to scan', 'all')
  .action(async (options) => {
    console.log(banner);
    console.log(chalk.yellow('\n🔍 Scanning for alpha opportunities...\n'));

    try {
      const chains = options.chain === 'all'
        ? ['ethereum', 'solana', 'base']
        : [options.chain];

      bot.config.chains = chains;
      const results = await bot.scan();

      console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.bold(`🎯 Top Alpha Signals (${results.topSignals.length})`));
      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

      if (results.topSignals.length === 0) {
        console.log(chalk.dim('\nNo significant signals found at this time.'));
      } else {
        results.topSignals.forEach((signal, i) => printSignal(signal, i));
      }

      console.log(chalk.dim(`\n─────────────────────────────────────────────────`));
      console.log(`📡 ${chalk.bold('API Calls:')} ${chalk.yellow(results.apiCalls)}`);

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

program
  .command('whales')
  .description('Discover smart money whales')
  .option('-c, --chain <chain>', 'Chain to scan', 'ethereum')
  .option('-l, --limit <number>', 'Number of whales to find', '10')
  .action(async (options) => {
    console.log(banner);
    console.log(chalk.yellow(`\n🐋 Discovering whales on ${options.chain}...\n`));

    try {
      const whales = await bot.discoverWhales(options.chain, { limit: parseInt(options.limit) });

      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.bold(`🐋 Smart Money Whales (${whales.length})`));
      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

      whales.slice(0, 10).forEach((whale, i) => printWhale(whale, i));

      console.log(chalk.dim(`\n─────────────────────────────────────────────────`));
      console.log(`📡 ${chalk.bold('API Calls:')} ${chalk.yellow(bot.getApiCallCount())}`);

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

program
  .command('research <query>')
  .description('Research a token or wallet using AI')
  .option('-c, --chain <chain>', 'Chain to research on', 'ethereum')
  .option('-t, --type <type>', 'Type: token or wallet', 'token')
  .option('--expert', 'Use expert mode for deeper analysis', false)
  .action(async (query, options) => {
    console.log(banner);
    console.log(chalk.yellow(`\n🔬 Researching ${options.type}: ${query}...\n`));

    try {
      let result;

      if (options.type === 'wallet' || query.startsWith('0x')) {
        result = await bot.researchWallet(query, options.chain);
      } else {
        result = await bot.researchToken(query, options.chain);
      }

      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.bold(`📊 Research Results`));
      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

      if (result.sections?.aiAnalysis) {
        console.log(chalk.bold('🤖 AI Analysis:'));
        console.log(chalk.white(formatResponse(result.sections.aiAnalysis)));
      }

      if (result.summary) {
        console.log(chalk.bold('\n📈 Summary:'));
        console.log(`   Verdict: ${result.summary.verdict.toUpperCase()}`);
        console.log(`   Confidence: ${result.summary.confidence}%`);
        if (result.summary.keyPoints.length > 0) {
          console.log(chalk.bold('   Key Points:'));
          result.summary.keyPoints.forEach(p => console.log(`   • ${p}`));
        }
      }

      console.log(chalk.dim(`\n─────────────────────────────────────────────────`));
      console.log(`📡 ${chalk.bold('API Calls:')} ${chalk.yellow(bot.getApiCallCount())}`);

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

program
  .command('ask <question>')
  .description('Ask the AI agent any question')
  .option('--expert', 'Use expert mode', false)
  .action(async (question, options) => {
    console.log(banner);
    console.log(chalk.yellow(`\n🤖 Asking AI: "${question}"...\n`));

    try {
      const response = await bot.ask(question, { expert: options.expert });

      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.bold('🤖 AI Response'));
      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
      console.log(chalk.white(formatResponse(response.answer)));

      console.log(chalk.dim(`\n─────────────────────────────────────────────────`));
      console.log(`📡 ${chalk.bold('API Calls:')} ${chalk.yellow(bot.getApiCallCount())}`);

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

program
  .command('profile <address>')
  .description('Deep profile a wallet address')
  .option('-c, --chain <chain>', 'Chain', 'ethereum')
  .action(async (address, options) => {
    console.log(banner);
    console.log(chalk.yellow(`\n📊 Profiling wallet: ${address.slice(0, 10)}...${address.slice(-8)}...\n`));

    try {
      const profile = await bot.profileWhale(address, options.chain);

      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.bold('📊 Wallet Profile'));
      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

      if (profile.labels && profile.labels.length > 0) {
        console.log(chalk.bold('🏷️  Labels:'));
        const labels = Array.isArray(profile.labels) ? profile.labels : [profile.labels];
        labels.forEach(l => console.log(`   • ${l.label || l.name || l}`));
      }

      if (profile.analysis) {
        console.log(chalk.bold('\n📈 Analysis:'));
        console.log(`   Trading Style: ${profile.analysis.tradingStyle}`);
        console.log(`   Risk Score: ${profile.analysis.riskScore}/100`);

        if (profile.analysis.insights.length > 0) {
          console.log(chalk.bold('   Insights:'));
          profile.analysis.insights.forEach(i => console.log(`   • ${i}`));
        }

        if (profile.analysis.topHoldings.length > 0) {
          console.log(chalk.bold('\n💰 Top Holdings:'));
          profile.analysis.topHoldings.forEach(h => {
            console.log(`   • ${h.token}: ${formatUSD(parseFloat(h.value) || 0)}`);
          });
        }
      }

      console.log(chalk.dim(`\n─────────────────────────────────────────────────`));
      console.log(`📡 ${chalk.bold('API Calls:')} ${chalk.yellow(bot.getApiCallCount())}`);

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

program
  .command('quote')
  .description('Get a swap quote')
  .requiredOption('-c, --chain <chain>', 'Chain (solana, base)')
  .requiredOption('-f, --from <token>', 'Token to swap from')
  .requiredOption('-t, --to <token>', 'Token to swap to')
  .requiredOption('-a, --amount <amount>', 'Amount in smallest unit')
  .action(async (options) => {
    console.log(banner);
    console.log(chalk.yellow(`\n💱 Getting quote: ${options.amount} ${options.from} → ${options.to} on ${options.chain}...\n`));

    try {
      const quote = await bot.getQuote(options.chain, options.from, options.to, options.amount);

      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.bold('💱 Swap Quote'));
      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
      console.log(JSON.stringify(quote, null, 2));

      console.log(chalk.dim(`\n─────────────────────────────────────────────────`));
      console.log(`📡 ${chalk.bold('API Calls:')} ${chalk.yellow(bot.getApiCallCount())}`);

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

program
  .command('status')
  .description('Show HackoBot status and API usage')
  .action(async () => {
    console.log(banner);

    try {
      const init = await bot.initialize();
      const state = bot.getState();

      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.bold('📊 HackoBot Status'));
      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
      console.log(`   ${chalk.bold('API Status:')} ${init.success ? chalk.green('Connected ✓') : chalk.red('Disconnected ✗')}`);
      console.log(`   ${chalk.bold('Mode:')} ${state.mode}`);
      console.log(`   ${chalk.bold('Running:')} ${state.isRunning ? chalk.green('Yes') : chalk.dim('No')}`);
      console.log(`   ${chalk.bold('Signals:')} ${state.signals.length}`);
      console.log(`   ${chalk.bold('Alerts:')} ${state.alerts.length}`);
      console.log(`   ${chalk.bold('API Calls:')} ${state.apiCalls}`);

      if (init.account) {
        console.log(chalk.bold('\n📋 Account Details:'));
        console.log(JSON.stringify(init.account, null, 2));
      }

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

program
  .command('ghostnet')
  .description('Run GhostNet cross-market coordination intelligence')
  .option('-c, --chain <chain>', 'Chain to analyze', 'ethereum')
  .action(async (options) => {
    console.log(banner);
    console.log(chalk.yellow(`\n👻 Running GhostNet on ${options.chain}...\n`));

    try {
      const ghostnet = new GhostNet(bot.nansen);
      const results = await ghostnet.run(options.chain);

      console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.bold('👻 GhostNet Summary'));
      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(`📡 ${chalk.bold('API Calls:')} ${chalk.yellow(results.apiCalls)}`);
      console.log(`🕸️  ${chalk.bold('Coordination Clusters:')} ${chalk.yellow(results.coordinationClusters.length)}`);
      console.log(`⚡ ${chalk.bold('Spot/Perp Overlap:')} ${chalk.yellow(results.hyperliquidOverlap.length)}`);
      console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    }
  });

// Parse arguments
program.parse();

// If no command specified, show help
if (!process.argv.slice(2).length) {
  console.log(banner);
  program.help();
}
