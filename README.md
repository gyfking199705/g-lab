# 🎯 Personal Life Planning System

一个综合性的个人规划管理系统，支持个人规划、学习规划、健身规划和理财规划。

## 📋 功能模块

### 1. 📝 **个人规划** (Personal Planning)
- 待办事项管理
- 日志记录
- 里程碑追踪
- 优先级管理

### 2. 📚 **学习规划** (Learning Planning)
- 课程管理
- 进度追踪
- 学习日志
- 技能目标

### 3. 💪 **健身规划** (Fitness Planning)
- 锻炼计划制定
- 身体指标记录
- 成就徽章
- 进度统计

### 4. 💰 **理财规划** (Financial Planning)
- 储蓄目标设置
- 投资记录
- 5年1000万目标追踪
- 财务统计分析

## 🏗️ 项目结构

```
g-lab/
├── README.md                 # 项目说明
├── web/                      # Web 应用
│   ├── index.html           # 主页面
│   ├── styles.css           # 样式文件
│   └── app.js               # 应用逻辑
├── data/                    # 数据存储（JSON）
│   ├── personal.json        # 个人规划数据
│   ├── learning.json        # 学习规划数据
│   ├── fitness.json         # 健身规划数据
│   └── finance.json         # 理财规划数据
├── api/                     # 后端 API（可选）
│   └── server.js            # Node.js 服务器
└── cli/                     # CLI 工具（后续）
    └── planner.js           # 命令行界面
```

## 🚀 快速开始

### Web 应用
```bash
# 直接打开 web/index.html 在浏览器中使用
```

### API 服务器（可选）
```bash
npm install
node api/server.js
```

## 📂 数据存储

所有数据存储在 JSON 文件中，便于管理和版本控制：
- `data/personal.json` - 个人规划数据
- `data/learning.json` - 学习规划数据
- `data/fitness.json` - 健身规划数据
- `data/finance.json` - 理财规划数据

## 🔄 工作流程

1. 在 Web 界面中创建和管理规划
2. 数据自动保存到 JSON 文件
3. 可随时导出或备份
4. 支持 Claude Code 访问和协作开发

## 💡 后续计划

- [ ] CLI 命令行工具
- [ ] 数据可视化图表
- [ ] 提醒和通知功能
- [ ] 数据库支持（可选）
- [ ] 移动端应用

---

**开始你的规划之旅吧！** 🚀
