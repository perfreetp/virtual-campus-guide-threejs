const roadNodes = [
  ['n_gate', -14.5, 8.6],
  ['n_clock', -14.5, 4.1],
  ['n_gym', -14.5, 2.5],
  ['n_west_mid', -9.6, 2.5],
  ['n_west_north', -9.6, -7.3],
  ['n_academy', -14.5, -7.3],
  ['n_playground', -9.6, -10.6],
  ['n_pool', 1.5, -10.6],
  ['n_twin', 1.5, -7.3],
  ['n_library', 1.5, -3.5],
  ['n_center', 1.5, 2.5],
  ['n_admin', 5.4, 4.1],
  ['n_canteen', 1.5, 8.6],
  ['n_market', -6.8, 8.6],
  ['n_east_mid', 11.8, 2.5],
  ['n_east_north', 11.8, -7.3],
  ['n_lab', 11.8, -8.8],
  ['n_solar', 8.5, -10.6],
  ['n_clinic', 15.2, -4.4],
  ['n_innovation', 15.2, 2.5],
  ['n_dorm_north', 11.8, 8.6],
  ['n_dorm_south', 15.2, 10.2],
  ['n_parking', 15.2, 6.2]
].map(([id, x, z]) => ({ id, x, z }));

const roadEdges = [
  ['n_gate', 'n_clock'],
  ['n_clock', 'n_gym'],
  ['n_gym', 'n_west_mid'],
  ['n_west_mid', 'n_center'],
  ['n_center', 'n_east_mid'],
  ['n_east_mid', 'n_innovation'],
  ['n_innovation', 'n_parking'],
  ['n_parking', 'n_dorm_north'],
  ['n_dorm_north', 'n_dorm_south'],
  ['n_west_mid', 'n_west_north'],
  ['n_west_north', 'n_academy'],
  ['n_west_north', 'n_playground'],
  ['n_playground', 'n_pool'],
  ['n_pool', 'n_twin'],
  ['n_twin', 'n_library'],
  ['n_library', 'n_center'],
  ['n_center', 'n_admin'],
  ['n_center', 'n_canteen'],
  ['n_canteen', 'n_market'],
  ['n_canteen', 'n_dorm_north'],
  ['n_east_mid', 'n_east_north'],
  ['n_east_north', 'n_lab'],
  ['n_east_north', 'n_solar'],
  ['n_east_north', 'n_clinic'],
  ['n_clinic', 'n_innovation']
];

const buildingAnchors = {
  gate: 'n_gate',
  'teaching-a': 'n_library',
  library: 'n_library',
  lab: 'n_lab',
  academy: 'n_academy',
  innovation: 'n_innovation',
  'dorm-north': 'n_dorm_north',
  'dorm-south': 'n_dorm_south',
  canteen: 'n_canteen',
  market: 'n_market',
  playground: 'n_playground',
  gym: 'n_gym',
  pool: 'n_pool',
  service: 'n_west_mid',
  admin: 'n_admin',
  clinic: 'n_clinic',
  'twin-center': 'n_twin',
  auditorium: 'n_center',
  clocktower: 'n_clock',
  'solar-hub': 'n_solar',
  parking: 'n_parking'
};

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function buildGraph() {
  const nodes = new Map(roadNodes.map((node) => [node.id, { ...node, edges: [] }]));
  roadEdges.forEach(([from, to]) => {
    const a = nodes.get(from);
    const b = nodes.get(to);
    const weight = distance(a, b);
    a.edges.push({ id: to, weight });
    b.edges.push({ id: from, weight });
  });
  return nodes;
}

function nearestNodeId(point) {
  return roadNodes.reduce((nearest, node) => {
    return distance(point, node) < distance(point, nearest) ? node : nearest;
  }, roadNodes[0]).id;
}

export function findCampusPath(startBuilding, endBuilding) {
  if (!startBuilding || !endBuilding) {
    return [];
  }

  const graph = buildGraph();
  const startNodeId = buildingAnchors[startBuilding.id] || nearestNodeId({ x: startBuilding.position[0], z: startBuilding.position[2] });
  const endNodeId = buildingAnchors[endBuilding.id] || nearestNodeId({ x: endBuilding.position[0], z: endBuilding.position[2] });
  const open = new Set([startNodeId]);
  const cameFrom = new Map();
  const gScore = new Map([[startNodeId, 0]]);
  const fScore = new Map([[startNodeId, distance(graph.get(startNodeId), graph.get(endNodeId))]]);

  while (open.size) {
    const current = [...open].reduce((best, id) => {
      return (fScore.get(id) ?? Infinity) < (fScore.get(best) ?? Infinity) ? id : best;
    }, [...open][0]);

    if (current === endNodeId) {
      const path = [current];
      let cursor = current;
      while (cameFrom.has(cursor)) {
        cursor = cameFrom.get(cursor);
        path.unshift(cursor);
      }

      return [
        { x: startBuilding.position[0], z: startBuilding.position[2] },
        ...path.map((id) => {
          const node = graph.get(id);
          return { x: node.x, z: node.z };
        }),
        { x: endBuilding.position[0], z: endBuilding.position[2] }
      ];
    }

    open.delete(current);
    graph.get(current).edges.forEach((edge) => {
      const tentative = (gScore.get(current) ?? Infinity) + edge.weight;
      if (tentative < (gScore.get(edge.id) ?? Infinity)) {
        cameFrom.set(edge.id, current);
        gScore.set(edge.id, tentative);
        fScore.set(edge.id, tentative + distance(graph.get(edge.id), graph.get(endNodeId)));
        open.add(edge.id);
      }
    });
  }

  return [
    { x: startBuilding.position[0], z: startBuilding.position[2] },
    { x: endBuilding.position[0], z: endBuilding.position[2] }
  ];
}

export function toMiniMapPoint(point) {
  return {
    x: ((point.x + 22) / 44) * 100,
    y: ((point.z + 17) / 34) * 100
  };
}
