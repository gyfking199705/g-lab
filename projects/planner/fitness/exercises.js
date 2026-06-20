/**
 * 内置动作库 + 训练计划模板
 * ------------------------------------------------------------------
 * 纯数据。动作含肌群与类型；模板可一键生成「分化训练计划」（如推/拉/腿）。
 */

export const MUSCLES = ['胸', '背', '腿', '臀', '肩', '手臂', '核心', '有氧'];

/** 动作库：{ id, name, muscle, type, equipment } */
export const EXERCISES = [
  { id: 'bench', name: '杠铃卧推', muscle: '胸', type: '力量', equipment: '杠铃' },
  { id: 'incline-db-press', name: '上斜哑铃卧推', muscle: '胸', type: '力量', equipment: '哑铃' },
  { id: 'pushup', name: '俯卧撑', muscle: '胸', type: '力量', equipment: '自重' },
  { id: 'chest-fly', name: '飞鸟夹胸', muscle: '胸', type: '力量', equipment: '哑铃' },
  { id: 'deadlift', name: '硬拉', muscle: '背', type: '力量', equipment: '杠铃' },
  { id: 'pullup', name: '引体向上', muscle: '背', type: '力量', equipment: '自重' },
  { id: 'barbell-row', name: '杠铃划船', muscle: '背', type: '力量', equipment: '杠铃' },
  { id: 'lat-pulldown', name: '高位下拉', muscle: '背', type: '力量', equipment: '器械' },
  { id: 'squat', name: '杠铃深蹲', muscle: '腿', type: '力量', equipment: '杠铃' },
  { id: 'leg-press', name: '腿举', muscle: '腿', type: '力量', equipment: '器械' },
  { id: 'lunge', name: '箭步蹲', muscle: '腿', type: '力量', equipment: '哑铃' },
  { id: 'leg-curl', name: '腿弯举', muscle: '腿', type: '力量', equipment: '器械' },
  { id: 'hip-thrust', name: '臀冲', muscle: '臀', type: '力量', equipment: '杠铃' },
  { id: 'glute-bridge', name: '臀桥', muscle: '臀', type: '力量', equipment: '自重' },
  { id: 'ohp', name: '站姿肩上推举', muscle: '肩', type: '力量', equipment: '杠铃' },
  { id: 'lateral-raise', name: '侧平举', muscle: '肩', type: '力量', equipment: '哑铃' },
  { id: 'face-pull', name: '面拉', muscle: '肩', type: '力量', equipment: '绳索' },
  { id: 'biceps-curl', name: '二头弯举', muscle: '手臂', type: '力量', equipment: '哑铃' },
  { id: 'triceps-pushdown', name: '三头下压', muscle: '手臂', type: '力量', equipment: '绳索' },
  { id: 'plank', name: '平板支撑', muscle: '核心', type: '力量', equipment: '自重' },
  { id: 'crunch', name: '卷腹', muscle: '核心', type: '力量', equipment: '自重' },
  { id: 'hanging-leg-raise', name: '悬垂举腿', muscle: '核心', type: '力量', equipment: '自重' },
  { id: 'run', name: '跑步', muscle: '有氧', type: '有氧', equipment: '无' },
  { id: 'cycling', name: '骑行', muscle: '有氧', type: '有氧', equipment: '无' },
  { id: 'jump-rope', name: '跳绳', muscle: '有氧', type: '有氧', equipment: '无' },
  { id: 'rowing', name: '划船机', muscle: '有氧', type: '有氧', equipment: '器械' },
];

/** 在内置库 + 自定义动作里按 id 查找。 */
export function findExercise(id, custom = []) {
  return (custom || []).find((e) => e.id === id) || EXERCISES.find((e) => e.id === id) || null;
}

/** 合并内置 + 自定义，供选择器使用。 */
export function allExercises(custom = []) {
  return [...EXERCISES, ...(custom || [])];
}

/**
 * 训练计划模板：一个模板可展开成一个或多个「训练日」(routine)。
 * items 的 exId 引用动作库；sets/reps 为目标组数与次数。
 */
export const ROUTINE_TEMPLATES = [
  {
    id: 'fullbody',
    name: '全身训练（新手友好）',
    desc: '每周 3 次、覆盖全身大肌群，最适合入门建立动作模式。',
    routines: [
      {
        name: '全身训练 A',
        items: [
          { exId: 'squat', sets: 3, reps: 8 },
          { exId: 'bench', sets: 3, reps: 8 },
          { exId: 'barbell-row', sets: 3, reps: 8 },
          { exId: 'ohp', sets: 2, reps: 10 },
          { exId: 'plank', sets: 3, reps: 30 },
        ],
      },
    ],
  },
  {
    id: 'ppl',
    name: '推 / 拉 / 腿 三分化',
    desc: '经典三分化，每周 3~6 练，进阶涨力量与维度。',
    routines: [
      {
        name: '推（胸·肩·三头）',
        items: [
          { exId: 'bench', sets: 4, reps: 8 },
          { exId: 'ohp', sets: 3, reps: 10 },
          { exId: 'incline-db-press', sets: 3, reps: 10 },
          { exId: 'lateral-raise', sets: 3, reps: 15 },
          { exId: 'triceps-pushdown', sets: 3, reps: 12 },
        ],
      },
      {
        name: '拉（背·二头）',
        items: [
          { exId: 'deadlift', sets: 3, reps: 5 },
          { exId: 'pullup', sets: 4, reps: 8 },
          { exId: 'barbell-row', sets: 3, reps: 10 },
          { exId: 'lat-pulldown', sets: 3, reps: 12 },
          { exId: 'biceps-curl', sets: 3, reps: 12 },
        ],
      },
      {
        name: '腿（股·臀）',
        items: [
          { exId: 'squat', sets: 4, reps: 8 },
          { exId: 'leg-press', sets: 3, reps: 12 },
          { exId: 'lunge', sets: 3, reps: 12 },
          { exId: 'hip-thrust', sets: 3, reps: 12 },
        ],
      },
    ],
  },
  {
    id: 'upperlower',
    name: '上 / 下肢分化',
    desc: '每周 4 练，力量与频率兼顾。',
    routines: [
      {
        name: '上肢',
        items: [
          { exId: 'bench', sets: 4, reps: 8 },
          { exId: 'barbell-row', sets: 4, reps: 8 },
          { exId: 'ohp', sets: 3, reps: 10 },
          { exId: 'lat-pulldown', sets: 3, reps: 12 },
          { exId: 'biceps-curl', sets: 3, reps: 12 },
          { exId: 'triceps-pushdown', sets: 3, reps: 12 },
        ],
      },
      {
        name: '下肢',
        items: [
          { exId: 'squat', sets: 4, reps: 8 },
          { exId: 'deadlift', sets: 3, reps: 5 },
          { exId: 'leg-press', sets: 3, reps: 12 },
          { exId: 'lunge', sets: 3, reps: 12 },
          { exId: 'plank', sets: 3, reps: 45 },
        ],
      },
    ],
  },
];

export function getRoutineTemplate(id) {
  return ROUTINE_TEMPLATES.find((t) => t.id === id) || null;
}
