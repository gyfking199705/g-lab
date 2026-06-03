# 💰 储蓄与财富规划模块

面向中国一线城市家庭（可双人）的交互式财富规划器，三个 Tab：

- **测算**：调整收入、支出、投资配置，实时看到 **月储蓄 / 储蓄率 / 综合年化 / 多久达成目标金额**，并用手写 SVG 展示未来资产增长曲线（敏感性测试 + 扣通胀）。
- **净资产**：定期记录资产 / 负债快照 → **净资产曲线**（手写 SVG）、资产构成占比、环比变化；把「算一次」变成「长期回看」。
- **体检**：综合最新净资产与收支，给出 **应急储备 / 储蓄率 / 负债率 / 净资产倍数** 等检查项与综合评分。

可作为独立组件单独运行，也方便集成进主应用（个人成长规划系统）。

```
savings/
├── calc.js            # ① 纯函数计算逻辑（税务/预算/投资/复利预测 + 净资产/体检）— 不依赖 React
├── calc.test.js       # 计算逻辑单元测试（Node 内置 test runner）
├── SavingsPlanner.jsx # ② React 组件（函数式 + hooks），图表为手写 SVG，自带样式
├── index.html         # ③ 可独立运行的演示页（加载 ../dist/savings.js）
└── package.json       # 标记 ESM（"type":"module"），便于 Node 测试
```

---

## 🚀 独立运行

`index.html` 通过 `fetch` 读取 `.jsx` 并在浏览器内用 Babel 转译，因此**需要通过 HTTP 访问**
（不能直接 `file://` 双击打开，浏览器会拦截本地 fetch / ES Module）：

```bash
# 在仓库根目录起一个静态服务器
python3 -m http.server 8000
# 然后浏览器打开：
#   http://localhost:8000/savings/
```

部署到 GitHub Pages 后，直接访问 `https://<用户名>.github.io/<repo>/savings/` 即可。
演示页用 CDN（esm.sh / unpkg）加载 React 与 Babel——这只是为了「零构建独立运行」，
**集成进主应用时用你项目自带的 React，不需要任何 CDN**。

## 🧪 测试

```bash
cd savings
node --test          # 运行 calc.test.js，覆盖税率表/换算/预算/加权/复利/达成年数/格式化
```

---

## 🔌 集成进主应用

组件与计算逻辑解耦，集成时只需引入 `SavingsPlanner.jsx`（它内部 `import './calc.js'`）：

```jsx
import SavingsPlanner from './savings/SavingsPlanner.jsx';

function App() {
  return (
    <SavingsPlanner
      // 可选：初始数据（优先级高于 localStorage）。结构见 DEFAULT_STATE
      initialState={{ forecast: { target: 10000000 } }}
      // 可选：数据或计算结果变化时回调，便于接入全局状态管理
      onChange={(state, result) => console.log(state, result)}
      // 可选：localStorage 键名；传 null 可关闭本地持久化、完全由 props 驱动
      storageKey="savings-planner"
    />
  );
}
```

- **数据进**：`initialState`（部分字段即可，会与默认值深合并）
- **数据出**：`onChange(state, result)`——`state` 是用户输入，`result` 是 `computePlan(state)` 的完整计算结果
- **持久化**：默认存 `localStorage`；若主应用有自己的状态管理，传 `storageKey={null}` 并用 `initialState` + `onChange` 接管
- **样式**：组件自带 `<style>`（类名前缀 `sp-`），无需引入额外 CSS；不依赖 Tailwind

> 若你的主应用是 Vite/CRA/Next 等带构建的工程，直接 `import` 即可，无需 `index.html` 里的运行时转译逻辑。

---

## 📐 计算函数说明（`calc.js`）

所有函数均为纯函数。金额单位 **元**，比率单位 **小数**（`0.07` = 7%）。

| 函数 | 输入 | 输出 | 说明 |
| --- | --- | --- | --- |
| `annualIncomeTax(taxable)` | 全年应纳税所得额 | 全年个税 | 七级超额累进，速算扣除数 |
| `computeAfterTax({monthlyGross, monthsPerYear, socialInsuranceRate, specialDeductionMonthly})` | 单人税前参数 | `{annualGross, socialInsurance, taxableIncome, tax, annualNet, monthlyNetAvg, effectiveTaxRate, ...}` | 税前→税后年度近似 |
| `computeBudget({persons, expenses})` | 各人税后结果 + 各项月支出 | `{monthlyNetIncome, monthlyExpense, monthlySaving, savingRate, annualSaving}` | 家庭收支 |
| `weightedAnnualReturn(allocations)` | `[{weight, expectedReturn}]` | `{totalWeight, weightedReturn}` | 综合年化（按占比归一化加权）|
| `projectWealth({currentAssets, annualSaving, annualReturn, years})` | 复利参数 | `[{year, assets, principal, gain}]`（长度 years+1）| 逐年复利 + 年储蓄 |
| `yearsToGoal({currentAssets, annualSaving, annualReturn, target})` | 同上 + 目标 | 年数（含小数，线性插值；无法达成返回 `Infinity`）| 达成目标所需年数 |
| `realReturn(nominal, inflation)` | 名义年化、通胀 | 实际年化 | 扣通胀 |
| `computePlan(input)` | 完整规划输入（见 `DEFAULT_STATE`）| 一份聚合结果 `{taxA, taxB, budget, investment, forecast}` | 顶层聚合，供 UI 直接消费 |
| `snapshotTotals(snapshot, accounts)` | 一期快照 + 账户表 | `{assets, liabilities, net, liquid}` | 单期净资产汇总（`流动`类计入 liquid）|
| `assetBreakdown(snapshot, accounts)` | 同上 | `[{category, amount, share}]` 降序 | 资产按类别占比 |
| `netWorthSeries(snapshots, accounts)` | 多期快照 | `[{date, assets, liabilities, net}]` 升序 | 净资产时间序列 |
| `netWorthChange(series)` | 序列 | `{abs, pct, fromDate}` 或 `null` | 最新一期环比变化 |
| `financialHealth({...})` | 流动资产/月支出/储蓄率/总资产/总负债/年收入/净资产 | `{checks, score, grade}` | 财务体检（应急/储蓄率/负债率/净资产倍数）|
| `formatMoney / formatPct / formatYears` | 数值 | 中文文本（如 `¥320万`、`4.6%`、`8.3 年`）| 展示格式化 |

### 关键计算口径
- **税后月收入** = 各人到手年薪 / 12；年终奖按「发薪月数」折算并入综合所得计税
- **五险一金**：按 12 个月工资 × 综合比例计提（年终奖不计社保），比例可调
- **个税**：年度累计法近似——全年应纳税所得额 = 年收入 − 五险一金 − 6 万起征点 − 专项附加扣除，套用年度税率表
- **月储蓄** = 税后月收入 − 总支出；**储蓄率** = 月储蓄 / 税后月收入
- **综合年化** = Σ(各资产占比 × 预期年化) / 占比之和
- **达成年数**：从当前资产起逐年「×(1+年化)+年储蓄」迭代，首次 ≥ 目标后用线性插值求小数年

---

## ⚠️ 免责声明

投资回报为长期假设，实际会逐年波动，本工具仅供规划参考，**不构成投资建议**；
个税与五险一金为基于税率表的年度近似估算，**以实际工资条与当地政策为准**。
