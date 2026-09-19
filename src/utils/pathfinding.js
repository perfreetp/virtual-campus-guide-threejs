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

// 边标记：walkOnly 表示步行街 / 健身步道，骑行模式不可通行；bikeAvenue 为骑行主通道
const roadEdges = [
  ['n_gate', 'n_clock', { bikeAvenue: true }],
  ['n_clock', 'n_gym', { bikeAvenue: true }],
  ['n_gym', 'n_west_mid', { bikeAvenue: true }],
  ['n_west_mid', 'n_center', { bikeAvenue: true }],
  ['n_center', 'n_east_mid', { bikeAvenue: true }],
  ['n_east_mid', 'n_innovation', { bikeAvenue: true }],
  ['n_innovation', 'n_parking', { bikeAvenue: true }],
  ['n_parking', 'n_dorm_north', { bikeAvenue: true }],
  ['n_dorm_north', 'n_dorm_south', { bikeAvenue: true }],
  ['n_west_mid', 'n_west_north', { bikeAvenue: true }],
  ['n_west_north', 'n_academy'],
  ['n_west_north', 'n_playground', { walkOnly: true }],
  ['n_playground', 'n_pool', { walkOnly: true }],
  ['n_west_mid', 'n_twin', { walkOnly: true }],
  ['n_west_mid', 'n_library', { walkOnly: true }],
  ['n_pool', 'n_twin', { walkOnly: true }],
  ['n_twin', 'n_library', { bikeAvenue: true }],
  ['n_library', 'n_center', { bikeAvenue: true }],
  ['n_center', 'n_admin'],
  ['n_center', 'n_canteen', { bikeAvenue: true }],
  ['n_canteen', 'n_market'],
  ['n_canteen', 'n_dorm_north', { bikeAvenue: true }],
  ['n_east_mid', 'n_east_north', { bikeAvenue: true }],
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

const UNIT_METERS = 5;
const MODE_SPEED = { walk: 1.4, bike: 4.2 };
const BIKE_AVENUE_FACTOR = 0.82;
const MODE_LABEL = { walk: '步行', bike: '骑行' };

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function buildGraph(mode) {
  const nodes = new Map(roadNodes.map((node) => [node.id, { ...node, edges: [] }]));
  roadEdges.forEach(([from, to, flags = {}]) => {
    if (mode === 'bike' && flags.walkOnly) {
      return;
    }

    const a = nodes.get(from);
    const b = nodes.get(to);
    const weight = distance(a, b) * (mode === 'bike' && flags.bikeAvenue ? BIKE_AVENUE_FACTOR : 1);
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

function aStar(graph, startNodeId, endNodeId) {
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
      return path;
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

  return null;
}

function resolveAnchor(building) {
  if (!building) {
    return '';
  }

  return buildingAnchors[building.id]
    || nearestNodeId({ x: building.position[0], z: building.position[2] });
}

function describeUnreachable(endBuilding, walkSucceeds) {
  if (walkSucceeds) {
    return `「${endBuilding.name}」位于步行街区，骑行无法直达，请切换步行模式或就近停车后步行前往`;
  }

  return `当前校园路网暂未连通「${endBuilding.name}」，请选择其他地点`;
}

export function planCampusRoute(stopBuildings, mode = 'walk') {
  const stops = (stopBuildings || []).filter(Boolean);
  const emptyPlan = {
    reachable: false,
    mode,
    stops,
    points: [],
    segments: [],
    distance: 0,
    distanceMeters: 0,
    etaMinutes: 0,
    unreachableLeg: null
  };

  if (stops.length < 2) {
    return emptyPlan;
  }

  const graph = buildGraph(mode);
  const walkGraph = buildGraph('walk');
  const segments = [];
  let totalDistance = 0;
  const points = [];

  for (let index = 0; index < stops.length - 1; index += 1) {
    const from = stops[index];
    const to = stops[index + 1];
    const segment = {
      fromId: from.id,
      toId: to.id,
      fromName: from.name,
      toName: to.name,
      points: [],
      distance: 0
    };

    if (from.id === to.id) {
      segment.points = [{ x: from.position[0], z: from.position[2] }];
      segments.push(segment);
      continue;
    }

    const startNodeId = resolveAnchor(from);
    const endNodeId = resolveAnchor(to);
    const nodePath = aStar(graph, startNodeId, endNodeId);

    if (!nodePath) {
      const walkPath = aStar(walkGraph, resolveAnchor(from), resolveAnchor(to));
      return {
        ...emptyPlan,
        stops,
        points,
        segments,
        distance: totalDistance,
        distanceMeters: Math.round(totalDistance * UNIT_METERS),
        unreachableLeg: {
          fromId: from.id,
          toId: to.id,
          reason: describeUnreachable(to, Boolean(walkPath))
        }
      };
    }

    const segmentPoints = [
      { x: from.position[0], z: from.position[2] },
      ...nodePath.slice(1, -1).map((id) => {
        const node = graph.get(id);
        return { x: node.x, z: node.z };
      }),
      { x: to.position[0], z: to.position[2] }
    ];
    segment.points = segmentPoints;
    segment.distance = segmentPoints.reduce((sum, point, pointIndex) => {
      if (pointIndex === 0) {
        return 0;
      }
      const previous = segmentPoints[pointIndex - 1];
      return sum + Math.hypot(point.x - previous.x, point.z - previous.z);
    }, 0);

    segmentPoints.forEach((point) => {
      const previous = points.at(-1);
      if (!previous || Math.hypot(previous.x - point.x, previous.z - point.z) > 0.01) {
        points.push(point);
      }
    });
    totalDistance += segment.distance;
    segments.push(segment);
  }

  const distanceMeters = Math.round(totalDistance * UNIT_METERS);
  const etaMinutes = Math.max(1, Math.round((distanceMeters / MODE_SPEED[mode] / 60) * 10) / 10);

  return {
    reachable: true,
    mode,
    stops,
    points,
    segments,
    distance: totalDistance,
    distanceMeters,
    etaMinutes,
    unreachableLeg: null
  };
}

export { MODE_LABEL, UNIT_METERS };

export function toMiniMapPoint(point) {
  return {
    x: ((point.x + 22) / 44) * 100,
    y: ((point.z + 17) / 34) * 100
  };
}
