/**
 * HackoBot - Whale Tracker
 * Tracks and profiles top smart money wallets
 */

const { NansenClient } = require('../utils/nansen');

class WhaleTracker {
  constructor(nansen) {
    this.nansen = nansen;
    this.trackedWallets = new Map();
    this.whaleProfiles = new Map();
  }

  /**
   * Discover top performing smart money wallets
   */
  async discoverWhales(chain = 'ethereum', options = {}) {
    const { limit = 20 } = options;
    const whales = [];

    try {
      // Get top traders from perp leaderboard
      const perpLeaderboard = await this.nansen.getPerpLeaderboard({ timeframe: '30d', limit });

      if (perpLeaderboard?.data) {
        const data = Array.isArray(perpLeaderboard.data) ? perpLeaderboard.data : [perpLeaderboard.data];
        for (const trader of data) {
          whales.push({
            address: trader.address || trader.wallet,
            chain,
            label: trader.label || 'Smart Perp Trader',
            metrics: {
              pnl: trader.pnl || trader.total_pnl,
              winRate: trader.winRate || trader.win_rate,
              trades: trader.trades || trader.trade_count
            },
            source: 'perp-leaderboard'
          });
        }
      }

      // Get smart money holdings for additional whales
      const holdings = await this.nansen.getSmartMoneyHoldings(chain, { limit });

      if (holdings?.data) {
        const data = Array.isArray(holdings.data) ? holdings.data : [holdings.data];
        for (const holder of data) {
          const existingWhale = whales.find(w => w.address === (holder.address || holder.wallet));
          if (!existingWhale) {
            whales.push({
              address: holder.address || holder.wallet,
              chain,
              label: holder.label || 'Smart Money',
              metrics: {
                portfolioValue: holder.portfolioValue || holder.portfolio_value,
                tokenCount: holder.tokenCount || holder.token_count
              },
              source: 'holdings'
            });
          }
        }
      }

    } catch (error) {
      console.error('Error discovering whales:', error.message);
    }

    return whales;
  }

  /**
   * Deep profile a specific whale wallet
   */
  async profileWhale(address, chain = 'ethereum') {
    const profile = {
      address,
      chain,
      timestamp: Date.now(),
      balance: null,
      pnl: null,
      labels: null,
      recentTrades: null,
      counterparties: null,
      relatedWallets: null,
      analysis: null
    };

    try {
      // Fetch all profile data in parallel
      const [balance, pnl, labels, transactions, counterparties, relatedWallets] = await Promise.all([
        this.nansen.getWalletBalance(address, chain).catch(() => null),
        this.nansen.getWalletPnL(address, chain).catch(() => null),
        this.nansen.getWalletLabels(address).catch(() => null),
        this.nansen.getWalletTransactions(address, chain, { limit: 20 }).catch(() => null),
        this.nansen.getWalletCounterparties(address, chain, { limit: 10 }).catch(() => null),
        this.nansen.getRelatedWallets(address, chain).catch(() => null)
      ]);

      profile.balance = balance?.data || balance;
      profile.pnl = pnl?.data || pnl;
      profile.labels = labels?.data || labels;
      profile.recentTrades = transactions?.data || transactions;
      profile.counterparties = counterparties?.data || counterparties;
      profile.relatedWallets = relatedWallets?.data || relatedWallets;

      // Generate analysis summary
      profile.analysis = this.analyzeProfile(profile);

      // Cache the profile
      this.whaleProfiles.set(address, profile);

    } catch (error) {
      console.error(`Error profiling whale ${address}:`, error.message);
    }

    return profile;
  }

  /**
   * Generate analysis summary from profile data
   */
  analyzeProfile(profile) {
    const analysis = {
      riskScore: 0,
      tradingStyle: 'unknown',
      topHoldings: [],
      recentActivity: [],
      insights: []
    };

    // Analyze balance data
    if (profile.balance && Array.isArray(profile.balance)) {
      analysis.topHoldings = profile.balance
        .sort((a, b) => parseFloat(b.valueUsd || b.value_usd || 0) - parseFloat(a.valueUsd || a.value_usd || 0))
        .slice(0, 5)
        .map(h => ({
          token: h.symbol || h.token,
          value: h.valueUsd || h.value_usd,
          percentage: h.percentage
        }));
    }

    // Analyze PnL
    if (profile.pnl) {
      const totalPnl = parseFloat(profile.pnl.totalPnl || profile.pnl.total_pnl || 0);
      const winRate = parseFloat(profile.pnl.winRate || profile.pnl.win_rate || 0);

      if (totalPnl > 100000 && winRate > 60) {
        analysis.insights.push('High-performing trader with strong win rate');
        analysis.tradingStyle = 'skilled';
        analysis.riskScore = 20;
      } else if (totalPnl > 0) {
        analysis.tradingStyle = 'profitable';
        analysis.riskScore = 40;
      }
    }

    // Analyze labels
    if (profile.labels && Array.isArray(profile.labels)) {
      const labelTypes = profile.labels.map(l => l.label || l.name || l);
      if (labelTypes.some(l => l.includes('Fund') || l.includes('Institution'))) {
        analysis.insights.push('Institutional/Fund wallet');
        analysis.riskScore = Math.max(0, analysis.riskScore - 10);
      }
      if (labelTypes.some(l => l.includes('Smart'))) {
        analysis.insights.push('Verified smart money label');
      }
    }

    // Analyze recent trades for patterns
    if (profile.recentTrades && Array.isArray(profile.recentTrades)) {
      const trades = profile.recentTrades.slice(0, 5);
      const buyTrades = trades.filter(t => t.type === 'buy' || t.side === 'buy').length;
      const sellTrades = trades.filter(t => t.type === 'sell' || t.side === 'sell').length;

      if (buyTrades > sellTrades * 2) {
        analysis.insights.push('Currently in accumulation mode');
      } else if (sellTrades > buyTrades * 2) {
        analysis.insights.push('Currently distributing/taking profits');
      }

      analysis.recentActivity = trades.map(t => ({
        type: t.type || t.side,
        token: t.token || t.symbol,
        value: t.valueUsd || t.value_usd || t.amount
      }));
    }

    return analysis;
  }

  /**
   * Track a whale wallet for monitoring
   */
  trackWallet(address, chain = 'ethereum', options = {}) {
    const { alias = null } = options;
    this.trackedWallets.set(address, {
      chain,
      alias,
      trackedAt: Date.now(),
      lastCheck: null
    });
  }

  /**
   * Get all tracked wallets
   */
  getTrackedWallets() {
    return Array.from(this.trackedWallets.entries()).map(([address, data]) => ({
      address,
      ...data
    }));
  }

  /**
   * Check for recent activity from tracked wallets
   */
  async checkTrackedActivity() {
    const activity = [];

    for (const [address, data] of this.trackedWallets) {
      try {
        const txns = await this.nansen.getWalletTransactions(address, data.chain, { limit: 5 });
        if (txns?.data && Array.isArray(txns.data)) {
          for (const tx of txns.data) {
            const txTime = new Date(tx.timestamp || tx.time).getTime();
            if (!data.lastCheck || txTime > data.lastCheck) {
              activity.push({
                wallet: address,
                alias: data.alias,
                transaction: tx
              });
            }
          }
        }
        data.lastCheck = Date.now();
      } catch (error) {
        console.error(`Error checking wallet ${address}:`, error.message);
      }
    }

    return activity;
  }
}

module.exports = { WhaleTracker };
