/**
 * HackoBot - Main Orchestrator
 * The brain that coordinates all modules for autonomous smart money intelligence
 */

const { NansenClient } = require('../utils/nansen');
const { AlphaScanner } = require('../modules/alpha-scanner');
const { WhaleTracker } = require('../modules/whale-tracker');
const { AIResearcher } = require('../modules/ai-researcher');
const { CopyTrader } = require('../modules/copy-trader');

class HackoBot {
  constructor() {
    this.nansen = new NansenClient();
    this.alphaScanner = new AlphaScanner(this.nansen);
    this.whaleTracker = new WhaleTracker(this.nansen);
    this.aiResearcher = new AIResearcher(this.nansen);
    this.copyTrader = new CopyTrader(this.nansen);

    this.state = {
      isRunning: false,
      lastScan: null,
      signals: [],
      alerts: [],
      mode: 'research' // research | monitor | trade
    };

    this.config = {
      chains: ['ethereum', 'solana', 'base'],
      scanInterval: 300000, // 5 minutes
      alertThreshold: 70,
      autoTrade: false
    };
  }

  /**
   * Initialize the bot
   */
  async initialize() {
    console.log('🤖 HackoBot initializing...');

    // Check account status
    try {
      const account = await this.nansen.getAccountStatus();
      console.log('✅ Nansen API connected');
      return { success: true, account };
    } catch (error) {
      console.error('❌ Failed to connect to Nansen API:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run a full alpha scan across all configured chains
   */
  async scan() {
    console.log('🔍 Scanning for alpha...');

    const scanResults = await this.alphaScanner.scanAllChains(this.config.chains);

    this.state.lastScan = Date.now();
    this.state.signals = scanResults.topSignals;

    // Generate alerts for high-confidence signals
    const newAlerts = scanResults.topSignals
      .filter(s => s.score >= this.config.alertThreshold)
      .map(signal => ({
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        signal,
        createdAt: Date.now(),
        acknowledged: false
      }));

    this.state.alerts.push(...newAlerts);

    return {
      timestamp: scanResults.timestamp,
      totalSignals: Object.values(scanResults.chains).flat().length,
      topSignals: scanResults.topSignals,
      newAlerts: newAlerts.length,
      apiCalls: this.nansen.getApiCallCount()
    };
  }

  /**
   * Research a specific token
   */
  async researchToken(token, chain = 'ethereum') {
    console.log(`🔬 Researching ${token} on ${chain}...`);
    return this.aiResearcher.researchToken(token, chain);
  }

  /**
   * Research a wallet
   */
  async researchWallet(address, chain = 'ethereum') {
    console.log(`🔬 Researching wallet ${address}...`);
    return this.aiResearcher.researchWallet(address, chain);
  }

  /**
   * Ask the AI agent a question
   */
  async ask(question, options = {}) {
    return this.aiResearcher.ask(question, options);
  }

  /**
   * Get market analysis
   */
  async analyzeMarket(chain = 'ethereum') {
    return this.aiResearcher.analyzeMarket(chain);
  }

  /**
   * Discover and track whales
   */
  async discoverWhales(chain = 'ethereum', options = {}) {
    console.log(`🐋 Discovering whales on ${chain}...`);
    return this.whaleTracker.discoverWhales(chain, options);
  }

  /**
   * Profile a specific whale
   */
  async profileWhale(address, chain = 'ethereum') {
    console.log(`📊 Profiling whale ${address}...`);
    return this.whaleTracker.profileWhale(address, chain);
  }

  /**
   * Follow a wallet for copy trading
   */
  followWallet(address, chain, options = {}) {
    return this.copyTrader.followWallet(address, chain, options);
  }

  /**
   * Get copy trading recommendations
   */
  async getCopyRecommendations() {
    return this.copyTrader.getRecommendations();
  }

  /**
   * Scan for copy trading opportunities
   */
  async scanCopyTrades() {
    return this.copyTrader.scanForTrades();
  }

  /**
   * Get a trade quote
   */
  async getQuote(chain, fromToken, toToken, amount) {
    return this.nansen.getTradeQuote(chain, fromToken, toToken, amount);
  }

  /**
   * Execute a trade
   */
  async executeTrade(quoteId, wallet = null) {
    return this.copyTrader.executeTrade(quoteId, wallet);
  }

  /**
   * Start autonomous monitoring mode
   */
  startMonitoring() {
    if (this.state.isRunning) {
      console.log('⚠️ Monitoring already running');
      return;
    }

    this.state.isRunning = true;
    this.state.mode = 'monitor';

    console.log('🚀 Starting autonomous monitoring...');

    this.monitorInterval = setInterval(async () => {
      try {
        const results = await this.scan();
        console.log(`📡 Scan complete: ${results.totalSignals} signals, ${results.newAlerts} new alerts`);

        // Check for copy trade opportunities
        if (this.copyTrader.getFollowedWallets().length > 0) {
          const copyOpps = await this.scanCopyTrades();
          if (copyOpps.length > 0) {
            console.log(`💰 ${copyOpps.length} new copy trading opportunities`);
          }
        }
      } catch (error) {
        console.error('Monitoring error:', error.message);
      }
    }, this.config.scanInterval);

    // Run initial scan
    this.scan();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.state.isRunning = false;
    console.log('⏹️ Monitoring stopped');
  }

  /**
   * Get current state
   */
  getState() {
    return {
      ...this.state,
      followedWallets: this.copyTrader.getFollowedWallets().length,
      trackedWhales: this.whaleTracker.getTrackedWallets().length,
      apiCalls: this.nansen.getApiCallCount()
    };
  }

  /**
   * Get signals
   */
  getSignals(minScore = 0) {
    return this.state.signals.filter(s => s.score >= minScore);
  }

  /**
   * Get unacknowledged alerts
   */
  getAlerts() {
    return this.state.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.state.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get API call count
   */
  getApiCallCount() {
    return this.nansen.getApiCallCount();
  }

  /**
   * Run a complete demonstration of capabilities
   */
  async runDemo() {
    const results = {
      steps: [],
      apiCalls: 0,
      startTime: Date.now()
    };

    console.log('\n🤖 HackoBot Demo Starting...\n');

    // Step 1: Account check
    console.log('📋 Step 1: Checking account status...');
    const account = await this.initialize();
    results.steps.push({ name: 'Account Check', result: account });

    // Step 2: Scan for alpha
    console.log('\n🔍 Step 2: Scanning for alpha opportunities...');
    const scanResults = await this.scan();
    results.steps.push({ name: 'Alpha Scan', result: scanResults });

    // Step 3: Discover whales
    console.log('\n🐋 Step 3: Discovering smart money whales...');
    const whales = await this.discoverWhales('ethereum', { limit: 5 });
    results.steps.push({ name: 'Whale Discovery', result: { count: whales.length } });

    // Step 4: Get market analysis
    console.log('\n📊 Step 4: Getting AI market analysis...');
    const marketAnalysis = await this.analyzeMarket('ethereum');
    results.steps.push({ name: 'Market Analysis', result: { hasAnalysis: !!marketAnalysis.analysis } });

    // Step 5: Get trading recommendation
    console.log('\n💡 Step 5: Getting trading recommendations...');
    const recommendations = await this.aiResearcher.getRecommendations('medium');
    results.steps.push({ name: 'Recommendations', result: { hasRecommendations: !!recommendations.recommendations } });

    results.apiCalls = this.getApiCallCount();
    results.duration = Date.now() - results.startTime;

    console.log('\n✅ Demo Complete!');
    console.log(`📊 Total API Calls: ${results.apiCalls}`);
    console.log(`⏱️ Duration: ${(results.duration / 1000).toFixed(1)}s`);

    return results;
  }
}

module.exports = { HackoBot };
