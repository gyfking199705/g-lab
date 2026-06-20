import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitFrontmatter, parseFrontmatter, parseYaml } from './frontmatter.js';

const SAMPLE = `---
name: conventional-commits
description: "Write structured commit messages: feat, fix, docs."
license: MIT
allowed-tools: Bash(git*), Read
metadata:
  category: Git
  version: 1.2.0
  tags: [git, commits]
  authors:
    - alice
    - bob
---
# Body heading

Hello world.`;

test('splits frontmatter from body', () => {
  const { data, body } = splitFrontmatter(SAMPLE);
  assert.equal(data.name, 'conventional-commits');
  assert.match(body, /^# Body heading/);
  assert.match(body, /Hello world\./);
});

test('parses quoted strings with colons inside', () => {
  const { data } = splitFrontmatter(SAMPLE);
  assert.equal(data.description, 'Write structured commit messages: feat, fix, docs.');
});

test('parses nested metadata object', () => {
  const { data } = splitFrontmatter(SAMPLE);
  assert.equal(data.metadata.category, 'Git');
  assert.equal(data.metadata.version, '1.2.0');
});

test('parses inline list', () => {
  const { data } = splitFrontmatter(SAMPLE);
  assert.deepEqual(data.metadata.tags, ['git', 'commits']);
});

test('parses block list', () => {
  const { data } = splitFrontmatter(SAMPLE);
  assert.deepEqual(data.metadata.authors, ['alice', 'bob']);
});

test('handles missing frontmatter gracefully', () => {
  const { data, body } = splitFrontmatter('no frontmatter here');
  assert.deepEqual(data, {});
  assert.equal(body, 'no frontmatter here');
});

test('strips inline comments outside quotes', () => {
  const data = parseYaml('name: foo # a comment\ndescription: "a # b"');
  assert.equal(data.name, 'foo');
  assert.equal(data.description, 'a # b');
});

test('coerces booleans and numbers', () => {
  const data = parseYaml('enabled: true\ncount: 3\nratio: 1.5');
  assert.equal(data.enabled, true);
  assert.equal(data.count, 3);
  assert.equal(data.ratio, 1.5);
});

test('parseFrontmatter convenience returns data only', () => {
  assert.equal(parseFrontmatter(SAMPLE).name, 'conventional-commits');
});

test('handles CRLF line endings', () => {
  const { data } = splitFrontmatter('---\r\nname: x\r\n---\r\nbody');
  assert.equal(data.name, 'x');
});
