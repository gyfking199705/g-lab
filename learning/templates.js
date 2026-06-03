/**
 * 内置学习计划模板库
 * ------------------------------------------------------------------
 * 通用学习平台：主题不限，提供可一键开课的模板；并内置一条示例「AI/ML 学习路径」。
 * 模板是纯数据，可被 scaffoldPlan() 实例化成可编辑、可追踪的学习计划，
 * 也天然适合「分享给别人来学」——导出某个计划即是一份可复用的课程。
 *
 * 每个模板字段：
 *   id, icon, title, subject, level, weeks, hoursPerWeek, summary,
 *   modules: [{ title, lessons: [string | {title, note}] }]
 */

export const TEMPLATES = [
  {
    id: 'tpl-top-talent',
    icon: '🏆',
    title: '顶尖技术人才 · 全方位提升计划',
    subject: '综合成长',
    level: '进阶到精通',
    weeks: 52,
    hoursPerWeek: 12,
    summary:
      '面向「顶尖软件/技术人才」的一年期全方位成长路线：硬核技术内功 + 系统设计 + AI 时代杠杆 + 工程卓越 + 沟通影响力 + 领导力与职业发展 + 精力与身心管理 + 持续精进的元能力。建议每季度复盘一次，与本应用的健身/财富/番茄/间隔复习联动使用。',
    modules: [
      {
        title: '① 计算机基础内功',
        lessons: [
          { title: '操作系统：进程/线程、内存、调度、IO', note: '理解程序真正如何运行，是性能与并发的根' },
          { title: '计算机网络：TCP/IP、HTTP(S)、TLS、DNS', note: '能讲清一次请求从输入网址到返回的全过程' },
          { title: '数据库原理：索引(B+树)、事务、隔离级别、锁', note: '面试与实战双高频' },
          { title: '主力语言的执行模型：内存/GC/并发原语' },
          { title: '常被忽视的基础：编码、时间与时区、浮点、字符集' },
        ],
      },
      {
        title: '② 算法与问题解决',
        lessons: [
          { title: '核心数据结构与复杂度分析' },
          { title: '算法范式：分治 / 贪心 / 动态规划 / 图', note: '重在识别「这题属于哪一类」' },
          { title: '系统性刷题与模式归纳（如 NeetCode 150）' },
          { title: '白板/口述解题框架：澄清→举例→暴力→优化→编码→测试' },
        ],
      },
      {
        title: '③ 编程精进与工程卓越',
        lessons: [
          { title: '精通一门主力语言（深入机制与惯用法）' },
          { title: '整洁代码：命名、函数、抽象、注释的取舍' },
          { title: '测试：单元/集成/端到端，可测性与覆盖率' },
          { title: '重构与「代码味道」识别' },
          { title: '调试与性能剖析（profiler / 火焰图）' },
          { title: 'Git 进阶：分支策略、rebase、协作流' },
        ],
      },
      {
        title: '④ 系统设计与架构',
        lessons: [
          { title: '可扩展性基础：负载均衡、缓存、分库分表' },
          { title: '分布式核心：CAP、一致性、共识、幂等', note: '高级工程师的分水岭' },
          { title: '消息队列与事件驱动架构' },
          { title: 'API 设计与服务边界划分' },
          { title: '实战：设计短链 / Feed 流 / IM / 秒杀' },
          { title: '架构权衡与决策记录（ADR）' },
        ],
      },
      {
        title: '⑤ AI 时代的技术杠杆',
        lessons: [
          { title: 'LLM 工作原理与能力边界', note: '知道它能做什么、不能做什么' },
          { title: '用 AI 加速开发：Copilot / Agent 工作流' },
          { title: '提示工程与检索增强（RAG）基础' },
          { title: '把 AI 能力嵌入产品：API、评测、护栏' },
          { title: '高效跟踪前沿：论文与发布的快速阅读法' },
        ],
      },
      {
        title: '⑥ 生产实战与可靠性',
        lessons: [
          { title: '可观测性：日志 / 指标 / 链路追踪' },
          { title: 'CI/CD 与基础设施即代码（IaC）' },
          { title: '容量、SLO/SLA 与故障演练' },
          { title: '事故响应与无指责复盘（postmortem）' },
          { title: '安全基础：认证授权、OWASP 常见漏洞' },
        ],
      },
      {
        title: '⑦ 沟通与影响力',
        lessons: [
          { title: '技术写作：设计文档 / RFC / 清晰的邮件' },
          { title: '高质量代码评审（给予与接受）' },
          { title: '演讲与分享：内部分享、技术大会' },
          { title: '向上沟通与跨团队协作' },
          { title: '指导他人（mentoring）与知识沉淀' },
        ],
      },
      {
        title: '⑧ 领导力与职业发展',
        lessons: [
          { title: '吃透职级模型与晋升标准' },
          { title: '从「做好执行」到「带好项目」（技术负责人）' },
          { title: '利益相关方管理与影响力地图' },
          { title: '个人品牌：博客 / 开源 / 社区' },
          { title: '季度职业复盘与目标设定（个人 OKR）' },
        ],
      },
      {
        title: '⑨ 精力与身心管理（全方位）',
        lessons: [
          { title: '睡眠 / 运动 / 饮食基线', note: '可与本应用「健身规划」联动追踪' },
          { title: '深度工作与专注（时间块）', note: '可用「学习规划」的番茄计时器记录' },
          { title: '压力与情绪管理' },
          { title: '久坐健康：颈椎、视力、护腰' },
          { title: '财务健康基线', note: '可与「财富规划」联动' },
        ],
      },
      {
        title: '⑩ 元能力：持续精进',
        lessons: [
          { title: '学会学习：刻意练习 / 费曼 / 间隔复习', note: '把要点做成卡片放进间隔复习队列' },
          { title: '建立知识管理系统（第二大脑）' },
          { title: '定期复盘与反思日志' },
          { title: '构建高质量信息源与人脉网络' },
          { title: '制定年度成长 OKR，并按季度校准' },
        ],
      },
    ],
  },
  {
    id: 'tpl-aiml',
    icon: '🤖',
    title: '人工智能 / 机器学习入门',
    subject: '人工智能',
    level: '入门到进阶',
    weeks: 16,
    hoursPerWeek: 8,
    summary: '从数学与 Python 基础，循序渐进到机器学习、深度学习与大语言模型，并落地到项目实战。',
    modules: [
      {
        title: '① 数学与基础工具',
        lessons: [
          { title: '线性代数：向量、矩阵、点积', note: '理解向量空间与矩阵乘法的几何含义' },
          { title: '概率与统计：分布、期望、贝叶斯', note: '贝叶斯是很多模型的思想源头' },
          { title: '微积分：导数、梯度、链式法则', note: '梯度是反向传播的核心' },
          { title: 'Python 与科学计算（NumPy / Pandas）' },
          { title: '数据可视化（Matplotlib）' },
        ],
      },
      {
        title: '② 机器学习基础',
        lessons: [
          { title: '监督学习 vs 无监督学习' },
          { title: '线性回归与逻辑回归' },
          { title: '过拟合、正则化与偏差-方差权衡', note: '面试高频概念' },
          { title: '决策树与集成方法（随机森林 / GBDT）' },
          { title: '模型评估：交叉验证、混淆矩阵、ROC/AUC' },
          { title: '用 scikit-learn 跑通一个完整流程' },
        ],
      },
      {
        title: '③ 深度学习',
        lessons: [
          { title: '神经网络与反向传播' },
          { title: '激活函数、损失函数与优化器' },
          { title: 'PyTorch 基础与训练循环' },
          { title: '卷积神经网络（CNN）与图像任务' },
          { title: '循环网络与序列建模（RNN / LSTM）' },
          { title: '正则化技巧：Dropout、BatchNorm、早停' },
        ],
      },
      {
        title: '④ 大语言模型（LLM）',
        lessons: [
          { title: 'Transformer 与自注意力机制', note: '现代大模型的基石' },
          { title: '预训练、微调与指令对齐（SFT/RLHF）' },
          { title: '提示工程（Prompt Engineering）' },
          { title: '检索增强生成（RAG）' },
          { title: '用 API 构建一个 LLM 小应用' },
          { title: 'Agent 与工具调用基础' },
        ],
      },
      {
        title: '⑤ 项目实战',
        lessons: [
          { title: '选题与数据收集/清洗' },
          { title: '从 0 复现一个经典模型' },
          { title: '部署：把模型变成可用的服务/应用' },
          { title: '写一篇项目复盘与作品集展示' },
        ],
      },
    ],
  },
  {
    id: 'tpl-programming',
    icon: '💻',
    title: '编程语言入门（通用）',
    subject: '编程',
    level: '入门',
    weeks: 10,
    hoursPerWeek: 6,
    summary: '适用于任意编程语言的通用学习骨架：建好计划后把「主题」改成 Python / Go / Rust 等即可。',
    modules: [
      { title: '环境与语法基础', lessons: ['开发环境与工具链', '变量、类型与运算', '流程控制（条件/循环）', '函数与作用域'] },
      { title: '数据结构', lessons: ['数组/列表与字符串', '映射/字典与集合', '常用算法思路（排序/查找）'] },
      { title: '模块化与工程', lessons: ['模块/包与依赖管理', '错误处理', '读写文件与 IO'] },
      { title: '编程范式', lessons: ['面向对象', '函数式要点', '并发/异步基础'] },
      { title: '质量与协作', lessons: ['单元测试', '调试技巧', 'Git 版本控制'] },
      { title: '综合项目', lessons: ['确定一个小项目', '迭代实现', '重构与代码评审'] },
    ],
  },
  {
    id: 'tpl-language',
    icon: '🗣️',
    title: '一门外语',
    subject: '语言学习',
    level: '入门',
    weeks: 12,
    hoursPerWeek: 5,
    summary: '听说读写四项均衡推进，配合间隔复习记忆高频词汇与核心语法。',
    modules: [
      { title: '发音与基础', lessons: ['字母/音标与发音', '问候与自我介绍', '数字、时间、日期'] },
      { title: '核心词汇', lessons: ['高频名词 100', '高频动词 100', '形容词与副词'] },
      { title: '核心语法', lessons: ['基本句型', '时态体系', '疑问与否定', '连接词与从句'] },
      { title: '听力输入', lessons: ['慢速听力材料', '影子跟读', '听写练习'] },
      { title: '口语输出', lessons: ['日常对话主题', '描述与表达观点', '找语伴/自言自语练习'] },
      { title: '读写进阶', lessons: ['分级读物', '写日记/短文', '常见写作模板'] },
    ],
  },
  {
    id: 'tpl-reading',
    icon: '📖',
    title: '主题阅读 / 读一本书',
    subject: '阅读',
    level: '通用',
    weeks: 4,
    hoursPerWeek: 4,
    summary: '把一本书或一个主题拆成可执行的精读计划，强调输出与应用，而非「读完即止」。',
    modules: [
      { title: '准备', lessons: ['通读目录与序言，建立全局地图', '明确阅读目的与问题清单'] },
      { title: '精读', lessons: ['核心章节一精读+笔记', '核心章节二精读+笔记', '核心章节三精读+笔记'] },
      { title: '内化', lessons: ['做概念卡片（便于间隔复习）', '用自己的话复述全书脉络'] },
      { title: '输出', lessons: ['写一篇读书笔记/书评', '提炼可落地的 3 个行动'] },
    ],
  },
  {
    id: 'tpl-exam',
    icon: '🎯',
    title: '备考 / 考证',
    subject: '考试',
    level: '通用',
    weeks: 12,
    hoursPerWeek: 10,
    summary: '考纲拆解 → 逐章攻克 → 真题训练 → 错题复盘 → 模拟冲刺的经典备考闭环。',
    modules: [
      { title: '规划', lessons: ['拆解考纲与分值分布', '制定周计划与里程碑'] },
      { title: '知识点逐章', lessons: ['模块一系统学习', '模块二系统学习', '模块三系统学习', '模块四系统学习'] },
      { title: '真题训练', lessons: ['按章节刷题', '限时套卷练习', '整理高频考点'] },
      { title: '错题复盘', lessons: ['建立错题本', '间隔复习薄弱点'] },
      { title: '冲刺', lessons: ['全真模拟', '查漏补缺', '考前状态调整'] },
    ],
  },
  {
    id: 'tpl-blank',
    icon: '📝',
    title: '空白计划',
    subject: '自定义',
    level: '自定',
    weeks: 8,
    hoursPerWeek: 5,
    summary: '从零开始，自己添加模块与知识点。',
    modules: [{ title: '模块一', lessons: [] }],
  },
];

/** 按 id 取模板。 */
export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || null;
}
