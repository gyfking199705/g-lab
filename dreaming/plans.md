# 计划 · plans

> 从 [`dreams.md`](dreams.md) 里筛出来的**真实可行**的计划，带步骤、验收与状态。
> 进了这里才代表「评估过、真打算做」。状态: proposed | active | done | dropped。
> 用 `node scripts/dream.mjs plan ...` 新增，`plan --update P-n --status active` 推进。

---

## P-1 · git 钩子让机制必然触发（post-commit 提醒 + pre-commit 拦截）
- 状态: done
- 作者: claude
- 来源脑爆: D-1
- 可行性: 纯本地 shell hook，零依赖；提醒不阻断、拦截可绕过，不破坏正常提交流程
- 步骤:
  1. 新增 `scripts/hooks/post-commit`（提交后预填 `capture` 命令提醒）✓
  2. 新增 `scripts/hooks/pre-commit`（上一个代码提交没记素材就挡住下一次）✓
  3. `dream.mjs enable-hooks` 一键启用；`.claude/settings.json` SessionStart 让 Claude 会话自动启用 ✓
  4. AGENTS.md / AGENTS.en.md / dreaming/README.md 补充启用与绕过说明 ✓
- 验收: 启用后忘记记素材会被 pre-commit 挡住、提交后有 post-commit 提醒；隔离副本已验证纪律流零摩擦、遗忘流可拦截可恢复

## P-2 · demo 加「审批模式」三档，演示分级放权
- 状态: done
- 作者: claude
- 来源脑爆: D-2
- 可行性: 纯前端可做：engine 已产出工具事件流，只需在工具事件前插入审批停顿/确认 UI；分级放权是四家共性核心，值得在 demo 里可感知
- 步骤:
  1. engine 增加 approvalMode 概念与「需审批的工具」判定（纯函数 + 单测）
  2. Console 在工具事件前按模式插入「批准/拒绝」交互或自动放行
  3. 标题栏/状态栏加模式切换（suggest/auto-edit/full-auto），离线即可体验
- 验收: 切到 suggest 每个工具调用前都要确认；full-auto 全自动连跑；行为与研究面板「分级放权」对得上

## P-3 · swarm 加入验证—返工闭环
- 状态: done
- 作者: claude
- 可行性: 当前管线是线性的：评审员只输出意见、不触发返工。generator-critic 迭代是业界最被验证的质量机制（RESEARCH §4.3），是当前最大功能缺口
- 步骤:
  1. orchestrator 加 parseVerdict/解析评审验收 + reworkSpecs/injectRework（纯函数）
  2. engine 在调度循环里：评审未通过且未超轮次→注入「执行者返工+复评」，汇总者改依赖最新复评
  3. mockRun 让评审首轮不通过、复评通过，离线即可演示闭环
  4. 补单测（parseVerdict/injectRework/有限轮次终止）+ 重打包
- 验收: 离线跑一个需求能看到：评审未通过→返工波次→复评通过→汇总；最多 2 轮即终止；node --test 全绿

## P-4 · swarm 真实 LLM 流式输出 + BYOK 实跑链路
- 状态: done
- 作者: claude
- 可行性: BYOK 代码已具备但未做流式、产出一次性返回，体验差且未验证；流式是真实 agent 工作区的标配（Anthropic/OpenAI SSE）
- 步骤:
  1. ai.js 加 callChatStream + 纯函数 extractDelta(provider) + streamSSE(可单测)
  2. engine runTask 支持 onToken：流式时把分片实时写进对应 task.output 并 onUpdate
  3. App TaskCard 在 running 且有 output 时实时显示流式文本（带光标）
  4. 补单测：extractDelta(anthropic/openai/[DONE]) + streamSSE 用 ReadableStream 喂分片；重打包
- 验收: node --test 全绿（含流式解析）；离线流程不受影响；填 Key 后产出逐字出现
