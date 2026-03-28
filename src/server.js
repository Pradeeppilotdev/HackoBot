/**
 * GhostNet Dashboard Server
 * Express backend that runs GhostNet and serves results to the dashboard
 */

const express = require('express');
const path = require('path');
const { GhostNet } = require('./modules/ghostnet');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../dashboard')));

// Main GhostNet API endpoint
app.get('/api/ghostnet', async (req, res) => {
  const chain = req.query.chain || 'ethereum';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    send('phase', { phase: 1, message: 'Discovering smart-money activity...' });

    const ghostnet = new GhostNet();

    // Phase 1
    const [netflow, dexTrades] = await Promise.all([
      ghostnet.getSmartMoneyTargets(chain),
      ghostnet.getActiveSmartWallets(chain)
    ]);

    const topTokens = ghostnet.extractTopTokens(netflow);
    const walletAddresses = ghostnet.extractWallets(dexTrades, 3);

    send('tokens', { topTokens });
    send('phase', { phase: 2, message: `Profiling ${walletAddresses.length} wallets...` });

    // Phase 2
    const walletProfiles = [];
    for (const address of walletAddresses) {
      const [counterparties, pnl, labels] = await Promise.all([
        ghostnet.getCounterparties(address, chain),
        ghostnet.getWalletPnL(address, chain),
        ghostnet.getWalletLabels(address)
      ]);

      const profile = {
        address,
        counterparties,
        pnl: pnl?.data || pnl || {},
        labels: labels?.data?.labels || labels?.data || []
      };
      walletProfiles.push(profile);
      send('wallet', profile);
    }

    send('phase', { phase: 3, message: 'Fetching Hyperliquid perp intelligence...' });

    // Phase 3
    const [perpTrades, perpScreener] = await Promise.all([
      ghostnet.getHyperliquidSmartMoney(),
      ghostnet.getPerpScreener()
    ]);

    send('phase', { phase: 4, message: 'Detecting coordination patterns...' });

    // Phase 4
    const hyperliquidOverlap = ghostnet.detectHyperliquidOverlap(walletAddresses, perpTrades);
    const coordinationClusters = ghostnet.detectCoordination(walletProfiles);

    send('overlap', { hyperliquidOverlap });
    send('coordination', { coordinationClusters });
    send('done', {
      apiCalls: ghostnet.nansen.getApiCallCount(),
      timestamp: new Date().toISOString(),
      chain,
      perpScreener: perpScreener?.data || perpScreener || null
    });
  } catch (error) {
    send('error', { message: error.message });
  }

  res.end();
});

app.listen(PORT, () => {
  console.log(`\nGhostNet Dashboard running at http://localhost:${PORT}\n`);
});
