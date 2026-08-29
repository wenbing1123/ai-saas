export const appConfig = {
  name: 'Nebula AI',
  tagline: 'Build, deploy & scale intelligent agents',
  description:
    'A unified platform to design AI agents with LangGraph, connect tools, and ship production-ready assistants.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  langgraph: {
    apiUrl: process.env.LANGGRAPH_API_URL ?? 'http://localhost:8123',
    apiKey: process.env.LANGGRAPH_API_KEY ?? '',
  },
  features: [
    {
      title: 'Visual Agent Studio',
      description:
        'Design multi-step agents with a drag-and-drop graph editor. Orchestrate state, tools, and memory.',
      icon: 'workflow',
    },
    {
      title: 'Knowledge RAG',
      description:
        'Connect PDFs, docs, and databases. Retrieve grounded answers with citations and confidence scores.',
      icon: 'database',
    },
    {
      title: 'Observability',
      description:
        'Trace every run, measure latency, and evaluate quality with built-in analytics and evals.',
      icon: 'activity',
    },
    {
      title: 'Team Collaboration',
      description:
        'Share agents, manage permissions, and ship safer with role-based access control.',
      icon: 'users',
    },
  ],
  pricing: [
    {
      name: 'Starter',
      price: '$0',
      interval: 'forever',
      description: 'Perfect for exploring the platform.',
      features: ['3 agents', '1k requests / mo', 'Community support', 'Basic analytics'],
      cta: 'Get started',
    },
    {
      name: 'Team',
      price: '$49',
      interval: '/ user / mo',
      description: 'For growing teams building with AI.',
      features: [
        'Unlimited agents',
        '100k requests / mo',
        'Priority support',
        'Advanced analytics',
        'Team workspaces',
      ],
      cta: 'Start 14-day trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      interval: '',
      description: 'Custom SLAs and dedicated infrastructure.',
      features: ['SSO / SAML', 'Dedicated VPC', 'Custom model hosting', '24/7 support'],
      cta: 'Contact sales',
    },
  ],
};

export type AppConfig = typeof appConfig;