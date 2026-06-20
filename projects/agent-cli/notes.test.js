import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIS, MATRIX, PATTERNS, SOURCES } from './notes.js';
import { matrixToMarkdown, researchReportMarkdown } from './engine.js';

test('CLIS 结构完整且来源下标有效', () => {
  assert.ok(CLIS.length >= 4);
  for (const c of CLIS) {
    assert.ok(c.id && c.name && c.vendor && c.glyph && c.tagline && c.loop);
    assert.ok(Array.isArray(c.rows) && c.rows.length > 0);
    for (const r of c.rows) assert.equal(r.length, 2);
    assert.ok(Array.isArray(c.sources) && c.sources.length > 0);
    for (const s of c.sources) assert.ok(s >= 0 && s < SOURCES.length, `来源下标 ${s} 越界`);
  }
});

test('CLIS id 唯一', () => {
  const ids = CLIS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('MATRIX 列与每行单元数对齐', () => {
  assert.ok(MATRIX.cols.length >= 4);
  assert.ok(MATRIX.rows.length >= 5);
  for (const row of MATRIX.rows) {
    // 第 0 项是维度名，其后每列一个单元
    assert.equal(row.length - 1, MATRIX.cols.length, `行「${row[0]}」单元数与列数不符`);
    for (const cell of row) assert.ok(cell && cell.length > 0);
  }
});

test('PATTERNS 都是 [标题, 说明] 二元组', () => {
  assert.ok(PATTERNS.length >= 5);
  for (const p of PATTERNS) {
    assert.equal(p.length, 2);
    assert.ok(p[0] && p[1]);
  }
});

test('matrixToMarkdown 生成合法表格', () => {
  const md = matrixToMarkdown(MATRIX);
  const lines = md.split('\n');
  assert.ok(lines[0].startsWith('| 维度 |'));
  for (const c of MATRIX.cols) assert.ok(lines[0].includes(c), `表头缺列 ${c}`);
  assert.match(lines[1], /^\| --- \|/); // 分隔行
  assert.equal(lines.length, 2 + MATRIX.rows.length); // 表头 + 分隔 + 每行
  // 每行列数一致（| 数 = 列数 + 2）
  const pipes = (lines[0].match(/\|/g) || []).length;
  for (const l of lines.slice(2)) assert.equal((l.match(/\|/g) || []).length, pipes);
});

test('researchReportMarkdown 含各节与全部条目', () => {
  const md = researchReportMarkdown(CLIS, MATRIX, PATTERNS, SOURCES);
  assert.match(md, /^# Agent CLI 交互研究/);
  assert.ok(md.includes('## 速查矩阵'));
  assert.ok(md.includes('| 维度 |'));
  assert.ok(md.includes('## 各家要点'));
  for (const c of CLIS) assert.ok(md.includes(`### ${c.name}`), `缺 ${c.name}`);
  assert.ok(md.includes('## 共性设计模式'));
  for (const [t] of PATTERNS) assert.ok(md.includes(t), `缺模式 ${t}`);
  assert.ok(md.includes('## 来源'));
  for (const s of SOURCES) assert.ok(md.includes(s.url), `缺来源 ${s.url}`);
});

test('SOURCES 都有 label 与 https URL', () => {
  assert.ok(SOURCES.length > 0);
  for (const s of SOURCES) {
    assert.ok(s.label);
    assert.ok(/^https:\/\//.test(s.url), `非 https 链接：${s.url}`);
  }
});
