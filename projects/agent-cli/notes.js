/**
 * 业界 agentic CLI「玩法」调研数据（纯数据，供研究面板渲染）
 * ------------------------------------------------------------------
 * 对比 Claude Code / OpenAI Codex CLI / Google Gemini CLI 的交互方式。
 * 结论与要点均附来源（见 SOURCES），便于核对；写于 2026-06，接口/命名可能随版本变化。
 */

/** 三家命令行 coding agent 的交互模型对比。 */
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
      ['配置', 'config.toml；自 v0.128 起暴露 tui.* 命名空间（键位/高亮/状态行/终端标题）'],
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
      ['可扩展', 'MCP：注册后其工具与内置工具同等被循环调用'],
      ['开放性', 'Apache-2.0 开源、可免费起步'],
    ],
    sources: [5, 6],
  },
];

/** 跨产品反复出现的「共性交互设计模式」——也是本 demo 复刻的对象。 */
export const PATTERNS = [
  ['REPL 工具循环', '不是一问一答，而是「想 → 调工具 → 看结果 → 再想」的多步循环，直到完成或需要你。'],
  ['流式呈现', '思考、工具调用、命令输出、回答都边产生边显示，过程可见、可随时打断（Esc/Ctrl+C）。'],
  ['工具调用卡', '把每次 Read/Edit/Bash 渲染成「标题 + 结果」的小卡，改动配行级 diff，可读可审计。'],
  ['斜杠命令', '/ 前缀的命令面板（/help /clear /model …）+ 自动补全，把会话级操作与自然语言分开。'],
  ['分级放权', '从「每步审批」到「自动改文件」到「全自动」，配合沙箱/只读边界，在安全与效率间取舍。'],
  ['计划模式', '先只读勘察、产出方案、不动代码（Claude 的 plan / 通用的 dry-run），确认后再执行。'],
  ['项目记忆', '用一份仓库内的 Markdown（CLAUDE.md / AGENTS.md）承载项目约定、命令与风格，跨会话复用。'],
  ['MCP 扩展', '用 Model Context Protocol 把外部工具/数据接进来，与内置工具同等被 agent 调用。'],
];

/** 来源（CLIS / PATTERNS 里的 sources 下标指向这里）。 */
export const SOURCES = [
  { label: 'Claude Code · Permission modes（官方文档）', url: 'https://code.claude.com/docs/en/permission-modes' },
  { label: 'Anthropic · How we built Claude Code auto mode', url: 'https://www.anthropic.com/engineering/claude-code-auto-mode' },
  { label: 'OpenAI · Codex agent approvals & security', url: 'https://developers.openai.com/codex/agent-approvals-security' },
  { label: 'OpenAI · Codex sandboxing', url: 'https://developers.openai.com/codex/concepts/sandboxing' },
  { label: 'OpenAI · Codex CLI slash commands', url: 'https://developers.openai.com/codex/cli/slash-commands' },
  { label: 'Google · Gemini CLI（GitHub）', url: 'https://github.com/google-gemini/gemini-cli' },
  { label: 'Google · Introducing Gemini CLI（官方博客）', url: 'https://blog.google/innovation-and-ai/technology/developers-tools/introducing-gemini-cli-open-source-ai-agent/' },
];
