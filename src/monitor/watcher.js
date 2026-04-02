const { GhostNet } = require('../modules/ghostnet');
const { TelegramAlerter } = require('./telegram');
const { SignalClassifier } = require('./classifier');

class GhostNetWatcher {
  constructor() {
    this.alerter = new TelegramAlerter();
    this.classifier = new SignalClassifier();
    this.isRunning = false;
    this.cycleCount = 0;
    this.interval = null;
    this.chains = ['ethereum']; // ONE chain only
    this.CYCLE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
    this.lastResults = {};
  }

  async runCycle(chain) {
    console.log(`\n[Watcher] Starting cycle ${this.cycleCount + 1} on ${chain}...`);
    const start = Date.now();

    try {
      const ghostnet = new GhostNet();

      const [netflow, dexTrades] = await Promise.all([
        ghostnet.getSmartMoneyTargets(chain),
        ghostnet.getActiveSmartWallets(chain)
      ]);

      const topTokens = ghostnet.extractTopTokens(netflow);
      const walletAddresses = ghostnet.extractWallets(dexTrades, 3);

      const walletProfiles = [];
      for (const address of walletAddresses) {
        const [counterparties, pnl, labels] = await Promise.all([
          ghostnet.getCounterparties(address, chain),
          ghostnet.getWalletPnL(address, chain),
          ghostnet.getWalletLabels(address)
        ]);
        walletProfiles.push({
          address,
          counterparties,
          pnl: pnl?.data || pnl || {},
          labels: labels?.data?.labels || labels?.data || []
        });
      }

      const [perpTrades] = await Promise.all([
        ghostnet.getHyperliquidSmartMoney()
      ]);

      const hyperliquidOverlap = ghostnet.detectHyperliquidOverlap(walletAddresses, perpTrades);
      const coordinationClusters = ghostnet.detectCoordination(walletProfiles);

      // Classify signals
      const signals = this.classifier.classify(
        topTokens, walletProfiles, coordinationClusters, hyperliquidOverlap
      );

      // Send alerts for new high-conviction signals
      const highConviction = signals.filter(s =>
        s.confidence >= 70 && this.classifier.isNewSignal(s)
      );

      for (const signal of highConviction) {
        console.log(`[Watcher] 🚨 Alert: ${signal.type} on ${signal.token} (${signal.confidence}%)`);
        await this.alerter.sendAlert(signal);
      }

      const runtime = ((Date.now() - start) / 1000).toFixed(1);

      // Send cycle summary
      await this.alerter.sendCycleSummary({
        chain,
        tokenCount: topTokens.length,
        walletCount: walletProfiles.length,
        clusters: coordinationClusters.length,
        overlaps: hyperliquidOverlap.length,
        apiCalls: ghostnet.nansen.getApiCallCount(),
        runtime,
        topSignals: highConviction.map(s => `${s.type}: ${s.token} (${s.confidence}%)`),
        topTokens,
        walletProfiles
      });

      // Store results for dashboard
      this.lastResults[chain] = {
        topTokens,
        walletProfiles,
        coordinationClusters,
        hyperliquidOverlap,
        signals,
        timestamp: Date.now(),
        runtime,
        apiCalls: ghostnet.nansen.getApiCallCount()
      };

      this.cycleCount++;
      console.log(`[Watcher] Cycle complete — ${signals.length} signals, ${highConviction.length} alerts sent`);

      return this.lastResults[chain];

    } catch (error) {
      console.error(`[Watcher] Cycle error on ${chain}:`, error.message);
      return null;
    }
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('\n👻 GhostNet Watcher starting...');
    await this.alerter.sendStartup(this.chains);

    // Run immediately on start
    for (const chain of this.chains) {
      await this.runCycle(chain);
    }

    // Then run every 30 minutes
    this.interval = setInterval(async () => {
      for (const chain of this.chains) {
        await this.runCycle(chain);
      }
    }, this.CYCLE_INTERVAL);

    console.log(`[Watcher] Running every 30 minutes on ${this.chains.join(', ')}`);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.isRunning = false;
    console.log('[Watcher] Stopped');
  }

  getLastResults() {
    return this.lastResults;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      cycleCount: this.cycleCount,
      chains: this.chains,
      lastResults: Object.keys(this.lastResults).map(chain => ({
        chain,
        timestamp: this.lastResults[chain]?.timestamp,
        signalCount: this.lastResults[chain]?.signals?.length || 0
      }))
    };
  }
}

module.exports = { GhostNetWatcher };
