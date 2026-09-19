const buildingMeta = {
  gate: { faculty: 'public', floors: 1 },
  'teaching-a': { faculty: 'cs', floors: 6 },
  library: { faculty: 'public', floors: 5 },
  lab: { faculty: 'cs', floors: 7 },
  academy: { faculty: 'science', floors: 4 },
  innovation: { faculty: 'cs', floors: 5 },
  'dorm-north': { faculty: 'life', floors: 8 },
  'dorm-south': { faculty: 'life', floors: 6 },
  canteen: { faculty: 'life', floors: 2 },
  market: { faculty: 'life', floors: 2 },
  playground: { faculty: 'sports', floors: 1 },
  gym: { faculty: 'sports', floors: 3 },
  pool: { faculty: 'sports', floors: 2 },
  service: { faculty: 'admin', floors: 3 },
  admin: { faculty: 'admin', floors: 4 },
  clinic: { faculty: 'admin', floors: 3 },
  'twin-center': { faculty: 'cs', floors: 6 },
  auditorium: { faculty: 'public', floors: 3 },
  clocktower: { faculty: 'public', floors: 5 },
  'solar-hub': { faculty: 'energy', floors: 5 },
  parking: { faculty: 'admin', floors: 3 }
};

export const faculties = [
  { value: 'all', label: '全部院系' },
  { value: 'cs', label: '信息工程学院' },
  { value: 'science', label: '理学院' },
  { value: 'energy', label: '能源与环境学院' },
  { value: 'life', label: '学生生活区' },
  { value: 'sports', label: '体育教学部' },
  { value: 'admin', label: '行政服务' },
  { value: 'public', label: '校园公共' }
];

export const facultyNames = Object.fromEntries(faculties.map((item) => [item.value, item.label]));

export function applyBuildingMeta(buildings) {
  buildings.forEach((building) => {
    const meta = buildingMeta[building.id];
    if (meta) {
      building.faculty = meta.faculty;
      building.floors = meta.floors;
    }
  });
}
