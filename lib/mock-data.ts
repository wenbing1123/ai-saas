import type { Agent, Conversation, KnowledgeBase, KnowledgeSource } from '@/lib/types';

export const AGENT_CATALOG: Agent[] = [
  {
    id: 'agent-researcher',
    name: 'Researcher',
    description: 'Deep research agent that searches, synthesizes, and cites sources.',
    systemPrompt:
      'You are a meticulous research analyst. Always cite sources, highlight uncertainty, and structure outputs with clear sections.',
    model: 'gpt-4o',
    temperature: 0.3,
    tools: ['web_search', 'arxiv', 'database'],
    status: 'active',
    graphId: 'research-graph',
  },
  {
    id: 'agent-copywriter',
    name: 'Copywriter',
    description: 'Brand-aware copywriter for emails, landing pages, and ads.',
    systemPrompt:
      'You are an expert B2B SaaS copywriter. Write concise, benefit-led copy. Use the PAS framework (Problem, Agitate, Solve) when appropriate.',
    model: 'gpt-4o',
    temperature: 0.8,
    tools: ['brand_voice', 'clarity_check'],
    status: 'active',
    graphId: 'copywriter-graph',
  },
  {
    id: 'agent-analyst',
    name: 'Analyst',
    description: 'SQL-first data analyst that answers questions with charts and tables.',
    systemPrompt:
      'You are a senior data analyst. Generate valid SQL, explain assumptions, and surface caveats. Prefer CTEs over nested subqueries.',
    model: 'gpt-4o',
    temperature: 0.1,
    tools: ['sql_generator', 'chart_renderer'],
    status: 'active',
    graphId: 'analyst-graph',
  },
  {
    id: 'agent-support',
    name: 'Support Assistant',
    description: 'Empathetic first-line support agent grounded in your docs.',
    systemPrompt:
      'You are a compassionate support agent. Always greet warmly, validate feelings, and resolve before escalating. Never invent policy.',
    model: 'gpt-4o-mini',
    temperature: 0.5,
    tools: ['kb_search', 'ticket_create'],
    status: 'active',
    graphId: 'support-graph',
  },
  {
    id: 'agent-lead',
    name: 'Lead Qualifier',
    description: 'Conversational lead qualification with structured scoring.',
    systemPrompt:
      'You are a B2B SDR. Ask progressively deeper questions, never pitch, and end every call with a clear next step or disqualification.',
    model: 'gpt-4o',
    temperature: 0.6,
    tools: ['crm_lookup', 'scoring'],
    status: 'draft',
  },
];

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Q3 launch summary',
    agentId: 'agent-researcher',
    updatedAt: Date.now() - 1000 * 60 * 25,
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'Summarize our Q3 product launch plan',
        createdAt: Date.now() - 1000 * 60 * 30,
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          "Here's a quick summary from my research on your Q3 launch plan:\n\n• **Timeline**: Launch week of Oct 14\n• **Audience**: Mid-market SaaS operators\n• **Channels**: Product-led demo, LinkedIn ads, partner webinars\n• **Risks**: Marketing content pipeline is 2 weeks behind\n\nWant me to draft a mitigation plan for the content delay?",
        createdAt: Date.now() - 1000 * 60 * 25,
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'Cold outreach draft',
    agentId: 'agent-copywriter',
    updatedAt: Date.now() - 1000 * 60 * 60 * 6,
    createdAt: Date.now() - 1000 * 60 * 60 * 10,
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'Draft a cold outreach email to Series B leads',
        createdAt: Date.now() - 1000 * 60 * 60 * 7,
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          "Subject: Saw your Series B — loved what you're building\n\nHi there,\n\nI noticed your recent raise and was impressed by your focus on developer experience. We help 40+ Series B teams ship AI features 3× faster with pre-built agent templates.\n\nWould a 20-minute intro next week make sense?",
        createdAt: Date.now() - 1000 * 60 * 60 * 6,
      },
    ],
  },
  {
    id: 'conv-3',
    title: 'Revenue by region SQL',
    agentId: 'agent-analyst',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
    createdAt: Date.now() - 1000 * 60 * 60 * 36,
    messages: [],
  },
];

export const DEMO_KNOWLEDGE_BASES: KnowledgeBase[] = [
  {
    id: 'kb-product',
    name: 'Product Docs',
    description: 'Internal product documentation and release notes.',
    documents: 142,
    size: '82 MB',
    status: 'ready',
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    id: 'kb-support',
    name: 'Support Center',
    description: 'Customer-facing help articles and FAQ.',
    documents: 87,
    size: '34 MB',
    status: 'ready',
    updatedAt: Date.now() - 1000 * 60 * 60 * 8,
  },
  {
    id: 'kb-sales',
    name: 'Sales Playbook',
    description: 'Battle cards, case studies, and pitch decks.',
    documents: 34,
    size: '18 MB',
    status: 'processing',
    updatedAt: Date.now() - 1000 * 60 * 60 * 48,
  },
  {
    id: 'kb-legal',
    name: 'Legal & Policy',
    description: 'Contracts, DPA, and privacy policies.',
    documents: 19,
    size: '6 MB',
    status: 'error',
    updatedAt: Date.now() - 1000 * 60 * 60 * 72,
  },
];

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: 'src-1',
    title: 'Q4 Product Launch Plan.pdf',
    type: 'pdf',
    status: 'ready',
    chunks: 142,
    tokens: 24800,
    progress: 100,
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    id: 'src-2',
    title: 'Customer Interview Notes.docx',
    type: 'docx',
    status: 'ready',
    chunks: 87,
    tokens: 12400,
    progress: 100,
    updatedAt: Date.now() - 1000 * 60 * 60 * 8,
  },
  {
    id: 'src-3',
    title: 'Sales Performance 2024.csv',
    type: 'csv',
    status: 'processing',
    chunks: 56,
    tokens: 8900,
    progress: 65,
    updatedAt: Date.now() - 1000 * 60 * 30,
  },
  {
    id: 'src-4',
    title: 'https://docs.example.com/api-reference',
    type: 'url',
    status: 'ready',
    chunks: 234,
    tokens: 45200,
    progress: 100,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'src-5',
    title: 'Engineering Handbook.md',
    type: 'markdown',
    status: 'error',
    chunks: 0,
    tokens: 0,
    progress: 0,
    updatedAt: Date.now() - 1000 * 60 * 60 * 48,
  },
];