<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { addWindowGrid, createBuildingMaterial, createPodium, createRoof } from '../three/builders/primitives';
import { getHeatLevel } from '../utils/heatmap';

const props = defineProps({
  buildings: {
    type: Array,
    required: true
  },
  activeCategory: {
    type: String,
    required: true
  },
  selectedBuildingId: {
    type: String,
    default: ''
  },
  focusedBuildingId: {
    type: String,
    default: ''
  },
  routeFocusKey: {
    type: Number,
    default: 0
  },
  cameraMode: {
    type: String,
    default: 'near'
  },
  cameraFocusKey: {
    type: Number,
    default: 0
  },
  sceneMode: {
    type: String,
    default: 'day'
  },
  routePlan: {
    type: Object,
    default: null
  },
  tourActive: {
    type: Boolean,
    default: false
  },
  tourPaused: {
    type: Boolean,
    default: false
  },
  tourKey: {
    type: Number,
    default: 0
  },
  heatEnabled: {
    type: Boolean,
    default: false
  },
  crowdSnapshot: {
    type: Object,
    default: null
  },
  heatFaculty: {
    type: String,
    default: 'all'
  },
  heatBuildingId: {
    type: String,
    default: ''
  },
  favoriteIds: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['selectBuilding', 'cameraState', 'heatSelect', 'tourStop', 'tourEnd']);

const canvasHost = ref(null);
let renderer;
let scene;
let camera;
let controls;
let raycaster;
let pointer;
let animationFrame;
let resizeObserver;
let routeGroup;
let heatGroup;
let favoriteGroup;
let pointerDownPosition = null;
let orbitingBuildingId = '';
let hoveredBuildingId = '';
let hoveredHeatId = '';
let cameraFlight = null;
let ambientLight;
let sunLight;
let fillLight;
let rainGroup;
let frameCount = 0;
let tourState = null;
let lastTourStopIndex = -1;
const buildingGroups = new Map();
const interactiveMeshes = [];
const heatDiscs = new Map();
const heatRings = new Map();
const heatBeams = new Map();
const favoriteMarkers = new Map();
const clock = new THREE.Clock();
const buildingPalettes = {
  teaching: {
    body: ['#5e9ee8', '#77aee4', '#8fa7e8', '#64bddc'],
    roof: '#e9f4fb',
    accent: '#39d8ff',
    podium: '#d8edf5'
  },
  life: {
    body: ['#64c7b0', '#74bea8', '#7bcdd1', '#8dc8b6'],
    roof: '#eff8f1',
    accent: '#47f0b8',
    podium: '#d9eee8'
  },
  sports: {
    body: ['#69bf7a', '#56c69a', '#7ec866'],
    roof: '#eef7e4',
    accent: '#b8f56c',
    podium: '#dcebd7'
  },
  service: {
    body: ['#9fb9cd', '#82c6db', '#a8c8de', '#7fc8d7'],
    roof: '#f2f8fb',
    accent: '#4fe7ff',
    podium: '#dceaf0'
  }
};
const modePalette = {
  walk: { glow: '#13dfff', core: '#e9feff', accent: '#31eaff' },
  bike: { glow: '#2bff9d', core: '#eafff4', accent: '#57ffae' }
};

function getPalette(building) {
  const palette = buildingPalettes[building.category] || buildingPalettes.service;
  const index = Math.max(0, props.buildings.findIndex((item) => item.id === building.id));
  return {
    body: palette.body[index % palette.body.length],
    roof: palette.roof,
    accent: palette.accent,
    podium: palette.podium
  };
}

function createBuilding(building, index) {
  const group = new THREE.Group();
  group.name = building.id;
  group.position.set(building.position[0], 0, building.position[2]);
  group.userData.building = building;

  if (building.shape === 'gate') {
    addGate(group, building);
  } else if (building.shape === 'playground') {
    addPlayground(group, building);
  } else if (building.shape === 'dome') {
    addDomeBuilding(group, building);
  } else if (building.shape === 'pool') {
    addPoolBuilding(group, building);
  } else if (building.shape === 'clinic') {
    addClinicBuilding(group, building);
  } else if (building.shape === 'twin') {
    addTwinCenter(group, building);
  } else if (building.shape === 'auditorium') {
    addAuditorium(group, building);
  } else if (building.shape === 'clocktower') {
    addClockTower(group, building);
  } else if (building.shape === 'solar') {
    addSolarBuilding(group, building);
  } else if (building.shape === 'parking') {
    addParkingBuilding(group, building);
  } else {
    addBlockBuilding(group, building);
  }

  const label = createTextSprite(`${String(index + 1).padStart(2, '0')}  ${building.name}`);
  label.position.set(0, building.size[1] + 0.85, 0);
  label.userData.isLabel = true;
  group.add(label);

  group.traverse((child) => {
    if (child.isMesh) {
      child.userData.building = building;
      child.userData.baseColor = child.material.color?.clone();
      child.userData.baseEmissive = child.material.emissive?.clone();
      interactiveMeshes.push(child);
    }
  });

  scene.add(group);
  buildingGroups.set(building.id, group);
}

function addBlockBuilding(group, building) {
  const [width, height, depth] = building.size;
  const palette = getPalette(building);
  const material = createBuildingMaterial(palette.body);
  const blockCount = building.shape === 'residence' ? 3 : building.shape === 'terrace' ? 2 : 1;
  for (let block = 0; block < blockCount; block += 1) {
    const blockWidth = blockCount > 1 ? width / blockCount - 0.22 : width;
    const localHeight = building.shape === 'stepped' ? height - block * 0.55 : height - block * 0.28;
    const body = new THREE.Mesh(new THREE.BoxGeometry(blockWidth, localHeight, depth), material);
    body.position.set((block - (blockCount - 1) / 2) * (blockWidth + 0.35), localHeight / 2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
  }

  if (building.shape === 'courtyard') {
    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.7, height * 0.8, depth + 1.1), material);
      wing.position.set(side * (width / 2 - 0.35), height * 0.4, 0);
      wing.castShadow = true;
      wing.receiveShadow = true;
      group.add(wing);
    });
  }

  if (building.shape === 'strip') {
    const awningMaterial = new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.7 });
    for (let i = 0; i < 5; i += 1) {
      const awning = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, depth + 0.35), awningMaterial);
      awning.position.set(-width / 2 + 0.7 + i * 1.05, 1.55, 0);
      group.add(awning);
    }
  }

  const beltMaterial = new THREE.MeshBasicMaterial({
    color: palette.accent,
    transparent: true,
    opacity: building.category === 'sports' ? 0.34 : 0.28
  });
  const belt = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.08, depth + 0.1), beltMaterial);
  belt.position.y = Math.max(1.05, height * 0.58);
  group.add(belt);

  group.add(createRoof(width, height, depth, palette.roof));
  addWindowGrid(group, width, height, depth);
  group.add(createPodium(width, depth, palette.podium));
}

function addDomeBuilding(group, building) {
  const [width, height, depth] = building.size;
  const palette = getPalette(building);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    metalness: 0.22,
    roughness: 0.42,
    emissive: '#063f66',
    emissiveIntensity: 0.08
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(width / 2, width / 2, height * 0.7, 28), baseMaterial);
  base.scale.z = depth / width;
  base.position.y = height * 0.35;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const roof = new THREE.Mesh(
    new THREE.SphereGeometry(width / 2.05, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#dff7ff', metalness: 0.28, roughness: 0.28 })
  );
  roof.scale.z = depth / width;
  roof.position.y = height * 0.72;
  roof.castShadow = true;
  group.add(roof);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(width / 2.02, 0.055, 8, 44),
    new THREE.MeshBasicMaterial({ color: '#37eaff' })
  );
  ring.scale.z = depth / width;
  ring.position.y = height * 0.72;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
}

function addPoolBuilding(group, building) {
  addBlockBuilding(group, building);
  const pool = new THREE.Mesh(
    new THREE.BoxGeometry(building.size[0] * 0.72, 0.05, building.size[2] * 0.55),
    new THREE.MeshBasicMaterial({ color: '#25d9ff', transparent: true, opacity: 0.72 })
  );
  pool.position.y = 0.42;
  group.add(pool);
}

function addClinicBuilding(group, building) {
  addBlockBuilding(group, building);
  const crossMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.95, 0.06), crossMaterial);
  const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.22, 0.06), crossMaterial);
  vertical.position.set(0, building.size[1] + 0.42, building.size[2] / 2 + 0.06);
  horizontal.position.copy(vertical.position);
  group.add(vertical, horizontal);
}

function addTwinCenter(group, building) {
  addBlockBuilding(group, building);
  const [width, height] = building.size;
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: '#31eaff',
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(width * 0.42, 0.045, 8, 72), ringMaterial);
  halo.position.y = height + 0.72;
  halo.rotation.x = Math.PI / 2;
  group.add(halo);

  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.2, 10),
    new THREE.MeshBasicMaterial({ color: '#dffbff' })
  );
  antenna.position.y = height + 1.05;
  group.add(antenna);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 18, 18),
    new THREE.MeshBasicMaterial({ color: '#ffffff' })
  );
  beacon.position.y = height + 1.7;
  group.add(beacon);
}

function addAuditorium(group, building) {
  const [width, height, depth] = building.size;
  const palette = getPalette(building);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    roughness: 0.46,
    metalness: 0.18,
    emissive: '#073b61',
    emissiveIntensity: 0.06
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.65, depth), bodyMaterial);
  body.position.y = height * 0.32;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(depth / 2, depth / 2, width + 0.25, 28, 1, false, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: '#e7fbff', roughness: 0.32, metalness: 0.24 })
  );
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.position.y = height * 0.68;
  roof.castShadow = true;
  group.add(roof);

  const stepsMaterial = new THREE.MeshBasicMaterial({ color: '#c9eaf5', transparent: true, opacity: 0.82 });
  for (let i = 0; i < 4; i += 1) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(width - i * 0.45, 0.08, 0.55), stepsMaterial);
    step.position.set(0, 0.08 + i * 0.08, depth / 2 + 0.45 + i * 0.38);
    group.add(step);
  }
}

function addClockTower(group, building) {
  const [width, height, depth] = building.size;
  const palette = getPalette(building);
  const towerMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    roughness: 0.42,
    metalness: 0.16,
    emissive: '#073b61',
    emissiveIntensity: 0.08
  });
  const base = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.78, depth), towerMaterial);
  base.position.y = height * 0.39;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const clockFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 32),
    new THREE.MeshBasicMaterial({ color: '#f6feff' })
  );
  clockFace.position.set(0, height * 0.68, depth / 2 + 0.035);
  group.add(clockFace);

  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(width * 0.58, height * 0.25, 4),
    new THREE.MeshStandardMaterial({ color: '#d8f7ff', roughness: 0.3, metalness: 0.24 })
  );
  spire.position.y = height * 0.92;
  spire.rotation.y = Math.PI / 4;
  spire.castShadow = true;
  group.add(spire);
}

function addSolarBuilding(group, building) {
  addBlockBuilding(group, building);
  const [width, height, depth] = building.size;
  const panelMaterial = new THREE.MeshBasicMaterial({ color: '#103f76', transparent: true, opacity: 0.92 });
  for (let i = 0; i < 4; i += 1) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(width * 0.36, 0.045, depth * 0.28), panelMaterial);
    panel.position.set((i % 2 ? 1 : -1) * width * 0.22, height + 0.45, (i > 1 ? 1 : -1) * depth * 0.18);
    panel.rotation.x = -0.18;
    group.add(panel);
  }
}

function addParkingBuilding(group, building) {
  addBlockBuilding(group, building);
  const rampMaterial = new THREE.MeshBasicMaterial({ color: '#a7d7e6', transparent: true, opacity: 0.8 });
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(building.size[0] * 0.9, 0.08, 0.72), rampMaterial);
  ramp.position.set(0, 0.24, building.size[2] / 2 + 0.72);
  ramp.rotation.x = -0.18;
  group.add(ramp);

  [-1.2, 0, 1.2].forEach((x) => {
    const car = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.36),
      new THREE.MeshBasicMaterial({ color: '#40e7ff', transparent: true, opacity: 0.75 })
    );
    car.position.set(x, 0.48, building.size[2] / 2 + 1.15);
    group.add(car);
  });
}

function addGate(group, building) {
  const palette = getPalette(building);
  const material = new THREE.MeshStandardMaterial({
    color: palette.body,
    metalness: 0.25,
    roughness: 0.38,
    emissive: '#0a3a66',
    emissiveIntensity: 0.08
  });
  const pillarGeometry = new THREE.BoxGeometry(0.7, building.size[1], 0.8);
  [-1.9, 1.9].forEach((x) => {
    const pillar = new THREE.Mesh(pillarGeometry, material);
    pillar.position.set(x, building.size[1] / 2, 0);
    pillar.castShadow = true;
    group.add(pillar);
  });

  const beam = new THREE.Mesh(new THREE.BoxGeometry(building.size[0], 0.55, 0.9), material);
  beam.position.y = building.size[1] + 0.2;
  beam.castShadow = true;
  group.add(beam);
}

function addPlayground(group, building) {
  const field = new THREE.Mesh(
    new THREE.BoxGeometry(building.size[0], building.size[1], building.size[2]),
    new THREE.MeshStandardMaterial({ color: '#58c7d8', roughness: 0.6, emissive: '#064654', emissiveIntensity: 0.04 })
  );
  field.position.y = 0.05;
  field.receiveShadow = true;
  group.add(field);

  const track = new THREE.Mesh(
    new THREE.RingGeometry(1.9, 2.45, 72),
    new THREE.MeshBasicMaterial({ color: '#d9f5ff', side: THREE.DoubleSide })
  );
  track.rotation.x = -Math.PI / 2;
  track.scale.set(1.55, 1, 1);
  track.position.y = 0.22;
  group.add(track);
}

function createTextSprite(text, options = {}) {
  const lines = String(text).split('\n');
  const canvas = document.createElement('canvas');
  canvas.width = options.width || 360;
  canvas.height = options.height || (lines.length > 1 ? 118 : 86);
  const context = canvas.getContext('2d');
  context.fillStyle = options.background || 'rgba(1,18,32,0.52)';
  roundRect(context, 8, 12, canvas.width - 16, canvas.height - 24, 12);
  context.fill();
  context.strokeStyle = options.border || 'rgba(53,232,255,0.58)';
  context.lineWidth = 2;
  roundRect(context, 8, 12, canvas.width - 16, canvas.height - 24, 12);
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  lines.forEach((line, index) => {
    const isFirst = index === 0;
    context.fillStyle = isFirst ? options.titleColor || '#baf8ff' : options.subColor || '#7de9ff';
    context.font = `${isFirst ? '700 22px' : '600 17px'} Arial, sans-serif`;
    const lineHeight = canvas.height / (lines.length + 1);
    context.fillText(line, canvas.width / 2, lineHeight * (index + 1));
  });

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  const aspect = canvas.width / canvas.height;
  const spriteHeight = options.spriteHeight || 0.68;
  sprite.scale.set(spriteHeight * aspect, spriteHeight, 1);
  return sprite;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function createCampusBase() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 34),
    new THREE.MeshStandardMaterial({ color: '#d8edf5', roughness: 0.74, metalness: 0.03 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(44, 44, '#49c9e8', '#b7dce8');
  grid.position.y = 0.015;
  scene.add(grid);

  const grassMaterial = new THREE.MeshBasicMaterial({ color: '#3ebf8f', transparent: true, opacity: 0.46 });
  [
    { size: [7.6, 0.035, 4.2], position: [-2.8, 0.07, 5.9] },
    { size: [5.8, 0.035, 4.8], position: [9.2, 0.07, 1.7] },
    { size: [6.6, 0.035, 3.4], position: [-13.6, 0.07, -4.7] },
    { size: [4.8, 0.035, 3.2], position: [16.2, 0.07, -8.7] }
  ].forEach((lawn) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...lawn.size), grassMaterial);
    mesh.position.set(...lawn.position);
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  const roadMaterial = new THREE.MeshBasicMaterial({ color: '#9db6c4', transparent: true, opacity: 0.95 });
  const roads = [
    { size: [38, 0.04, 1.1], position: [0, 0.04, 2.5] },
    { size: [34, 0.04, 0.78], position: [1.5, 0.05, -7.3] },
    { size: [0.9, 0.04, 27], position: [1.5, 0.06, -0.2] },
    { size: [0.72, 0.04, 24], position: [-9.6, 0.06, -1.2] },
    { size: [0.72, 0.04, 24], position: [11.8, 0.06, -1.2] }
  ];
  roads.forEach((road) => {
    const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(...road.size), roadMaterial);
    roadMesh.position.set(...road.position);
    scene.add(roadMesh);
  });

  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.1, 0.04, 48),
    new THREE.MeshBasicMaterial({ color: '#d6f7ff', transparent: true, opacity: 0.78 })
  );
  plaza.position.set(-12, 0.08, 8);
  scene.add(plaza);

  const lake = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 48),
    new THREE.MeshBasicMaterial({ color: '#2fc8ff', transparent: true, opacity: 0.42 })
  );
  lake.rotation.x = -Math.PI / 2;
  lake.scale.set(1.55, 0.72, 1);
  lake.position.set(7.5, 0.09, 2.7);
  scene.add(lake);

  const fountain = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.08, 8, 48),
    new THREE.MeshBasicMaterial({ color: '#d8fbff', transparent: true, opacity: 0.72 })
  );
  fountain.rotation.x = Math.PI / 2;
  fountain.position.set(-2.8, 0.16, 5.9);
  scene.add(fountain);

  const fountainCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 0.5, 18),
    new THREE.MeshBasicMaterial({ color: '#44e8ff', transparent: true, opacity: 0.68 })
  );
  fountainCore.position.set(-2.8, 0.38, 5.9);
  scene.add(fountainCore);

  const pathMaterial = new THREE.MeshBasicMaterial({ color: '#e7f9ff', transparent: true, opacity: 0.52 });
  [
    { size: [8.8, 0.03, 0.42], position: [-2.8, 0.12, 5.9] },
    { size: [0.42, 0.03, 5.8], position: [-2.8, 0.13, 5.9] },
    { size: [6.2, 0.03, 0.36], position: [7.8, 0.12, 0.2] },
    { size: [0.36, 0.03, 5.4], position: [7.8, 0.13, 0.2] }
  ].forEach((path) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...path.size), pathMaterial);
    mesh.position.set(...path.position);
    scene.add(mesh);
  });

  addTreeRows();
  addLightPoles();
}

function addTreeRows() {
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#7e6a52', roughness: 0.75 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: '#2bbf83', roughness: 0.62 });
  const points = [];
  for (let x = -17; x <= 17; x += 3) {
    points.push([x, 4.1], [x, -6.1]);
  }
  for (let z = -11; z <= 11; z += 3) {
    points.push([-14.5, z], [15.2, z]);
  }
  [
    [-6.2, 6.5], [-4.6, 6.6], [-1.2, 6.8], [1.2, 6.7],
    [5.6, 0.9], [6.8, 1.8], [8.8, 3.9], [10.2, 3.2],
    [-12.6, 6.8], [-11.1, 7.5], [-13.4, 2.4], [-15.6, 2.8],
    [13.4, -6.9], [15.8, -6.4], [16.8, -1.7]
  ].forEach((point) => points.push(point));

  points.forEach(([x, z], index) => {
    const tree = new THREE.Group();
    const treeScale = index % 3 === 0 ? 1.18 : index % 3 === 1 ? 0.92 : 1;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.56 * treeScale, 8), trunkMaterial);
    trunk.position.y = 0.28 * treeScale;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.46 * treeScale, 1.05 * treeScale, 12), leafMaterial);
    leaf.position.y = 1.05 * treeScale;
    tree.add(trunk, leaf);
    tree.position.set(x, 0, z);
    scene.add(tree);
  });
}

function addLightPoles() {
  const poleMaterial = new THREE.MeshBasicMaterial({ color: '#dffbff' });
  const lightMaterial = new THREE.MeshBasicMaterial({ color: '#44edff' });
  [-13, -7, -1, 5, 11, 17].forEach((x) => {
    [-9.2, 5.2].forEach((z) => {
      const pole = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), poleMaterial);
      stem.position.y = 0.6;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), lightMaterial);
      lamp.position.y = 1.28;
      pole.add(stem, lamp);
      pole.position.set(x, 0, z);
      scene.add(pole);
    });
  });
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a1726');
  scene.fog = new THREE.Fog('#0a1726', 22, 58);

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
  camera.position.set(17, 18, 22);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasHost.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 42;
  controls.maxPolarAngle = Math.PI / 2.18;
  controls.target.set(0, 0.4, 0);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  ambientLight = new THREE.AmbientLight('#d7f5ff', 1.55);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight('#ffffff', 2.9);
  sunLight.position.set(8, 14, 10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  scene.add(sunLight);

  fillLight = new THREE.PointLight('#29d7ff', 22, 48);
  fillLight.position.set(-12, 8, 8);
  scene.add(fillLight);

  createCampusBase();
  props.buildings.forEach(createBuilding);
  heatGroup = new THREE.Group();
  favoriteGroup = new THREE.Group();
  scene.add(heatGroup, favoriteGroup);
  createHeatLayer();
  createFavoriteMarkers();
  updateCategoryVisibility();
  updateHighlights();
  updateRoute();
  updateHeatLayer();
  updateFavorites();
  updateEnvironment();
}

function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function handlePointerDown(event) {
  pointerDownPosition = {
    x: event.clientX,
    y: event.clientY
  };
}

function handlePointerUp(event) {
  if (!pointerDownPosition) {
    return;
  }

  const movedDistance = Math.hypot(
    event.clientX - pointerDownPosition.x,
    event.clientY - pointerDownPosition.y
  );
  pointerDownPosition = null;

  if (movedDistance > 6) {
    return;
  }

  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const buildingHits = raycaster.intersectObjects(interactiveMeshes, false);
  if (buildingHits.length) {
    const building = buildingHits[0].object.userData.building;
    if (building) {
      emit('selectBuilding', building);
      return;
    }
  }

  if (props.heatEnabled && heatGroup?.visible) {
    const heatHits = raycaster.intersectObjects([...heatDiscs.values()], false);
    if (heatHits.length) {
      emit('heatSelect', heatHits[0].object.userData.buildingId);
    }
  }
}

function handlePointerMove(event) {
  if (!renderer || !camera || !raycaster || !pointer) {
    return;
  }

  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(interactiveMeshes, false);
  const building = hits[0]?.object.userData.building;
  hoveredBuildingId = building?.id || '';

  if (!hoveredBuildingId && props.heatEnabled && heatGroup?.visible) {
    const heatHits = raycaster.intersectObjects([...heatDiscs.values()], false);
    hoveredHeatId = heatHits[0]?.object.userData.buildingId || '';
  } else {
    hoveredHeatId = '';
  }

  renderer.domElement.style.cursor = building || hoveredHeatId ? 'pointer' : 'grab';
}

function handlePointerLeave() {
  hoveredBuildingId = '';
  hoveredHeatId = '';
  if (renderer?.domElement) {
    renderer.domElement.style.cursor = 'grab';
  }
}

function updateCategoryVisibility() {
  props.buildings.forEach((building) => {
    const group = buildingGroups.get(building.id);
    if (group) {
      group.visible = props.activeCategory === 'all' || building.category === props.activeCategory;
    }

    const disc = heatDiscs.get(building.id);
    if (disc) {
      const categoryVisible = props.activeCategory === 'all' || building.category === props.activeCategory;
      const facultyVisible = props.heatFaculty === 'all' || building.faculty === props.heatFaculty;
      disc.visible = Boolean(categoryVisible && facultyVisible);
    }
  });
}

function updateHighlights() {
  buildingGroups.forEach((group, id) => {
    const isActive = id === props.selectedBuildingId || id === props.focusedBuildingId;
    group.traverse((child) => {
      if (!child.isMesh || !child.material.color) {
        return;
      }

      if (isActive) {
        child.material.color.set('#ffffff');
        if (child.material.emissive) {
          child.material.emissive.set('#2bbcff');
          child.material.emissiveIntensity = 0.55;
        }
      } else if (child.userData.baseColor) {
        child.material.color.copy(child.userData.baseColor);
        if (child.material.emissive && child.userData.baseEmissive) {
          child.material.emissive.copy(child.userData.baseEmissive);
          child.material.emissiveIntensity = props.sceneMode === 'night' ? 0.22 : 0.05;
        }
      }
    });
  });
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function startCameraFlight(nextPosition, nextTarget, duration = 1.12) {
  cameraFlight = {
    fromPosition: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPosition: nextPosition.clone(),
    toTarget: nextTarget.clone(),
    start: clock.getElapsedTime(),
    duration
  };
}

function focusBuilding(id, mode = props.cameraMode) {
  const group = buildingGroups.get(id);
  if (!group) {
    return;
  }

  orbitingBuildingId = mode === 'orbit' ? id : '';
  const target = group.position.clone();
  const currentDirection = camera.position.clone().sub(controls.target).normalize();
  const currentDistance = camera.position.distanceTo(controls.target);
  const nextTarget = new THREE.Vector3(target.x, 1.1, target.z);
  let nextPosition;

  if (mode === 'top') {
    nextPosition = new THREE.Vector3(target.x + 0.2, 21, target.z + 0.2);
  } else if (mode === 'orbit') {
    nextPosition = new THREE.Vector3(target.x + 10, 7.2, target.z + 10);
  } else {
    const nextDistance = THREE.MathUtils.clamp(currentDistance, 8.5, 15);
    const elevatedDirection = currentDirection.clone();
    elevatedDirection.y = THREE.MathUtils.clamp(elevatedDirection.y + 0.16, 0.26, 0.54);
    elevatedDirection.normalize();
    nextPosition = nextTarget.clone().add(elevatedDirection.multiplyScalar(nextDistance));
  }

  startCameraFlight(nextPosition, nextTarget, mode === 'orbit' ? 0.95 : 1.18);
}

function getRoutePoints() {
  if (!props.routePlan?.reachable) {
    return [];
  }

  return props.routePlan.points.map((point) => new THREE.Vector3(point.x, 0.68, point.z));
}

function focusRoute() {
  const routePoints = getRoutePoints();
  if (routePoints.length < 2) {
    return;
  }

  const box = new THREE.Box3().setFromPoints(routePoints);
  const center = box.getCenter(new THREE.Vector3());
  const routeSize = box.getSize(new THREE.Vector3());
  const routeDistance = Math.max(routeSize.x, routeSize.z, routePoints[0].distanceTo(routePoints.at(-1)), 7);
  const routeVector = routePoints.at(-1).clone().sub(routePoints[0]).normalize();
  const sideVector = new THREE.Vector3(-routeVector.z, 0, routeVector.x).normalize();
  const cameraDistance = THREE.MathUtils.clamp(routeDistance * 0.82 + 8, 14, 27);

  startCameraFlight(
    new THREE.Vector3(
      center.x + sideVector.x * cameraDistance,
      8.6 + routeDistance * 0.18,
      center.z + sideVector.z * cameraDistance
    ),
    new THREE.Vector3(center.x, 0.8, center.z),
    1.08
  );
}

function createHeatLayer() {
  heatGroup.visible = props.heatEnabled;
  props.buildings.forEach((building) => {
    const radius = Math.max(building.size[0], building.size[2]) * 0.72 + 1.1;
    const discMaterial = new THREE.MeshBasicMaterial({
      color: '#57d6ff',
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 40), discMaterial);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(building.position[0], 0.21, building.position[2]);
    disc.userData.buildingId = building.id;
    heatDiscs.set(building.id, disc);
    heatGroup.add(disc);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: '#57d6ff',
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.06, 8, 56), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(building.position[0], 0.24, building.position[2]);
    ring.userData.buildingId = building.id;
    heatRings.set(building.id, ring);
    heatGroup.add(ring);

    const beamMaterial = new THREE.MeshBasicMaterial({
      color: '#57d6ff',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.9, building.size[1] + 1.2, 20, 1, true),
      beamMaterial
    );
    beam.position.set(building.position[0], (building.size[1] + 1.2) / 2 + 0.2, building.position[2]);
    beam.userData.buildingId = building.id;
    heatBeams.set(building.id, beam);
    heatGroup.add(beam);
  });
}

function getCrowdEntry(buildingId) {
  return props.crowdSnapshot?.entries.find((entry) => entry.id === buildingId) || null;
}

function updateHeatLayer() {
  if (!heatGroup) {
    return;
  }

  heatGroup.visible = props.heatEnabled;
  props.buildings.forEach((building) => {
    const disc = heatDiscs.get(building.id);
    if (!disc) {
      return;
    }

    const entry = getCrowdEntry(building.id);
    const level = getHeatLevel(entry?.density ?? 0);
    const isSelected = props.heatBuildingId === building.id;
    disc.material.color.set(level.color);
    disc.material.opacity = isSelected ? 0.62 : level.glow + 0.14;

    const ring = heatRings.get(building.id);
    if (ring) {
      ring.material.color.set(level.color);
      ring.material.opacity = isSelected ? 1 : 0.62;
      ring.scale.setScalar(isSelected ? 1.18 : 1);
    }

    const beam = heatBeams.get(building.id);
    if (beam) {
      beam.material.color.set(level.color);
      beam.material.opacity = (entry?.warning === 'red' ? 0.26 : entry?.warning === 'yellow' ? 0.12 : 0.04)
        + (isSelected ? 0.1 : 0);
    }

    const categoryVisible = props.activeCategory === 'all' || building.category === props.activeCategory;
    const facultyVisible = props.heatFaculty === 'all' || building.faculty === props.heatFaculty;
    disc.visible = Boolean(categoryVisible && facultyVisible && entry);
  });
}

function createFavoriteMarkers() {
  props.buildings.forEach((building) => {
    const marker = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8),
      new THREE.MeshBasicMaterial({ color: '#ffd34d' })
    );
    pole.position.y = 0.45;
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22),
      new THREE.MeshBasicMaterial({ color: '#ffd34d' })
    );
    star.position.y = 1;
    star.userData.isStar = true;
    marker.add(pole, star);
    marker.position.set(
      building.position[0] + building.size[0] / 2 + 0.55,
      0,
      building.position[2] + building.size[2] / 2 + 0.55
    );
    marker.visible = false;
    favoriteMarkers.set(building.id, marker);
    favoriteGroup.add(marker);
  });
}

function updateFavorites() {
  favoriteMarkers.forEach((marker, id) => {
    marker.visible = props.favoriteIds.includes(id);
  });
}

function createStopSprite(stop, distanceMeters, kind) {
  const kindLabel = kind === 'start' ? '起点' : kind === 'end' ? '终点' : '途经';
  const distanceText = distanceMeters > 0 ? `距起点 ${distanceMeters} m` : '出发';
  const color = kind === 'waypoint' ? 'rgba(255,178,61,0.72)' : 'rgba(53,232,255,0.58)';
  const sprite = createTextSprite(`${kindLabel} · ${stop.name}\n${distanceText}`, {
    border: color,
    spriteHeight: 0.82
  });
  sprite.position.set(0, 2.1, 0);
  sprite.userData.stopSprite = true;
  sprite.userData.kind = kind;
  return sprite;
}

function updateRoute() {
  if (routeGroup) {
    scene.remove(routeGroup);
    routeGroup.traverse((child) => {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material?.dispose();
      }
    });
    routeGroup = null;
  }

  const plan = props.routePlan;
  if (!plan?.reachable) {
    return;
  }

  const routePoints = getRoutePoints();
  if (routePoints.length < 2) {
    return;
  }

  routeGroup = new THREE.Group();
  routeGroup.userData.pulses = [];
  routeGroup.userData.stopMarkers = [];
  const colors = modePalette[plan.mode] || modePalette.walk;
  const startPoint = routePoints[0];
  const endPoint = routePoints.at(-1);
  const curve = new THREE.CatmullRomCurve3(routePoints, false, 'catmullrom', 0.06);
  routeGroup.userData.curve = curve;

  const glowTube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 120, 0.22, 18, false),
    new THREE.MeshBasicMaterial({
      color: colors.glow,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glowTube.userData.routeGlow = true;
  routeGroup.add(glowTube);

  const coreTube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 120, 0.105, 16, false),
    new THREE.MeshBasicMaterial({
      color: colors.core,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  coreTube.userData.routeCore = true;
  routeGroup.add(coreTube);

  const arrowCount = Math.max(6, Math.round(plan.distance / 4));
  for (let index = 0; index < arrowCount; index += 1) {
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.56, 3),
      new THREE.MeshBasicMaterial({
        color: colors.core,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    arrow.userData.routeArrow = true;
    arrow.userData.offset = (index + 0.5) / arrowCount;
    routeGroup.add(arrow);
  }

  for (let index = 0; index < 10; index += 1) {
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 18, 18),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? colors.glow : '#ffffff',
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    pulse.userData.routePulse = true;
    pulse.userData.offset = index / 10;
    routeGroup.userData.pulses.push(pulse);
    routeGroup.add(pulse);
  }

  const cumulativeMeters = [];
  let traveled = 0;
  plan.segments.forEach((segment, index) => {
    cumulativeMeters[index] = Math.round(traveled * 5);
    traveled += segment.distance;
  });
  cumulativeMeters[plan.stops.length - 1] = plan.distanceMeters;

  plan.stops.forEach((stop, index) => {
    const kind = index === 0 ? 'start' : index === plan.stops.length - 1 ? 'end' : 'waypoint';
    const point = new THREE.Vector3(stop.position[0], 0.68, stop.position[2]);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: kind === 'waypoint' ? '#ffb23d' : '#ffffff',
      transparent: true,
      opacity: 0.98
    });
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(kind === 'waypoint' ? 0.3 : 0.34, 24, 24),
      markerMaterial
    );
    marker.position.copy(point);
    marker.userData.stopIndex = index;
    routeGroup.userData.stopMarkers.push(marker);
    routeGroup.add(marker);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(kind === 'waypoint' ? 0.62 : 0.82, 0.045, 8, 48),
      new THREE.MeshBasicMaterial({
        color: kind === 'waypoint' ? '#ffb23d' : colors.accent,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ring.position.copy(point);
    ring.rotation.x = Math.PI / 2;
    ring.userData.stopRing = true;
    ring.userData.stopIndex = index;
    routeGroup.add(ring);

    const label = createStopSprite(stop, cumulativeMeters[index], kind);
    label.position.set(point.x, point.y + 1.42, point.z);
    label.userData.stopIndex = index;
    routeGroup.add(label);
  });

  scene.add(routeGroup);

  if (tourState) {
    tourState.curve = curve;
    tourState.progress = 0;
  }
}

function createRain() {
  const rain = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    color: '#9feaff',
    transparent: true,
    opacity: 0.34
  });

  for (let i = 0; i < 120; i += 1) {
    const x = THREE.MathUtils.randFloatSpread(42);
    const z = THREE.MathUtils.randFloatSpread(32);
    const y = THREE.MathUtils.randFloat(3, 16);
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(x - 0.18, y - 0.8, z + 0.08)
    ]);
    const line = new THREE.Line(geometry, material);
    line.userData.speed = THREE.MathUtils.randFloat(0.08, 0.18);
    rain.add(line);
  }

  return rain;
}

function updateEnvironment() {
  if (!scene || !ambientLight || !sunLight || !fillLight) {
    return;
  }

  const modes = {
    day: {
      background: '#0a1726',
      fog: '#0a1726',
      ambient: 1.55,
      sun: 2.9,
      fill: 22
    },
    night: {
      background: '#020916',
      fog: '#020916',
      ambient: 0.72,
      sun: 0.85,
      fill: 34
    },
    rain: {
      background: '#07111d',
      fog: '#07111d',
      ambient: 1.05,
      sun: 1.35,
      fill: 28
    }
  };
  const mode = modes[props.sceneMode] || modes.day;

  scene.background = new THREE.Color(mode.background);
  scene.fog = new THREE.Fog(mode.fog, 18, props.sceneMode === 'rain' ? 38 : 58);
  ambientLight.intensity = mode.ambient;
  sunLight.intensity = mode.sun;
  fillLight.intensity = mode.fill;
  fillLight.color.set(props.sceneMode === 'night' ? '#16d8ff' : '#29d7ff');

  buildingGroups.forEach((group) => {
    group.traverse((child) => {
      if (child.isMesh && child.material?.emissive) {
        child.material.emissiveIntensity = props.sceneMode === 'night' ? 0.22 : 0.05;
      }
    });
  });

  if (props.sceneMode === 'rain' && !rainGroup) {
    rainGroup = createRain();
    scene.add(rainGroup);
  } else if (props.sceneMode !== 'rain' && rainGroup) {
    scene.remove(rainGroup);
    rainGroup.traverse((child) => child.geometry?.dispose());
    rainGroup = null;
  }
}

function startTour() {
  const curve = routeGroup?.userData.curve;
  if (!props.routePlan?.reachable || !curve) {
    return;
  }

  cameraFlight = null;
  orbitingBuildingId = '';
  controls.enabled = false;
  const duration = THREE.MathUtils.clamp(props.routePlan.distance * 0.85, 8, 30);
  tourState = {
    curve,
    duration,
    progress: 0,
    lastTime: clock.getElapsedTime()
  };
  lastTourStopIndex = -1;
}

function finishTour(completed) {
  if (tourState) {
    tourState = null;
    controls.enabled = true;
    emit('tourEnd', { completed });
  }
}

function updateTour(elapsed) {
  if (!tourState) {
    return;
  }

  if (props.tourPaused) {
    tourState.lastTime = elapsed;
    return;
  }

  const delta = elapsed - tourState.lastTime;
  tourState.lastTime = elapsed;
  tourState.progress = THREE.MathUtils.clamp(tourState.progress + delta / tourState.duration, 0, 1);
  const eased = easeInOutCubic(tourState.progress);
  const point = tourState.curve.getPoint(eased);
  const lookAhead = tourState.curve.getPoint(Math.min(1, eased + 0.03));
  camera.position.set(point.x, 5.6, point.z);
  controls.target.lerp(new THREE.Vector3(lookAhead.x, 1.4, lookAhead.z), 0.35);

  const segmentBounds = [];
  let accumulated = 0;
  props.routePlan.segments.forEach((segment) => {
    segmentBounds.push(accumulated);
    accumulated += segment.distance;
  });
  segmentBounds.push(accumulated);
  const traveled = eased * accumulated;
  let activeIndex = 0;
  for (let index = 1; index < segmentBounds.length; index += 1) {
    if (traveled >= segmentBounds[index]) {
      activeIndex = index;
    }
  }

  if (activeIndex !== lastTourStopIndex) {
    lastTourStopIndex = activeIndex;
    const stop = props.routePlan.stops[activeIndex];
    emit('tourStop', {
      index: activeIndex,
      buildingId: stop.id,
      buildingName: stop.name
    });
  }

  if (tourState.progress >= 1) {
    finishTour(true);
  }
}

function resize() {
  if (!canvasHost.value || !renderer || !camera) {
    return;
  }

  const { width, height } = canvasHost.value.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  const elapsed = clock.getElapsedTime();
  frameCount += 1;

  updateTour(elapsed);

  if (routeGroup) {
    const curve = routeGroup.userData.curve;
    const speedFactor = props.routePlan?.mode === 'bike' ? 1.55 : 1;
    routeGroup.children.forEach((child) => {
      if (child.userData.routeGlow && child.material) {
        child.material.opacity = 0.18 + Math.sin(elapsed * 3.4) * 0.08;
      }
      if (child.userData.routeCore && child.material) {
        child.material.opacity = 0.82 + Math.sin(elapsed * 5) * 0.16;
      }
      if (child.userData.stopRing) {
        const isActive = tourState && child.userData.stopIndex === lastTourStopIndex;
        const scale = (1 + Math.sin(elapsed * 2.6) * 0.12) * (isActive ? 1.5 : 1);
        child.scale.setScalar(scale);
      }
      if (child.userData.routePulse && curve) {
        const t = (elapsed * 0.18 * speedFactor + child.userData.offset) % 1;
        child.position.copy(curve.getPoint(t));
        child.scale.setScalar(0.8 + Math.sin((t + elapsed) * Math.PI * 2) * 0.18);
      }
      if (child.userData.routeArrow && curve) {
        const t = (elapsed * 0.08 * speedFactor + child.userData.offset) % 1;
        const point = curve.getPoint(t);
        const tangent = curve.getTangent(t).normalize();
        child.position.copy(point);
        child.position.y += 0.12;
        child.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        child.rotateY(Math.PI / 2);
      }
      if (child.userData.stopSprite) {
        const isActive = tourState && child.userData.stopIndex === lastTourStopIndex;
        const scale = isActive ? 1.25 : 0.85;
        child.scale.setScalar(scale);
        if (child.material) {
          child.material.opacity = isActive || !tourState ? 1 : 0.45;
        }
      }
    });
  }

  if (heatGroup?.visible) {
    heatRings.forEach((ring, buildingId) => {
      const isHovered = hoveredHeatId === buildingId;
      const isSelected = props.heatBuildingId === buildingId;
      ring.rotation.z = elapsed * 0.25;
      if (isHovered && !isSelected) {
        ring.scale.setScalar(1.12);
      } else if (!isSelected) {
        ring.scale.setScalar(1);
      }
    });
    heatBeams.forEach((beam, buildingId) => {
      const entry = getCrowdEntry(buildingId);
      const isSelected = props.heatBuildingId === buildingId;
      if (entry?.warning === 'red' && beam.material) {
        beam.material.opacity = 0.2 + Math.sin(elapsed * 3.2) * 0.12 + (isSelected ? 0.12 : 0);
      }
    });
  }

  if (favoriteGroup?.visible !== false) {
    favoriteMarkers.forEach((marker, id) => {
      if (!marker.visible) {
        return;
      }
      const star = marker.children.find((child) => child.userData.isStar);
      if (star) {
        star.rotation.y = elapsed * 1.4;
        star.position.y = 1 + Math.sin(elapsed * 2.2 + id.length) * 0.12;
      }
    });
  }

  if (orbitingBuildingId && !tourState) {
    const group = buildingGroups.get(orbitingBuildingId);
    if (group) {
      const radius = 12;
      const angle = elapsed * 0.16;
      const target = group.position.clone();
      controls.target.lerp(new THREE.Vector3(target.x, 1.1, target.z), 0.06);
      camera.position.lerp(new THREE.Vector3(target.x + Math.cos(angle) * radius, 7.4, target.z + Math.sin(angle) * radius), 0.035);
    }
  }

  if (cameraFlight) {
    const progress = THREE.MathUtils.clamp((elapsed - cameraFlight.start) / cameraFlight.duration, 0, 1);
    const eased = easeInOutCubic(progress);
    camera.position.lerpVectors(cameraFlight.fromPosition, cameraFlight.toPosition, eased);
    controls.target.lerpVectors(cameraFlight.fromTarget, cameraFlight.toTarget, eased);
    if (progress >= 1) {
      cameraFlight = null;
    }
  }

  buildingGroups.forEach((group, id) => {
    const label = group.children.find((child) => child.userData.isLabel);
    if (!label) {
      return;
    }

    const distance = camera.position.distanceTo(group.position);
    const isSelected = id === props.selectedBuildingId || id === props.focusedBuildingId;
    const isHovered = id === hoveredBuildingId;
    label.visible = isSelected || isHovered || distance < 15;
    const scale = isSelected || isHovered
      ? 1
      : THREE.MathUtils.clamp(10 / distance, 0.34, 0.7);
    label.scale.set(2.65 * scale, 0.68 * scale, 1);
    if (label.material) {
      label.material.opacity = isSelected || isHovered
        ? 0.96
        : THREE.MathUtils.clamp(1.05 - distance / 20, 0.0, 0.42);
    }
  });

  if (rainGroup) {
    rainGroup.children.forEach((drop) => {
      drop.position.y -= drop.userData.speed;
      if (drop.position.y < -3) {
        drop.position.y = 16;
      }
    });
  }

  controls.update();
  if (frameCount % 12 === 0) {
    const direction = camera.position.clone().sub(controls.target);
    const heading = THREE.MathUtils.radToDeg(Math.atan2(direction.x, direction.z));
    emit('cameraState', { heading });
  }
  renderer.render(scene, camera);
  animationFrame = requestAnimationFrame(animate);
}

onMounted(() => {
  setupScene();
  resize();
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvasHost.value);
  renderer.domElement.addEventListener('pointerdown', handlePointerDown);
  renderer.domElement.addEventListener('pointermove', handlePointerMove);
  renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
  renderer.domElement.addEventListener('pointerup', handlePointerUp);
  animate();
  focusBuilding(props.focusedBuildingId);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  renderer?.domElement.removeEventListener('pointerdown', handlePointerDown);
  renderer?.domElement.removeEventListener('pointermove', handlePointerMove);
  renderer?.domElement.removeEventListener('pointerleave', handlePointerLeave);
  renderer?.domElement.removeEventListener('pointerup', handlePointerUp);
  resizeObserver?.disconnect();
  controls?.dispose();
  renderer?.dispose();
});

watch(() => props.activeCategory, () => {
  updateCategoryVisibility();
});
watch(() => [props.selectedBuildingId, props.focusedBuildingId], updateHighlights);
watch(() => props.focusedBuildingId, (id) => {
  if (!tourState) {
    focusBuilding(id);
  }
});
watch(() => props.routePlan, updateRoute, { deep: true });
watch(() => props.routeFocusKey, () => focusRoute());
watch(() => props.cameraFocusKey, () => {
  if (!tourState) {
    focusBuilding(props.selectedBuildingId, props.cameraMode);
  }
});
watch(() => props.sceneMode, () => {
  updateEnvironment();
  updateHighlights();
});
watch(() => [props.heatEnabled, props.heatFaculty, props.activeCategory], updateHeatLayer);
watch(() => props.crowdSnapshot, updateHeatLayer, { deep: true });
watch(() => props.heatBuildingId, updateHeatLayer);
watch(() => props.favoriteIds, updateFavorites, { deep: true });
watch(() => props.tourActive, (active) => {
  if (active) {
    startTour();
  } else if (tourState) {
    finishTour(false);
  }
});
watch(() => props.tourKey, (key) => {
  if (key > 0 && props.tourActive) {
    startTour();
  }
});
</script>

<template>
  <div ref="canvasHost" class="campus-scene" aria-label="3D校园导览场景"></div>
</template>
