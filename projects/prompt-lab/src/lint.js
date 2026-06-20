/**
 * prompt 质量体检（纯函数，便于 `node --test`）
 * ------------------------------------------------------------------
 * 依据业界 prompt 工程最佳实践，对一条 prompt 做启发式检查并打分。
 * 不追求「正确/错误」，而是给出可执行的改进建议，帮助对齐业界标准。
 */

/** 单项检查工厂。 */
function mk(id, label, pass, tip) {
  return { id, label, pass: !!pass, tip };
}

/**
 * 体检一条 prompt，返回 { checks[], passed, total, score, grade }。
 * @param {object} p 规整后的 prompt 记录
 */
export function lintPrompt(p = {}) {
  const content = typeof p.content === 'string' ? p.content : '';
  const system = typeof p.system === 'string' ? p.system : '';
  const techniques = Array.isArray(p.techniques) ? p.techniques : [];
  const both = `${system}\n${content}`;

  const hasRole = !!system.trim() || /你是|您是|you are|act as|担任|扮演|作为一名|as an? /i.test(content);
  const clearTask = content.trim().length >= 24;
  const hasFormat =
    techniques.includes('structured-output') ||
    techniques.includes('xml-tags') ||
    /格式|json|列表|表格|markdown|<[a-z][\w-]*>|标签|字段|schema|每条|逐条|小节|步骤/i.test(content);
  const hasGuardrails =
    techniques.includes('guardrails') ||
    /不要编造|不得|不应|仅(依据|根据|基于)|只(依据|根据|输出|返回)|未提及|不知道|如(条件|信息|资料)不足|don['’]?t (make|invent|assume)|do not|only (use|answer)/i.test(
      both
    );
  const hasExamples =
    techniques.includes('few-shot') ||
    !!(p.exampleInput || '').trim() ||
    !!(p.exampleOutput || '').trim() ||
    /例如|示例|举例|example|输入：|输出：/i.test(content);
  const hasVariables = Array.isArray(p.variables) && p.variables.length > 0;
  const discoverable =
    !!(p.summary || '').trim() &&
    (p.category && p.category !== 'other' ? true : (Array.isArray(p.tags) && p.tags.length > 0));

  const checks = [
    mk('role', '明确角色 / System', hasRole, '用 System 或开头一句设定角色与目标（“你是一名…”），输出更稳定一致。'),
    mk('task', '任务指令清晰具体', clearTask, '正文偏短：明确说明要做什么、约束条件与目标，避免含糊。'),
    mk('format', '指定输出格式', hasFormat, '说明期望的输出结构（JSON / 列表 / 小节 / 标签等），便于消费与复现。'),
    mk('guardrails', '抗幻觉 / 边界约束', hasGuardrails, '加入边界，如“仅依据给定资料、不要编造、信息不足就说明”，降低幻觉。'),
    mk('examples', '提供示例（few-shot）', hasExamples, '给 1~2 个输入/输出示例，能显著稳定格式与风格。'),
    mk('variables', '参数化变量便于复用', hasVariables, '把可变部分写成 {{变量}}，便于复用、批量与对照。'),
    mk('discoverable', '可检索（简介 + 分类/标签）', discoverable, '补一句简介并设好分类或标签，方便日后检索与他人理解。'),
  ];

  const passed = checks.filter((c) => c.pass).length;
  const total = checks.length;
  const score = Math.round((passed / total) * 100);
  return { checks, passed, total, score, grade: gradeOf(score) };
}

/** 分数到等级（配合 UI 配色）。 */
export function gradeOf(score) {
  if (score >= 85) return { key: 'A', label: '优秀', tone: 'ok' };
  if (score >= 70) return { key: 'B', label: '良好', tone: 'ok' };
  if (score >= 50) return { key: 'C', label: '及格', tone: 'warn' };
  return { key: 'D', label: '待完善', tone: 'danger' };
}
