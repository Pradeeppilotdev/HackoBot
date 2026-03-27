/**
 * HackoBot - Smart Money Alpha Scanner
 * Identifies high-conviction alpha opportunities from smart money flows
 */

const { NansenClient } = require('../utils/nansen');

class AlphaScanner {
  constructor(nansen) {
    this.nansen = nansen;
    this.signals = [];
    this.scanHistory = [];
  }

  /**
   * Scan for alpha across multiple chains
   */
  async scanAllChains(chains = ['ethereum', 'solana', 'base']) {
    const results = await Promise.all(
      chains.map(chain => this.scanChain(chain))
    );

    return {
      timestamp: Date.now(),
      chains: Object.fromEntries(chains.map((chain, i) => [chain, results[i]])),
      topSignals: this.aggregateSignals(results.flat())
    };
  }

  /**
   * Deep scan a single chain for alpha opportunities
   */
  async scanChain(chain) {
    const signals = [];

    try {
      // 1. Get smart money netflows - identify tokens with strong inflows
      const netflows = await this.nansen.getSmartMoneyNetflow(chain, { days: 7, limit: 20 });
      const netflowSignals = this.analyzeNetflows(netflows, chain);
      signals.push(...netflowSignals);

      // 2. Get recent smart money DEX trades
      const dexTrades = await this.nansen.getSmartMoneyDexTrades(chain, { days: 1, limit: 50 });
      const tradeSignals = this.analyzeDexTrades(dexTrades, chain);
      signals.push(...tradeSignals);

      // 3. Get token screener for trending tokens
      const screener = await this.nansen.getTokenScreener(chain, { timeframe: '24h', limit: 30 });
      const screenerSignals = this.analyzeScreener(screener, chain);
      signals.push(...screenerSignals);

      // 4. Get smart money DCA patterns
      const dcas = await this.nansen.getSmartMoneyDCAs(chain, { limit: 20 });
      const dcaSignals = this.analyzeDCAs(dcas, chain);
      signals.push(...dcaSignals);

    } catch (error) {
      console.error(`Error scanning ${chain}:`, error.message);
    }

    return signals;
  }

  /**
   * Analyze netflows for accumulation patterns
   */
  analyzeNetflows(netflows, chain) {
    const signals = [];

    if (!netflows?.data) return signals;

    const data = Array.isArray(netflows.data) ? netflows.data : [netflows.data];

    for (const flow of data) {
      const netInflow = parseFloat(flow.netInflow || flow.net_inflow || 0);
      const smartMoneyBuyers = parseInt(flow.smartMoneyBuyers || flow.smart_money_buyers || 0);

      // Strong accumulation signal
      if (netInflow > 100000 && smartMoneyBuyers >= 3) {
        signals.push({
          type: 'ACCUMULATION',
          chain,
          token: flow.token || flow.symbol,
          tokenAddress: flow.tokenAddress || flow.token_address,
          score: this.calculateScore(netInflow, smartMoneyBuyers),
          metrics: {
            netInflow,
            smartMoneyBuyers,
            priceChange: flow.priceChange || flow.price_change || 0
          },
          timestamp: Date.now(),
          source: 'netflow'
        });
      }
    }

    return signals;
  }

  /**
   * Analyze DEX trades for large purchases
   */
  analyzeDexTrades(trades, chain) {
    const signals = [];

    if (!trades?.data) return signals;

    const data = Array.isArray(trades.data) ? trades.data : [trades.data];

    // Group trades by token to identify concentrated buying
    const tokenTrades = new Map();

    for (const trade of data) {
      const token = trade.tokenBought || trade.token_bought || trade.token;
      const amount = parseFloat(trade.amountUsd || trade.amount_usd || 0);
      const label = trade.label || trade.wallet_label || '';

      if (token && amount > 0) {
        if (!tokenTrades.has(token)) {
          tokenTrades.set(token, { totalVolume: 0, trades: [], labels: new Set() });
        }
        const entry = tokenTrades.get(token);
        entry.totalVolume += amount;
        entry.trades.push(trade);
        if (label) entry.labels.add(label);
      }
    }

    // Generate signals for tokens with concentrated smart money buying
    for (const [token, data] of tokenTrades) {
      if (data.totalVolume > 50000 && data.trades.length >= 2) {
        signals.push({
          type: 'SMART_MONEY_BUYING',
          chain,
          token,
          score: Math.min(100, Math.round(data.totalVolume / 10000)),
          metrics: {
            totalVolume: data.totalVolume,
            tradeCount: data.trades.length,
            labels: Array.from(data.labels)
          },
          timestamp: Date.now(),
          source: 'dex-trades'
        });
      }
    }

    return signals;
  }

  /**
   * Analyze token screener for momentum
   */
  analyzeScreener(screener, chain) {
    const signals = [];

    if (!screener?.data) return signals;

    const data = Array.isArray(screener.data) ? screener.data : [screener.data];

    for (const token of data) {
      const volume24h = parseFloat(token.volume24h || token.volume_24h || 0);
      const volumeChange = parseFloat(token.volumeChange || token.volume_change || 0);
      const smartMoneyHolders = parseInt(token.smartMoneyHolders || token.smart_money_holders || 0);
      const priceChange = parseFloat(token.priceChange24h || token.price_change_24h || 0);

      // Breakout pattern: volume spike + smart money interest
      if (volumeChange > 100 && smartMoneyHolders >= 2) {
        signals.push({
          type: 'VOLUME_BREAKOUT',
          chain,
          token: token.symbol || token.name,
          tokenAddress: token.address,
          score: Math.min(100, Math.round(volumeChange / 10) + smartMoneyHolders * 10),
          metrics: {
            volume24h,
            volumeChange,
            smartMoneyHolders,
            priceChange
          },
          timestamp: Date.now(),
          source: 'screener'
        });
      }
    }

    return signals;
  }

  /**
   * Analyze DCA patterns for conviction
   */
  analyzeDCAs(dcas, chain) {
    const signals = [];

    if (!dcas?.data) return signals;

    const data = Array.isArray(dcas.data) ? dcas.data : [dcas.data];

    for (const dca of data) {
      const totalValue = parseFloat(dca.totalValue || dca.total_value || 0);
      const orderCount = parseInt(dca.orderCount || dca.order_count || 0);

      // High conviction DCA
      if (totalValue > 25000 && orderCount >= 5) {
        signals.push({
          type: 'DCA_CONVICTION',
          chain,
          token: dca.token || dca.symbol,
          wallet: dca.wallet || dca.address,
          score: Math.min(100, Math.round(totalValue / 5000) + orderCount * 5),
          metrics: {
            totalValue,
            orderCount,
            label: dca.label || dca.wallet_label
          },
          timestamp: Date.now(),
          source: 'dcas'
        });
      }
    }

    return signals;
  }

  /**
   * Calculate composite alpha score
   */
  calculateScore(netInflow, buyerCount) {
    const inflowScore = Math.min(50, netInflow / 10000);
    const buyerScore = buyerCount * 10;
    return Math.min(100, Math.round(inflowScore + buyerScore));
  }

  /**
   * Aggregate and rank signals from multiple sources
   */
  aggregateSignals(signals) {
    // Sort by score and take top signals
    return signals
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * Get signals above a certain threshold
   */
  getHighConvictionSignals(minScore = 70) {
    return this.signals.filter(s => s.score >= minScore);
  }
}

module.exports = { AlphaScanner };
