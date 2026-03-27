/**
 * HackoBot - Copy Trading Engine
 * Track and optionally copy-trade smart money wallets
 */

const { NansenClient } = require('../utils/nansen');

class CopyTrader {
  constructor(nansen) {
    this.nansen = nansen;
    this.followedWallets = new Map();
    this.pendingTrades = [];
    this.executedTrades = [];
    this.settings = {
      autoCopy: false,
      maxTradeSize: 100, // USD
      minConfidence: 70,
      chains: ['ethereum', 'solana', 'base']
    };
  }

  /**
   * Follow a smart money wallet for copy trading
   */
  followWallet(address, chain, options = {}) {
    const {
      alias = null,
      allocation = 10, // % of portfolio to allocate
      minTradeSize = 1000, // Minimum trade to copy (USD)
      maxSlippage = 3 // Max slippage tolerance (%)
    } = options;

    this.followedWallets.set(address, {
      address,
      chain,
      alias,
      allocation,
      minTradeSize,
      maxSlippage,
      followedAt: Date.now(),
      trades: [],
      stats: {
        copied: 0,
        skipped: 0,
        pnl: 0
      }
    });

    return { success: true, address, alias };
  }

  /**
   * Unfollow a wallet
   */
  unfollowWallet(address) {
    return this.followedWallets.delete(address);
  }

  /**
   * Get all followed wallets
   */
  getFollowedWallets() {
    return Array.from(this.followedWallets.values());
  }

  /**
   * Check for new copy-worthy trades from followed wallets
   */
  async scanForTrades() {
    const opportunities = [];

    for (const [address, config] of this.followedWallets) {
      try {
        const txns = await this.nansen.getWalletTransactions(address, config.chain, { limit: 10 });

        if (!txns?.data) continue;

        const data = Array.isArray(txns.data) ? txns.data : [txns.data];

        for (const tx of data) {
          // Skip if already processed
          const txHash = tx.hash || tx.txHash || tx.transaction_hash;
          if (config.trades.some(t => t.hash === txHash)) continue;

          // Only process buy trades
          const isBuy = tx.type === 'buy' || tx.side === 'buy' || tx.action === 'swap';
          if (!isBuy) continue;

          const tradeSize = parseFloat(tx.valueUsd || tx.value_usd || tx.amount || 0);

          // Check if trade meets minimum size
          if (tradeSize < config.minTradeSize) continue;

          const opportunity = {
            id: `${txHash}-${Date.now()}`,
            sourceWallet: address,
            walletAlias: config.alias,
            chain: config.chain,
            token: tx.tokenBought || tx.token_bought || tx.token,
            tokenAddress: tx.tokenAddress || tx.token_address,
            originalSize: tradeSize,
            suggestedSize: Math.min(tradeSize * (config.allocation / 100), this.settings.maxTradeSize),
            timestamp: tx.timestamp || tx.time,
            confidence: this.calculateConfidence(tx, config),
            status: 'pending'
          };

          opportunities.push(opportunity);
          config.trades.push({ hash: txHash, processed: Date.now() });
        }
      } catch (error) {
        console.error(`Error scanning wallet ${address}:`, error.message);
      }
    }

    // Add to pending trades if auto-copy enabled and confidence is high enough
    for (const opp of opportunities) {
      if (this.settings.autoCopy && opp.confidence >= this.settings.minConfidence) {
        this.pendingTrades.push(opp);
      }
    }

    return opportunities;
  }

  /**
   * Calculate confidence score for a trade
   */
  calculateConfidence(tx, config) {
    let confidence = 50; // Base confidence

    // Larger trades = higher confidence
    const tradeSize = parseFloat(tx.valueUsd || tx.value_usd || 0);
    if (tradeSize > 100000) confidence += 20;
    else if (tradeSize > 50000) confidence += 15;
    else if (tradeSize > 10000) confidence += 10;

    // If wallet has good historical performance
    if (config.stats.pnl > 0) {
      confidence += Math.min(20, Math.round(config.stats.pnl / 10000));
    }

    return Math.min(100, confidence);
  }

  /**
   * Get a quote for a copy trade
   */
  async getQuote(opportunity) {
    try {
      // Determine the tokens - we're buying what they bought
      const fromToken = opportunity.chain === 'solana' ? 'SOL' : 'ETH';
      const toToken = opportunity.tokenAddress || opportunity.token;

      // Calculate amount in native token units
      // This is simplified - in production you'd need proper price conversion
      const amountWei = opportunity.chain === 'solana'
        ? Math.round(opportunity.suggestedSize * 1e9 / 100) // Rough SOL conversion
        : Math.round(opportunity.suggestedSize * 1e18 / 2000); // Rough ETH conversion

      const quote = await this.nansen.getTradeQuote(
        opportunity.chain,
        fromToken,
        toToken,
        amountWei.toString()
      );

      return {
        opportunity,
        quote: quote?.data || quote,
        quoteId: quote?.quoteId || quote?.quote_id,
        estimatedOutput: quote?.outputAmount || quote?.output_amount,
        priceImpact: quote?.priceImpact || quote?.price_impact
      };
    } catch (error) {
      return {
        opportunity,
        error: error.message
      };
    }
  }

  /**
   * Execute a copy trade
   */
  async executeTrade(quoteId, walletName = null) {
    try {
      const result = await this.nansen.executeTrade(quoteId, walletName);

      const trade = {
        quoteId,
        executedAt: Date.now(),
        result: result?.data || result,
        txHash: result?.txHash || result?.transaction_hash,
        status: 'executed'
      };

      this.executedTrades.push(trade);

      return trade;
    } catch (error) {
      return {
        quoteId,
        error: error.message,
        status: 'failed'
      };
    }
  }

  /**
   * Get execution history
   */
  getHistory() {
    return {
      executed: this.executedTrades,
      pending: this.pendingTrades,
      stats: {
        totalExecuted: this.executedTrades.length,
        totalPending: this.pendingTrades.length
      }
    };
  }

  /**
   * Update copy trading settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    return this.settings;
  }

  /**
   * Get current settings
   */
  getSettings() {
    return this.settings;
  }

  /**
   * Approve a pending trade
   */
  approveTrade(tradeId) {
    const index = this.pendingTrades.findIndex(t => t.id === tradeId);
    if (index !== -1) {
      const trade = this.pendingTrades[index];
      trade.status = 'approved';
      return trade;
    }
    return null;
  }

  /**
   * Reject a pending trade
   */
  rejectTrade(tradeId) {
    const index = this.pendingTrades.findIndex(t => t.id === tradeId);
    if (index !== -1) {
      return this.pendingTrades.splice(index, 1)[0];
    }
    return null;
  }

  /**
   * Get trade recommendations based on followed wallets
   */
  async getRecommendations() {
    const recommendations = [];

    for (const [address, config] of this.followedWallets) {
      try {
        // Get the wallet's current holdings
        const balance = await this.nansen.getWalletBalance(address, config.chain);

        if (!balance?.data) continue;

        const data = Array.isArray(balance.data) ? balance.data : [balance.data];

        // Get their top holdings as recommendations
        const topHoldings = data
          .sort((a, b) => parseFloat(b.valueUsd || b.value_usd || 0) - parseFloat(a.valueUsd || a.value_usd || 0))
          .slice(0, 3);

        for (const holding of topHoldings) {
          recommendations.push({
            token: holding.symbol || holding.token,
            tokenAddress: holding.address || holding.token_address,
            chain: config.chain,
            sourceWallet: address,
            walletAlias: config.alias,
            allocation: parseFloat(holding.percentage || holding.allocation || 0),
            value: parseFloat(holding.valueUsd || holding.value_usd || 0)
          });
        }
      } catch (error) {
        console.error(`Error getting recommendations from ${address}:`, error.message);
      }
    }

    // Aggregate recommendations by token
    const tokenMap = new Map();
    for (const rec of recommendations) {
      const key = rec.tokenAddress || rec.token;
      if (!tokenMap.has(key)) {
        tokenMap.set(key, {
          ...rec,
          wallets: [{ address: rec.sourceWallet, alias: rec.walletAlias }],
          totalValue: rec.value
        });
      } else {
        const existing = tokenMap.get(key);
        existing.wallets.push({ address: rec.sourceWallet, alias: rec.walletAlias });
        existing.totalValue += rec.value;
      }
    }

    return Array.from(tokenMap.values())
      .sort((a, b) => b.wallets.length - a.wallets.length || b.totalValue - a.totalValue);
  }
}

module.exports = { CopyTrader };
