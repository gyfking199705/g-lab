/**
 * 学习地图 —— 学习卡片与路径（纯函数 + AI 胶水）
 * ------------------------------------------------------------------
 * 让地图从「记录」变成「能学」：
 *   · pathFor      同分组内的前置/后继知识点 → 面板里的学习路径（可跳转）
 *   · buildStudyPrompt 生成结构化学习卡的 system/user 提示词（AI 直连用）
 *   · copyablePrompt   无 AI Key 时的一键复制版提示词（粘到任意对话 AI）
 *   · generateStudyCard 经 learning/ai.js 的 callChat 生成卡片文本
 *   · renderCardHtml    极简 markdown（## / - / **）→ 安全 HTML
 * 卡片文本存进知识点的 card 字段（随备份/同步走），生成一次永久可看。
 */
import { callChat } from '../learning/ai.js';

/** 同分组内取前置/后继各 N 个（按地图排布顺序 = 编排的学习顺序）。 */
export function pathFor(groups, sel, n = 3) {
  for (const g of groups || []) {
    for (const tr of g.tracks) {
      if (tr.id !== sel.trackId) continue;
      for (const cl of tr.clusters) {
        if (cl.id !== sel.clusterId) continue;
        const i = cl.topics.findIndex((t) => t.id === sel.topicId);
        if (i < 0) return { prev: [], next: [] };
        return {
          prev: cl.topics.slice(Math.max(0, i - n), i),
          next: cl.topics.slice(i + 1, i + 1 + n),
        };
      }
    }
  }
  return { prev: [], next: [] };
}

/** 学习卡提示词（system/user）。迷雾点以解锁问题为靶心。 */
export function buildStudyPrompt(sel, path = { prev: [], next: [] }) {
  const crumb = [sel.domain, sel.trackName, sel.clusterName].filter(Boolean).join(' → ');
  const system = '你是一位极擅长把硬核技术讲透的导师。用简体中文回答，惜字如金但绝不含糊：先给直觉再给严谨，多用具体数字和类比，少用空话。输出用 markdown：小节标题用 ##，要点用 -。';
  let user = `请为下面这个知识点做一张「学习卡」，让我在 10 分钟内建立扎实理解。

知识点：${sel.name}
所属脉络：${crumb || '（独立知识点）'}`;
  if (sel.note) user += `\n我目前的理解：${sel.note}`;
  if (sel.unlock) user += `\n我卡住的问题（请把它作为讲解的靶心，必须正面回答）：${sel.unlock}`;
  if (path.prev.length) user += `\n我已经学过/即将学（前置）：${path.prev.map((t) => t.name).join('、')}`;
  if (path.next.length) user += `\n接下来会学（后继）：${path.next.map((t) => t.name).join('、')}`;
  user += `

请按这个结构输出（总长 500~800 字）：
## 一句话本质
## 直觉与类比
## 核心拆解（3~5 个要点，含关键数字/公式）
${sel.unlock ? '## 解你卡住的问题\n' : ''}## 与前后知识的接缝（它依赖什么、解锁什么）
## 自检三问（能答出即可标记「已掌握」，附简短参考答案）`;
  return { system, user };
}

/** 无 AI 配置时的一键复制提示词（单段纯文本）。 */
export function copyablePrompt(sel, path) {
  const { system, user } = buildStudyPrompt(sel, path);
  return system + '\n\n' + user;
}

/** 生成学习卡（经统一 callChat，支持 anthropic/openai/代理）。 */
export async function generateStudyCard({ config, sel, path, signal }) {
  const { system, user } = buildStudyPrompt(sel, path);
  return callChat({ config, system, user, maxTokens: 1600, signal });
}

/** 极简 markdown → HTML（只支持 ## 标题 / - 列表 / **加粗**；其余转义，安全）。 */
export function renderCardHtml(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const lines = String(md || '').split(/\r?\n/);
  let html = '', inList = false;
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
  for (const ln of lines) {
    const t = ln.trim();
    if (!t) { closeList(); continue; }
    if (/^#{2,3}\s+/.test(t)) { closeList(); html += `<h4>${inline(t.replace(/^#{2,3}\s+/, ''))}</h4>`; continue; }
    if (/^[-*]\s+/.test(t)) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(t.replace(/^[-*]\s+/, ''))}</li>`; continue; }
    closeList();
    html += `<p>${inline(t)}</p>`;
  }
  closeList();
  return html;
}
