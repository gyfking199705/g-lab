import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSkill, parseIndex, filterSkills, categoriesOf, tagsOf,
  validateSkill, slugify, scoreSkill, installCommand,
} from './registry.js';

const RAW = {
  name: 'conventional-commits',
  description: 'Write structured commit messages following the Conventional Commits spec.',
  license: 'MIT',
  'allowed-tools': 'Bash(git*), Read',
  metadata: { category: 'Git', version: '1.0.0', tags: ['git', 'commits'], author: 'g-lab' },
};

test('normalizeSkill flattens metadata and tools', () => {
  const s = normalizeSkill(RAW, 'conventional-commits');
  assert.equal(s.slug, 'conventional-commits');
  assert.equal(s.category, 'Git');
  assert.equal(s.version, '1.0.0');
  assert.deepEqual(s.allowedTools, ['Bash(git*)', 'Read']);
  assert.deepEqual(s.tags, ['git', 'commits']);
  assert.equal(s.path, 'skills/conventional-commits/SKILL.md');
});

test('normalizeSkill tolerates missing fields', () => {
  const s = normalizeSkill({ name: 'x' });
  assert.equal(s.category, 'Uncategorized');
  assert.equal(s.version, '0.1.0');
  assert.deepEqual(s.tags, []);
});

test('parseIndex accepts array or {skills}', () => {
  assert.equal(parseIndex([RAW]).length, 1);
  assert.equal(parseIndex({ skills: [RAW] }).length, 1);
  assert.deepEqual(parseIndex(null), []);
});

test('filterSkills by query across fields', () => {
  const list = parseIndex([RAW, { name: 'pr-writer', description: 'pull requests', metadata: { category: 'Git', tags: ['pr'] } }]);
  assert.equal(filterSkills(list, { query: 'commit' }).length, 1);
  assert.equal(filterSkills(list, { query: 'git' }).length, 2);
  assert.equal(filterSkills(list, { query: 'pull' })[0].name, 'pr-writer');
});

test('filterSkills by category and multi-token AND', () => {
  const list = parseIndex([RAW, { name: 'review', description: 'review code', metadata: { category: 'Quality' } }]);
  assert.equal(filterSkills(list, { category: 'Git' }).length, 1);
  assert.equal(filterSkills(list, { query: 'commit messages' }).length, 1);
  assert.equal(filterSkills(list, { query: 'commit nonexistent' }).length, 0);
});

test('categoriesOf counts and sorts', () => {
  const list = parseIndex([RAW, { name: 'a', metadata: { category: 'Git' } }, { name: 'b', metadata: { category: 'Quality' } }]);
  const cats = categoriesOf(list);
  assert.deepEqual(cats[0], { name: 'Git', count: 2 });
});

test('tagsOf aggregates tags', () => {
  const list = parseIndex([RAW, { name: 'a', metadata: { tags: ['git'] } }]);
  const tags = tagsOf(list);
  assert.equal(tags.find((t) => t.name === 'git').count, 2);
});

test('validateSkill flags bad name and short description', () => {
  assert.deepEqual(validateSkill({ name: 'conventional-commits', description: 'A clear, specific description.' }), []);
  assert.ok(validateSkill({ name: 'Bad Name', description: 'A clear, specific description.' }).length);
  assert.ok(validateSkill({ name: 'ok-name', description: 'short' }).length);
  assert.ok(validateSkill({ name: '', description: '' }).length >= 2);
});

test('slugify', () => {
  assert.equal(slugify('Conventional Commits!'), 'conventional-commits');
});

test('scoreSkill gives full marks to a complete skill', () => {
  const skill = normalizeSkill(
    { ...RAW, description: 'Write structured commit messages. Use when committing changes.' },
    'conventional-commits');
  const body = `# Title\n\n## When to use\nUse when committing.\n\n` +
    '```\nfeat: x\n```\n' + 'x'.repeat(400);
  const r = scoreSkill(skill, body);
  assert.equal(r.score, 100);
  assert.equal(r.grade, 'A');
  assert.ok(r.checks.every((c) => c.ok));
});

test('scoreSkill penalizes missing description cue, examples, body', () => {
  const skill = normalizeSkill({ name: 'thin', description: 'does a thing somehow ok', metadata: {} });
  const r = scoreSkill(skill, '');
  assert.ok(r.score < 60);
  assert.equal(r.grade, 'D');
  assert.ok(r.checks.find((c) => c.label.includes('示例')).ok === false);
});

test('scoreSkill detects when-cue in description', () => {
  const withCue = scoreSkill({ name: 'a', description: 'Do X. Use when you need Y.' }, '');
  const noCue = scoreSkill({ name: 'a', description: 'Just does X and nothing else here.' }, '');
  const cueCheck = (r) => r.checks.find((c) => c.label.includes('触发线索')).ok;
  assert.equal(cueCheck(withCue), true);
  assert.equal(cueCheck(noCue), false);
});

test('installCommand builds user and project scoped commands', () => {
  assert.equal(installCommand('code-reviewer'),
    'mkdir -p ~/.claude/skills && cp -r projects/skill-lab/skills/code-reviewer ~/.claude/skills/code-reviewer');
  assert.match(installCommand('code-reviewer', 'project'), /^mkdir -p \.claude\/skills /);
});
