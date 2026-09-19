export const departments = [
  { label: '全部院系', value: 'all' },
  { label: '信息工程学院', value: 'info' },
  { label: '理学院', value: 'science' },
  { label: '经济管理学院', value: 'economy' },
  { label: '体育教研部', value: 'pe' },
  { label: '学生生活区', value: 'life' },
  { label: '公共服务', value: 'public' }
];

export const departmentNames = departments.reduce((map, item) => {
  map[item.value] = item.label;
  return map;
}, {});

// 各楼栋人流基础数据：院系归属、楼层数、容纳上限与基准在楼人数
export const buildingCrowdBase = {
  gate: { department: 'public', floors: 1, capacity: 320, basePeople: 148 },
  'teaching-a': { department: 'info', floors: 6, capacity: 1800, basePeople: 1240 },
  library: { department: 'info', floors: 5, capacity: 2200, basePeople: 1560 },
  lab: { department: 'science', floors: 7, capacity: 1200, basePeople: 640 },
  academy: { department: 'science', floors: 4, capacity: 900, basePeople: 420 },
  innovation: { department: 'economy', floors: 5, capacity: 800, basePeople: 510 },
  'dorm-north': { department: 'life', floors: 12, capacity: 2400, basePeople: 1730 },
  'dorm-south': { department: 'life', floors: 8, capacity: 1600, basePeople: 980 },
  canteen: { department: 'life', floors: 3, capacity: 1500, basePeople: 1180 },
  market: { department: 'life', floors: 2, capacity: 600, basePeople: 330 },
  playground: { department: 'pe', floors: 1, capacity: 2000, basePeople: 460 },
  gym: { department: 'pe', floors: 3, capacity: 1600, basePeople: 720 },
  pool: { department: 'pe', floors: 2, capacity: 500, basePeople: 260 },
  service: { department: 'public', floors: 3, capacity: 500, basePeople: 210 },
  admin: { department: 'public', floors: 4, capacity: 600, basePeople: 240 },
  clinic: { department: 'public', floors: 3, capacity: 400, basePeople: 130 },
  'twin-center': { department: 'info', floors: 6, capacity: 700, basePeople: 380 },
  auditorium: { department: 'public', floors: 2, capacity: 1800, basePeople: 540 },
  clocktower: { department: 'public', floors: 2, capacity: 200, basePeople: 60 },
  'solar-hub': { department: 'science', floors: 5, capacity: 900, basePeople: 470 },
  parking: { department: 'public', floors: 3, capacity: 450, basePeople: 120 }
};

export const crowdLevels = [
  { key: 'smooth', label: '顺畅', color: '#2ee6a8', max: 0.6 },
  { key: 'busy', label: '较拥挤', color: '#ffc44d', max: 0.85 },
  { key: 'warning', label: '预警', color: '#ff5d6c', max: Infinity }
];

export function getCrowdLevel(ratio) {
  return crowdLevels.find((level) => ratio < level.max) || crowdLevels[crowdLevels.length - 1];
}

// 基于基准值生成一份带随机波动的“实时”人流快照
export function createCrowdSnapshot(buildings) {
  return buildings.reduce((map, building) => {
    const base = buildingCrowdBase[building.id];
    if (!base) {
      return map;
    }

    const jitter = 0.78 + Math.random() * 0.5;
    const people = Math.min(base.capacity, Math.round(base.basePeople * jitter));
    const ratio = people / base.capacity;
    const level = getCrowdLevel(ratio);
    map[building.id] = {
      buildingId: building.id,
      department: base.department,
      floors: base.floors,
      capacity: base.capacity,
      people,
      ratio,
      level: level.key,
      levelLabel: level.label,
      color: level.color,
      warning: level.key === 'warning'
        ? '人流超过预警阈值，建议错峰前往并开启分流引导'
        : level.key === 'busy'
          ? '客流较高，请留意现场秩序'
          : '客流平稳，通行顺畅'
    };
    return map;
  }, {});
}
