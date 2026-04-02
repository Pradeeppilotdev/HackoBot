const https = require('https');

class TelegramAlerter {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
  }

  async send(message) {
    if (!this.token || !this.chatId) {
      console.log('[Telegram] No credentials — skipping alert');
      return;
    }

    const body = JSON.stringify({
      chat_id: this.chatId,
      text: message,
      parse_mode: 'HTML'
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${this.token}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  async sendAlert(signal) {
    const emoji = {
      MOMENTUM: '🚀',
      EARLY: '👀',
      NEUTRAL: '💡',
      COORDINATION: '🕸️',
      OVERLAP: '⚡'
    }[signal.type] || '📡';

    const message = `
${emoji} <b>GHOSTNET ALERT</b>

<b>Type:</b> ${signal.type}
<b>Chain:</b> ${signal.chain}
<b>Token:</b> ${signal.token || '—'}
<b>Signal:</b> ${signal.message}
<b>Confidence:</b> ${signal.confidence}%

<i>${new Date().toISOString()}</i>
<a href="https://ghostnetai.xyz">View Dashboard</a>
    `.trim();

    return this.send(message);
  }

  async sendCycleSummary(summary) {
    const tokenLines = summary.topTokens && summary.topTokens.length > 0
      ? summary.topTokens.slice(0, 3).map((t, i) =>
          `${i + 1}. <b>${t.symbol}</b> — +$${Number(t.netInflow || 0).toLocaleString(undefined, {maximumFractionDigits: 0})} 7d inflow`
        ).join('\n')
      : '— No accumulation tokens found';

    const walletLines = summary.walletProfiles && summary.walletProfiles.length > 0
      ? summary.walletProfiles.slice(0, 3).map(w => {
          const pnl = w.pnl?.realized_pnl_usd ?? 0;
          const pnlText = pnl >= 0 ? `+$${pnl.toLocaleString()}` : `-$${Math.abs(pnl).toLocaleString()}`;
          return `• <code>${w.address.slice(0, 8)}...${w.address.slice(-6)}</code> PnL: ${pnlText}`;
        }).join('\n')
      : '— No wallets profiled';

    const message = `
👻 <b>GHOSTNET CYCLE COMPLETE</b>

📡 <b>Chain:</b> ${summary.chain}
⏱ <b>Runtime:</b> ${summary.runtime}s | <b>API Calls:</b> ${summary.apiCalls}

📊 <b>TOP ACCUMULATION TOKENS:</b>
${tokenLines}

🐋 <b>SMART MONEY WALLETS:</b>
${walletLines}

🕸 <b>Coordination Clusters:</b> ${summary.clusters}
⚡ <b>Hyperliquid Overlaps:</b> ${summary.overlaps}

${summary.topSignals.length > 0
  ? '🔥 <b>SIGNALS:</b>\n' + summary.topSignals.map(s => `• ${s}`).join('\n')
  : '✅ No high-conviction signals this cycle'}

<i>${new Date().toISOString()}</i>
    `.trim();

    return this.send(message);
  }

  async sendStartup(chains) {
    const message = `
👻 <b>GHOSTNET MONITOR STARTED</b>

Watching chains: <b>${chains.join(', ')}</b>
Cycle interval: <b>30 minutes</b>
Alert threshold: <b>HIGH conviction only</b>

GhostNet is now hunting coordination signals 24/7.
<a href="https://ghostnetai.xyz">View Dashboard</a>
    `.trim();

    return this.send(message);
  }
}

module.exports = { TelegramAlerter };
