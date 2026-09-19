/**
 * Marketing site + auth pages (landing, pricing, docs, login, register).
 * English is the source of truth; zh must satisfy the same shape.
 * Brand names (Nebula API), model names and technical terms (OpenAI-compatible,
 * sk-nebula-, HTTP status codes, endpoints) are kept untranslated.
 */
export const marketingEn = {
  header: {
    home: 'Home',
    pricing: 'Pricing',
    docs: 'Docs',
    models: 'Models',
    packages: 'Packages',
    signIn: 'Sign in',
    getStarted: 'Get started',
    getApiKey: 'Get API key',
    dashboard: 'Dashboard',
    menu: 'Menu',
  },
  landing: {
    hero: {
      slides: [
        {
          badge: 'OpenAI + Anthropic compatible · Claude Code & Codex ready',
          titlePrefix: 'Premium AI tokens at ',
          titleHighlight: 'wholesale prices',
          subtitle:
            'One key for Claude, GPT, Gemini and DeepSeek. Same APIs your coding agent already speaks — billed by the token with simple, competitive per-token pricing.',
        },
        {
          badge: 'Two protocols, every frontier model',
          titlePrefix: 'One endpoint for ',
          titleHighlight: 'Claude · GPT · Gemini',
          subtitle:
            'Fully OpenAI- and Anthropic-compatible wire protocols. Point Claude Code, Codex, Cline or any OpenAI client at your Nebula base URL and keep shipping.',
        },
        {
          badge: 'Pay-as-you-go, no lock-in',
          titlePrefix: 'Keys in 30 seconds — ',
          titleHighlight: 'pay only for tokens',
          subtitle:
            'No subscriptions, no commitment. Credit never expires, access is instant, and switching providers never requires changing a line of code.',
        },
      ],
      ctaPrimary: 'Start with $6 credit',
      ctaSecondary: 'See live token prices',
      prevSlide: 'Previous banner',
      nextSlide: 'Next banner',
      slideDot: 'Banner {n}',
    },
    stats: {
      models: 'Frontier models',
      provisioning: 'Key provisioning',
      protocols: 'Wire protocols',
      noLockIn: 'Lock-in, cancel anytime',
    },
    providerStrip: {
      label: 'Available providers:',
    },
    modelSection: {
      title: 'Transparent per-token pricing',
      subtitle:
        'Every model shows exactly what you pay. No bundled plans hiding margins, no surprise bills — clear per-token pricing you can compare at a glance.',
      footnote: 'Prices in USD per 1,000,000 tokens. Cached prompt tokens are billed at reduced rates.',
      fullPricingLink: 'Full pricing details',
    },
    features: {
      title: 'Everything an API reseller should be',
      subtitle: 'Infrastructure-grade gateway with the developer experience of a first-party provider.',
      items: [
        {
          title: 'Drop-in compatible',
          desc: 'Point any OpenAI SDK at /v1, or any Anthropic SDK at /v1/messages. Zero code changes.',
        },
        {
          title: 'Built for coding agents',
          desc: 'Claude Code, Codex CLI, Cline, Continue — set a base URL and keep your existing workflow.',
        },
        {
          title: 'Prepaid, never overcharged',
          desc: 'Buy credit, spend it on tokens. Requests stop automatically when the balance runs out.',
        },
        {
          title: 'Usage you can audit',
          desc: 'Per-request token counts, cost and latency. Export-friendly records for every API key.',
        },
        {
          title: 'Throughput on demand',
          desc: 'Higher packages raise requests-per-minute and concurrency for CI and team workloads.',
        },
        {
          title: 'Key-scoped security',
          desc: 'Create and revoke keys anytime. We store only SHA-256 hashes, never the raw secret.',
        },
      ],
    },
    steps: {
      title: 'Running in three steps',
      items: [
        {
          title: '1. Buy credit',
          desc: 'Pick a package in seconds. Credit lands on your balance immediately; it never expires while active.',
        },
        {
          title: '2. Create an API key',
          desc: 'Generate a sk-nebula-… key in the dashboard. Name it per machine or per project.',
        },
        {
          title: '3. Point your client',
          desc: 'Set the base URL to our gateway and paste the key. Works with Claude Code, Codex and every SDK.',
        },
      ],
    },
    packages: {
      title: 'Top-up packages',
      subtitle: 'Credit on your balance, bonus credit in the package. Spend across any enabled model.',
      mostPopular: 'Most popular',
      creditSuffix: 'credit',
      buy: 'Buy {plan}',
    },
    faq: {
      title: 'Frequently asked',
      items: [
        {
          q: 'How are tokens billed?',
          a: 'Per request, using the upstream-reported token counts: input, output, cached-read and cached-write tokens are metered separately at the prices listed on this page.',
        },
        {
          q: 'Does credit expire?',
          a: 'Your balance remains available across packages. Each package also grants a rate-limit entitlement for its validity window (30–90 days); after it expires you can still spend remaining credit at the default rate.',
        },
        {
          q: 'Can I use this with Claude Code or Codex?',
          a: 'Yes. The gateway exposes native /v1/messages (Anthropic) and /v1/chat/completions (OpenAI) endpoints. Setup snippets are in the Docs — usually two environment variables.',
        },
        {
          q: 'How is this priced?',
          a: 'We aggregate demand from thousands of developers and keep operational overhead low, which lets us offer competitive, straightforward per-token pricing. The price shown next to every model is the price you pay.',
        },
      ],
    },
    footer: {
      tagline: 'Nebula API — wholesale AI tokens, developer-grade gateway',
      product: 'Product',
      resources: 'Resources',
      friends: 'Friends',
      copyright: '© {year} Nebula API. All rights reserved.',
    },
  },
  pricingTable: {
    model: 'Model',
    provider: 'Provider',
    context: 'Context',
    inputPer1m: 'Input / 1M',
    outputPer1m: 'Output / 1M',
  },
  pricing: {
    title: 'Simple, metered pricing',
    subtitle:
      'Pay only for tokens you consume. All prices in USD per 1,000,000 tokens; package credit is spendable across every model below.',
    tokenPrices: 'Token prices',
    inputTitle: 'Input tokens',
    inputBody:
      'are charged when prompts are processed. Prompt caching tokens (when supported by the model) are charged at the reduced cache-read/cache-write rates shown in the dashboard model editor.',
    retriesTitle: 'Free retries?',
    retriesBody:
      'Requests rejected before reaching the upstream provider (auth, balance, rate limits) are never charged. Upstream errors carry no token charge.',
    creditPackages: 'Credit packages',
    creditSuffix: 'credit',
    choose: 'Choose {plan}',
    costFloorTitle: 'Transparent pricing guarantee',
    costFloorBody:
      'The price you see is the price you pay — no hidden fees, no minimum commitments. Every model page shows the exact per-token price, and your balance only moves with metered usage.',
  },
  docs: {
    title: 'Quickstart',
    navTitle: 'Documentation',
    subtitle:
      'Nebula API is wire-compatible with the OpenAI and Anthropic APIs. If your tool lets you set a custom base URL, it works — usually with two environment variables.',
    baseUrl: 'Base URL',
    openaiEndpoint: 'OpenAI endpoint',
    anthropicEndpoint: 'Anthropic endpoint',
    apiKey: {
      title: 'Create an API key',
      bodyBeforeLink: 'Sign up, buy credit (or use welcome credit), then create a key on the',
      linkText: 'API keys',
      bodyMid: 'page. Keys start with',
      bodyAfterCode: 'and are shown only once.',
    },
    claudeCode: {
      title: 'Claude Code (Anthropic protocol)',
      bodyBefore: 'Claude Code reads the standard Anthropic environment variables. Set',
      bodyMid: 'to the gateway and',
      bodyAfter: 'to your key.',
    },
    codex: {
      title: 'OpenAI Codex CLI',
      bodyBefore: 'Register a custom provider in',
      bodyMid: '. Use',
      bodyMid2: 'so Codex calls the Chat Completions endpoint with any model.',
    },
    sdks: {
      title: 'SDKs & curl',
      body: 'The same base URL works with the official OpenAI SDKs (Python, Node.js, Go, .NET), Cline, Continue, and any tool speaking either protocol.',
    },
    models: {
      title: 'Available models',
      body: 'Use these ids in the model field. Anthropic-protocol models must be called via /v1/messages; the rest via /v1/chat/completions.',
      modelId: 'Model id',
      protocol: 'Protocol',
      context: 'Context',
    },
    errors: {
      title: 'Errors & billing behavior',
      unauthorized: 'missing, invalid or revoked key.',
      insufficientBalance: 'top up credit; requests are blocked before any upstream cost is incurred.',
      rateLimited: 'requests-per-minute or concurrency limit of your current package.',
      streamingBefore: 'Streaming requests (',
      streamingAfter: ') are billed from the final usage frame, exactly like non-streaming calls.',
    },
  },
  codeBlock: {
    copy: 'Copy',
    copied: 'Copied',
  },
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to manage keys, credit and usage',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    forgotPassword: 'Forgot password?',
    noAccount: 'No account?',
    createOne: 'Create one',
    unverified: 'Please activate your account via the email link before signing in.',
    orContinue: 'or continue with',
    oauthGoogle: 'Sign in with Google',
    oauthGithub: 'Sign in with GitHub',
    oauthErrors: {
      provider_unavailable: 'This sign-in provider is not available right now.',
      cancelled: 'Sign-in was cancelled. Please try again.',
      invalid_state: 'Sign-in session expired. Please try again.',
      account_suspended: 'This account has been suspended. Contact support.',
      sign_in_failed: 'Sign-in failed. Please try again.',
    },
  },
  register: {
    title: 'Create your account',
    subtitle: 'Buy credit, generate a key, point your agent — in minutes',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    passwordHint: 'At least 8 characters.',
    inviteCode: 'Invite code (optional)',
    inviteCodeHint: 'Enter a friend\'s code to credit them as your inviter.',
    submit: 'Create account',
    alreadyHave: 'Already have an account?',
    signIn: 'Sign in',
    terms: 'By creating an account you agree to use the service in compliance with your local AI usage regulations.',
    bonus: 'Sign up now and get $6 free credit to try any model.',
  },
  accountEmail: {
    verify: {
      title: 'Check your email',
      subtitle: 'One last step to activate your account',
      desc: (email: string) =>
        `We just sent an activation link to ${email}. Open the email and click the link to activate your account.`,
      spamHint: 'No email yet? Check your spam folder, or resend the link below.',
      resend: 'Resend activation email',
      resendDone: 'A new activation link has been sent. It expires in 24 hours.',
      resendIdle: 'If the address belongs to an unverified account, a new link is on its way.',
      tooSoon: 'Please wait a minute before requesting another email.',
      backToLogin: 'Back to sign in',
    },
    activate: {
      successTitle: 'Email verified',
      successDesc: 'Your account is now active — taking you to the dashboard…',
      alreadyTitle: 'Account already active',
      alreadyDesc: 'Your email is already verified. Please sign in to continue.',
      invalidTitle: 'Activation link is invalid or has expired',
      invalidDesc: 'Request a new activation email to finish creating your account.',
      requestNew: 'Request a new link',
      goLogin: 'Go to sign in',
    },
    forgot: {
      title: 'Reset your password',
      subtitle: 'Enter your account email and we will send you a reset link',
      email: 'Email',
      submit: 'Send reset link',
      doneTitle: 'Check your email',
      doneDesc: 'If an account exists for that address, a password reset link is on its way. The link expires in 1 hour.',
      tooSoon: 'Please wait a minute before requesting another email.',
      notFound: 'No account exists with that email address.',
      backToLogin: 'Back to sign in',
    },
    reset: {
      title: 'Choose a new password',
      subtitle: 'Your new password must be at least 8 characters',
      newPassword: 'New password',
      confirmPassword: 'Confirm new password',
      passwordHint: 'At least 8 characters.',
      submit: 'Reset password',
      doneTitle: 'Password updated',
      doneDesc: 'Your password has been changed. You can now sign in with the new password.',
      invalidTitle: 'Reset link is invalid or has expired',
      invalidDesc: 'Request a new password reset link and try again.',
      requestNew: 'Request a new link',
      goLogin: 'Go to sign in',
    },
  },
  emails: {
    activation: {
      subject: 'Activate your Nebula API account',
      hello: (name: string) => `Hi ${name},`,
      intro:
        'Welcome to Nebula API! Confirm your email address to activate your account and claim your welcome credit.',
      cta: 'Activate account',
      expires: 'This link expires in 24 hours.',
      fallback: 'If the button does not work, copy and paste this URL into your browser:',
      ignore: 'If you did not create an account, you can safely ignore this email.',
    },
    reset: {
      subject: 'Reset your Nebula API password',
      hello: (name: string) => `Hi ${name},`,
      intro: 'We received a request to reset the password for your Nebula API account.',
      cta: 'Reset password',
      expires: 'This link expires in 1 hour.',
      fallback: 'If the button does not work, copy and paste this URL into your browser:',
      ignore: 'If you did not request a password reset, you can safely ignore this email. Your password stays unchanged.',
    },
    footer: 'Nebula API — wholesale AI tokens for coding agents',
  },
};

export const marketingZh = {
  header: {
    home: '首页',
    pricing: '定价',
    docs: '文档',
    models: '模型',
    packages: '套餐',
    signIn: '登录',
    getStarted: '立即开始',
    getApiKey: '获取 API 密钥',
    dashboard: '进入控制台',
    menu: '菜单',
  },
  landing: {
    hero: {
      slides: [
        {
          badge: 'OpenAI + Anthropic 兼容 · 支持 Claude Code 与 Codex',
          titlePrefix: '顶级 AI Token，',
          titleHighlight: '批发价直供',
          subtitle:
            '一个密钥通吃 Claude、GPT、Gemini 与 DeepSeek。与你编码智能体现在使用的 API 完全一致——按 Token 计费，单价简单透明、有竞争力。',
        },
        {
          badge: '双协议兼容 · 全量前沿模型',
          titlePrefix: '一个 API 直通 ',
          titleHighlight: 'Claude · GPT · Gemini',
          subtitle:
            '完全兼容 OpenAI 与 Anthropic 线协议。Claude Code、Codex、Cline 或任何 OpenAI 客户端，改个 base URL 就能继续干活。',
        },
        {
          badge: '即付即用 · 零订阅锁定',
          titlePrefix: '30 秒拿到密钥，',
          titleHighlight: '用多少付多少',
          subtitle:
            '不用订阅、没有承诺，余额永不过期，开通即时生效；切换供应商也无需改动一行代码。',
        },
      ],
      ctaPrimary: '注册即送 $6 额度',
      ctaSecondary: '查看实时 Token 价格',
      prevSlide: '上一张',
      nextSlide: '下一张',
      slideDot: '第 {n} 张',
    },
    stats: {
      models: '前沿模型',
      provisioning: '密钥极速开通',
      protocols: '接入协议',
      noLockIn: '平台锁定，随时取消',
    },
    providerStrip: {
      label: '可用供应商：',
    },
    modelSection: {
      title: '透明的按 Token 计价',
      subtitle: '每个模型都明码标价。没有隐藏利润的捆绑套餐，也没有意外的账单——单价一目了然，方便你自行对比。',
      footnote: '价格以美元计，按每 1,000,000 个 Token 报价。缓存的提示词 Token 按优惠费率计费。',
      fullPricingLink: '查看完整定价说明',
    },
    features: {
      title: 'API 转售平台应有的一切',
      subtitle: '基础设施级网关，搭配一线厂商般的开发者体验。',
      items: [
        {
          title: '无缝兼容',
          desc: '把任意 OpenAI SDK 指向 /v1，或把任意 Anthropic SDK 指向 /v1/messages，零代码改动。',
        },
        {
          title: '为编码智能体而生',
          desc: 'Claude Code、Codex CLI、Cline、Continue——只需设置 Base URL，即可保留现有工作流。',
        },
        {
          title: '预付费，绝不超支',
          desc: '先充值，再按 Token 消耗。余额用尽后请求自动停止。',
        },
        {
          title: '用量可审计',
          desc: '逐条记录每次请求的 Token 数、费用与延迟，每个 API 密钥的记录都便于导出。',
        },
        {
          title: '按需扩容吞吐',
          desc: '更高级的套餐可提升每分钟请求数与并发数，从容应对 CI 与团队负载。',
        },
        {
          title: '密钥级安全',
          desc: '随时创建与吊销密钥。我们只保存 SHA-256 哈希，绝不存储原始密钥。',
        },
      ],
    },
    steps: {
      title: '三步跑通',
      items: [
        {
          title: '1. 购买额度',
          desc: '几秒内选定套餐，额度立即到账；只要账户处于使用状态即永不过期。',
        },
        {
          title: '2. 创建 API 密钥',
          desc: '在控制台生成 sk-nebula-… 密钥，可按机器或项目分别命名。',
        },
        {
          title: '3. 配置客户端',
          desc: '把 Base URL 指向我们的网关并填入密钥，即可用于 Claude Code、Codex 及各类 SDK。',
        },
      ],
    },
    packages: {
      title: '充值套餐',
      subtitle: '额度计入余额，套餐附赠加量。可在所有已启用模型间通用。',
      mostPopular: '最受欢迎',
      creditSuffix: '额度',
      buy: '购买 {plan}',
    },
    faq: {
      title: '常见问题',
      items: [
        {
          q: 'Token 如何计费？',
          a: '按请求计费，使用上游返回的 Token 用量：输入、输出、缓存读取与缓存写入 Token 分别按本页列出的价格计量。',
        },
        {
          q: '额度会过期吗？',
          a: '余额在所有套餐间持续有效。每个套餐还会在其有效期（30–90 天）内授予相应的限流权益；过期后你仍可以默认速率消耗剩余额度。',
        },
        {
          q: '可以在 Claude Code 或 Codex 中使用吗？',
          a: '可以。网关同时提供原生 /v1/messages（Anthropic）与 /v1/chat/completions（OpenAI）端点。设置片段见文档——通常只需两个环境变量。',
        },
        {
          q: '价格是怎么定的？',
          a: '我们聚合大量开发者的需求，并保持较低的运营成本，因此能提供有竞争力、简单透明的按 Token 单价。每个模型旁展示的价格即你所付的价格。',
        },
      ],
    },
    footer: {
      tagline: 'Nebula API — 批发价 AI Token，开发者级网关',
      product: '产品',
      resources: '资源',
      friends: '友情链接',
      copyright: '© {year} Nebula API. 保留所有权利。',
    },
  },
  pricingTable: {
    model: '模型',
    provider: '供应商',
    context: '上下文',
    inputPer1m: '输入 / 1M',
    outputPer1m: '输出 / 1M',
  },
  pricing: {
    title: '简单透明的按量计价',
    subtitle: '只为消耗的 Token 付费。所有价格以美元计、按每 1,000,000 个 Token 报价；套餐额度可在下方所有模型间通用。',
    tokenPrices: 'Token 价格',
    inputTitle: '输入 Token',
    inputBody:
      '在处理提示词时计费。提示缓存 Token（在模型支持时）按控制台模型编辑器中展示的更低的缓存读取/缓存写入费率计费。',
    retriesTitle: '失败重试免费吗？',
    retriesBody: '在到达上游供应商之前被拒绝的请求（鉴权失败、余额不足、触发限流）一律不计费。上游错误也不产生任何 Token 费用。',
    creditPackages: '额度套餐',
    creditSuffix: '额度',
    choose: '选择 {plan}',
    costFloorTitle: '价格透明保障',
    costFloorBody:
      '所见价格即所付价格——没有隐藏费用，也没有最低消费。每个模型页都展示精确的 token 单价，余额只随实际计费用量变动。',
  },
  docs: {
    title: '快速开始',
    navTitle: '文档目录',
    subtitle:
      'Nebula API 与 OpenAI、Anthropic API 线上协议兼容。只要你的工具支持自定义 Base URL，就能使用——通常只需两个环境变量。',
    baseUrl: 'Base URL',
    openaiEndpoint: 'OpenAI 端点',
    anthropicEndpoint: 'Anthropic 端点',
    apiKey: {
      title: '创建 API 密钥',
      bodyBeforeLink: '注册账号、购买额度（或使用赠送额度），然后前往',
      linkText: 'API 密钥',
      bodyMid: '页面创建密钥。密钥以',
      bodyAfterCode: '开头，且仅在创建时显示一次。',
    },
    claudeCode: {
      title: 'Claude Code（Anthropic 协议）',
      bodyBefore: 'Claude Code 读取标准 Anthropic 环境变量。将',
      bodyMid: '设置为网关地址，并将',
      bodyAfter: '设置为你的密钥。',
    },
    codex: {
      title: 'OpenAI Codex CLI',
      bodyBefore: '在',
      bodyMid: '中注册自定义 provider。将',
      bodyMid2: '设置为该值后，Codex 即可通过 Chat Completions 端点调用任意模型。',
    },
    sdks: {
      title: 'SDK 与 curl',
      body: '同一个 Base URL 适用于官方 OpenAI SDK（Python、Node.js、Go、.NET）、Cline、Continue，以及任何支持这两种协议的工具。',
    },
    models: {
      title: '可用模型',
      body: '在 model 字段中使用这些 id。Anthropic 协议的模型必须通过 /v1/messages 调用，其余通过 /v1/chat/completions 调用。',
      modelId: '模型 ID',
      protocol: '协议',
      context: '上下文',
    },
    errors: {
      title: '错误与计费行为',
      unauthorized: '密钥缺失、无效或已被吊销。',
      insufficientBalance: '余额不足，请充值；在任何上游成本产生之前，请求即被拦截。',
      rateLimited: '已达当前套餐的每分钟请求数或并发上限。',
      streamingBefore: '流式请求（',
      streamingAfter: '）按最终 usage 帧计费，与非流式调用完全一致。',
    },
  },
  codeBlock: {
    copy: '复制',
    copied: '已复制',
  },
  login: {
    title: '欢迎回来',
    subtitle: '登录后管理密钥、额度与用量',
    email: '邮箱',
    password: '密码',
    submit: '登录',
    forgotPassword: '忘记密码？',
    noAccount: '还没有账号？',
    createOne: '立即注册',
    unverified: '请先通过邮件中的激活链接激活账号后再登录。',
    orContinue: '或使用以下方式登录',
    oauthGoogle: '使用 Google 登录',
    oauthGithub: '使用 GitHub 登录',
    oauthErrors: {
      provider_unavailable: '该登录方式暂不可用。',
      cancelled: '登录已取消，请重试。',
      invalid_state: '登录会话已过期，请重试。',
      account_suspended: '该账号已被停用，请联系客服。',
      sign_in_failed: '登录失败，请重试。',
    },
  },
  register: {
    title: '创建你的账号',
    subtitle: '购买额度、生成密钥、接入你的智能体——几分钟搞定',
    name: '姓名',
    email: '邮箱',
    password: '密码',
    passwordHint: '至少 8 个字符。',
    inviteCode: '邀请码（选填）',
    inviteCodeHint: '填写好友的邀请码，即可标记 Ta 为你的邀请人。',
    submit: '创建账号',
    alreadyHave: '已有账号？',
    signIn: '登录',
    terms: '创建账号即表示你同意遵守当地 AI 使用法规，合规使用本服务。',
    bonus: '注册即送 $6 体验金，可调用任意模型。',
  },
  accountEmail: {
    verify: {
      title: '查收激活邮件',
      subtitle: '还差最后一步即可激活账号',
      desc: (email: string) =>
        `激活链接已发送至 ${email}。请打开邮件并点击链接完成账号激活。`,
      spamHint: '没收到邮件？请检查垃圾邮件文件夹，或在下方重新发送。',
      resend: '重新发送激活邮件',
      resendDone: '新的激活链接已发送，24 小时内有效。',
      resendIdle: '如果该邮箱对应未激活账号，新的激活链接正在发送途中。',
      tooSoon: '请稍等一分钟后再请求发送邮件。',
      backToLogin: '返回登录',
    },
    activate: {
      successTitle: '邮箱验证成功',
      successDesc: '账号已激活，正在跳转到控制台……',
      alreadyTitle: '账号已激活',
      alreadyDesc: '你的邮箱已完成验证，请直接登录。',
      invalidTitle: '激活链接无效或已过期',
      invalidDesc: '请重新发送激活邮件以完成账号创建。',
      requestNew: '重新发送激活邮件',
      goLogin: '去登录',
    },
    forgot: {
      title: '重置密码',
      subtitle: '输入账号邮箱，我们将向你发送重置链接',
      email: '邮箱',
      submit: '发送重置链接',
      doneTitle: '查收重置邮件',
      doneDesc: '如果该邮箱已注册账号，重置链接正在发送途中，链接 1 小时内有效。',
      tooSoon: '请稍等一分钟后再请求发送邮件。',
      notFound: '该邮箱尚未注册账号。',
      backToLogin: '返回登录',
    },
    reset: {
      title: '设置新密码',
      subtitle: '新密码至少需要 8 个字符',
      newPassword: '新密码',
      confirmPassword: '确认新密码',
      passwordHint: '至少 8 个字符。',
      submit: '重置密码',
      doneTitle: '密码已更新',
      doneDesc: '密码修改成功，现在可以使用新密码登录。',
      invalidTitle: '重置链接无效或已过期',
      invalidDesc: '请重新申请密码重置链接后再试。',
      requestNew: '重新申请重置链接',
      goLogin: '去登录',
    },
  },
  emails: {
    activation: {
      subject: '激活你的 Nebula API 账号',
      hello: (name: string) => `你好，${name}：`,
      intro:
        '欢迎使用 Nebula API！请确认你的邮箱地址以激活账号并领取注册赠送额度。',
      cta: '激活账号',
      expires: '该链接 24 小时内有效。',
      fallback: '如果按钮无法点击，请将以下链接复制到浏览器中打开：',
      ignore: '如果这不是你本人的注册操作，请忽略本邮件。',
    },
    reset: {
      subject: '重置你的 Nebula API 密码',
      hello: (name: string) => `你好，${name}：`,
      intro: '我们收到了重置你 Nebula API 账号密码的请求。',
      cta: '重置密码',
      expires: '该链接 1 小时内有效。',
      fallback: '如果按钮无法点击，请将以下链接复制到浏览器中打开：',
      ignore: '如果这不是你本人的操作，请忽略本邮件，你的密码不会发生变化。',
    },
    footer: 'Nebula API — 批发价 AI Token，开发者级网关',
  },
} satisfies typeof marketingEn;
