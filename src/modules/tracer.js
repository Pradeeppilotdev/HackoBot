/**
 * GhostNet Tracer — Multi-hop BFS network mapper
 * Uses profiler trace to map shadow networks behind smart money
 */

class GhostNetTracer {
  constructor(nansen) {
    this.nansen = nansen;
  }

  async traceWallet(address, chain = 'ethereum') {
    return this.nansen.exec(
      `research profiler trace --address ${address} --chain ${chain} --depth 2 --width 3 --days 7`
    );
  }

  async getFlowIntelligence(tokenAddress, chain = 'ethereum') {
    return this.nansen.exec(
      `research token flow-intelligence --chain ${chain} --token ${tokenAddress} --days 7`
    );
  }

  async getWalletPerpPositions(address) {
    return this.nansen.exec(
      `research profiler perp-positions --address ${address}`
    );
  }

  /**
   * Calculate conviction score from flow intelligence data
   */
  scoreFromFlowIntel(flowData) {
    if (!flowData?.data?.data) return 0;
    const d = Array.isArray(flowData.data.data)
      ? flowData.data.data[0]
      : flowData.data.data;

    let score = 0;
    const reasons = [];

    const freshFlow = d.fresh_wallets_net_flow_usd || 0;
    const smartFlow = d.smart_trader_net_flow_usd || 0;
    const whaleFlow = d.whale_net_flow_usd || 0;
    const exchangeFlow = d.exchange_net_flow_usd || 0;
    const smartCount = d.smart_trader_wallet_count || 0;
    const whaleCount = d.whale_wallet_count || 0;

    if (smartFlow > 0) {
      score += 30;
      reasons.push(`Smart Traders buying (+$${Math.round(smartFlow).toLocaleString()})`);
    }
    if (whaleFlow > 0) {
      score += 25;
      reasons.push(`Whales accumulating (+$${Math.round(whaleFlow).toLocaleString()})`);
    }
    if (freshFlow > 50000) {
      score += 20;
      reasons.push(`Fresh wallets: $${Math.round(freshFlow / 1000)}K inflow`);
    }
    if (exchangeFlow < -10000) {
      score += 15;
      reasons.push(`Exchange outflow: $${Math.round(Math.abs(exchangeFlow) / 1000)}K leaving`);
    }
    if (smartCount >= 2) {
      score += 10;
      reasons.push(`${smartCount} Smart Trader wallets active`);
    }

    return { score: Math.min(100, score), reasons };
  }

  /**
   * Score from network trace — big volume at hop-2 = institutional routing
   */
  scoreFromTrace(traceData) {
    if (!traceData?.data) return { score: 0, reasons: [] };
    const d = traceData.data;

    let score = 0;
    const reasons = [];

    const hop2Edges = (d.edges || []).filter(e => e.hop === 2);
    const totalHop2Volume = hop2Edges.reduce((sum, e) => sum + (e.volume_usd || 0), 0);
    const nodeCount = d.stats?.nodes_visited || 0;

    if (totalHop2Volume > 10000000) {
      score += 30;
      reasons.push(`$${Math.round(totalHop2Volume / 1000000)}M flowing through hop-2 network`);
    } else if (totalHop2Volume > 1000000) {
      score += 20;
      reasons.push(`$${Math.round(totalHop2Volume / 1000)}K in hop-2 network`);
    }

    if (nodeCount >= 8) {
      score += 20;
      reasons.push(`${nodeCount} nodes in shadow network`);
    } else if (nodeCount >= 5) {
      score += 10;
      reasons.push(`${nodeCount} connected wallets found`);
    }

    return { score: Math.min(50, score), reasons };
  }

  /**
   * Classify signal based on combined score
   */
  classify(totalScore) {
    if (totalScore >= 70) return 'MOMENTUM';
    if (totalScore >= 40) return 'EARLY';
    return 'NEUTRAL';
  }

  /**
   * Full conviction analysis for a token + wallet
   */
  async analyzeConviction(tokenAddress, walletAddress, chain = 'ethereum') {
    const [flowIntel, trace] = await Promise.all([
      this.getFlowIntelligence(tokenAddress, chain),
      this.traceWallet(walletAddress, chain)
    ]);

    const flowScore = this.scoreFromFlowIntel(flowIntel);
    const traceScore = this.scoreFromTrace(trace);

    const totalScore = flowScore.score + traceScore.score;
    const classification = this.classify(totalScore);
    const allReasons = [...flowScore.reasons, ...traceScore.reasons];

    return {
      tokenAddress,
      walletAddress,
      score: totalScore,
      classification,
      reasons: allReasons,
      flowIntel: flowIntel?.data?.data?.[0] || {},
      traceStats: trace?.data?.stats || {},
      traceNodes: trace?.data?.nodes?.length || 0
    };
  }
}

module.exports = { GhostNetTracer };
