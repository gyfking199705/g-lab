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
    id: 'tpl-founder',
    icon: '🚀',
    title: '顶尖管理者 / 创业者 · 全方位提升计划',
    subject: '管理与创业',
    level: '进阶到精通',
    weeks: 52,
    hoursPerWeek: 10,
    summary:
      '面向「顶尖管理者 / 创业者」的一年期全方位成长路线：自我领导与决策 + 团队与领导力 + 商业战略 + 产品与客户 + 增长营销与销售 + 财务与融资 + 运营与执行 + 沟通与影响力 + 人脉与个人品牌 + 精力与韧性。建议每季度复盘一次，与本应用的财富/健身/番茄/间隔复习联动使用。',
    modules: [
      {
        title: '① 自我领导与决策心智',
        lessons: [
          { title: '认识自己：优势、盲区、价值观与边界', note: '管理始于自我管理' },
          { title: '决策框架：可逆/不可逆、期望值、二阶思维' },
          { title: '心智模型与批判性思维（避免常见认知偏差）' },
          { title: '时间与优先级：要事第一、授权、说「不」' },
          { title: '复盘习惯：周/季度反思与目标校准' },
        ],
      },
      {
        title: '② 团队与领导力',
        lessons: [
          { title: '招人：画像、面试、识别 A 级人才', note: '创始人最重要的工作之一' },
          { title: '带人：一对一、反馈、辅导与授权' },
          { title: '激励与留人：动机、薪酬/股权、成长路径' },
          { title: '打造文化与价值观落地' },
          { title: '处理低绩效与必要的告别' },
          { title: '搭班子：高管团队与互补' },
        ],
      },
      {
        title: '③ 商业与战略',
        lessons: [
          { title: '商业模式画布与盈利逻辑' },
          { title: '战略定位：差异化、护城河、取舍', note: '战略的本质是选择不做什么' },
          { title: '市场与竞争分析（行业结构、对手、时机）' },
          { title: '愿景、使命与三年/一年目标拆解' },
          { title: '商业敏感度：读懂关键指标背后的生意' },
        ],
      },
      {
        title: '④ 产品与客户',
        lessons: [
          { title: '客户开发：访谈、需求挖掘、JTBD' },
          { title: '产品感与价值主张设计' },
          { title: '从 0 到 1：MVP 与快速验证' },
          { title: '寻找 PMF（产品-市场匹配）的信号' },
          { title: '用数据驱动迭代（指标、AB、留存）' },
        ],
      },
      {
        title: '⑤ 增长 · 营销 · 销售',
        lessons: [
          { title: '增长模型与 AARRR 海盗指标' },
          { title: '获客渠道与 CAC / LTV', note: '单位经济模型必须算清楚' },
          { title: '品牌与内容营销基础' },
          { title: '销售方法论与销售漏斗（B2B / B2C）' },
          { title: '定价策略与谈判' },
          { title: 'GTM（进入市场）策略' },
        ],
      },
      {
        title: '⑥ 财务与融资',
        lessons: [
          { title: '读懂三大报表（利润表/资产负债表/现金流）' },
          { title: '单位经济模型与盈亏平衡' },
          { title: '现金流管理与 runway（生命线）', note: '现金流断了公司就没了' },
          { title: '融资流程：估值、条款清单、股权稀释' },
          { title: '股权结构与期权池（cap table）' },
          { title: '预算与财务规划', note: '可与本应用「财富规划」联动思考个人侧' },
        ],
      },
      {
        title: '⑦ 运营与执行',
        lessons: [
          { title: '目标管理：OKR / KPI 的设定与对齐' },
          { title: '建立可复制的流程与 SOP' },
          { title: '项目与节奏管理（周会/月度经营）' },
          { title: '数据仪表盘与经营复盘' },
          { title: '规模化与组织设计' },
        ],
      },
      {
        title: '⑧ 沟通与影响力',
        lessons: [
          { title: '讲故事：愿景叙事与 pitch', note: '融资、招人、卖货都靠它' },
          { title: '公开演讲与路演' },
          { title: '谈判与冲突管理' },
          { title: '高效书面沟通（备忘录 / 经营信）' },
          { title: '危机沟通与对外发声' },
        ],
      },
      {
        title: '⑨ 人脉与个人品牌',
        lessons: [
          { title: '建立与经营高质量关系网' },
          { title: '找到导师与加入圈子' },
          { title: '个人品牌：公开写作 / 分享 / 影响力' },
          { title: '资源整合与借力' },
        ],
      },
      {
        title: '⑩ 精力 · 韧性 · 长期主义',
        lessons: [
          { title: '创始人身心健康与压力管理', note: '可与「健身规划」联动追踪' },
          { title: '深度工作与精力分配', note: '可用「学习规划」番茄计时器记录' },
          { title: '抗挫折与情绪复原力（resilience）' },
          { title: '工作与生活的可持续节奏' },
          { title: '长期主义：复利思维与延迟满足' },
        ],
      },
    ],
  },
  {
    id: 'tpl-researcher',
    icon: '🔬',
    title: '顶尖研究者 / 学者 · 全方位提升计划',
    subject: '学术与科研',
    level: '进阶到精通',
    weeks: 52,
    hoursPerWeek: 12,
    summary:
      '面向「顶尖研究者 / 学者」的一年期全方位成长路线：研究方法论 + 文献与领域掌握 + 提出好问题 + 研究设计与统计 + 数据与工具 + 学术写作与发表 + 学术表达与影响力 + 协作与师生关系 + 科研职业发展 + 精力与长期主义。建议每季度复盘一次，与本应用的健身/番茄/间隔复习联动使用。',
    modules: [
      {
        title: '① 研究方法论',
        lessons: [
          { title: '科学方法与研究范式（定量/定性/混合）' },
          { title: '可复现性与开放科学', note: '预注册、数据/代码开源是大势所趋' },
          { title: '研究伦理与学术诚信' },
          { title: '批判性阅读与论证结构' },
        ],
      },
      {
        title: '② 文献与领域掌握',
        lessons: [
          { title: '高效读论文：三遍法（略读/精读/复现）', note: '先判断「值不值得读」' },
          { title: '系统性文献综述与梳理脉络' },
          { title: '文献管理工具（Zotero / Notion）' },
          { title: '跟踪前沿：会议、预印本、关键作者' },
        ],
      },
      {
        title: '③ 提出好问题',
        lessons: [
          { title: '识别研究空白与机会' },
          { title: '把模糊想法收敛成可研究的问题', note: '好问题是研究成功的一半' },
          { title: '新颖性、重要性与可行性的权衡' },
          { title: '形成假设与研究目标' },
        ],
      },
      {
        title: '④ 研究设计与统计',
        lessons: [
          { title: '实验设计：变量、对照、随机化' },
          { title: '统计基础：假设检验、置信区间、效应量' },
          { title: '因果推断与常见陷阱（混淆/选择偏差）', note: '相关不等于因果' },
          { title: '样本量与统计功效' },
        ],
      },
      {
        title: '⑤ 数据与工具',
        lessons: [
          { title: '数据采集、清洗与管理' },
          { title: '统计/编程工具（Python / R）' },
          { title: '可复现的分析流水线（脚本化、版本控制）' },
          { title: '科学可视化与图表规范' },
        ],
      },
      {
        title: '⑥ 学术写作与发表',
        lessons: [
          { title: '论文结构：IMRaD 与讲好一个故事' },
          { title: '清晰的学术写作与修改打磨' },
          { title: '选刊/选会与投稿策略' },
          { title: '回应审稿意见（rebuttal）', note: '决定能否被接收的关键一步' },
        ],
      },
      {
        title: '⑦ 学术表达与影响力',
        lessons: [
          { title: '学术报告与会议演讲' },
          { title: '海报与可视化沟通' },
          { title: '学术社交与建立合作' },
          { title: '科普与对外传播研究' },
        ],
      },
      {
        title: '⑧ 协作与师生关系',
        lessons: [
          { title: '与导师高效协作（向上管理）' },
          { title: '跨学科/跨机构合作' },
          { title: '指导学生与团队带教' },
          { title: '署名与贡献的规范' },
        ],
      },
      {
        title: '⑨ 科研职业发展',
        lessons: [
          { title: '基金申请与经费管理' },
          { title: '学术求职（教职/博后）与工业界路径' },
          { title: '学术影响力（引用、h 指数）的理性看待' },
          { title: '年度科研目标与产出规划（个人 OKR）' },
        ],
      },
      {
        title: '⑩ 精力 · 韧性 · 长期主义',
        lessons: [
          { title: '科研是马拉松：身心健康基线', note: '可与「健身规划」联动' },
          { title: '深度工作与专注', note: '可用「学习规划」番茄计时器记录' },
          { title: '应对拒稿与不确定性的心态' },
          { title: '可持续的研究节奏与复盘' },
        ],
      },
    ],
  },
  {
    id: 'tpl-product',
    icon: '🎨',
    title: '顶尖设计师 / 产品经理 · 全方位提升计划',
    subject: '设计与产品',
    level: '进阶到精通',
    weeks: 52,
    hoursPerWeek: 10,
    summary:
      '面向「顶尖设计师 / 产品经理」的一年期全方位成长路线：用户研究 + 产品思维与策略 + 交互与信息架构 + 视觉与设计基础 + 设计系统与工具 + 可用性与体验度量 + 与工程/商业协作 + 数据驱动与增长 + 沟通与影响力 + 作品集与职业发展。建议每季度复盘一次，与本应用的番茄/间隔复习联动使用。',
    modules: [
      {
        title: '① 用户与研究',
        lessons: [
          { title: '用户访谈与需求挖掘' },
          { title: '用户画像与 JTBD（待办任务）', note: '关注用户「想完成什么」而非功能' },
          { title: '定性与定量研究方法' },
          { title: '同理心与用户旅程地图' },
        ],
      },
      {
        title: '② 产品思维与策略',
        lessons: [
          { title: '产品感：判断什么值得做' },
          { title: '愿景、策略与路线图' },
          { title: '需求优先级（RICE / Kano / 价值-成本）' },
          { title: 'MVP 与快速验证' },
        ],
      },
      {
        title: '③ 交互与信息架构',
        lessons: [
          { title: '信息架构与导航设计' },
          { title: '任务流与交互流程' },
          { title: '交互模式与微交互' },
          { title: '可用性原则（如尼尔森十大启发式）', note: '设计评审的通用语言' },
        ],
      },
      {
        title: '④ 视觉与设计基础',
        lessons: [
          { title: '排版与字体' },
          { title: '色彩理论与配色' },
          { title: '布局、网格与间距' },
          { title: '视觉层级与格式塔原则' },
        ],
      },
      {
        title: '⑤ 设计系统与工具',
        lessons: [
          { title: '精通 Figma（组件、变体、自动布局）' },
          { title: '建立与维护设计系统', note: '规模化设计的基础设施' },
          { title: '原型与交付（开发标注）' },
          { title: 'AI 辅助设计工作流' },
        ],
      },
      {
        title: '⑥ 可用性与体验度量',
        lessons: [
          { title: '可用性测试（含远程/无主持）' },
          { title: '体验指标（SUS / NPS / 任务成功率）' },
          { title: 'A/B 测试与实验' },
          { title: '无障碍设计（a11y）', note: '顶尖产品的必修项' },
        ],
      },
      {
        title: '⑦ 与工程/商业协作',
        lessons: [
          { title: '与工程协作：可行性与交付' },
          { title: '写清楚 PRD / 设计规格' },
          { title: '理解商业目标与约束' },
          { title: '跨职能推动落地' },
        ],
      },
      {
        title: '⑧ 数据驱动与增长',
        lessons: [
          { title: '产品分析与漏斗' },
          { title: '关键指标（北极星 / 留存 / 转化）' },
          { title: '从数据中发现机会' },
          { title: '增长实验与迭代' },
        ],
      },
      {
        title: '⑨ 沟通与影响力',
        lessons: [
          { title: '设计评审：给予与接受反馈' },
          { title: '用故事呈现方案（讲清「为什么」）', note: '说服力比稿子本身更重要' },
          { title: '向上与跨团队汇报' },
          { title: '推动决策与利益相关方对齐' },
        ],
      },
      {
        title: '⑩ 作品集与职业发展',
        lessons: [
          { title: '打磨高质量作品集（讲过程而非只放结果）' },
          { title: '个人品牌与社区分享' },
          { title: '设计/产品职级与成长路径' },
          { title: '精力管理与长期成长', note: '可与「健身规划」「番茄计时」联动' },
        ],
      },
    ],
  },
  {
    id: 'tpl-finance',
    icon: '💰',
    title: '顶尖投资人 / 金融从业者 · 全方位提升计划',
    subject: '金融与投资',
    level: '进阶到精通',
    weeks: 52,
    hoursPerWeek: 10,
    summary:
      '面向「顶尖投资人 / 金融从业者」的一年期全方位成长路线：金融市场基础 + 财报与估值 + 投资组合理论 + 宏观与周期 + 各类资产 + 量化与数据 + 风险管理 + 交易心理 + 合规与职业 + 精力与长期主义。建议每季度复盘一次，与本应用的财富规划/股市观测联动使用。',
    modules: [
      {
        title: '① 金融与市场基础',
        lessons: [
          { title: '货币时间价值与复利', note: '一切估值的地基' },
          { title: '金融市场与主要工具（股/债/衍生品）' },
          { title: '利率、收益率与折现' },
          { title: '市场参与者与微观结构' },
        ],
      },
      {
        title: '② 财务报表与估值',
        lessons: [
          { title: '读懂三大报表' },
          { title: '财务比率与质量分析' },
          { title: '绝对估值：DCF / 自由现金流' },
          { title: '相对估值：可比公司 / 倍数' },
        ],
      },
      {
        title: '③ 投资组合与资产配置',
        lessons: [
          { title: '风险与收益、波动与相关性' },
          { title: '现代组合理论与有效前沿' },
          { title: '资产配置与再平衡' },
          { title: '指数化与因子投资' },
        ],
      },
      {
        title: '④ 宏观经济与周期',
        lessons: [
          { title: '宏观指标（GDP/通胀/就业）' },
          { title: '货币与财政政策、利率周期' },
          { title: '经济周期与大类资产轮动' },
        ],
      },
      {
        title: '⑤ 各类资产与策略',
        lessons: [
          { title: '权益：成长 vs 价值' },
          { title: '固定收益与信用' },
          { title: '衍生品与对冲基础' },
          { title: '另类资产（地产 / 商品 / 私募）' },
        ],
      },
      {
        title: '⑥ 量化与数据',
        lessons: [
          { title: '金融数据获取与处理' },
          { title: '回测与策略评估', note: '小心过拟合与幸存者偏差' },
          { title: '统计与概率在投资中的应用' },
        ],
      },
      {
        title: '⑦ 风险管理',
        lessons: [
          { title: '风险度量（波动 / VaR / 回撤）' },
          { title: '仓位管理与分散' },
          { title: '黑天鹅与尾部风险' },
        ],
      },
      {
        title: '⑧ 交易与投资心理',
        lessons: [
          { title: '行为金融与认知偏差' },
          { title: '纪律、复盘与交易日志', note: '亏在心态的人远多于亏在分析' },
          { title: '逆向思维与独立判断' },
        ],
      },
      {
        title: '⑨ 合规与职业发展',
        lessons: [
          { title: '职业证书路径（CFA / FRM 等）' },
          { title: '合规、道德与受托责任' },
          { title: '行业角色与职业地图' },
        ],
      },
      {
        title: '⑩ 精力 · 韧性 · 长期主义',
        lessons: [
          { title: '身心健康与情绪稳定', note: '可与「健身规划」联动' },
          { title: '深度研究与专注', note: '可用「学习规划」番茄计时器记录' },
          { title: '长期复利思维与延迟满足', note: '可与「财富规划」「股市观测」联动' },
        ],
      },
    ],
  },
  {
    id: 'tpl-growth',
    icon: '📣',
    title: '顶尖市场 / 增长操盘手 · 全方位提升计划',
    subject: '市场与增长',
    level: '进阶到精通',
    weeks: 52,
    hoursPerWeek: 10,
    summary:
      '面向「顶尖市场 / 增长操盘手」的一年期全方位成长路线：营销基础 + 用户与市场洞察 + 品牌与内容 + 渠道与投放 + 增长实验 + 用户生命周期 + 私域与社群 + 数据与归因 + 跨团队协作 + 职业发展。建议每季度复盘一次，与本应用的番茄/间隔复习联动使用。',
    modules: [
      {
        title: '① 营销与增长基础',
        lessons: [
          { title: '营销的本质与 4P / STP' },
          { title: '增长模型与 AARRR 海盗指标' },
          { title: 'CAC / LTV 与单位经济', note: '增长是否健康全看这两个数' },
          { title: '北极星指标的选择' },
        ],
      },
      {
        title: '② 用户与市场洞察',
        lessons: [
          { title: '用户研究与画像' },
          { title: '市场细分与定位' },
          { title: '竞品分析与差异化' },
        ],
      },
      {
        title: '③ 品牌与内容',
        lessons: [
          { title: '品牌定位与心智占领' },
          { title: '内容营销与故事化表达' },
          { title: '文案与转化撰写' },
        ],
      },
      {
        title: '④ 渠道与投放',
        lessons: [
          { title: 'SEO 与搜索营销（SEM）' },
          { title: '社媒与信息流投放' },
          { title: '渠道组合与预算分配' },
          { title: 'KOL / 联盟 / 裂变' },
        ],
      },
      {
        title: '⑤ 增长实验与数据',
        lessons: [
          { title: '增长黑客方法与实验流程' },
          { title: 'A/B 测试设计与显著性' },
          { title: '落地页与转化率优化（CRO）' },
        ],
      },
      {
        title: '⑥ 用户生命周期',
        lessons: [
          { title: '获客 → 激活 → 留存 → 推荐' },
          { title: '激活与「啊哈时刻」设计' },
          { title: '留存与流失召回' },
        ],
      },
      {
        title: '⑦ 私域与社群',
        lessons: [
          { title: '私域运营与用户分层' },
          { title: '社群与忠诚度' },
          { title: 'CRM 与生命周期营销' },
        ],
      },
      {
        title: '⑧ 数据与归因',
        lessons: [
          { title: '数据看板与关键指标' },
          { title: '多触点归因模型' },
          { title: 'ROI / ROAS 与效果评估' },
        ],
      },
      {
        title: '⑨ 沟通与跨团队协作',
        lessons: [
          { title: '与产品 / 销售 / 设计协作' },
          { title: '写清楚 brief 与营销方案' },
          { title: '向上汇报与资源争取' },
        ],
      },
      {
        title: '⑩ 职业发展与精力',
        lessons: [
          { title: '个人品牌与作品集（操盘案例）' },
          { title: '市场 / 增长职级与成长路径' },
          { title: '精力管理与长期成长', note: '可与「健身规划」「番茄计时」联动' },
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

/* =============================================================
 * 模板分类（方向多了便于归纳）：按类别 + 类内 id 顺序分组展示。
 * 新增模板时把它的 id 归到对应类别即可；未归类的会落入「其他」。
 * ============================================================= */
export const TEMPLATE_CATEGORIES = [
  {
    id: 'mastery',
    label: '🎯 顶尖人才 · 全方位提升',
    hint: '一年期、十大维度的旗舰成长计划，按职业方向选择',
    ids: ['tpl-top-talent', 'tpl-founder', 'tpl-researcher', 'tpl-product', 'tpl-finance', 'tpl-growth'],
  },
  {
    id: 'skill',
    label: '📚 技能与学科',
    hint: '具体技能 / 学科的上手到进阶',
    ids: ['tpl-aiml', 'tpl-programming', 'tpl-language'],
  },
  {
    id: 'exam',
    label: '🎓 考试与阅读',
    hint: '备考闭环与主题精读',
    ids: ['tpl-exam', 'tpl-reading'],
  },
  {
    id: 'custom',
    label: '✨ 自定义',
    hint: '从零开始自己搭',
    ids: ['tpl-blank'],
  },
];

/** 返回分组后的模板：[{ id, label, hint, templates:[...] }]，并把未归类模板兜底到「其他」。 */
export function groupedTemplates() {
  const used = new Set();
  const groups = TEMPLATE_CATEGORIES.map((c) => {
    const templates = c.ids.map((id) => TEMPLATES.find((t) => t.id === id)).filter(Boolean);
    templates.forEach((t) => used.add(t.id));
    return { ...c, templates };
  }).filter((c) => c.templates.length);
  const rest = TEMPLATES.filter((t) => !used.has(t.id));
  if (rest.length) groups.push({ id: 'other', label: '📦 其他', hint: '', templates: rest });
  return groups;
}
