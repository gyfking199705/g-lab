/**
 * devx-lab 数据层（纯数据，无副作用）。
 *
 * 两类核心数据：
 *   FRAMEWORKS —— 业界公认的「研发效能」度量/方法框架（DORA / SPACE / DevEx / DX Core 4 …），
 *                 用于对齐业界标准、给范式提供理论锚点。
 *   PRACTICES  —— 「提效范式库」：业界都在用的、被验证有效的提效实践，
 *                 每条都标注所属类别、对应框架、影响/成本/采用度，以及可信来源链接。
 *
 * 评分约定（1–5）：
 *   impact   提效影响（越高越值得做）
 *   effort   落地成本（越高越难，越需要投入）
 *   adoption 业界采用度（越高越主流）
 *
 * 来源均为公开、权威的一手资料（标准网站 / ACM Queue / 官方白皮书 / 经典著作）。
 */

// ── 类别（用于范式库筛选） ──────────────────────────────────────────
export const CATEGORIES = [
  { id: 'ai', name: 'AI 辅助研发', icon: '🤖' },
  { id: 'cd', name: '持续交付', icon: '🚀' },
  { id: 'code', name: '代码与评审', icon: '🔁' },
  { id: 'quality', name: '测试与质量', icon: '🧪' },
  { id: 'platform', name: '平台工程', icon: '🧱' },
  { id: 'flow', name: '协作与流程', icon: '🌊' },
  { id: 'metrics', name: '度量与反馈', icon: '📈' },
  { id: 'devex', name: '开发者体验', icon: '💚' },
];

// ── 业界框架（对齐标准） ────────────────────────────────────────────
export const FRAMEWORKS = [
  {
    id: 'dora',
    name: 'DORA',
    full: 'DORA Four Keys / State of DevOps',
    by: 'Google Cloud · DORA 团队（Forsgren、Humble、Kim 等）',
    year: '2014–至今',
    summary:
      '用 4 个核心指标衡量软件交付与运维表现，并据此把团队划分为 Elite / High / Medium / Low。十余年大样本研究证明：吞吐与稳定可以兼得，且与组织绩效正相关。',
    pillars: [
      { name: '部署频率', desc: '多久能把变更上线一次（吞吐）' },
      { name: '变更前置时间', desc: '从代码提交到上线运行的时长（吞吐）' },
      { name: '变更失败率', desc: '上线导致需要补救的变更占比（稳定）' },
      { name: '故障恢复时间', desc: '服务受损后恢复所需时长（稳定）' },
    ],
    url: 'https://dora.dev/',
  },
  {
    id: 'space',
    name: 'SPACE',
    full: 'The SPACE of Developer Productivity',
    by: 'Forsgren、Storey、Maddila、Zimmermann 等（ACM Queue, 2021）',
    year: '2021',
    summary:
      '提出「生产力不是单一维度、不能只看产出」。从 5 个维度立体度量，强调要混合主观与客观、避免用单一指标驱动行为。',
    pillars: [
      { name: 'Satisfaction', desc: '满意度与幸福感（主观）' },
      { name: 'Performance', desc: '结果与质量（如可靠性、缺陷率）' },
      { name: 'Activity', desc: '产出活动量（提交、评审、构建）' },
      { name: 'Communication', desc: '协作与沟通（评审、知识流动）' },
      { name: 'Efficiency', desc: '心流与无阻断（等待、中断）' },
    ],
    url: 'https://queue.acm.org/detail.cfm?id=3454124',
  },
  {
    id: 'devex',
    name: 'DevEx',
    full: 'Developer Experience: Core Dimensions',
    by: 'Noda、Storey、Forsgren、Houck、Calvano（ACM Queue, 2023）',
    year: '2023',
    summary:
      '把「开发者体验」收敛为 3 个可改进的核心维度。主张从开发者真实感受出发找瓶颈，体验改善会直接转化为效能与留存。',
    pillars: [
      { name: '反馈回路', desc: '构建/测试/评审/上线等回路越短越好' },
      { name: '认知负荷', desc: '理解与完成工作所需的脑力开销越低越好' },
      { name: '心流状态', desc: '可进入并保持专注、不被打断' },
    ],
    url: 'https://queue.acm.org/detail.cfm?id=3595878',
  },
  {
    id: 'core4',
    name: 'DX Core 4',
    full: 'DX Core 4（统一 DORA + SPACE + DevEx）',
    by: 'DX（Forsgren 等，2024）',
    year: '2024',
    summary:
      '把前述框架统一为一套可落地的度量体系：4 个顶层维度，避免单指标博弈，兼顾速度、质量、体验与业务影响。',
    pillars: [
      { name: 'Speed', desc: '交付速度（如 PR 吞吐、前置时间）' },
      { name: 'Effectiveness', desc: '有效性 / 开发者体验指数（DXI）' },
      { name: 'Quality', desc: '质量与稳定（变更失败率、可用性）' },
      { name: 'Impact', desc: '业务影响（投入产出、价值占比）' },
    ],
    url: 'https://getdx.com/research/measuring-developer-productivity-with-the-dx-core-4/',
  },
  {
    id: 'topologies',
    name: 'Team Topologies',
    full: 'Team Topologies',
    by: 'Matthew Skelton & Manuel Pais',
    year: '2019',
    summary:
      '用 4 种团队类型与 3 种交互模式组织研发，降低团队认知负荷、用平台团队把复杂度做成「内部产品」，让流式团队快速交付。',
    pillars: [
      { name: 'Stream-aligned', desc: '面向业务价值流、端到端交付的主力团队' },
      { name: 'Platform', desc: '把底层能力做成自助产品，降低他人认知负荷' },
      { name: 'Enabling', desc: '赋能团队，帮助补齐能力短板' },
      { name: 'Complicated-subsystem', desc: '封装高专业度的复杂子系统' },
    ],
    url: 'https://teamtopologies.com/',
  },
  {
    id: 'platform',
    name: 'Platform Engineering',
    full: 'CNCF Platforms White Paper / IDP',
    by: 'CNCF App Delivery TAG',
    year: '2023',
    summary:
      '用「内部开发者平台（IDP）」把铺路工作产品化：黄金路径、自助、默认安全合规，把一次性脚本沉淀为可复用的平台能力。',
    pillars: [
      { name: '黄金路径', desc: '为常见场景提供有主见、好走的默认路径' },
      { name: '自助服务', desc: '开发者按需自取环境/流水线/资源' },
      { name: '产品化运营', desc: '平台当产品做：有用户、路线图、SLO' },
    ],
    url: 'https://tag-app-delivery.cncf.io/whitepapers/platforms/',
  },
];

// ── 提效范式库 ──────────────────────────────────────────────────────
// frameworks 字段引用上面框架的 id，便于「按框架对齐」筛选。
export const PRACTICES = [
  // —— AI 辅助研发 ——
  {
    id: 'ai-pairing',
    title: 'AI 结对编程（Copilot / Claude Code）',
    category: 'ai',
    frameworks: ['devex', 'core4'],
    impact: 5,
    effort: 2,
    adoption: 5,
    summary:
      '在 IDE / 终端内用 AI 助手补全、解释、重构、写测试与脚手架，缩短反馈回路、降低样板代码的认知负荷。',
    how: [
      '从样板代码、单测、正则、脚本等低风险场景切入',
      '约定「人审 AI 写」：AI 出草稿，人对质量与安全负责',
      '沉淀团队提示词 / 规则文件（如 AGENTS.md、CLAUDE.md）',
    ],
    signals: ['前置时间', 'PR 吞吐', '开发者满意度'],
    sources: [
      { label: 'DevEx (ACM Queue, 2023)', url: 'https://queue.acm.org/detail.cfm?id=3595878' },
    ],
  },
  {
    id: 'ai-review',
    title: 'AI 辅助代码评审与摘要',
    category: 'ai',
    frameworks: ['space', 'devex'],
    impact: 4,
    effort: 2,
    adoption: 4,
    summary:
      '用 AI 生成 PR 摘要、风险提示、测试建议，减少评审者的上下文重建成本，缩短评审等待。',
    how: [
      'AI 先做一遍「机械检查」（风格、空指针、边界）',
      '人聚焦设计、可维护性与业务正确性',
      '把 AI 评审作为辅助而非守门人，避免误判阻塞',
    ],
    signals: ['评审时长', '沟通维度（SPACE）'],
    sources: [
      { label: 'SPACE (ACM Queue, 2021)', url: 'https://queue.acm.org/detail.cfm?id=3454124' },
    ],
  },

  // —— 持续交付 ——
  {
    id: 'cicd',
    title: '持续集成 / 持续交付（CI/CD）',
    category: 'cd',
    frameworks: ['dora'],
    impact: 5,
    effort: 3,
    adoption: 5,
    summary:
      '每次提交自动构建、测试、打包并可一键发布。是 DORA 高频部署与短前置时间的基础设施。',
    how: [
      '主干每次提交触发自动构建 + 测试',
      '构建产物一次构建、多环境复用',
      '把「发布」做成低风险、可重复、可回滚的按钮',
    ],
    signals: ['部署频率', '变更前置时间'],
    sources: [{ label: 'DORA Capabilities', url: 'https://dora.dev/capabilities/' }],
  },
  {
    id: 'tbd',
    title: '主干开发（Trunk-Based Development）',
    category: 'cd',
    frameworks: ['dora'],
    impact: 4,
    effort: 3,
    adoption: 4,
    summary:
      '短生命周期分支、频繁合回主干，避免长期分支与「合并地狱」，是高频集成与交付的前提。',
    how: [
      '分支存活以小时/天计，尽快合回',
      '用功能开关（feature flag）隐藏未完成功能',
      '主干始终保持可发布状态',
    ],
    signals: ['变更前置时间', '变更失败率'],
    sources: [{ label: 'trunkbaseddevelopment.com', url: 'https://trunkbaseddevelopment.com/' }],
  },
  {
    id: 'flags',
    title: '功能开关与渐进发布',
    category: 'cd',
    frameworks: ['dora'],
    impact: 4,
    effort: 3,
    adoption: 4,
    summary:
      '用开关把「部署」与「发布」解耦，配合金丝雀 / 灰度逐步放量，出问题即时关阀，显著降低变更失败影响。',
    how: [
      '新功能默认关闭，按人群/比例逐步放量',
      '关键开关有看板与一键回滚',
      '定期清理过期开关，避免技术债',
    ],
    signals: ['变更失败率', '故障恢复时间'],
    sources: [{ label: 'DORA Capabilities', url: 'https://dora.dev/capabilities/' }],
  },

  // —— 代码与评审 ——
  {
    id: 'small-pr',
    title: '小批量提交 / 小 PR',
    category: 'code',
    frameworks: ['dora', 'devex'],
    impact: 5,
    effort: 1,
    adoption: 4,
    summary:
      '把改动拆小，单个 PR 聚焦一件事。评审更快更准、冲突更少、回滚更易，是最高性价比的提效动作之一。',
    how: [
      '一个 PR 只做一件事，控制在数百行以内',
      '大改动拆成可独立合入的小步',
      '配合主干开发，缩短在途时间',
    ],
    signals: ['评审时长', '变更前置时间', '认知负荷'],
    sources: [
      { label: 'Google Eng Practices', url: 'https://google.github.io/eng-practices/review/' },
    ],
  },
  {
    id: 'review-sla',
    title: '代码评审 SLA 与轮值',
    category: 'code',
    frameworks: ['space', 'devex'],
    impact: 4,
    effort: 2,
    adoption: 3,
    summary:
      '给评审约定响应时限（如 1 工作日内首响），用轮值/自动指派分摊负荷，消除「PR 卡住没人看」的隐性等待。',
    how: [
      '约定首次响应时限并可视化超时 PR',
      '用 CODEOWNERS / 轮值自动指派评审人',
      '小 PR 优先快速通过，避免堆积',
    ],
    signals: ['评审等待', '心流（SPACE Efficiency）'],
    sources: [
      { label: 'Google Eng Practices', url: 'https://google.github.io/eng-practices/review/reviewer/speed.html' },
    ],
  },
  {
    id: 'conv-commits',
    title: '约定式提交 + 语义化版本',
    category: 'code',
    frameworks: ['core4'],
    impact: 3,
    effort: 1,
    adoption: 4,
    summary:
      '统一提交信息格式（feat/fix/...），让变更日志、版本号、发布说明可自动生成，减少手工与沟通成本。',
    how: [
      '采用 Conventional Commits 规范',
      '据提交类型自动推导 SemVer 版本',
      '自动生成 CHANGELOG 与发布说明',
    ],
    signals: ['发布开销', '沟通效率'],
    sources: [
      { label: 'Conventional Commits', url: 'https://www.conventionalcommits.org/' },
      { label: 'Semantic Versioning', url: 'https://semver.org/' },
    ],
  },

  // —— 测试与质量 ——
  {
    id: 'test-pyramid',
    title: '测试金字塔与快测试',
    category: 'quality',
    frameworks: ['devex', 'dora'],
    impact: 5,
    effort: 3,
    adoption: 4,
    summary:
      '以大量快速单测为底、少量端到端为顶。快速可信的测试是短反馈回路的核心，让人敢于频繁改动。',
    how: [
      '底层多写纯函数单测，秒级反馈',
      '中层契约/集成测试，顶层少量 E2E',
      '消灭 flaky 测试，保住测试可信度',
    ],
    signals: ['反馈回路', '变更失败率'],
    sources: [
      { label: 'DevEx (ACM Queue, 2023)', url: 'https://queue.acm.org/detail.cfm?id=3595878' },
    ],
  },
  {
    id: 'shift-left',
    title: '质量左移（静态检查 / pre-commit）',
    category: 'quality',
    frameworks: ['dora', 'devex'],
    impact: 4,
    effort: 2,
    adoption: 4,
    summary:
      '把格式化、Lint、类型检查、密钥扫描放到提交前与 CI 早期，问题越早暴露修复越便宜。',
    how: [
      'pre-commit / CI 跑格式化 + Lint + 类型检查',
      '集成 SAST 与密钥扫描，安全左移',
      '保持检查快速，避免拖慢提交',
    ],
    signals: ['变更失败率', '反馈回路'],
    sources: [{ label: 'DORA Capabilities', url: 'https://dora.dev/capabilities/' }],
  },
  {
    id: 'dora-cfr',
    title: '可回滚 + 演练故障恢复',
    category: 'quality',
    frameworks: ['dora'],
    impact: 4,
    effort: 3,
    adoption: 3,
    summary:
      '把回滚做成一等公民并定期演练，直接改善 DORA 的「故障恢复时间」与稳定性表现。',
    how: [
      '每次发布都准备好回滚路径',
      '定期做故障演练 / Game Day',
      '建立清晰的告警与值班 Runbook',
    ],
    signals: ['故障恢复时间', '变更失败率'],
    sources: [{ label: 'DORA Capabilities', url: 'https://dora.dev/capabilities/' }],
  },

  // —— 平台工程 ——
  {
    id: 'golden-path',
    title: '黄金路径（Golden Path）脚手架',
    category: 'platform',
    frameworks: ['platform', 'topologies'],
    impact: 5,
    effort: 4,
    adoption: 4,
    summary:
      '为常见项目类型提供有主见、默认正确（含 CI、监控、合规）的模板，一条命令拉起新服务，砍掉从零搭建的重复劳动。',
    how: [
      '把最佳实践固化成可生成的模板',
      '默认内置 CI/CD、可观测、安全基线',
      '当作内部产品迭代，收集开发者反馈',
    ],
    signals: ['新服务启动时间', '认知负荷'],
    sources: [
      { label: 'CNCF Platforms White Paper', url: 'https://tag-app-delivery.cncf.io/whitepapers/platforms/' },
    ],
  },
  {
    id: 'idp-portal',
    title: '内部开发者门户（Backstage 等）',
    category: 'platform',
    frameworks: ['platform'],
    impact: 4,
    effort: 4,
    adoption: 3,
    summary:
      '用统一门户做服务目录、软件模板、技术文档与自助操作入口，减少「东西在哪、归谁、怎么用」的找寻成本。',
    how: [
      '建立服务目录与所有权（ownership）',
      '集成软件模板与技术文档（TechDocs）',
      '把常用自助操作收进门户',
    ],
    signals: ['认知负荷', '上手时间'],
    sources: [{ label: 'Backstage', url: 'https://backstage.io/' }],
  },
  {
    id: 'twelve-factor',
    title: '十二要素 / 云原生应用规范',
    category: 'platform',
    frameworks: ['platform'],
    impact: 3,
    effort: 3,
    adoption: 4,
    summary:
      '用十二要素约束配置、依赖、进程与日志，让应用在任意环境一致运行，降低环境差异带来的排障成本。',
    how: [
      '配置走环境变量、依赖显式声明',
      '进程无状态、可水平扩展',
      '日志当事件流，交由平台收集',
    ],
    signals: ['环境一致性', '排障成本'],
    sources: [{ label: 'The Twelve-Factor App', url: 'https://12factor.net/' }],
  },

  // —— 协作与流程 ——
  {
    id: 'wip-limit',
    title: '限制在制品（WIP）与拉式流',
    category: 'flow',
    frameworks: ['space', 'topologies'],
    impact: 4,
    effort: 2,
    adoption: 3,
    summary:
      '限制同时进行的任务数，减少上下文切换与排队，让价值流更顺、前置时间更短（看板/精益核心）。',
    how: [
      '为每个流程阶段设置 WIP 上限',
      '优先把在途的事做完再开新坑',
      '可视化瓶颈，针对阻塞点改进',
    ],
    signals: ['前置时间', '心流', '上下文切换'],
    sources: [
      { label: 'SPACE (ACM Queue, 2021)', url: 'https://queue.acm.org/detail.cfm?id=3454124' },
    ],
  },
  {
    id: 'team-cognitive',
    title: '按认知负荷划分团队边界',
    category: 'flow',
    frameworks: ['topologies'],
    impact: 4,
    effort: 4,
    adoption: 3,
    summary:
      '让流式团队端到端拥有有限范围、把复杂度交给平台/赋能团队，降低单团队认知负荷以提速。',
    how: [
      '按价值流而非技术分层组建团队',
      '复杂子系统封装、平台能力自助化',
      '用赋能团队补能力短板而非接管',
    ],
    signals: ['认知负荷', '团队自治度'],
    sources: [{ label: 'Team Topologies', url: 'https://teamtopologies.com/' }],
  },
  {
    id: 'docs-async',
    title: '异步沟通 + 文档优先',
    category: 'flow',
    frameworks: ['devex', 'space'],
    impact: 4,
    effort: 2,
    adoption: 4,
    summary:
      '用设计文档、ADR、README 沉淀决策，异步沟通替代频繁会议，保护专注时段、让知识可检索。',
    how: [
      '重要决策写 ADR / 设计文档留痕',
      '设「无会议时段」保护心流',
      '默认公开、可搜索的知识库',
    ],
    signals: ['心流', '会议占比', '上手时间'],
    sources: [
      { label: 'DevEx (ACM Queue, 2023)', url: 'https://queue.acm.org/detail.cfm?id=3595878' },
    ],
  },

  // —— 度量与反馈 ——
  {
    id: 'four-keys',
    title: '度量 DORA 四项指标',
    category: 'metrics',
    frameworks: ['dora', 'core4'],
    impact: 5,
    effort: 3,
    adoption: 4,
    summary:
      '持续采集部署频率、前置时间、变更失败率、恢复时间，建立改进基线并对标 Elite/High/Medium/Low。',
    how: [
      '从流水线与事件系统自动采集四指标',
      '看趋势而非单点，团队级而非个人级',
      '与回顾结合，定位瓶颈再改进',
    ],
    signals: ['四项 DORA 指标'],
    sources: [{ label: 'Google Four Keys', url: 'https://github.com/dora-team/fourkeys' }],
  },
  {
    id: 'space-mix',
    title: '混合主客观度量（SPACE）',
    category: 'metrics',
    frameworks: ['space', 'core4'],
    impact: 4,
    effort: 3,
    adoption: 3,
    summary:
      '别只盯产出指标。把开发者体验调研（主观）与系统数据（客观）结合，避免单指标博弈与「指标即目标」陷阱。',
    how: [
      '定期做开发者体验问卷（DXI 等）',
      '客观数据 + 主观感受交叉验证',
      '永远不要用单一指标考核个人',
    ],
    signals: ['满意度', '有效性指数', '稳定性'],
    sources: [
      { label: 'SPACE (ACM Queue, 2021)', url: 'https://queue.acm.org/detail.cfm?id=3454124' },
    ],
  },
  {
    id: 'observability',
    title: '可观测性（OpenTelemetry）',
    category: 'metrics',
    frameworks: ['dora'],
    impact: 4,
    effort: 3,
    adoption: 4,
    summary:
      '用统一的指标/日志/链路追踪标准快速定位问题，缩短故障恢复时间，也为效能度量提供可信数据源。',
    how: [
      '采用 OpenTelemetry 统一埋点标准',
      '建立关键路径的链路追踪与告警',
      '把 SLO/SLI 作为发布与告警依据',
    ],
    signals: ['故障恢复时间', '排障效率'],
    sources: [{ label: 'OpenTelemetry', url: 'https://opentelemetry.io/' }],
  },

  // —— 开发者体验 ——
  {
    id: 'fast-onboard',
    title: '一键环境 / 十分钟上手',
    category: 'devex',
    frameworks: ['devex', 'platform'],
    impact: 5,
    effort: 3,
    adoption: 4,
    summary:
      '用容器化/Dev Container/脚本把本地环境做成一键拉起，让新人当天就能跑通并提交第一个改动。',
    how: [
      '一条命令拉起可运行的开发环境',
      '把环境定义进代码（Dev Container 等）',
      '以「首次提交耗时」衡量上手体验',
    ],
    signals: ['上手时间', '认知负荷', '满意度'],
    sources: [
      { label: 'DevEx (ACM Queue, 2023)', url: 'https://queue.acm.org/detail.cfm?id=3595878' },
    ],
  },
  {
    id: 'fast-build',
    title: '快构建 / 增量与远端缓存',
    category: 'devex',
    frameworks: ['devex'],
    impact: 4,
    effort: 3,
    adoption: 3,
    summary:
      '本地与 CI 构建越快，反馈回路越短。用增量构建、远端缓存、并行化把分钟级压到秒级。',
    how: [
      '增量构建 + 远端构建缓存复用',
      '测试并行化与按影响面选测',
      '盯住「P75 构建时长」持续优化',
    ],
    signals: ['反馈回路', '心流'],
    sources: [
      { label: 'DevEx (ACM Queue, 2023)', url: 'https://queue.acm.org/detail.cfm?id=3595878' },
    ],
  },
  {
    id: 'flow-protect',
    title: '保护心流（减少中断与会议）',
    category: 'devex',
    frameworks: ['devex', 'space'],
    impact: 4,
    effort: 1,
    adoption: 3,
    summary:
      '把零散中断、临时会议、频繁切换降到最低，给出大块完整的专注时间——心流是高产出的前提。',
    how: [
      '设无会议日/免打扰时段',
      '合并通知、批处理打断',
      '减少同时在手的任务数（配合 WIP）',
    ],
    signals: ['心流', '满意度', '上下文切换'],
    sources: [
      { label: 'DevEx (ACM Queue, 2023)', url: 'https://queue.acm.org/detail.cfm?id=3595878' },
    ],
  },

  // —— 补充批次 ——
  {
    id: 'ai-agents',
    title: 'AI 智能体工作流（Agentic）',
    category: 'ai',
    frameworks: ['devex', 'core4'],
    impact: 4,
    effort: 3,
    adoption: 3,
    summary:
      '让 AI 智能体按计划自主执行多步任务（查代码 → 改 → 跑测试 → 修），把重复的工程流程自动化，但保留人类对结果的把关。',
    how: [
      '从边界清晰、可验证的任务起步（迁移、批量重构）',
      '给智能体可用的工具与明确的成功判据（测试通过）',
      '保留人审与回滚，复杂任务才上多步自治',
    ],
    signals: ['前置时间', '重复劳动占比'],
    sources: [
      { label: 'Anthropic · Building effective agents', url: 'https://www.anthropic.com/research/building-effective-agents' },
    ],
  },
  {
    id: 'iac',
    title: '基础设施即代码（IaC）',
    category: 'platform',
    frameworks: ['dora', 'platform'],
    impact: 4,
    effort: 3,
    adoption: 4,
    summary:
      '用版本化的声明式代码描述并创建基础设施，让环境可复制、可评审、可回滚，消除「雪花服务器」与手工漂移。',
    how: [
      '基础设施定义进仓库、走评审与 CI',
      '环境从代码一键重建，禁止手工改线上',
      '配合策略检查，默认安全合规',
    ],
    signals: ['环境一致性', '变更前置时间'],
    sources: [
      { label: 'DORA · Infrastructure as code', url: 'https://dora.dev/capabilities/infrastructure-as-code/' },
    ],
  },
  {
    id: 'db-migration',
    title: '数据库变更管理',
    category: 'cd',
    frameworks: ['dora'],
    impact: 3,
    effort: 3,
    adoption: 3,
    summary:
      '把数据库 schema 变更纳入版本控制与自动化迁移，与应用一起评审、发布、回滚，避免数据库成为交付瓶颈与事故源。',
    how: [
      '迁移脚本进仓库、随流水线自动执行',
      '变更向后兼容、可分步上线（扩展-收缩）',
      '与功能开关配合，解耦发布与切换',
    ],
    signals: ['变更前置时间', '变更失败率'],
    sources: [
      { label: 'DORA · Database change management', url: 'https://dora.dev/capabilities/database-change-management/' },
    ],
  },
  {
    id: 'tdd',
    title: '测试驱动开发（TDD）',
    category: 'quality',
    frameworks: ['devex', 'dora'],
    impact: 4,
    effort: 3,
    adoption: 3,
    summary:
      '先写失败测试再写实现，用「红-绿-重构」小步推进。逼出可测试的设计，并形成快速回归网，缩短反馈回路。',
    how: [
      '红：先写一个会失败的测试',
      '绿：写最小实现让它通过',
      '重构：在测试保护下清理设计',
    ],
    signals: ['反馈回路', '缺陷率'],
    sources: [
      { label: 'Martin Fowler · TestDrivenDevelopment', url: 'https://martinfowler.com/bliki/TestDrivenDevelopment.html' },
    ],
  },
  {
    id: 'contract-testing',
    title: '契约测试（Consumer-Driven Contracts）',
    category: 'quality',
    frameworks: ['dora'],
    impact: 4,
    effort: 3,
    adoption: 3,
    summary:
      '微服务间用「消费者驱动契约」替代脆弱的端到端测试：各服务可独立验证接口兼容性，支持独立部署与高频交付。',
    how: [
      '消费者定义期望、生成契约',
      '提供方在 CI 中校验是否满足契约',
      '契约变更可见、破坏性变更提前拦截',
    ],
    signals: ['部署独立性', '变更失败率'],
    sources: [{ label: 'Pact · Contract Testing', url: 'https://docs.pact.io/' }],
  },
  {
    id: 'chaos',
    title: '混沌工程',
    category: 'quality',
    frameworks: ['dora'],
    impact: 3,
    effort: 4,
    adoption: 2,
    summary:
      '主动向系统注入故障，在可控范围内验证韧性、提前发现脆弱点，提升对线上稳定与快速恢复的信心。',
    how: [
      '先定义稳态指标与爆炸半径',
      '在生产/类生产小范围注入故障并观测',
      '把发现的弱点转成改进与演练',
    ],
    signals: ['故障恢复时间', '可用性'],
    sources: [{ label: 'Principles of Chaos Engineering', url: 'https://principlesofchaos.org/' }],
  },
  {
    id: 'slo',
    title: 'SLO 与错误预算',
    category: 'metrics',
    frameworks: ['dora'],
    impact: 4,
    effort: 3,
    adoption: 3,
    summary:
      '用服务等级目标（SLO）量化可靠性，用「错误预算」平衡发布速度与稳定：预算充足就大胆发，烧光就先补稳定性。',
    how: [
      '为关键用户旅程定义 SLI 与 SLO',
      '用错误预算决定发布节奏与冻结',
      'SLO 破线触发告警与复盘',
    ],
    signals: ['可用性', '变更失败率'],
    sources: [
      { label: 'Google SRE · Service Level Objectives', url: 'https://sre.google/sre-book/service-level-objectives/' },
    ],
  },
  {
    id: 'blameless',
    title: '无指责复盘 / 生成式文化',
    category: 'flow',
    frameworks: ['dora', 'space'],
    impact: 5,
    effort: 2,
    adoption: 3,
    summary:
      '事故后聚焦系统与流程而非追责个人。研究表明：Westrum「生成式」文化与高交付表现强相关，是诸多能力得以落地的土壤。',
    how: [
      '复盘对事不对人，产出可执行改进项',
      '鼓励上报坏消息、共享失败学习',
      '管理层示范心理安全',
    ],
    signals: ['满意度', '故障恢复时间', '学习速度'],
    sources: [
      { label: 'DORA · Generative culture', url: 'https://dora.dev/capabilities/generative-organizational-culture/' },
    ],
  },
  {
    id: 'policy-as-code',
    title: '策略即代码 / 默认合规',
    category: 'platform',
    frameworks: ['platform', 'dora'],
    impact: 3,
    effort: 3,
    adoption: 3,
    summary:
      '把安全、合规、成本等护栏写成可执行策略，在流水线与平台层自动校验，让「正确的事」成为默认、低摩擦的路径。',
    how: [
      '用策略引擎（如 OPA）在 CI/准入处校验',
      '违规即时反馈、给出修复建议',
      '护栏内置进黄金路径，开发者无感合规',
    ],
    signals: ['合规通过率', '认知负荷'],
    sources: [{ label: 'Open Policy Agent', url: 'https://www.openpolicyagent.org/' }],
  },
  {
    id: 'dep-automation',
    title: '依赖自动升级与软件供应链安全',
    category: 'quality',
    frameworks: ['dora', 'devex'],
    impact: 3,
    effort: 2,
    adoption: 4,
    summary:
      '自动检测并升级有漏洞/过期的依赖（Dependabot / Renovate），用小步频繁升级替代「一年一次大升级」的高风险积压。',
    how: [
      '开启自动依赖更新 PR 并配 CI 验证',
      '小步频繁合入，控制单次升级风险',
      '结合 SBOM 与漏洞扫描守供应链',
    ],
    signals: ['漏洞暴露时长', '升级成本'],
    sources: [
      { label: 'GitHub · Dependabot', url: 'https://docs.github.com/code-security/dependabot' },
    ],
  },
  {
    id: 'docs-as-code',
    title: '文档即代码（Docs as Code）',
    category: 'devex',
    frameworks: ['devex'],
    impact: 3,
    effort: 2,
    adoption: 3,
    summary:
      '用写代码的工具链管理文档：版本控制、评审、CI 发布、就近放在仓库里。降低查找与维护成本，文档不再过期。',
    how: [
      '文档与代码同仓、随 PR 一起评审',
      '用 CI 校验链接/构建并自动发布',
      '把「改代码顺手改文档」变成习惯',
    ],
    signals: ['上手时间', '认知负荷'],
    sources: [
      { label: 'Write the Docs · Docs as Code', url: 'https://www.writethedocs.org/guide/docs-as-code/' },
    ],
  },
];

// ── DORA 自评：指标分级（业界 State of DevOps 通用口径） ──────────────
// 每个指标 4 档，索引 0=Elite，1=High，2=Medium，3=Low（越小越好）。
export const DORA_METRICS = [
  {
    key: 'deploy',
    name: '部署频率',
    hint: '多久能把变更上线一次',
    levels: ['按需 · 多次/天', '每天 ~ 每周', '每周 ~ 每月', '每月以下'],
  },
  {
    key: 'lead',
    name: '变更前置时间',
    hint: '从提交到上线运行的时长',
    levels: ['少于 1 天', '1 天 ~ 1 周', '1 周 ~ 1 月', '超过 1 月'],
  },
  {
    key: 'cfr',
    name: '变更失败率',
    hint: '上线需补救的变更占比',
    levels: ['0 – 15%', '16 – 30%', '31 – 45%', '45% 以上'],
  },
  {
    key: 'mttr',
    name: '故障恢复时间',
    hint: '服务受损到恢复的时长',
    levels: ['少于 1 小时', '少于 1 天', '1 天 ~ 1 周', '超过 1 周'],
  },
];

// ── 采纳状态（团队对每条范式的落地进度，存本地浏览器） ──────────────
export const ADOPTION_STATUS = [
  { id: 'todo', name: '未开始', color: '#B0AFA5' },
  { id: 'doing', name: '进行中', color: '#BE9356' },
  { id: 'done', name: '已落地', color: '#6E9079' },
];

export const DORA_LEVELS = [
  { name: 'Elite', cn: '精英', color: '#6E9079', desc: '吞吐与稳定兼得，处于业界第一梯队。' },
  { name: 'High', cn: '高效', color: '#CC785C', desc: '表现优秀，已具备高频可靠交付能力。' },
  { name: 'Medium', cn: '中等', color: '#BE9356', desc: '有明显改进空间，可挑一两个瓶颈先动。' },
  { name: 'Low', cn: '偏低', color: '#BC6055', desc: '建议从 CI/CD 与小批量交付等基础能力补起。' },
];
