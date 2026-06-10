# favicon 候选库

App 图标的备选方案。统一规范：64×64 viewBox、圆角 15 的暖陶土渐变砖
（`#D97757 → #C4633F`，Claude 风格暖色板）+ 奶油色前景 `#F7F3EC`，
与 App 纸感主题（`theme-color #F6F5F0`）同调。所有图形在 16px tab 尺寸下可辨。

**当前在用：E-seedling（幼苗·土线）** —— 根目录 `favicon.svg`。

| 文件 | 名称 | 寓意 |
| --- | --- | --- |
| `A-trajectory.svg` | 上升轨迹·火花 | 上扬曲线收束于亮点，编辑感强 |
| `B-sprout.svg` | 嫩芽 | 茎 + 双叶，成长最直白的隐喻 |
| `C-bars.svg` | 渐进台阶 | 三根递增柱 + 虚线趋势，进度/数据感 |
| `D-compass.svg` | 上升指针 | 圆环 + 上箭头，方向/目标感 |
| `E-seedling.svg` | 幼苗·土线（在用） | 嫩芽落地生根，多了一条地平线 |
| `F-tree.svg` | 小树 | 圆冠 + 树干，小尺寸剪影最干净 |
| `G-summit.svg` | 山峰·朝阳 | 攀登 + 日出，叙事感最强 |
| `H-dots.svg` | 上升圆点 | 三点由小到大右上行，极简 |
| `I-ring.svg` | 进度环 | 75% 圆环 + 中心点，工具感 |
| `J-stairs.svg` | 阶梯剪影 | 实心楼梯，厚重 |

换图标：把候选文件内容复制到根目录 `favicon.svg` 即可（`index.html` 引用的是
`./favicon.svg`，无需改 HTML）。浏览器对 favicon 缓存较狠，换后需强刷或重开标签页。
