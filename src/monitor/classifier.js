class SignalClassifier {
  constructor() {
    this.history = new Map(); // token -> previous signals
  }

  classify(tokens, walletProfiles, coordinationClusters, hyperliquidOverlap) {
    const signals = [];

    // Classify tokens
    for (const token of tokens) {
      const signal = this.classifyToken(token, coordinationClusters, hyperliquidOverlap);
      if (signal) signals.push(signal);
    }

    // Classify coordination clusters
    for (const cluster of coordinationClusters) {
      signals.push({
        type: 'COORDINATION',
        chain: 'cross-chain',
        token: null,
        message: `${cluster.connectedWallets.length} wallets share counterparty ${cluster.counterparty.slice(0, 8)}...`,
        confidence: Math.min(95, 60 + cluster.strength * 10),
        raw: cluster
      });
    }

    // Classify Hyperliquid overlaps
    for (const overlap of hyperliquidOverlap) {
      signals.push({
        type: 'OVERLAP',
        chain: 'hyperliquid',
        token: overlap.token,
        message: `Spot wallet ${overlap.address.slice(0, 8)}... opening ${overlap.side.toUpperCase()} perp on ${overlap.token}`,
        confidence: 85,
        raw: overlap
      });
    }

    return signals.sort((a, b) => b.confidence - a.confidence);
  }

  classifyToken(token, clusters, overlaps) {
    const inflow = token.netInflow || 0;
    const symbol = token.symbol;

    if (inflow <= 0) return null;

    // Check if this token has Hyperliquid confirmation
    const hasHyperliquidConfirmation = overlaps.some(o =>
      o.token?.toLowerCase() === symbol?.toLowerCase()
    );

    // Check if coordinated wallets are buying this token
    const hasCoordinationSignal = clusters.length > 0;

    let type, confidence, message;

    if (hasHyperliquidConfirmation && hasCoordinationSignal) {
      type = 'MOMENTUM';
      confidence = 90;
      message = `Smart money accumulating + coordinated wallets + Hyperliquid confirmation`;
    } else if (hasHyperliquidConfirmation || hasCoordinationSignal) {
      type = 'EARLY';
      confidence = 70;
      message = `Early accumulation signal — ${hasHyperliquidConfirmation ? 'Hyperliquid active' : 'wallet coordination detected'}`;
    } else if (inflow > 1000) {
      type = 'NEUTRAL';
      confidence = 50;
      message = `SM netflow positive: +$${inflow.toLocaleString()} 7d inflow`;
    } else {
      return null;
    }

    return { type, chain: token.raw?.chain || 'unknown', token: symbol, message, confidence, raw: token };
  }

  isNewSignal(signal) {
    const key = `${signal.type}-${signal.token}-${signal.chain}`;
    const last = this.history.get(key);
    const now = Date.now();

    // Only alert if signal is new or hasn't been seen in 2 hours
    if (!last || (now - last) > 7200000) {
      this.history.set(key, now);
      return true;
    }
    return false;
  }
}

module.exports = { SignalClassifier };
