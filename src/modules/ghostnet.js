/**
 * GhostNet - Cross-Market Wallet Coordination Intelligence
 * Uses low-cost Nansen research endpoints to detect wallet coordination signals.
 */

const { NansenClient } = require('../utils/nansen');

class GhostNet {
  constructor(nansen = null) {
    this.nansen = nansen || new NansenClient();
    this.results = {
      chain: 'ethereum',
      topTokens: [],
      walletAddresses: [],
      walletProfiles: [],
      hyperliquidOverlap: [],
      coordinationClusters: [],
      perpScreener: null
    };
  }

  async getSmartMoneyTargets(chain = 'ethereum') {
    return this.nansen.getSmartMoneyNetflow(chain, { days: 7, limit: 10 });
  }

  async getActiveSmartWallets(chain = 'ethereum') {
    return this.nansen.getSmartMoneyDexTrades(chain, { days: 1, limit: 30 });
  }

  async getCounterparties(address, chain = 'ethereum') {
    return this.nansen.getWalletCounterparties(address, chain, { limit: 15 });
  }

  async getWalletPnL(address, chain = 'ethereum') {
    return this.nansen.getWalletPnL(address, chain);
  }

  async getWalletLabels(address) {
    return this.nansen.getWalletLabels(address);
  }

  async getHyperliquidSmartMoney() {
    return this.nansen.getSmartMoneyPerpTrades({ days: 1, limit: 30 });
  }

  async getPerpScreener() {
    return this.nansen.getPerpScreener({ timeframe: '24h' });
  }

  extractTopTokens(netflowData) {
    if (!netflowData?.data) return [];
    const rows = Array.isArray(netflowData.data?.data)
      ? netflowData.data.data
      : Array.isArray(netflowData.data)
      ? netflowData.data
      : [netflowData.data];
    return rows.slice(0, 5).map((row) => ({
      symbol: row.token_symbol || row.symbol || row.token || 'Unknown',
      netInflow: Number(row.net_flow_7d_usd || row.net_flow_24h_usd || row.netInflow || row.net_inflow || 0),
      raw: row
    }));
  }

  extractWallets(dexTradeData, maxWallets = 3) {
    if (!dexTradeData?.data) return [];
    const rows = Array.isArray(dexTradeData.data?.data)
      ? dexTradeData.data.data
      : Array.isArray(dexTradeData.data)
      ? dexTradeData.data
      : [];
    const wallets = [];
    const seen = new Set();

    for (const row of rows) {
      const address = row.trader_address || row.address || row.wallet || row.trader;
      if (!address || typeof address !== 'string') continue;
      if (address.length < 32) continue;
      if (seen.has(address)) continue;
      seen.add(address);
      wallets.push(address);
      if (wallets.length >= maxWallets) break;
    }

    return wallets;
  }

  detectHyperliquidOverlap(spotWallets, perpTradeData) {
    if (!perpTradeData?.data || !Array.isArray(spotWallets) || spotWallets.length === 0) return [];

    const rows = Array.isArray(perpTradeData.data) ? perpTradeData.data : [perpTradeData.data];
    const spotSet = new Set(spotWallets);
    const overlap = [];

    for (const row of rows) {
      const address = row.address || row.wallet || row.trader;
      if (!address || !spotSet.has(address)) continue;
      overlap.push({
        address,
        token: row.token || row.symbol || row.market || 'Unknown',
        side: (row.side || row.direction || 'unknown').toLowerCase(),
        sizeUsd: Number(row.sizeUsd || row.size_usd || row.notionalUsd || row.notional_usd || 0),
        pnl: Number(row.pnl || row.realizedPnl || row.realized_pnl || 0)
      });
    }

    return overlap;
  }

  detectCoordination(walletProfiles) {
    const counterpartyToWallets = new Map();

    for (const profile of walletProfiles) {
      const cpData = profile.counterparties?.data;
      if (!cpData) continue;

      const counterparties = Array.isArray(cpData) ? cpData : [cpData];
      for (const cp of counterparties) {
        const cpAddress = cp.address || cp.counterparty || cp.wallet;
        if (!cpAddress) continue;
        if (!counterpartyToWallets.has(cpAddress)) {
          counterpartyToWallets.set(cpAddress, new Set());
        }
        counterpartyToWallets.get(cpAddress).add(profile.address);
      }
    }

    const clusters = [];
    for (const [counterparty, wallets] of counterpartyToWallets.entries()) {
      if (wallets.size < 2) continue;
      clusters.push({
        counterparty,
        connectedWallets: Array.from(wallets),
        strength: wallets.size
      });
    }

    return clusters.sort((a, b) => b.strength - a.strength).slice(0, 5);
  }

  shortAddress(address) {
    if (!address || typeof address !== 'string') return 'Unknown';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  }

  formatUsd(value) {
    const num = Number(value || 0);
    return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  renderBrief() {
    const { chain, topTokens, walletProfiles, coordinationClusters, hyperliquidOverlap } = this.results;
    const lines = [];

    lines.push('============================================================');
    lines.push('GHOSTNET INTELLIGENCE BRIEF');
    lines.push('============================================================');
    lines.push(`Chain: ${chain}`);
    lines.push('');

    lines.push('TOP SMART MONEY ACCUMULATION TOKENS');
    if (topTokens.length === 0) {
      lines.push('  - No netflow token data available');
    } else {
      topTokens.slice(0, 3).forEach((token, idx) => {
        lines.push(`  ${idx + 1}. ${token.symbol} | 7d Inflow: ${this.formatUsd(token.netInflow)} | MCap: ${this.formatUsd(token.raw?.market_cap_usd)}`);
      });
    }
    lines.push('');

    lines.push(`SMART MONEY WALLETS PROFILED (${walletProfiles.length})`);
    if (walletProfiles.length === 0) {
      lines.push('  - No wallet addresses extracted from DEX trades');
    } else {
      walletProfiles.forEach((wallet, idx) => {
        const labels = Array.isArray(wallet.labels) ? wallet.labels : [];
        const normalizedLabels = labels
          .map((l) => (typeof l === 'string' ? l : l.label || l.name || 'Unknown'))
          .filter(Boolean)
          .slice(0, 3)
          .join(', ') || 'Unlabeled';

        const pnl = wallet.pnl?.realized_pnl_usd ?? wallet.pnl?.totalPnl ?? wallet.pnl?.total_pnl ?? 'N/A';
        const pnlText = typeof pnl === 'number' ? this.formatUsd(pnl) : String(pnl);

        lines.push(`  ${idx + 1}. ${this.shortAddress(wallet.address)} | Labels: ${normalizedLabels} | PnL: ${pnlText}`);
      });
    }
    lines.push('');

    lines.push(`COORDINATION SIGNALS (${coordinationClusters.length})`);
    if (coordinationClusters.length === 0) {
      lines.push('  - No shared counterparties detected across profiled wallets');
    } else {
      coordinationClusters.forEach((cluster, idx) => {
        lines.push(`  ${idx + 1}. Shared CP ${this.shortAddress(cluster.counterparty)} | Wallets: ${cluster.connectedWallets.length} | Strength: ${cluster.strength}`);
      });
    }
    lines.push('');

    lines.push(`CROSS-MARKET SPOT/PERP OVERLAP (${hyperliquidOverlap.length})`);
    if (hyperliquidOverlap.length === 0) {
      lines.push('  - No spot wallet overlap found in smart-money perp trades');
    } else {
      hyperliquidOverlap.forEach((o, idx) => {
        lines.push(`  ${idx + 1}. ${this.shortAddress(o.address)} | ${String(o.side).toUpperCase()} ${o.token} | Size: ${this.formatUsd(o.sizeUsd)}`);
      });
    }
    lines.push('');

    lines.push('SUMMARY');
    lines.push(`  - API Calls: ${this.nansen.getApiCallCount()}`);
    lines.push(`  - Generated: ${new Date().toISOString()}`);
    lines.push('============================================================');

    return lines.join('\n');
  }

  async run(chain = 'ethereum') {
    this.results.chain = chain;

    console.log('\n[GhostNet] Phase 1/4: Discovering smart-money activity...');
    const [netflow, dexTrades] = await Promise.all([
      this.getSmartMoneyTargets(chain),
      this.getActiveSmartWallets(chain)
    ]);

    this.results.topTokens = this.extractTopTokens(netflow);
    this.results.walletAddresses = this.extractWallets(dexTrades, 3);
    console.log(`[GhostNet] Wallets selected for profiling: ${this.results.walletAddresses.length}`);

    console.log('[GhostNet] Phase 2/4: Profiling wallets and counterparties...');
    const walletProfiles = [];
    for (const address of this.results.walletAddresses) {
      const [counterparties, pnl, labels] = await Promise.all([
        this.getCounterparties(address, chain),
        this.getWalletPnL(address, chain),
        this.getWalletLabels(address)
      ]);

      walletProfiles.push({
        address,
        counterparties,
        pnl: pnl?.data || pnl || {},
        labels: labels?.data?.labels || labels?.data || []
      });
    }
    this.results.walletProfiles = walletProfiles;

    console.log('[GhostNet] Phase 3/4: Fetching perp intelligence...');
    const [perpTrades, perpScreener] = await Promise.all([
      this.getHyperliquidSmartMoney(),
      this.getPerpScreener()
    ]);
    this.results.perpScreener = perpScreener?.data || perpScreener || null;

    console.log('[GhostNet] Phase 4/4: Detecting overlaps and coordination...');
    this.results.hyperliquidOverlap = this.detectHyperliquidOverlap(this.results.walletAddresses, perpTrades);
    this.results.coordinationClusters = this.detectCoordination(walletProfiles);

    const brief = this.renderBrief();
    console.log('\n' + brief + '\n');

    return {
      ...this.results,
      brief,
      apiCalls: this.nansen.getApiCallCount()
    };
  }
}

module.exports = { GhostNet };
