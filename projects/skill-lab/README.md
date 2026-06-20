# 🧩 Skill 研究室 · skill-lab

> g-lab 的子项目：**收录、整理与展示高质量 [Agent Skills](./SPEC.md)**。每个技能都遵循
> 业界标准的 `SKILL.md` 格式，画廊里可检索、查看、一键复制 / 下载，即取即用。

在线路径：`…/g-lab/projects/skill-lab/` ｜ 规范：[`SPEC.md`](./SPEC.md)

## 它是什么

- **一座技能库**：`skills/<name>/SKILL.md`，每个都是自包含、可移植、可组合的技能说明书。
- **一个展示画廊**：纯前端 React 应用，按分类/关键词/标签检索，弹窗查看正文并复制下载。
- **一套标准**：[`SPEC.md`](./SPEC.md) 定义 frontmatter 与正文约定；构建期自动校验。

## 目录结构

```
skill-lab/
├── index.html            # 画廊页（加载 dist/app.js）
├── build.mjs             # 构建：扫描 skills/ 生成 index.json + 打包前端
├── SPEC.md               # SKILL.md 业界标准格式（贡献者必读）
├── app/                  # 前端源码（React 18，逻辑/UI 解耦，纯函数可单测）
│   ├── bootstrap.jsx     # 打包入口
│   ├── SkillLab.jsx      # 画廊 UI（自带 <style>，遵循 DESIGN.md）
│   ├── frontmatter.js    # 解析 SKILL.md 的 YAML frontmatter（+ .test.js）
│   ├── markdown.js       # 极简零依赖 Markdown 渲染（+ .test.js）
│   └── registry.js       # 登记表逻辑：检索/过滤/分类/校验（+ .test.js）
├── skills/               # 收录的技能集合（每个一个目录）
│   ├── index.json        # 由 build.mjs 自动生成的登记表
│   └── <name>/SKILL.md
└── dist/app.js           # 打包产物（入库，GitHub Pages 自托管）
```

## 本地预览

需经 HTTP 访问（不能 `file://` 双击）：

```bash
# 在仓库根
python3 -m http.server 8000
# 打开 http://localhost:8000/projects/skill-lab/
```

## 构建

```bash
cd projects/skill-lab
npm install --no-save esbuild react@18.3.1 react-dom@18.3.1
node build.mjs
```

`build.mjs` 会：

1. 扫描 `skills/<name>/SKILL.md`，解析 frontmatter、按标准校验，生成 `skills/index.json`；
2. 把 `app/bootstrap.jsx` 打成自托管单文件 `dist/app.js`（含 React），并给 `index.html` 写入 `?v=hash`。

## 测试

```bash
cd projects/skill-lab && node --test app/*.test.js
```

纯逻辑（`frontmatter` / `markdown` / `registry`）均有 `node --test` 单测。

## 新增一个技能

1. 在 `skills/<name>/` 建 `SKILL.md`，按 [`SPEC.md`](./SPEC.md) 填写 frontmatter + 正文。
2. 跑 `node build.mjs`，自动收录进 `index.json` 并校验。
3. 在画廊里自查描述是否具体、正文是否可执行、校验是否通过。

## 收录现有技能（12）

| 技能 | 分类 | 用途 |
| --- | --- | --- |
| `conventional-commits` | Git & Version Control | 写规范的 Conventional Commits 提交信息 |
| `pr-description` | Git & Version Control | 从分支 diff 生成 PR 描述 |
| `code-reviewer` | Code Quality | 按优先级审查 diff 的正确性/安全/可维护性 |
| `debugging-strategy` | Debugging | 系统化定位根因，先复现再确认再修 |
| `unit-test-author` | Testing | 为函数/模块写聚焦、确定性的单测 |
| `security-reviewer` | Security | 审查注入/鉴权/密钥等可利用漏洞并给修复 |
| `api-designer` | Architecture & API | 设计一致、可演进的 HTTP/REST API |
| `sql-optimizer` | Data & Databases | 用执行计划与索引优化慢查询 |
| `dockerfile-author` | DevOps & Infra | 写小而安全、缓存友好的生产 Dockerfile |
| `accessibility-auditor` | Frontend | 按 WCAG 审查无障碍并给优先级修复 |
| `changelog-keeper` | Docs & Release | 维护 Keep a Changelog 风格的 CHANGELOG |
| `readme-author` | Docs & Release | 写让新人快速上手的 README |

## 设计

视觉遵循 g-lab 共享 [`DESIGN.md`](../../DESIGN.md)：暖纸色 + 陶土橙、衬线标题、克制留白、
零图表库（手写 SVG 图标）。纯前端、无后端、无外部 CDN。
