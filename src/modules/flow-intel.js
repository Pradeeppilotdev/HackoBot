/**
 * GhostNet Flow Intelligence
 * Aggregates label-based flow data across multiple tokens
 */

class FlowIntelligence {
  constructor(nansen) {
    this.nansen = nansen;
  }

  async getTokenFlowIntel(tokenAddress, chain = 'ethereum') {
    return this.nansen.exec(
      `research token flow-intelligence --chain ${chain} --token ${tokenAddress} --days 7`
    );
  }

  /**
   * Analyze multiple tokens and rank by conviction
   */
  async rankTokensByConviction(tokens, chain = 'ethereum') {
    const results = [];

    for (const token of tokens.slice(0, 3)) { // max 3 to save credits
      if (!token.raw?.token_address) continue;

      const flowIntel = await this.getTokenFlowIntel(token.raw.token_address, chain);
      if (!flowIntel?.data?.data) continue;

      const d = Array.isArray(flowIntel.data.data)
        ? flowIntel.data.data[0]
        : flowIntel.data.data;

      const smartFlow = d.smart_trader_net_flow_usd || 0;
      const whaleFlow = d.whale_net_flow_usd || 0;
      const freshFlow = d.fresh_wallets_net_flow_usd || 0;
      const exchangeFlow = d.exchange_net_flow_usd || 0;

      // Multi-label alignment score
      const labelAlignment = [
        smartFlow > 0 ? 1 : 0,
        whaleFlow > 0 ? 1 : 0,
        freshFlow > 10000 ? 1 : 0,
        exchangeFlow < 0 ? 1 : 0  // exchange outflow = accumulation
      ].reduce((a, b) => a + b, 0);

      results.push({
        symbol: token.symbol,
        tokenAddress: token.raw?.token_address,
        smartFlow,
        whaleFlow,
        freshFlow,
        exchangeFlow,
        labelAlignment,
        netInflow: token.netInflow,
        raw: d
      });
    }

    return results.sort((a, b) => b.labelAlignment - a.labelAlignment);
  }

  /**
   * Format flow intel for Telegram
   */
  formatForTelegram(rankedTokens) {
    if (!rankedTokens.length) return '— No flow intelligence data';

    return rankedTokens.map((t, i) => {
      const labels = [];
      if (t.smartFlow > 0) labels.push('🧠 SM');
      if (t.whaleFlow > 0) labels.push('🐋 Whale');
      if (t.freshFlow > 10000) labels.push('🆕 Fresh');
      if (t.exchangeFlow < 0) labels.push('📤 Outflow');

      const alignment = labels.length > 0
        ? labels.join(' + ')
        : '— No label alignment';

      return `${i + 1}. <b>$${t.symbol}</b> [${alignment}]`;
    }).join('\n');
  }
}

module.exports = { FlowIntelligence };
