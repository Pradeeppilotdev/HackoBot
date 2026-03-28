let selectedChain = 'ethereum';
let walletCounter = 0;
let startTime = null;
let sessionData = {
  caseId: '',
  chain: 'ethereum',
  tokens: [],
  wallets: [],
  clusters: [],
  overlaps: [],
  apiCalls: null,
  runtime: null,
  timestamp: null
};

function generateCaseId() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${y}${m}${day}-${rand}`;
}

function updateTopMeta() {
  const caseIdEl = document.getElementById('caseId');
  const chainBadgeEl = document.getElementById('chainBadge');
  if (caseIdEl) caseIdEl.textContent = `CASE #${sessionData.caseId || '----'}`;
  if (chainBadgeEl) chainBadgeEl.textContent = String(selectedChain).toUpperCase();
}

function fmtUsd(v) {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function shortAddr(a) {
  if (!a) return '-';
  return `${a.slice(0, 10)}...${a.slice(-6)}`;
}

function selectChain(chain, el) {
  selectedChain = chain;
  sessionData.chain = chain;
  document.querySelectorAll('.chain-btn').forEach((b) => b.classList.remove('active'));
  el.classList.add('active');
  updateTopMeta();
}

function setPhase(num) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`step${i}`);
    el.className = 'phase-step';
    if (i < num) el.classList.add('done');
    if (i === num) el.classList.add('active');
  }
}

function setStatus(text, live = false) {
  document.getElementById('statusText').textContent = String(text).toUpperCase();
  document.getElementById('statusDot').className = `status-dot${live ? ' live' : ''}`;
}

function showSkeleton(id, rows = 3) {
  document.getElementById(id).innerHTML =
    `<div class="skel">${'<div class="skel-row"></div>'.repeat(rows)}</div>`;
}

function renderTokens(tokens) {
  sessionData.tokens = Array.isArray(tokens) ? tokens : [];
  const el = document.getElementById('tokenBody');
  document.getElementById('tokenCount').textContent = `${tokens.length} tokens`;

  if (!tokens.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">-</div><div class="empty-state-text">NO NETFLOW DATA</div></div>';
    return;
  }

  el.innerHTML = tokens.map((t, i) => {
    const inflow = Number(t.netInflow || 0);
    const inflowClass = inflow === 0 ? 'neutral' : '';
    const sectorRaw = t.raw?.token_sectors;
    const sector = Array.isArray(sectorRaw) && sectorRaw.length ? sectorRaw[0] : '-';
    return `<div class="token-row" style="animation-delay:${i * 60}ms">
      <span class="row-num">${i + 1}</span>
      <span class="token-sym">${t.symbol || '-'}</span>
      <span class="token-sector">${sector}</span>
      <span class="token-mcap">${fmtUsd(t.raw?.market_cap_usd)}</span>
      <span class="token-inflow ${inflowClass}">${inflow > 0 ? '+' : ''}${fmtUsd(inflow)}</span>
    </div>`;
  }).join('');
}

function appendWallet(profile) {
  sessionData.wallets.push(profile);
  walletCounter++;
  const el = document.getElementById('walletBody');
  document.getElementById('walletCount').textContent = `${walletCounter} wallets`;

  if (el.querySelector('.empty-state') || el.querySelector('.skel')) el.innerHTML = '';

  const labels = (Array.isArray(profile.labels) ? profile.labels : [])
    .map((l) => (typeof l === 'string' ? l : l.label || l.name || ''))
    .filter(Boolean)
    .slice(0, 2);

  const labelHtml = labels.length
    ? labels.map((l) => `<span class="wallet-label-tag">${l}</span>`).join('')
    : '<span class="wallet-label-tag">Unlabeled</span>';

  const pnlVal = profile.pnl?.realized_pnl_usd ?? profile.pnl?.totalPnl ?? profile.pnl?.total_pnl ?? 0;
  const pnlClass = pnlVal > 0 ? 'pos' : pnlVal < 0 ? 'neg' : 'zero';
  const pnlText = pnlVal > 0 ? `+${fmtUsd(pnlVal)}` : fmtUsd(pnlVal);

  const delay = (walletCounter - 1) * 80;
  el.innerHTML += `<div class="wallet-row" style="animation-delay:${delay}ms">
    <div>
      <div class="wallet-addr">${shortAddr(profile.address)}</div>
      <div class="wallet-meta">${labelHtml}</div>
    </div>
    <div class="wallet-pnl ${pnlClass}">${pnlText}</div>
  </div>`;

  document.getElementById('statWallets').textContent = String(walletCounter);
}

function renderCoordination(clusters) {
  sessionData.clusters = Array.isArray(clusters) ? clusters : [];
  const el = document.getElementById('coordBody');
  document.getElementById('coordCount').textContent = `${clusters.length} clusters`;
  document.getElementById('statClusters').textContent = String(clusters.length);

  if (!clusters.length) {
    el.innerHTML = `<div class="no-coord">
      <div class="no-coord-badge">INDEPENDENT</div>
      <div class="no-coord-text">No shared counterparties detected. Wallets appear to be acting independently.</div>
    </div>`;
    return;
  }

  el.innerHTML = clusters.map((c, i) => {
    const pips = Array.from({ length: 5 }, (_, j) =>
      `<div class="strength-pip ${j < c.strength ? 'on' : ''}"></div>`).join('');
    return `<div class="coord-row" style="animation-delay:${i * 80}ms">
      <div class="coord-header">
        <span style="font-family:var(--mono);font-size:0.65rem;color:var(--text)">Cluster ${i + 1}</span>
        <div class="coord-strength">${pips}</div>
      </div>
      <div class="coord-cp">Shared counterparty: ${shortAddr(c.counterparty)}</div>
      <div class="coord-wallets">${c.connectedWallets.length} wallets connected</div>
    </div>`;
  }).join('');
}

function renderOverlap(overlaps) {
  sessionData.overlaps = Array.isArray(overlaps) ? overlaps : [];
  const el = document.getElementById('perpBody');
  document.getElementById('perpCount').textContent = `${overlaps.length} overlaps`;

  if (!overlaps.length) {
    el.innerHTML = `<div class="no-overlap">
      <div class="no-overlap-badge">NO OVERLAP</div>
      <div class="no-overlap-text">Spot wallets not detected in Hyperliquid perp trades.</div>
    </div>`;
    return;
  }

  el.innerHTML = overlaps.map((o, i) => {
    const side = String(o.side || 'unknown').toLowerCase();
    const sideClass = side === 'long' ? 'long' : side === 'short' ? 'short' : 'unknown';
    return `<div class="perp-row" style="animation-delay:${i * 80}ms">
      <div class="perp-header">
        <span class="perp-addr">${shortAddr(o.address)}</span>
        <span class="side-badge ${sideClass}">${side.toUpperCase()}</span>
      </div>
      <div class="perp-detail">${o.token || '-'} · Size: ${fmtUsd(o.sizeUsd)}</div>
    </div>`;
  }).join('');
}

async function runGhostNet() {
  const btn = document.getElementById('runBtn');
  const btnText = document.getElementById('btnText');

  walletCounter = 0;
  startTime = Date.now();
  sessionData = {
    caseId: generateCaseId(),
    chain: selectedChain,
    tokens: [],
    wallets: [],
    clusters: [],
    overlaps: [],
    apiCalls: null,
    runtime: null,
    timestamp: null
  };
  updateTopMeta();
  btn.disabled = true;
  btnText.textContent = 'Running...';

  ['tokenBody', 'walletBody', 'coordBody', 'perpBody'].forEach((id) => showSkeleton(id));
  ['tokenCount', 'walletCount', 'coordCount', 'perpCount'].forEach((id) => {
    document.getElementById(id).textContent = '-';
  });

  document.getElementById('statCalls').textContent = '-';
  document.getElementById('statWallets').textContent = '-';
  document.getElementById('statClusters').textContent = '-';
  document.getElementById('statRuntime').textContent = '-';
  document.getElementById('timestamp').textContent = '-';

  setPhase(1);
  setStatus('Connecting to Nansen...', true);

  const es = new EventSource(`/api/ghostnet?chain=${encodeURIComponent(selectedChain)}`);

  es.addEventListener('phase', (e) => {
    const d = JSON.parse(e.data);
    setPhase(d.phase);
    setStatus(d.message, true);
  });

  es.addEventListener('tokens', (e) => {
    renderTokens(JSON.parse(e.data).topTokens || []);
  });

  es.addEventListener('wallet', (e) => {
    appendWallet(JSON.parse(e.data));
  });

  es.addEventListener('coordination', (e) => {
    renderCoordination(JSON.parse(e.data).coordinationClusters || []);
  });

  es.addEventListener('overlap', (e) => {
    renderOverlap(JSON.parse(e.data).hyperliquidOverlap || []);
  });

  es.addEventListener('done', (e) => {
    const d = JSON.parse(e.data);
    const runtime = ((Date.now() - startTime) / 1000).toFixed(1);
    setPhase(5);
    setStatus(`Analysis complete - ${d.chain}`, false);
    document.getElementById('statCalls').textContent = String(d.apiCalls);
    document.getElementById('statRuntime').textContent = `${runtime}s`;
    document.getElementById('timestamp').textContent = new Date(d.timestamp).toLocaleTimeString();
    sessionData.apiCalls = d.apiCalls;
    sessionData.runtime = runtime;
    sessionData.timestamp = d.timestamp;
    sessionData.chain = d.chain || selectedChain;
    updateTopMeta();
    btn.disabled = false;
    btnText.textContent = 'Run Analysis';
    es.close();
  });

  es.addEventListener('error', (e) => {
    try {
      setStatus(`Error: ${JSON.parse(e.data).message}`, false);
    } catch {
      setStatus('Connection error', false);
    }
    btn.disabled = false;
    btnText.textContent = 'Run Analysis';
    es.close();
  });
}

async function copyBrief() {
  const tokens = sessionData.tokens.slice(0, 5).map((t, i) => {
    return `${i + 1}. ${t.symbol || '-'} | Inflow: ${fmtUsd(t.netInflow)} | MCap: ${fmtUsd(t.raw?.market_cap_usd)}`;
  });

  const wallets = sessionData.wallets.slice(0, 5).map((w, i) => {
    const pnl = w.pnl?.realized_pnl_usd ?? w.pnl?.totalPnl ?? w.pnl?.total_pnl ?? 0;
    const labels = (Array.isArray(w.labels) ? w.labels : [])
      .map((l) => (typeof l === 'string' ? l : l.label || l.name || ''))
      .filter(Boolean)
      .slice(0, 2)
      .join(', ') || 'Unlabeled';
    return `${i + 1}. ${shortAddr(w.address)} | PnL: ${fmtUsd(pnl)} | Labels: ${labels}`;
  });

  const clusters = sessionData.clusters.slice(0, 5).map((c, i) => {
    return `${i + 1}. Shared CP ${shortAddr(c.counterparty)} | Wallets: ${c.connectedWallets.length} | Strength: ${c.strength}`;
  });

  const overlaps = sessionData.overlaps.slice(0, 5).map((o, i) => {
    return `${i + 1}. ${shortAddr(o.address)} | ${(o.side || 'unknown').toUpperCase()} ${o.token || '-'} | Size: ${fmtUsd(o.sizeUsd)}`;
  });

  const brief = [
    `GHOSTNET BRIEF | CASE #${sessionData.caseId || '----'}`,
    `Chain: ${String(sessionData.chain || selectedChain).toUpperCase()}`,
    `Timestamp: ${sessionData.timestamp ? new Date(sessionData.timestamp).toISOString() : '-'}`,
    `API Calls: ${sessionData.apiCalls ?? '-'}`,
    `Runtime: ${sessionData.runtime ? `${sessionData.runtime}s` : '-'}`,
    '',
    'Top Accumulation Tokens:',
    ...(tokens.length ? tokens : ['- None']),
    '',
    'Smart Money Wallets:',
    ...(wallets.length ? wallets : ['- None']),
    '',
    'Coordination Clusters:',
    ...(clusters.length ? clusters : ['- None']),
    '',
    'Hyperliquid Overlap:',
    ...(overlaps.length ? overlaps : ['- None'])
  ].join('\n');

  const copyBtn = document.getElementById('copyBtn');
  try {
    await navigator.clipboard.writeText(brief);
    if (copyBtn) {
      copyBtn.textContent = 'Copied';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Brief';
      }, 1200);
    }
  } catch {
    if (copyBtn) {
      copyBtn.textContent = 'Copy Failed';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Brief';
      }, 1400);
    }
  }
}

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const tag = target?.tagName?.toLowerCase();
  const isTypingContext = target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
  if (isTypingContext) return;

  if (event.key.toLowerCase() === 'r') {
    const runBtn = document.getElementById('runBtn');
    if (runBtn && !runBtn.disabled) {
      runGhostNet();
    }
  }
});

sessionData.caseId = generateCaseId();
updateTopMeta();
