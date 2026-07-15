'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, ArrowRight, Bot, CornerDownLeft, Loader2, User, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGlobalMetrics } from '@/lib/dealership-data';
import { askDealershipAnalyst } from '@/lib/gemini';
import { usePathname } from 'next/navigation';
import { useDashboardContext } from '@/lib/dashboard-context';
import { GlobalMetrics } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Markdown bold renderer ──────────────────────────────────
function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// ─── Individual chat bubble ──────────────────────────────────
function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2.5 w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-auto shadow-sm ${isUser ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-primary'
        }`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
      </div>
      <div
        className={`max-w-[85%] text-xs leading-relaxed rounded-3xl px-4 py-3 shadow-sm ${isUser
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-background border border-border/50 text-foreground rounded-bl-sm'
          }`}
      >
        {isUser
          ? msg.content
          : <span className="space-y-2 block" dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
        }
      </div>
    </div>
  );
}

// ─── Typing indicator ────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2 flex-row">
      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 shadow-sm">
        <Sparkles className="w-3 h-3 text-primary" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5 shadow-sm glass">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Insight Generator ───────────────────────────────────────
function generateInsights(context: {
  pageName: string;
  metrics: GlobalMetrics;
  selectedEntityId: string | null;
  selectedSegment: { type: 'funnel_stage' | 'loss_reason'; value: string } | null;
  activeMetricToggle: string;
}) {
  const { pageName, metrics, selectedEntityId, selectedSegment } = context;
  const wins: string[] = [];
  const risks: string[] = [];
  const actions: string[] = [];

  const formatCurrency = (val: number) => `₹${(val / 10000000).toFixed(2)} Cr`;
  const gConv = metrics.kpis.conversionRate || 0;

  if (selectedSegment) {
    if (selectedSegment.type === 'funnel_stage') {
      const stageInfo = metrics.funnel.find(s => s.stage === selectedSegment.value);
      if (stageInfo) {
        risks.push(`**${stageInfo.label}** sees a drop-off of ${stageInfo.dropOffCount} leads, accounting for ${stageInfo.dropOffPct.toFixed(1)}% of its volume.`);
        if (stageInfo.topLostReason) {
          risks.push(`The primary reason for loss at this stage is **${stageInfo.topLostReason}**.`);
          actions.push(`Review open deals in ${stageInfo.label} to address ${stageInfo.topLostReason}.`);
        } else {
          actions.push(`Investigate pipeline blockage at ${stageInfo.label}.`);
        }
        wins.push(`Global conversion remains steady despite drop-offs at this stage.`);
      }
    } else if (selectedSegment.type === 'loss_reason') {
      const reason = selectedSegment.value;
      const count = metrics.lostReasons[reason] || 0;
      risks.push(`**${reason}** accounts for ${count} lost leads globally, hurting overall win rates.`);
      actions.push(`Develop standardized objection handling for ${reason}.`);
      wins.push(`We have successfully identified ${reason} as a key friction point for targeted training.`);
    }
    return { title: `Deep Dive: ${selectedSegment.value}`, wins, risks, actions };
  }

  if (pageName === 'Overview' || (!selectedEntityId && pageName !== 'Models' && pageName !== 'Sources' && pageName !== 'Action Center')) {
    wins.push(`Network conversion is **${gConv.toFixed(1)}%**, generating **${formatCurrency(metrics.kpis.revenue)}**.`);
    const sortedB = [...metrics.branches].sort((a, b) => b.revenue - a.revenue);
    if (sortedB.length >= 2) {
      wins.push(`**${sortedB[0].name}** leads with ${formatCurrency(sortedB[0].revenue)}, outperforming **${sortedB[sortedB.length - 1].name}** significantly.`);
    }
    if (metrics.kpis.targetAchievement < 100) {
      risks.push(`Network is pacing at **${metrics.kpis.targetAchievement.toFixed(1)}%** of revenue target.`);
    } else {
      wins.push(`Network has exceeded the revenue target at **${metrics.kpis.targetAchievement.toFixed(1)}%**!`);
    }
    risks.push(`There is **${formatCurrency(metrics.kpis.activePipelineValue)}** sitting in active pipeline at risk of aging.`);
    if (metrics.kpis.slaCompliancePct < 90) {
      actions.push('Enforce 48-hour response SLA across all underperforming branches.');
    } else {
      actions.push('Maintain strict SLA compliance to preserve high win rates.');
    }
    actions.push(`Focus on moving stagnant leads to the next funnel stage to secure ${formatCurrency(metrics.kpis.activePipelineValue)} pipeline.`);
  }
  else if (pageName === 'Branch Intelligence' || pageName === 'Branches') {
    const branch = selectedEntityId ? metrics.branches.find(b => b.id === selectedEntityId) : metrics.branches[0];
    if (branch) {
      const bConv = branch.conversion || 0;
      wins.push(`**${branch.name}** has secured **${formatCurrency(branch.revenue)}** with a win rate of **${bConv.toFixed(1)}%**.`);
      if (bConv > gConv) {
        wins.push(`Branch win rate is **${(bConv - gConv).toFixed(1)}% higher** than network average.`);
      } else {
        risks.push(`Branch win rate is **${(gConv - bConv).toFixed(1)}% lower** than network average.`);
      }

      if (branch.targetAchievement >= 100) wins.push(`Exceeding target at **${branch.targetAchievement.toFixed(0)}%**.`);
      else risks.push(`Currently underpacing at **${branch.targetAchievement.toFixed(0)}%** of target.`);

      if (branch.avgResponseTimeHours > metrics.kpis.avgResponseTimeHours) {
        risks.push(`Response time of **${branch.avgResponseTimeHours.toFixed(1)} hrs** is slower than the network average.`);
        actions.push(`Coach ${branch.manager} on immediate lead assignment and SLA adherence.`);
      } else {
        actions.push(`Replicate ${branch.name}'s lead response workflow in slower branches.`);
      }

      const highestDropOff = branch.funnel.reduce((max, s) => s.dropOffPct > max.dropOffPct ? s : max, branch.funnel[0]);
      if (highestDropOff && highestDropOff.dropOffPct > 0) {
        actions.push(`Investigate the **${highestDropOff.dropOffPct.toFixed(1)}%** drop-off at the **${highestDropOff.label}** stage.`);
      }
    }
  }
  else if (pageName === 'Sales Reps') {
    const rep = selectedEntityId ? metrics.reps.find(r => r.id === selectedEntityId) : metrics.reps[0];
    if (rep) {
      const rConv = rep.conversion || 0;
      const bConv = metrics.branches.find(b => b.id === rep.branchId)?.conversion || gConv;

      wins.push(`**${rep.name}** holds a conversion rate of **${rConv.toFixed(1)}%**.`);
      if (rConv > bConv) wins.push(`Rep outperforms their branch average by **${(rConv - bConv).toFixed(1)}%**.`);
      else risks.push(`Rep is converting **${(bConv - rConv).toFixed(1)}% lower** than their branch average.`);

      if (rep.avgResponseTimeHours > 4) risks.push(`Response time is critically slow at **${rep.avgResponseTimeHours.toFixed(1)} hrs**.`);
      else wins.push(`Maintains a solid response time of **${rep.avgResponseTimeHours.toFixed(1)} hrs**.`);

      if (rep.activeLeadsCount > 30) risks.push(`High pipeline load: **${rep.activeLeadsCount}** active leads risking burnout.`);

      if (rep.activeLeadsCount > 30) actions.push(`Consider redistributing leads from ${rep.name} to avoid SLA breaches.`);
      else actions.push(`Assign more incoming leads to ${rep.name} to maximize their bandwidth.`);

      const highestDropOff = rep.funnel.reduce((max, s) => s.dropOffPct > max.dropOffPct ? s : max, rep.funnel[0]);
      if (highestDropOff && highestDropOff.dropOffPct > 0) {
        actions.push(`Provide coaching on overcoming objections at the **${highestDropOff.label}** stage.`);
      }
    }
  }
  else if (pageName === 'Models') {
    const model = selectedEntityId ? metrics.models.find(m => m.model === selectedEntityId) : metrics.models[0];
    if (model) {
      const topModel = [...metrics.models].sort((a, b) => b.revenue - a.revenue)[0];
      if (topModel) {
        const topReason = topModel.lostReasons.length > 0 ? topModel.lostReasons[0].reason : 'Unknown';
        wins.push(`**${topModel.model}** has the highest revenue at **${formatCurrency(topModel.revenue)}** but also a **${topModel.lostPercentage.toFixed(1)}%** loss rate — primarily driven by **${topReason}**.`);
      }

      const mConv = model.conversion || 0;
      if (model.model !== topModel?.model) {
        wins.push(`**${model.model}** generated **${formatCurrency(model.revenue)}** across ${model.unitsSold} units.`);
      }

      if (mConv > gConv) wins.push(`Converts at **${mConv.toFixed(1)}%**, outperforming the network average.`);
      else risks.push(`Win rate of **${mConv.toFixed(1)}%** is below the network average.`);

      if (model.lostReasons.length > 0) {
        actions.push(`Equip reps with rebuttals specifically for **${model.lostReasons[0].reason}** on this model.`);
      }

      if (model.activeLeadsCount > 0) {
        actions.push(`Prioritize the ${model.activeLeadsCount} active leads for ${model.model} to secure pending revenue.`);
      } else {
        actions.push(`Launch targeted marketing to build pipeline for ${model.model}.`);
      }
    }
  }

  else if (pageName === 'Action Center') {
    wins.push(`Active pipeline holds **${metrics.kpis.activeLeads} leads** currently being worked.`);
    if (metrics.kpis.activePipelineValue > 50000000) {
      wins.push(`Pipeline value is robust at ${formatCurrency(metrics.kpis.activePipelineValue)}.`);
    } else {
      risks.push(`Pipeline value is low at ${formatCurrency(metrics.kpis.activePipelineValue)}.`);
    }

    const stagnantValue = metrics.kpis.stagnantPipelineValue || 0;
    if (stagnantValue > 0) {
      risks.push(`Stagnant pipeline represents **${formatCurrency(stagnantValue)}** in potential revenue leakage.`);
    }

    if (metrics.kpis.avgResponseTimeHours > 3) {
      risks.push(`Overdue leads are dragging down response times (currently **${metrics.kpis.avgResponseTimeHours.toFixed(1)} hrs**).`);
    }

    actions.push(`Review delayed deliveries and escalate to operations if >7 days.`);
    actions.push(`Mandate end-of-day updates from reps on all high-value flagged items.`);
  }

  // Fallbacks
  if (wins.length === 0) wins.push("Data collection is operating nominally.");
  if (risks.length === 0) risks.push("No immediate critical risks identified.");
  if (actions.length === 0) actions.push("Continue monitoring KPIs.");

  return { title: `AI Insights: ${pageName}`, wins, risks, actions };
}

// ─────────────────────────────────────────────────────────────
export default function AISummary() {
  const pathname = usePathname();
  const { timeFilter, selectedEntityId, selectedSegment, activeMetricToggle, dateRange, selectedBranches } = useDashboardContext();
  const [activeTab, setActiveTab] = useState<'wins' | 'risks' | 'actions'>('wins');
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isInsightsExpanded, setIsInsightsExpanded] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const getPageName = () => {
    if (!pathname || pathname === '/') return 'Overview';
    if (pathname.includes('/overview')) return 'Overview';
    if (pathname.includes('/branch-intelligence')) return 'Branches';
    if (pathname.includes('/sales-reps')) return 'Sales Reps';
    if (pathname.includes('/models')) return 'Models';
    if (pathname.includes('/source-performance')) return 'Sources';
    if (pathname.includes('/action-center')) return 'Action Center';
    return 'Overview';
  };

  const pageName = getPageName();

  // Simulate analysis load on state changes
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, [pathname, timeFilter, selectedEntityId, selectedSegment, activeMetricToggle, dateRange, selectedBranches]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const metrics = getGlobalMetrics(timeFilter, dateRange, selectedBranches);
  const content = generateInsights({ pageName, metrics, selectedEntityId, selectedSegment, activeMetricToggle });

  // Prompt suggestions change per page
  const suggestions: Record<string, string[]> = {
    Overview: ['Why is Mumbai underperforming?', 'Who are the top performers?', 'Summary of December'],
    'Branches': ['Compare Mumbai vs Hyderabad', 'Worst conversion branch?', 'Improve Bangalore pipeline'],
    'Sales Reps': ['Top 3 rep analysis', 'Who needs coaching?', 'SLA violations this month'],
    Models: ['Fortuner drop-off reasons', 'Best converting model?', 'Innova Hycross supply fix'],
    Sources: ['Which channel is best?', 'Compare Walk-In vs Website', 'Should we increase ads?'],
    'Action Center': ['Which leads are at highest risk?', 'Top reasons for delay?', 'Suggest intervention'],
  };
  const pageSuggestions = suggestions[pageName] || suggestions['Overview'];

  // ── Handle chat submit ─────────────────────────────────────
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = chatInput.trim();
    if (!question || isTyping) return;

    setChatInput('');
    const userMsg: Message = { role: 'user', content: question };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      const history = updatedMessages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model' as 'user' | 'model',
        content: m.content
      }));

      const response = await askDealershipAnalyst(question, history);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or check your API key in Settings.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-card rounded-md p-5 shadow-sm border border-border">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-6 h-6 bg-muted rounded-full animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 5 / 6, 4 / 5, 3 / 4].map((w, i) => (
            <div key={i} className="h-3 bg-muted rounded animate-pulse" style={{ width: `${w * 100}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full w-full bg-card text-foreground"
    >
      {/* ── SECTION 1: AI Data Insights ─────────────────────── */}
      <div className="flex-shrink-0 flex flex-col m-3 bg-gradient-to-br from-primary to-blue-800 text-primary-foreground rounded-2xl shadow-md relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />

        <button
          onClick={() => setIsInsightsExpanded(!isInsightsExpanded)}
          className="px-4 pt-4 pb-3 relative z-10 w-full text-left flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center space-x-2">
            <h3 className="font-medium text-white tracking-tight text-sm leading-snug flex items-center">
              {content.title}
            </h3>
          </div>
          <ChevronDown className={`w-5 h-5 text-blue-200 transition-transform duration-300 group-hover:text-white ${isInsightsExpanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Accordion Content */}
        <AnimatePresence initial={false}>
          {isInsightsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden flex flex-col"
            >
              {/* Tabs */}
              <div className="px-4 pb-2 flex-shrink-0 relative z-10">
                <div className="flex w-full bg-black/10 p-1 rounded-full border border-white/10">
                  {[
                    { key: 'wins', icon: TrendingUp, label: 'Wins' },
                    { key: 'risks', icon: AlertTriangle, label: 'Risks' },
                    { key: 'actions', icon: ArrowRight, label: 'Actions' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`flex-1 flex items-center justify-center py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === tab.key
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-blue-100 hover:text-white hover:bg-white/10'
                        }`}
                    >
                      <tab.icon className="w-3.5 h-3.5 mr-1.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Insight content */}
              <div className="overflow-y-auto px-4 py-2 pb-4 relative z-10 max-h-48">
                <div className="space-y-3 [&_strong]:text-white [&_strong]:font-bold">
                  <AnimatePresence mode="wait">
                    {(['wins', 'risks', 'actions'] as const).map(tab =>
                      activeTab === tab ? (
                        <motion.ul
                          key={tab}
                          initial={{ opacity: 0, y: 2 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -2 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-3"
                        >
                          {content[tab].map((item, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-blue-50 leading-relaxed flex items-start"
                            >
                              <span
                                className={`w-2 h-2 rounded-full mt-1.5 mr-3 flex-shrink-0 shadow-sm ${tab === 'wins' ? 'bg-green-300' : tab === 'risks' ? 'bg-amber-300' : 'bg-red-400'
                                  }`}
                              />
                              <span dangerouslySetInnerHTML={{ __html: parseMarkdown(item) }} />
                            </li>
                          ))}
                        </motion.ul>
                      ) : null
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── SECTION 2: AI Chat ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 bg-card border-t border-border/40 px-4 pt-4 pb-4">
        {/* Chat header */}
        <div className="flex items-center space-x-1.5 mb-3 flex-shrink-0">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-muted-foreground tracking-tight">Ask Copilot</span>
        </div>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-3 pr-1 min-h-0 flex flex-col">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <Sparkles className="w-8 h-8 text-primary/40 mb-3" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ask me anything about branches, reps, models, or pipeline performance.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion pills */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div 
              initial={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
              transition={{ duration: 0.2 }}
              className="flex flex-wrap gap-2 flex-shrink-0"
            >
              {pageSuggestions.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setChatInput(prompt);
                    setIsInsightsExpanded(false);
                    setShowSuggestions(false);
                  }}
                  className="px-3.5 py-1.5 text-[11px] font-bold bg-background hover:bg-muted text-muted-foreground hover:text-foreground rounded-full border border-border shadow-sm transition-all cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <form onSubmit={handleChatSubmit} className="flex items-center relative flex-shrink-0 mt-1">
          <input
            type="text"
            value={chatInput}
            onFocus={() => {
              setIsInsightsExpanded(false);
              setShowSuggestions(false);
            }}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Ask Copilot..."
            disabled={isTyping}
            className="w-full bg-background border border-border shadow-sm rounded-full pl-5 pr-14 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isTyping}
            className="absolute right-2 p-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center cursor-pointer shadow-sm"
            title="Send"
          >
            {isTyping
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CornerDownLeft className="w-4 h-4" />
            }
          </button>
        </form>
      </div>
    </motion.div>
  );
}
