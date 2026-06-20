# 📋 项目规划

把一批任务，用三种方式看——**日程**、**人力甘特**、**番茄专注**共享同一份任务数据，不重复录入。

```
project/
├── calc.js            # 纯函数：日期、任务分桶、甘特布局、番茄统计（可单测）
├── calc.test.js       # 单元测试（node --test）
├── ProjectPlanner.jsx # React 组件（三视图 + 编辑弹窗，自带样式 pp-）
├── bootstrap.jsx      # 独立页入口（打包成 dist/project.js）
├── index.html         # 独立演示页
└── package.json
```

## 三个视图
- **🗓 日程**：顶部一行快速建任务（标题/负责人/起止），按到期日自动分桶：逾期 · 今天 · 近 7 天 · 以后 · 未排期 · 已完成。点圆点切状态（待办→进行中→完成），点 ▶ 直接对该任务开番茄。
- **📊 人力甘特**：按**负责人**分行，在时间轴上画每个任务的起止条；今天有竖线标记，时间窗可选 2/4/8/12 周，横向滚动。点色条即可编辑。
- **🍅 番茄专注**：可配置的番茄钟（默认专注 25 / 休息 5 分），可绑定到某个任务；完成一段自动记一次专注。右侧看连续天数、累计、近 7 天柱图与最近记录。

## 任务模型（被三视图共享）
```js
task    = { id, title, status:'todo'|'doing'|'done', start, end, assignee, notes, createdAt }
session = { id, date, minutes, taskId|null }   // 一次专注
```
关键日期取 `end || start`；甘特只画带日期的任务，并按 `assignee` 分行（空负责人归「未分配」）。

## 数据与同步
数据存浏览器 `localStorage`（键 `project-planner`），并随**导出/导入备份**与 **Google Drive 云同步**一起走（对应云端文件 `项目规划.json`）。AI Key 等敏感信息不在内。

## 开发
```bash
node --test project/calc.test.js   # 跑纯逻辑测试
node scripts/build.mjs             # 重新打包（生成 dist/project.js）
```
集成在主应用侧栏「项目规划」；本目录的 `index.html` 是独立演示页。
