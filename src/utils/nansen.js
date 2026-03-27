/**
 * HackoBot - Nansen CLI Wrapper
 * Provides a clean API for interacting with Nansen CLI
 */

const { execSync, spawn } = require('child_process');

class NansenClient {
  constructor() {
    this.apiCallCount = 0;
    this.cache = new Map();
    this.cacheTTL = 60000; // 1 minute cache
    this.creditsRemaining = null;
    this.plan = null;
  }

  /**
   * Check remaining credits before making calls
   */
  async checkCredits() {
    const status = await this.getAccountStatus();
    if (status?.data) {
      this.creditsRemaining = status.data.credits_remaining;
      this.plan = status.data.plan;
    }
    return {
      credits: this.creditsRemaining,
      plan: this.plan,
      hasCredits: this.creditsRemaining > 0
    };
  }

  /**
   * Execute a Nansen CLI command
   */
  async exec(command, options = {}) {
    const { cache = false, stream = false, pretty = false } = options;

    let cmd = `nansen ${command}`;
    if (pretty) cmd += ' --pretty';
    if (stream) cmd += ' --stream';
    if (cache) cmd += ' --cache';

    // Check cache
    const cacheKey = cmd;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      const result = execSync(cmd, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large responses
        timeout: 120000 // 2 minute timeout
      });

      this.apiCallCount++;

      let parsed;
      try {
        parsed = JSON.parse(result);
      } catch {
        parsed = result;
      }

      // Check for API errors in response
      if (parsed && typeof parsed === 'object') {
        if (parsed.success === false) {
          // Check for common error types
          if (parsed.code === 'INSUFFICIENT_CREDITS' || parsed.error?.includes('credits')) {
            throw new Error(`Insufficient credits. Remaining: ${this.creditsRemaining || 0}. Get more at https://agents.nansen.ai`);
          }
          if (parsed.code === 'UNAUTHORIZED') {
            throw new Error('Not logged in. Run: nansen login --api-key YOUR_KEY');
          }
          // Return error object for proper display
          return parsed;
        }
      }

      // Cache the result
      if (cache) {
        this.cache.set(cacheKey, { data: parsed, timestamp: Date.now() });
      }

      return parsed;
    } catch (error) {
      // Try to parse error output for more details
      if (error.stdout) {
        try {
          const errJson = JSON.parse(error.stdout);
          if (errJson.success === false) {
            // Return the error object for proper display
            return errJson;
          }
        } catch {
          // Not JSON, return raw output
          return { success: false, error: error.stdout };
        }
      }
      if (error.stderr) {
        return { success: false, error: error.stderr };
      }
      return { success: false, error: error.message };
    }
  }

  // ========== SMART MONEY ==========

  async getSmartMoneyNetflow(chain = 'ethereum', options = {}) {
    const { days = 7, limit = 20 } = options;
    return this.exec(`research smart-money netflow --chain ${chain} --days ${days} --limit ${limit}`);
  }

  async getSmartMoneyDexTrades(chain = 'ethereum', options = {}) {
    const { days = 1, limit = 50 } = options;
    return this.exec(`research smart-money dex-trades --chain ${chain} --days ${days} --limit ${limit}`);
  }

  async getSmartMoneyHoldings(chain = 'ethereum', options = {}) {
    const { limit = 50 } = options;
    return this.exec(`research smart-money holdings --chain ${chain} --limit ${limit}`);
  }

  async getSmartMoneyDCAs(chain = 'ethereum', options = {}) {
    const { limit = 20 } = options;
    return this.exec(`research smart-money dcas --chain ${chain} --limit ${limit}`);
  }

  async getSmartMoneyPerpTrades(options = {}) {
    const { days = 1, limit = 50 } = options;
    return this.exec(`research smart-money perp-trades --days ${days} --limit ${limit}`);
  }

  // ========== TOKEN ANALYTICS ==========

  async getTokenScreener(chain = 'ethereum', options = {}) {
    const { timeframe = '24h', limit = 30 } = options;
    return this.exec(`research token screener --chain ${chain} --timeframe ${timeframe} --limit ${limit}`);
  }

  async getTokenFlows(token, chain = 'ethereum', options = {}) {
    const { days = 7 } = options;
    return this.exec(`research token flows --token ${token} --chain ${chain} --days ${days}`);
  }

  async getTokenHolders(token, chain = 'ethereum', options = {}) {
    const { limit = 50 } = options;
    return this.exec(`research token holders --token ${token} --chain ${chain} --limit ${limit}`);
  }

  async getTokenWhoBoughtSold(token, chain = 'ethereum', options = {}) {
    const { days = 1, limit = 50 } = options;
    return this.exec(`research token who-bought-sold --token ${token} --chain ${chain} --days ${days} --limit ${limit}`);
  }

  async getTokenPnL(token, chain = 'ethereum', options = {}) {
    const { limit = 50 } = options;
    return this.exec(`research token pnl --token ${token} --chain ${chain} --limit ${limit}`);
  }

  async getTokenInfo(token, chain = 'ethereum') {
    return this.exec(`research token info --token ${token} --chain ${chain}`);
  }

  async getTokenIndicators(token, chain = 'ethereum') {
    return this.exec(`research token indicators --token ${token} --chain ${chain}`);
  }

  async getTokenDexTrades(token, chain = 'ethereum', options = {}) {
    const { days = 1, limit = 100 } = options;
    return this.exec(`research token dex-trades --token ${token} --chain ${chain} --days ${days} --limit ${limit}`);
  }

  // ========== WALLET PROFILER ==========

  async getWalletBalance(address, chain = 'ethereum') {
    return this.exec(`research profiler balance --address ${address} --chain ${chain}`);
  }

  async getWalletPnL(address, chain = 'ethereum') {
    return this.exec(`research profiler pnl-summary --address ${address} --chain ${chain}`);
  }

  async getWalletTransactions(address, chain = 'ethereum', options = {}) {
    const { limit = 50 } = options;
    return this.exec(`research profiler transactions --address ${address} --chain ${chain} --limit ${limit}`);
  }

  async getWalletLabels(address) {
    return this.exec(`research profiler labels --address ${address}`);
  }

  async getWalletCounterparties(address, chain = 'ethereum', options = {}) {
    const { limit = 50 } = options;
    return this.exec(`research profiler counterparties --address ${address} --chain ${chain} --limit ${limit}`);
  }

  async getRelatedWallets(address, chain = 'ethereum') {
    return this.exec(`research profiler related-wallets --address ${address} --chain ${chain}`);
  }

  async searchWallets(query) {
    return this.exec(`research profiler search --query "${query}"`);
  }

  // ========== PERPETUALS ==========

  async getPerpScreener(options = {}) {
    const { timeframe = '24h' } = options;
    return this.exec(`research perp screener --timeframe ${timeframe}`);
  }

  async getPerpLeaderboard(options = {}) {
    const { timeframe = '7d', limit = 50 } = options;
    return this.exec(`research perp leaderboard --timeframe ${timeframe} --limit ${limit}`);
  }

  // ========== AI AGENT ==========

  async askAgent(question, options = {}) {
    const { expert = false, conversationId = null } = options;
    let cmd = `agent "${question.replace(/"/g, '\\"')}"`;
    if (expert) cmd += ' --expert';
    if (conversationId) cmd += ` --conversation-id ${conversationId}`;
    return this.exec(cmd);
  }

  // ========== TRADING ==========

  async getTradeQuote(chain, fromToken, toToken, amount ) {
    return this.exec(`trade quote --chain ${chain} --from ${fromToken} --to ${toToken} --amount ${amount}`);
  }

  async executeTrade(quoteId, wallet = null) {
    let cmd = `trade execute --quote ${quoteId}`;
    if (wallet) cmd += ` --wallet ${wallet}`;
    return this.exec(cmd);
  }

  // ========== PORTFOLIO ==========

  async getPortfolio(chain = 'ethereum', options = {}) {
    const { limit = 50 } = options;
    return this.exec(`research portfolio --chain ${chain} --limit ${limit}`);
  }

  // ========== ALERTS ==========

  async listAlerts() {
    return this.exec('alerts list');
  }

  async createAlert(config) {
    const configStr = JSON.stringify(config).replace(/"/g, '\\"');
    return this.exec(`alerts create --config "${configStr}"`);
  }

  // ========== ACCOUNT ==========

  async getAccountStatus() {
    return this.exec('account');
  }

  // ========== UTILITIES ==========

  getApiCallCount() {
    return this.apiCallCount;
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = { NansenClient };
