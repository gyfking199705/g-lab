/**
 * 扫描 aimap/maps/*.json（除 index.json），统计知识点数，生成 aimap/maps/index.json。
 * 用法：node scripts/build-aimap-index.mjs
 * 地图文件 schema：{ id, icon, name, desc, tracks:[{tag,name,clusters:[{name,topics:[string|object]}]}] }
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.cwd(), 'aimap/maps');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json').sort();
const index = [];
let grand = 0;
for (const f of files) {
  const m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  let topics = 0;
  for (const tr of m.tracks || []) for (const cl of tr.clusters || []) topics += (cl.topics || []).length;
  grand += topics;
  index.push({
    file: f, id: m.id, icon: m.icon || '🗺️', name: m.name, desc: m.desc || '',
    tracks: (m.tracks || []).length, topics,
    trackNames: (m.tracks || []).map((t) => t.name),
  });
  console.log(`${f.padEnd(28)} ${String(topics).padStart(4)} 知识点 · ${m.tracks.length} 轨道  ${m.name}`);
}
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index, null, 2));
console.log('—'.repeat(48));
console.log(`共 ${index.length} 张地图 · ${grand} 个知识点 → index.json`);
if (grand < 1000) { console.error('⚠ 总数不足 1000'); process.exit(1); }
