/**
 * HackoBot - AI Research Agent
 * Natural language interface to Nansen's AI agent for deep research
 */

const { NansenClient } = require('../utils/nansen');

class AIResearcher {
  constructor(nansen) {
    this.nansen = nansen;
    this.conversations = new Map();
    this.researchCache = new Map();
  }

  /**
   * Ask the Nansen AI agent a research question
   */
  async ask(question, options = {}) {
    const { expert = false, conversationId = null } = options;

    try {
      const response = await this.nansen.askAgent(question, { expert, conversationId });

      // Extract conversation ID for follow-up questions
      const newConversationId = response?.conversationId || response?.conversation_id;

      if (newConversationId) {
        this.conversations.set(newConversationId, {
          startedAt: Date.now(),
          questions: [question],
          expert
        });
      }

      return {
        answer: response?.response || response?.answer || response,
        conversationId: newConversationId,
        expert,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`AI Research error: ${error.message}`);
    }
  }

  /**
   * Continue a conversation with follow-up questions
   */
  async followUp(conversationId, question) {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.questions.push(question);
    }

    return this.ask(question, {
      expert: conversation?.expert || false,
      conversationId
    });
  }

  /**
   * Research a specific token in detail
   */
  async researchToken(token, chain = 'ethereum') {
    const cacheKey = `${token}:${chain}`;

    // Check cache (valid for 5 minutes)
    if (this.researchCache.has(cacheKey)) {
      const cached = this.researchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) {
        return cached;
      }
    }

    const research = {
      token,
      chain,
      timestamp: Date.now(),
      sections: {}
    };

    try {
      // Get comprehensive token analysis from AI
      const aiAnalysis = await this.ask(
        `Analyze ${token} on ${chain}. Include: smart money activity, recent large trades, token metrics, and your overall assessment of the opportunity.`,
        { expert: true }
      );
      research.sections.aiAnalysis = aiAnalysis.answer;
      research.conversationId = aiAnalysis.conversationId;

      // Get quantitative data
      const [info, indicators, flows, holders] = await Promise.all([
        this.nansen.getTokenInfo(token, chain).catch(() => null),
        this.nansen.getTokenIndicators(token, chain).catch(() => null),
        this.nansen.getTokenFlows(token, chain, { days: 7 }).catch(() => null),
        this.nansen.getTokenHolders(token, chain, { limit: 20 }).catch(() => null)
      ]);

      research.sections.info = info?.data || info;
      research.sections.indicators = indicators?.data || indicators;
      research.sections.flows = flows?.data || flows;
      research.sections.topHolders = holders?.data || holders;

      // Generate summary
      research.summary = this.generateResearchSummary(research);

      // Cache the research
      this.researchCache.set(cacheKey, research);

    } catch (error) {
      research.error = error.message;
    }

    return research;
  }

  /**
   * Research a wallet address
   */
  async researchWallet(address, chain = 'ethereum') {
    const research = {
      address,
      chain,
      timestamp: Date.now(),
      sections: {}
    };

    try {
      // Get AI analysis of the wallet
      const aiAnalysis = await this.ask(
        `Analyze wallet ${address} on ${chain}. What kind of trader is this? What's their trading strategy? What are they currently holding and trading?`,
        { expert: true }
      );
      research.sections.aiAnalysis = aiAnalysis.answer;
      research.conversationId = aiAnalysis.conversationId;

      // Get quantitative data
      const [balance, pnl, labels, counterparties] = await Promise.all([
        this.nansen.getWalletBalance(address, chain).catch(() => null),
        this.nansen.getWalletPnL(address, chain).catch(() => null),
        this.nansen.getWalletLabels(address).catch(() => null),
        this.nansen.getWalletCounterparties(address, chain, { limit: 10 }).catch(() => null)
      ]);

      research.sections.balance = balance?.data || balance;
      research.sections.pnl = pnl?.data || pnl;
      research.sections.labels = labels?.data || labels;
      research.sections.counterparties = counterparties?.data || counterparties;

    } catch (error) {
      research.error = error.message;
    }

    return research;
  }

  /**
   * Ask about market conditions
   */
  async analyzeMarket(chain = 'ethereum') {
    const analysis = await this.ask(
      `What's happening in the ${chain} market right now? What are smart money wallets doing? Any notable trends or opportunities?`,
      { expert: true }
    );

    return {
      chain,
      analysis: analysis.answer,
      conversationId: analysis.conversationId,
      timestamp: Date.now()
    };
  }

  /**
   * Get trading recommendations
   */
  async getRecommendations(riskTolerance = 'medium') {
    const prompt = riskTolerance === 'high'
      ? 'What are the highest conviction smart money plays right now? I have high risk tolerance and want aggressive opportunities.'
      : riskTolerance === 'low'
      ? 'What are the safest smart money accumulation plays right now? I prefer established tokens with institutional support.'
      : 'What are the best balanced opportunities right now? Mix of established plays and emerging opportunities.';

    const recommendations = await this.ask(prompt, { expert: true });

    return {
      riskTolerance,
      recommendations: recommendations.answer,
      conversationId: recommendations.conversationId,
      timestamp: Date.now()
    };
  }

  /**
   * Generate research summary from collected data
   */
  generateResearchSummary(research) {
    const summary = {
      verdict: 'neutral',
      confidence: 0,
      keyPoints: []
    };

    // Analyze flows
    if (research.sections.flows) {
      const flows = research.sections.flows;
      const netInflow = parseFloat(flows.netInflow || flows.net_inflow || 0);

      if (netInflow > 100000) {
        summary.keyPoints.push(`Strong net inflows: $${(netInflow / 1000).toFixed(0)}K`);
        summary.confidence += 20;
        summary.verdict = 'bullish';
      } else if (netInflow < -100000) {
        summary.keyPoints.push(`Net outflows: $${(Math.abs(netInflow) / 1000).toFixed(0)}K`);
        summary.confidence += 20;
        summary.verdict = 'bearish';
      }
    }

    // Analyze holders
    if (research.sections.topHolders && Array.isArray(research.sections.topHolders)) {
      const smartMoneyHolders = research.sections.topHolders.filter(
        h => h.label && (h.label.includes('Smart') || h.label.includes('Fund'))
      ).length;

      if (smartMoneyHolders >= 3) {
        summary.keyPoints.push(`${smartMoneyHolders} smart money holders in top 20`);
        summary.confidence += 15;
      }
    }

    // Analyze indicators
    if (research.sections.indicators) {
      const ind = research.sections.indicators;
      if (ind.smartMoneyScore || ind.smart_money_score) {
        const score = parseFloat(ind.smartMoneyScore || ind.smart_money_score);
        summary.keyPoints.push(`Smart Money Score: ${score.toFixed(0)}/100`);
        summary.confidence += Math.round(score / 5);
      }
    }

    summary.confidence = Math.min(100, summary.confidence);

    return summary;
  }
}

module.exports = { AIResearcher };
