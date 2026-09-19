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

// 步行专用捷径（穿越广场与绿地的小径），骑行网络不包含这些边
const walkOnlyEdges = [
  ['n_clock', 'n_west_mid'],
  ['n_center', 'n_market'],
  ['n_twin', 'n_west_north']
];

// 骑行不可进入的建筑（步行区域，如运动场内部）
const bikeRestrictedBuildings = ['playground', 'pool'];

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

// 场景坐标换算为实际距离（1 单位 ≈ 30 米）
export const METERS_PER_UNIT = 30;
export const TRAVEL_MODES = {
  walk: { label: '步行', metersPerMinute: 80 },
  bike: { label: '骑行', metersPerMinute: 220 }
};

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function buildGraph(mode = 'walk') {
  const nodes = new Map(roadNodes.map((node) => [node.id, { ...node, edges: [] }]));
  const edges = mode === 'bike' ? roadEdges : [...roadEdges, ...walkOnlyEdges];
  edges.forEach(([from, to]) => {
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

function anchorNodeId(building) {
  return buildingAnchors[building.id] || nearestNodeId({ x: building.position[0], z: building.position[2] });
}

function findNodePath(graph, startNodeId, endNodeId) {
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

export function findCampusPath(startBuilding, endBuilding, mode = 'walk') {
  if (!startBuilding || !endBuilding) {
    return [];
  }

  const graph = buildGraph(mode);
  const startNodeId = anchorNodeId(startBuilding);
  const endNodeId = anchorNodeId(endBuilding);
  const path = findNodePath(graph, startNodeId, endNodeId);

  if (!path) {
    return [];
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

function pathLength(points) {
  return points.reduce((total, point, index) => {
    if (index === 0) {
      return 0;
    }
    const previous = points[index - 1];
    return total + Math.hypot(point.x - previous.x, point.z - previous.z);
  }, 0);
}

function optimizeStopOrder(startId, waypointIds, endId, buildingsById, mode) {
  const graph = buildGraph(mode);
  const nodeOf = (id) => anchorNodeId(buildingsById.get(id));
  const cost = (fromId, toId) => {
    const path = findNodePath(graph, nodeOf(fromId), nodeOf(toId));
    if (!path) {
      return Infinity;
    }
    let total = 0;
    for (let i = 1; i < path.length; i += 1) {
      total += distance(graph.get(path[i - 1]), graph.get(path[i]));
    }
    return total;
  };

  // 最近邻构造初始顺序
  const remaining = [...waypointIds];
  const order = [];
  let cursor = startId;
  while (remaining.length) {
    let bestIndex = 0;
    let bestCost = Infinity;
    remaining.forEach((id, index) => {
      const value = cost(cursor, id);
      if (value < bestCost) {
        bestCost = value;
        bestIndex = index;
      }
    });
    cursor = remaining.splice(bestIndex, 1)[0];
    order.push(cursor);
  }

  // 2-opt 局部优化，进一步缩短总行程
  const routeCost = (candidate) => {
    const chain = [startId, ...candidate, endId];
    let total = 0;
    for (let i = 1; i < chain.length; i += 1) {
      const legCost = cost(chain[i - 1], chain[i]);
      if (!Number.isFinite(legCost)) {
        return Infinity;
      }
      total += legCost;
    }
    return total;
  };

  let improved = true;
  let best = order;
  let bestTotal = routeCost(best);
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length; i += 1) {
      for (let j = i + 1; j < best.length; j += 1) {
        const candidate = [...best];
        [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
        const total = routeCost(candidate);
        if (total < bestTotal - 1e-6) {
          best = candidate;
          bestTotal = total;
          improved = true;
        }
      }
    }
  }

  return best;
}

export function planSmartRoute({ startId, endId, waypointIds = [], mode = 'walk' }, buildings) {
  const buildingsById = new Map(buildings.map((building) => [building.id, building]));
  const start = buildingsById.get(startId);
  const end = buildingsById.get(endId);

  if (!start || !end) {
    return { reachable: false, message: '请先选择起点和终点', stops: [], legs: [], totalDistance: 0 };
  }

  if (startId === endId && !waypointIds.length) {
    return { reachable: false, message: '起点与终点相同，请选择不同的目的地', stops: [], legs: [], totalDistance: 0 };
  }

  if (mode === 'bike') {
    const restricted = [start, end, ...waypointIds.map((id) => buildingsById.get(id))]
      .filter((building) => building && bikeRestrictedBuildings.includes(building.id));
    if (restricted.length) {
      return {
        reachable: false,
        message: `「${restricted[0].name}」为步行区域，骑行无法进入，请切换步行模式或调整站点`,
        stops: [],
        legs: [],
        totalDistance: 0
      };
    }
  }

  const uniqueWaypoints = [...new Set(waypointIds)].filter((id) => {
    return id !== startId && id !== endId && buildingsById.has(id);
  });
  const orderedWaypoints = uniqueWaypoints.length > 1
    ? optimizeStopOrder(startId, uniqueWaypoints, endId, buildingsById, mode)
    : uniqueWaypoints;
  const stopIds = [startId, ...orderedWaypoints, endId];
  const legs = [];

  for (let i = 1; i < stopIds.length; i += 1) {
    const from = buildingsById.get(stopIds[i - 1]);
    const to = buildingsById.get(stopIds[i]);
    const points = findCampusPath(from, to, mode);
    if (points.length < 2) {
      return {
        reachable: false,
        message: `暂未找到从「${from.name}」到「${to.name}」的可达路径，请调整途经点或切换出行方式`,
        stops: [],
        legs: [],
        totalDistance: 0
      };
    }
    legs.push({
      from: from.id,
      to: to.id,
      points,
      distance: pathLength(points) * METERS_PER_UNIT
    });
  }

  const totalDistance = legs.reduce((total, leg) => total + leg.distance, 0);
  let cumulative = 0;
  const stops = stopIds.map((id, index) => {
    if (index > 0) {
      cumulative += legs[index - 1].distance;
    }
    return {
      id,
      name: buildingsById.get(id).name,
      type: index === 0 ? 'start' : index === stopIds.length - 1 ? 'end' : 'waypoint',
      distanceFromStart: cumulative
    };
  });

  return {
    reachable: true,
    message: '',
    mode,
    stops,
    legs,
    totalDistance,
    points: legs.flatMap((leg, index) => (index === 0 ? leg.points : leg.points.slice(1)))
  };
}

export function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
}

export function estimateMinutes(meters, mode = 'walk') {
  const speed = (TRAVEL_MODES[mode] || TRAVEL_MODES.walk).metersPerMinute;
  return Math.max(1, Math.round(meters / speed));
}

export function toMiniMapPoint(point) {
  return {
    x: ((point.x + 22) / 44) * 100,
    y: ((point.z + 17) / 34) * 100
  };
}
