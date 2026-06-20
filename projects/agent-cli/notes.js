/**
 * 业界 agentic CLI「玩法」调研数据（纯数据，供研究面板渲染）
 * ------------------------------------------------------------------
 * 对比 Claude Code / OpenAI Codex CLI / Google Gemini CLI / Aider 的交互方式：
 *   - CLIS    每家一张卡：循环模型 + 放权/审批/沙箱 + 斜杠命令 + 记忆 + 扩展
 *   - MATRIX  维度 × 四家 的速查矩阵
 *   - PATTERNS 跨产品反复出现的共性交互设计模式
 *   - SOURCES 来源（CLIS / MATRIX 的 sources 下标指向这里）
 * 结论均附来源，便于核对；写于 2026-06，接口/命名可能随版本变化，以官方文档为准。
 */

/** 命令行 coding agent 的交互模型对比（每家一张卡）。 */
export const CLIS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    vendor: 'Anthropic',
    glyph: '✻',
    tagline: '以「许可模式」分级放权的 agentic 终端',
    loop: 'agentic 工具循环：读文件 → 编辑 → 跑命令，按需停下来征求许可',
    rows: [
      ['权限模式', 'default（读放行、写/执行前询问）· acceptEdits（自动应用编辑，含 mkdir/mv/rm 等常见 fs 命令）· plan（只研究提方案、不改文件不执行）· bypassPermissions（全放行，危险）'],
      ['模式切换', 'Shift+Tab 在 normal → acceptEdits → plan 间循环；plan 也可用 /plan 单条触发'],
      ['斜杠命令', '/help /clear /model /init /agents /mcp 等；支持自定义命令'],
      ['项目记忆', 'CLAUDE.md（/init 可生成；放项目约定、命令、风格）'],
      ['可扩展', 'MCP 接外部工具/数据 · hooks 生命周期钩子 · subagents 子代理'],
    ],
    sources: [0, 1],
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    vendor: 'OpenAI',
    glyph: '◇',
    tagline: '「审批模式 × 沙箱」两条正交的安全旋钮',
    loop: '工具循环 + 沙箱执行：在沙箱边界内读写/跑命令，越界才提权',
    rows: [
      ['审批模式', 'Suggest（默认、最严，每步都要批准）· Auto-Edit（自动改文件、命令仍需批准）· Full-Auto（命令也不确认，仅限隔离环境）'],
      ['沙箱', 'read-only · workspace-write（默认，限工作区内文件+常规命令）· danger-full-access（去掉文件/网络边界）'],
      ['斜杠命令', '/clear（或 Ctrl+L 仅清屏）/model /theme（带实时预览）/keymap /doctor /profiles'],
      ['配置/记忆', 'AGENTS.md（项目约定）+ config.toml；自 v0.128 起暴露 tui.* 命名空间'],
      ['可扩展', 'MCP；profiles 切换不同配置组合'],
    ],
    sources: [2, 3, 4],
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    vendor: 'Google',
    glyph: '◆',
    tagline: '开源、显式 ReAct 循环、自带搜索接地',
    loop: 'ReAct 循环：reason（想下一步）→ act（调工具）→ observe（看返回）→ 再 reason，直到完成或需要你',
    rows: [
      ['内置工具', '文件读/写/编辑 · shell（跑测试/装包/git）· web fetch · Google Search 接地（answers 锚定实时结果）'],
      ['交互范式', '不是一次性大答案，而是逐步循环；需要你时才停下'],
      ['项目记忆', 'GEMINI.md（上下文文件，承载项目约定）'],
      ['可扩展', 'MCP：注册后其工具与内置工具同等被循环调用'],
      ['开放性', 'Apache-2.0 开源、可免费起步'],
    ],
    sources: [5, 6],
  },
  {
    id: 'aider',
    name: 'Aider',
    vendor: '开源（Aider-AI）',
    glyph: '◐',
    tagline: 'Git 原生：自动提交 + 仓库地图喂上下文',
    loop: '改文件 → 展示 diff → 自动 git commit（带描述）；用仓库地图给模型全局上下文',
    rows: [
      ['上下文', '仓库地图（repo map：函数签名 + 结构）喂全局；/add /drop 精确控制喂哪些文件（建议每任务 3–5 个）'],
      ['模式', 'architect 模式：一个模型规划、另一个实现；另有 code / ask 等'],
      ['Git 集成', '每次成功改动自动 commit（描述性信息），形成清晰历史；git push 仍由你决定'],
      ['斜杠命令', '/add /drop /architect /diff /undo /run /commit'],
      ['可扩展', '多模型可选；开源、可自托管'],
    ],
    sources: [7, 8],
  },
  {
    id: 'cline',
    name: 'Cline',
    vendor: '开源（IDE 扩展 + CLI）',
    glyph: '◑',
    tagline: 'Plan/Act 双模式 + 每步批准的自治 agent',
    loop: 'Plan（只读、对齐策略）↔ Act（执行，每个文件编辑/命令都要批准）；Tab 切 Plan/Act，Shift+Tab 切自动批准',
    rows: [
      ['双模式', 'Plan 读+推理不改动；Act 才执行；不能自行从 Plan 跳 Act，须你确认（防「AI 改了半个项目」）'],
      ['审批', '每个文件编辑/终端命令都展示 diff/命令并等 Approve/Reject；可一键开「自动批准」放手跑'],
      ['形态', 'VS Code / JetBrains 扩展，另有 Cline CLI 2.0；BYOK 自选模型'],
      ['可扩展', 'MCP；多家模型可选；开源'],
    ],
    sources: [9, 10],
  },
  {
    id: 'continue',
    name: 'Continue',
    vendor: '开源（IDE + cn CLI）',
    glyph: '◒',
    tagline: 'Chat 内置 Agent 模式 + @ 上下文 + / 命令',
    loop: 'Agent 模式与 Chat 同一输入框：模型自行决定调工具/找上下文；@ 提供上下文、/ 触发命令',
    rows: [
      ['Agent 模式', '在 Chat 同一界面让模型用工具完成任务，省去手动找上下文/执行'],
      ['上下文', '@ context providers：打开的文件 / git diff / 终端输出 / 文档 URL 等按需拉取'],
      ['命令', '/ 斜杠命令（含自定义 /review /test 映射到 prompt 模板）；单一 JSON 配置'],
      ['形态/扩展', 'IDE 扩展 + cn CLI；MCP 接外部工具'],
    ],
    sources: [11, 12],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    vendor: 'Anysphere（AI 编辑器 + CLI）',
    glyph: '◭',
    tagline: 'AI 编辑器：Agent/Composer 自治改码',
    loop: 'Agent 模式：读码库 → 改文件 → 跑命令 → 迭代修错，多步自治；Cmd+. 在 Agent/Ask/Manual 间切',
    rows: [
      ['形态', 'AI 代码编辑器（VS Code 衍生）+ cursor-agent CLI + Background Agent'],
      ['模式', 'Chat / Ask / Manual / Agent(Composer)，Agent 为默认'],
      ['交互', '自然语言描述任务 → 自动多步执行（读/改/跑/搜/修错）'],
      ['可扩展', 'MCP；.cursor/rules 项目规则；Background Agent 后台跑'],
    ],
    sources: [13, 14],
  },
  {
    id: 'devin',
    name: 'Devin',
    vendor: 'Cognition（云端自治）',
    glyph: '◮',
    tagline: '云端自治软件工程师：先规划后执行',
    loop: 'agentic 循环：拆解目标 → 读文档 → 改码 → 跑测试 → 分析失败 → 迭代直到收尾；先给计划、人可前置介入（human-in-the-loop）',
    rows: [
      ['形态', '云端沙箱环境（shell + 编辑器 + 浏览器）；Slack / Web 下单，长跨度任务'],
      ['交互', '自然语言下单 → 产出 step-by-step 计划 → 自治执行，进度可 steer'],
      ['计费', '按 ACU（Agent Compute Unit）；Devin 2.0 起 $20 入门'],
      ['定位', 'agent-native IDE：长跨度任务 + 人审'],
    ],
    sources: [15, 16],
  },
];

/** 维度 × 四家 的速查矩阵（cols 与 rows[i][1..] 一一对应）。 */
export const MATRIX = {
  cols: ['Claude Code', 'Codex CLI', 'Gemini CLI', 'Aider', 'Cline', 'Continue', 'Cursor', 'Devin'],
  rows: [
    ['放权 / 审批', 'default/acceptEdits/plan/bypass', 'Suggest/Auto-Edit/Full-Auto', '工具调用按需确认', '展示 diff 后应用', 'Plan/Act + 每步批准（可自动）', 'Agent 模式自行决定', 'Agent 自治（可审阅/回滚）', '先计划→自治执行，人可介入'],
    ['沙箱边界', '权限规则 + 目录范围', 'read-only/workspace-write/full', '本地执行', '本地执行（git 兜底）', '本地执行', '本地 / IDE', '本地 / IDE + Background', '云端沙箱（shell/编辑器/浏览器）'],
    ['上下文 / 记忆', 'CLAUDE.md', 'AGENTS.md + config.toml', 'GEMINI.md', '仓库地图 + /add 选文件', '规则 / 自定义指令', '@ context providers', '@ 符号 + .cursor/rules', '自带环境 + 任务计划'],
    ['计划模式', 'plan mode（Shift+Tab）', '审批即门禁', '逐步 ReAct', 'architect（规划/实现分离）', 'Plan 模式（核心）', 'Agent 自行规划', 'Plan/Agent 迭代', '显式计划→执行（核心）'],
    ['Git 集成', '按权限调用 git', '按权限调用 git', '可调用 git', '自动 commit（核心特性）', '可调用 git', '@ git diff 上下文', '可调用 git', '自动开 PR / 跑 CI'],
    ['扩展', 'MCP / hooks / subagents', 'MCP / profiles', 'MCP + 搜索接地', '多模型；开源自托管', 'MCP；多模型', 'MCP + 自定义命令', 'MCP + Background Agent', '集成 Slack/GitHub/CI'],
    ['开源', '否（商用）', '是（CLI 开源）', '是（Apache-2.0）', '是', '是', '是', '否（商用）', '否（商用）'],
  ],
};

/** 跨产品反复出现的「共性交互设计模式」——也是本 demo 复刻的对象。 */
export const PATTERNS = [
  ['REPL 工具循环', '不是一问一答，而是「想 → 调工具 → 看结果 → 再想」的多步循环，直到完成或需要你。'],
  ['流式呈现', '思考、工具调用、命令输出、回答都边产生边显示，过程可见、可随时打断（Esc/Ctrl+C）。'],
  ['工具调用卡', '把每次 Read/Edit/Bash 渲染成「标题 + 结果」的小卡，改动配行级 diff，可读可审计。'],
  ['斜杠命令', '/ 前缀的命令面板（/help /clear /model …）+ 自动补全，把会话级操作与自然语言分开。'],
  ['分级放权', '从「每步审批」到「自动改文件」到「全自动」，配合沙箱/只读边界，在安全与效率间取舍。'],
  ['计划模式', '先只读勘察、产出方案、不动代码（Claude 的 plan / Aider 的 architect），确认后再执行。'],
  ['项目记忆', '用一份仓库内的 Markdown（CLAUDE.md / AGENTS.md / GEMINI.md）承载约定、命令与风格，跨会话复用。'],
  ['仓库地图 / 检索', '面对大仓库不全量塞上下文，而是用仓库地图 / 检索 / 手动选文件，按需喂相关代码。'],
  ['可回滚', '改动配 diff，并与 git 结合（自动提交 / /undo），出错能回退，鼓励小步快跑。'],
  ['MCP 扩展', '用 Model Context Protocol 把外部工具/数据接进来，与内置工具同等被 agent 调用。'],
];

/** 来源（CLIS / MATRIX 的 sources 下标指向这里）。 */
export const SOURCES = [
  { label: 'Claude Code · Permission modes（官方文档）', url: 'https://code.claude.com/docs/en/permission-modes' },
  { label: 'Anthropic · How we built Claude Code auto mode', url: 'https://www.anthropic.com/engineering/claude-code-auto-mode' },
  { label: 'OpenAI · Codex agent approvals & security', url: 'https://developers.openai.com/codex/agent-approvals-security' },
  { label: 'OpenAI · Codex sandboxing', url: 'https://developers.openai.com/codex/concepts/sandboxing' },
  { label: 'OpenAI · Codex CLI slash commands', url: 'https://developers.openai.com/codex/cli/slash-commands' },
  { label: 'Google · Gemini CLI（GitHub）', url: 'https://github.com/google-gemini/gemini-cli' },
  { label: 'Google · Introducing Gemini CLI（官方博客）', url: 'https://blog.google/innovation-and-ai/technology/developers-tools/introducing-gemini-cli-open-source-ai-agent/' },
  { label: 'Aider · AI pair programming in your terminal（GitHub）', url: 'https://github.com/Aider-AI/aider' },
  { label: 'Aider · Setup, Architect Mode & Git workflow（指南）', url: 'https://www.deployhq.com/guides/aider' },
  { label: 'Cline · Autonomous coding agent（GitHub）', url: 'https://github.com/cline/cline' },
  { label: 'Cline · Plan/Act 与审批（指南）', url: 'https://www.deployhq.com/guides/cline' },
  { label: 'Continue · Agent mode how-it-works（官方文档）', url: 'https://docs.continue.dev/agent/how-to-use-it' },
  { label: 'Continue · CLI（cn）（官方文档）', url: 'https://docs.continue.dev/guides/cli' },
  { label: 'Cursor · AI code editor（官网）', url: 'https://cursor.com/' },
  { label: 'Cursor · Composer / Agent / Background（指南）', url: 'https://www.deployhq.com/guides/cursor' },
  { label: 'Devin · Cognition（官网）', url: 'https://devin.ai/' },
  { label: 'Devin · 自治编码完整指南', url: 'https://www.digitalapplied.com/blog/devin-ai-autonomous-coding-complete-guide' },
];
