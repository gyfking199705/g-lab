import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKUP_KEYS,
  SYNC_FILENAME,
  gatherBackup,
  extractModules,
  applyBackup,
  buildMultipartBody,
  stableStringify,
  signatureOf,
  FILE_MAP,
  fileForKey,
  keyForFile,
  filesToModules,
  perKeySig,
  buildReadme,
} from './backup.js';

function memStore(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    get: (k) => (m.has(k) ? m.get(k) : null),
    set: (k, v) => m.set(k, v),
    map: m,
  };
}

test('BACKUP_KEYS：不含含密键，含各模块数据键', () => {
  assert.ok(!BACKUP_KEYS.includes('learning-ai')); // AI Key 不入备份
  assert.ok(!BACKUP_KEYS.includes('sync-client-id'));
  for (const k of ['learning-planner', 'fitness-planner', 'savings-planner', 'stocks-watch', 'schedule-planner', 'goals-planner', 'habits-planner', 'cut-planner', 'papers-planner']) {
    assert.ok(BACKUP_KEYS.includes(k), `应包含 ${k}`);
  }
  assert.equal(SYNC_FILENAME, 'g-lab-sync.json');
});

test('gatherBackup：采集存在的键、跳过缺失与损坏', () => {
  const s = memStore({
    'learning-planner': JSON.stringify({ plans: [1] }),
    'savings-planner': JSON.stringify({ a: 1 }),
    'stocks-watch': '{坏的 json', // 损坏
    'learning-ai': JSON.stringify({ apiKey: 'sk-secret' }), // 不在 BACKUP_KEYS，不应被采集
  });
  const blob = gatherBackup(s.get);
  assert.equal(blob.app, 'growth-planner');
  assert.deepEqual(blob.modules['learning-planner'], { plans: [1] });
  assert.deepEqual(blob.modules['savings-planner'], { a: 1 });
  assert.ok(!('stocks-watch' in blob.modules)); // 损坏被跳过
  assert.ok(!('learning-ai' in blob.modules)); // 密钥不入备份
});

test('extractModules：兼容 {modules} 与裸对象；非法抛错', () => {
  assert.deepEqual(extractModules({ modules: { 'savings-planner': { a: 1 } } }), { 'savings-planner': { a: 1 } });
  assert.deepEqual(extractModules({ 'savings-planner': { a: 1 } }), { 'savings-planner': { a: 1 } });
  assert.throws(() => extractModules(null), /格式/);
  assert.throws(() => extractModules('x'), /格式/);
});

test('applyBackup：仅写回 BACKUP_KEYS 内存在的键，返回数量', () => {
  const s = memStore();
  const n = applyBackup(s.set, { 'savings-planner': { a: 1 }, 'learning-ai': { apiKey: 'x' }, 'unknown-key': { b: 2 } });
  assert.equal(n, 1); // 只有 savings-planner 被写
  assert.equal(s.map.get('savings-planner'), JSON.stringify({ a: 1 }));
  assert.equal(s.map.has('learning-ai'), false); // 即便备份里有也不写（不在 BACKUP_KEYS）
  assert.equal(s.map.has('unknown-key'), false);
});

test('gather → extract → apply 往返一致', () => {
  const src = memStore({
    'learning-planner': JSON.stringify({ plans: [{ id: 'p1' }] }),
    'fitness-planner': JSON.stringify({ workouts: [] }),
    'savings-planner': JSON.stringify({ netWorth: { snapshots: [] } }),
  });
  const blob = gatherBackup(src.get);
  const dst = memStore();
  const n = applyBackup(dst.set, extractModules(blob));
  assert.equal(n, 3);
  for (const k of ['learning-planner', 'fitness-planner', 'savings-planner']) {
    assert.equal(dst.map.get(k), src.get(k));
  }
});

test('signatureOf：与键顺序无关、内容变化即变化（用于自动同步判断）', () => {
  const a = { 'savings-planner': { x: 1, y: 2 }, 'stocks-watch': { list: ['A', 'B'] } };
  const b = { 'stocks-watch': { list: ['A', 'B'] }, 'savings-planner': { y: 2, x: 1 } }; // 键顺序不同
  assert.equal(signatureOf(a), signatureOf(b)); // 同内容 → 同签名
  const c = { 'savings-planner': { x: 1, y: 3 } };
  assert.notEqual(signatureOf(a), signatureOf(c)); // 内容不同 → 签名不同
  assert.equal(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}'); // 键排序
});

test('文件系统映射：fileForKey / keyForFile 往返，覆盖所有备份键', () => {
  for (const k of BACKUP_KEYS) {
    const f = fileForKey(k);
    assert.ok(f.endsWith('.json'));
    assert.equal(keyForFile(f), k); // 往返一致
  }
  assert.equal(keyForFile('陌生文件.json'), null);
  assert.equal(FILE_MAP.length, BACKUP_KEYS.length);
});

test('filesToModules：按文件名还原 modules、跳过无关/损坏文件', () => {
  const files = [
    { name: fileForKey('savings-planner'), text: JSON.stringify({ a: 1 }) },
    { name: fileForKey('learning-planner'), text: JSON.stringify({ plans: [] }) },
    { name: '说明.txt', text: 'hi' }, // 非模块文件
    { name: fileForKey('stocks-watch'), text: '{坏' }, // 损坏
  ];
  const mods = filesToModules(files);
  assert.deepEqual(mods['savings-planner'], { a: 1 });
  assert.deepEqual(mods['learning-planner'], { plans: [] });
  assert.ok(!('stocks-watch' in mods));
});

test('perKeySig：逐模块签名、只含存在的键', () => {
  const sig = perKeySig({ 'savings-planner': { x: 1 }, 'learning-ai': { apiKey: 'x' } });
  assert.ok(sig['savings-planner']);
  assert.ok(!('learning-ai' in sig)); // 不在 BACKUP_KEYS
});

test('buildReadme：含文件名映射与最小权限说明', () => {
  const txt = buildReadme();
  assert.match(txt, /财富规划\.json/);
  assert.match(txt, /drive\.file/);
});

test('buildMultipartBody：包含元数据、媒体与分隔符', () => {
  const body = buildMultipartBody({ name: 'g-lab-sync.json', parents: ['appDataFolder'] }, '{"x":1}', 'BOUND');
  assert.match(body, /--BOUND/);
  assert.match(body, /appDataFolder/);
  assert.match(body, /\{"x":1\}/);
  assert.match(body, /--BOUND--$/);
});
