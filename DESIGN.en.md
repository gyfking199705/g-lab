# Design Style Guide

> Visual style spec for the Personal Growth Planner — also a reusable style prompt
> you can paste into any AI agent. Aesthetic: **Claude.ai-style warm editorial / quiet-luxury.**
> 中文版见 [`DESIGN.md`](DESIGN.md)。

## In one line
Warm, restrained, generous whitespace, refined and youthful. Establish hierarchy through
**whitespace and subtle tonal differences**, not heavy borders or shadows. Keep information
density **compact and modern** (NOT a "large-print" look); target younger users. Reference
the visual language of Claude.ai.

## Color (warm paper + clay/terracotta)
| Role | Value |
| --- | --- |
| Background | `#F6F5F0` |
| Card / surface | `#FFFFFF` |
| Secondary surface (inputs, soft fills) | `#FBFAF6` |
| Light fill (progress tracks, etc.) | `#F1EFE8` |
| Text primary | `#26241F` |
| Text secondary | `#83827A` |
| Text muted | `#B0AFA5` |
| Accent (clay) | `#CC785C` |
| Accent darker (hover) | `#B5654A` |
| Accent tint (selected / hero) | `#F5ECE5` |
| Border (hairline) | `#ECEAE2` |
| Border lighter (dividers) | `#F0EEE7` |
| Success (desaturated green) | `#6E9079` |
| Warning (desaturated amber) | `#BE9356` |
| Danger (desaturated red) | `#BC6055` |

## Typography
- **Headings & key numbers**: serif `'Tiempos Text', Georgia, 'Songti SC', serif`, weight **500**,
  for an editorial feel.
- **Body**: system sans `ui-sans-serif, system-ui, -apple-system, 'PingFang SC', sans-serif`.
- **Base size 13–14px** (compact). Use `font-variant-numeric: tabular-nums` for all numbers.

## Form & texture
- **Radius**: cards 14px, controls 8px.
- **Shadows**: almost none (at most `0 1px 2px rgba(0,0,0,.03)`).
- **Borders**: hairline, barely there; list items have NO border by default and only reveal
  a faint border on hover.
- **Use accent sparingly**: only for the primary CTA, selected state, and key numbers;
  everything else stays neutral warm-gray.

## Buttons
- **Primary CTA (refined solid)**: solid clay `#CC785C` + white text, weight 500, radius 8px,
  padding `8×16`, font 13px; add a very soft same-hue shadow `0 1px 2px rgba(204,120,92,.25)`;
  on hover darken to `#B5654A` and deepen the shadow; on press `transform: translateY(1px)`.
- **Secondary**: ghost / outline (transparent bg, hairline border, secondary text color),
  hover = subtle background change only.
- **Inline actions (edit / delete, etc.)**: text-only ghost buttons; muted gray normally,
  reveal color on hover (edit → clay, delete → danger red).

## Interaction
- Transitions `0.15s`, soft and restrained.
- **No** lift / glow / glassmorphism / large shadows; hover only changes background or border slightly.

## Density
Compact and modern: moderate-to-small padding, no bulky controls, narrow sidebar (~228px).
Aim for a crisp, youthful tool feel — never a "large-print" layout.

## Data viz (charts)
- Hand-drawn SVG, no chart libraries.
- Warm palette: primary line in clay `#CC785C`; secondary line in desaturated green `#6E9079`
  (dashed); reference/target line in desaturated red `#BC6055` (dashed).
- Very light gridlines `#ECEAE2`; axis labels in muted gray `#B0AFA5`.
- Tooltip on a deep warm bg `#33302A` with white text, radius 10–11px.
