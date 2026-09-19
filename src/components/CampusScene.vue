<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { addWindowGrid, createBuildingMaterial, createPodium, createRoof } from '../three/builders/primitives';
import { findCampusPath } from '../utils/pathfinding';
import { evaluateMetric } from '../env/environment.js';

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
  route: {
    type: Object,
    default: null
  },
  weather: {
    type: String,
    default: 'sunny'
  },
  timeHours: {
    type: Number,
    default: 12
  },
  layerVisible: {
    type: Boolean,
    default: true
  },
  monitorRegion: {
    type: String,
    default: 'all'
  },
  monitorMetric: {
    type: String,
    default: 'aqi'
  },
  stationData: {
    type: Array,
    default: () => []
  },
  selectedStationId: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['selectBuilding', 'cameraState', 'selectStation']);

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
let pointerDownPosition = null;
let orbitingBuildingId = '';
let hoveredBuildingId = '';
let hoveredStationId = '';
let cameraFlight = null;
let ambientLight;
let sunLight;
let fillLight;
let rainGroup;
let skyDome;
let sunSprite;
let moonSprite;
let starField;
let hemisphereLight;
let groundMaterial;
let roadMaterial;
let snowGround;
let wetGroup;
let polePointLights = [];
let poleLampMaterials = [];
let stationLayer;
const stationMarkers = new Map();
let snowSystem;
let currentWetness = 0;
let currentSnow = 0;
let currentNight = 0;
let currentDusk = 0;
let currentFogAmount = 0;
const wetMaterials = new Set();
const buildingWindowMaterials = [];
const buildingSnowMaterials = new Map();
let frameCount = 0;
const buildingGroups = new Map();
const interactiveMeshes = [];
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
  material.userData.moodBuildingId = building.id;
  wetMaterials.add(material);
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

  const roofMaterial = new THREE.MeshStandardMaterial({
    color: palette.roof,
    metalness: 0.22,
    roughness: 0.34
  });
  roofMaterial.userData.moodSnow = true;
  roofMaterial.userData.moodBuildingId = building.id;
  const roof = createRoof(width, height, depth, palette.roof);
  roof.material = roofMaterial;
  group.add(roof);

  const podiumMaterial = new THREE.MeshStandardMaterial({
    color: palette.podium,
    metalness: 0.18,
    roughness: 0.42
  });
  podiumMaterial.userData.moodSnow = true;
  podiumMaterial.userData.moodBuildingId = building.id;
  const podium = createPodium(width, depth, palette.podium);
  podium.material = podiumMaterial;
  group.add(podium);

  addBuildingWindows(group, building, width, height, depth);
  buildingSnowMaterials.set(building.id, [roofMaterial, podiumMaterial]);
}

function addBuildingWindows(group, building, width, height, depth) {
  const rows = Math.max(2, Math.floor(height));
  const cols = Math.max(4, Math.floor(width * 1.35));
  const litMaterial = new THREE.MeshStandardMaterial({
    color: '#0e2636',
    emissive: '#ffcf82',
    emissiveIntensity: 0,
    metalness: 0.35,
    roughness: 0.25
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: '#0a2230',
    emissive: '#264a66',
    emissiveIntensity: 0,
    metalness: 0.35,
    roughness: 0.3
  });
  let seed = 0;
  building.id.split('').forEach((char) => { seed += char.charCodeAt(0); });

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const isLit = ((seed + row * 7 + col * 13) % 10) < 7;
      const material = isLit ? litMaterial : darkMaterial;
      const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.035), material);
      windowMesh.position.set(
        -width / 2 + 0.65 + col * (width - 1.3) / Math.max(1, cols - 1),
        0.8 + row * 0.72,
        depth / 2 + 0.025
      );
      windowMesh.userData.isWindow = true;
      group.add(windowMesh);
    }
  }
  buildingWindowMaterials.push({ material: litMaterial, buildingId: building.id });
  buildingWindowMaterials.push({ material: darkMaterial, buildingId: building.id });
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
  baseMaterial.userData.moodBuildingId = building.id;
  wetMaterials.add(baseMaterial);
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
  bodyMaterial.userData.moodBuildingId = building.id;
  wetMaterials.add(bodyMaterial);
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
  towerMaterial.userData.moodBuildingId = building.id;
  wetMaterials.add(towerMaterial);
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
  material.userData.moodBuildingId = building.id;
  wetMaterials.add(material);
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

function createTextSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 86;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(1,18,32,0.52)';
  roundRect(context, 8, 15, 344, 50, 12);
  context.fill();
  context.strokeStyle = 'rgba(53,232,255,0.58)';
  context.lineWidth = 2;
  roundRect(context, 8, 15, 344, 50, 12);
  context.stroke();
  context.fillStyle = '#baf8ff';
  context.font = '700 22px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 180, 41);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(2.65, 0.68, 1);
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
  groundMaterial = new THREE.MeshStandardMaterial({ color: '#d8edf5', roughness: 0.74, metalness: 0.03 });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 34),
    groundMaterial
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

  roadMaterial = new THREE.MeshStandardMaterial({ color: '#8fa8b7', roughness: 0.82, metalness: 0.04 });
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
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);
  });

  addWetPuddles();
  addSnowGround();

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
  const lightMaterial = new THREE.MeshBasicMaterial({ color: '#3a5a70', transparent: true, opacity: 0.9 });
  poleLampMaterials.push(lightMaterial);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: '#ffd98a',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  poleLampMaterials.push(glowMaterial);
  const litPointIndices = new Set([0, 5, 14, 23]);
  let poleIndex = 0;
  [-13, -7, -1, 5, 11, 17].forEach((x) => {
    [-9.2, 5.2].forEach((z) => {
      const pole = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), poleMaterial);
      stem.position.y = 0.6;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), lightMaterial);
      lamp.position.y = 1.28;
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 14), glowMaterial);
      glow.position.y = 1.26;
      pole.add(stem, lamp, glow);
      if (litPointIndices.has(poleIndex)) {
        const point = new THREE.PointLight('#ffd28a', 0, 11, 2);
        point.position.set(x, 1.5, z);
        scene.add(point);
        polePointLights.push(point);
      }
      pole.position.set(x, 0, z);
      scene.add(pole);
      poleIndex += 1;
    });
  });
}

function addWetPuddles() {
  wetGroup = new THREE.Group();
  const puddleMaterial = new THREE.MeshStandardMaterial({
    color: '#9fd4ef',
    metalness: 0.92,
    roughness: 0.05,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const puddles = [
    { x: -6, z: 2.7, sx: 2.6, sz: 0.42, rot: 0.04 },
    { x: 5, z: 2.6, sx: 3.1, sz: 0.5, rot: -0.05 },
    { x: 1.4, z: -3.4, sx: 0.55, sz: 2.4, rot: 0 },
    { x: -9.6, z: -4.2, sx: 0.44, sz: 2.2, rot: 0 },
    { x: 11.8, z: -3.2, sx: 0.44, sz: 2.6, rot: 0 },
    { x: -11.6, z: 8.2, sx: 1.8, sz: 0.5, rot: 0.12 },
    { x: 1.8, z: 8.8, sx: 1.6, sz: 0.46, rot: -0.1 }
  ];
  puddles.forEach((puddle) => {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 36), puddleMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = puddle.rot;
    mesh.scale.set(puddle.sx, puddle.sz, 1);
    mesh.position.set(puddle.x, 0.075, puddle.z);
    wetGroup.add(mesh);
  });
  scene.add(wetGroup);
}

function addSnowGround() {
  const snowMaterial = new THREE.MeshStandardMaterial({
    color: '#f6faff',
    roughness: 0.85,
    metalness: 0,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  snowGround = new THREE.Mesh(new THREE.PlaneGeometry(43.5, 33.5), snowMaterial);
  snowGround.rotation.x = -Math.PI / 2;
  snowGround.position.y = 0.045;
  snowGround.receiveShadow = true;
  scene.add(snowGround);
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

  hemisphereLight = new THREE.HemisphereLight('#bfe8ff', '#2a3344', 0.55);
  scene.add(hemisphereLight);

  sunLight = new THREE.DirectionalLight('#ffffff', 2.9);
  sunLight.position.set(8, 14, 10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -26;
  sunLight.shadow.camera.right = 26;
  sunLight.shadow.camera.top = 22;
  sunLight.shadow.camera.bottom = -22;
  scene.add(sunLight);

  fillLight = new THREE.PointLight('#29d7ff', 22, 48);
  fillLight.position.set(-12, 8, 8);
  scene.add(fillLight);

  createSkyDome();
  createCelestialBodies();
  createWeatherParticles();
  createCampusBase();
  props.buildings.forEach(createBuilding);
  createStationLayer();
  updateCategoryVisibility();
  updateHighlights();
  updateRoute();
  updateStationVisuals(true);
  updateEnvironment(true);
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

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const stationCores = interactiveMeshes.filter((mesh) => mesh.userData.stationCore);
  const stationHits = raycaster.intersectObjects(stationCores, false).filter((hit) => {
    let node = hit.object;
    while (node) {
      if (node.visible === false) {
        return false;
      }
      node = node.parent;
    }
    return true;
  });
  if (stationHits.length) {
    emit('selectStation', stationHits[0].object.userData.stationId);
    return;
  }

  const buildingMeshes = interactiveMeshes.filter((mesh) => !mesh.userData.stationCore);
  const buildingHits = raycaster.intersectObjects(buildingMeshes, false).filter((hit) => {
    let node = hit.object;
    while (node) {
      if (node.visible === false) {
        return false;
      }
      node = node.parent;
    }
    return true;
  });
  if (!buildingHits.length) {
    return;
  }

  const building = buildingHits[0].object.userData.building;
  if (building) {
    emit('selectBuilding', building);
  }
}

function handlePointerMove(event) {
  if (!renderer || !camera || !raycaster || !pointer) {
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(interactiveMeshes, false);
  const station = hits[0]?.object.userData.stationCore ? hits[0].object.userData.stationId : '';
  const building = hits[0]?.object.userData.building;
  hoveredStationId = station;
  hoveredBuildingId = building?.id || '';
  renderer.domElement.style.cursor = building || station ? 'pointer' : 'grab';
}

function handlePointerLeave() {
  hoveredBuildingId = '';
  hoveredStationId = '';
  if (renderer?.domElement) {
    renderer.domElement.style.cursor = 'grab';
  }
}

function updateCategoryVisibility() {
  props.buildings.forEach((building) => {
    const group = buildingGroups.get(building.id);
    if (!group) {
      return;
    }

    group.visible = props.activeCategory === 'all' || building.category === props.activeCategory;
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
      } else if (
        child.userData.baseColor
        && !child.userData.isWindow
        && !wetMaterials.has(child.material)
        && !child.material.userData.moodSnow
      ) {
        child.material.color.copy(child.userData.baseColor);
        if (child.material.emissive && child.userData.baseEmissive) {
          child.material.emissive.copy(child.userData.baseEmissive);
          child.material.emissiveIntensity = 0.05;
        }
      } else if (wetMaterials.has(child.material) && child.material.userData.baseMoodColor) {
        child.material.color.copy(child.material.userData.baseMoodColor);
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

function focusRoute() {
  if (!props.route) {
    return;
  }

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

function nearestRoadValue(value, roads) {
  return roads.reduce((nearest, current) => {
    return Math.abs(current - value) < Math.abs(nearest - value) ? current : nearest;
  }, roads[0]);
}

function pushRoutePoint(points, x, y, z) {
  const next = new THREE.Vector3(x, y, z);
  const previous = points.at(-1);
  if (!previous || previous.distanceTo(next) > 0.12) {
    points.push(next);
  }
}

function getRoutePoints() {
  if (!props.route) {
    return [];
  }

  const startBuilding = props.buildings.find((building) => building.id === props.route.start);
  const endBuilding = props.buildings.find((building) => building.id === props.route.end);
  if (!startBuilding || !endBuilding) {
    return [];
  }

  const y = 0.68;
  return findCampusPath(startBuilding, endBuilding).map((point) => new THREE.Vector3(point.x, y, point.z));
}

function sunDirectionAt(hour) {
  const angle = ((hour - 6) / 12) * Math.PI;
  const direction = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0.34);
  direction.normalize();
  return direction;
}

function getEnvironmentTargets() {
  const hour = ((props.timeHours % 24) + 24) % 24;
  const sunDirection = sunDirectionAt(hour);
  const elevation = sunDirection.y;
  const dayFactor = THREE.MathUtils.smoothstep(elevation, -0.02, 0.2);
  const nightFactor = 1 - dayFactor;
  const horizonGlow = THREE.MathUtils.clamp(1 - Math.abs(elevation - 0.05) / 0.3, 0, 1);
  const nearSunrise = hour >= 4.8 && hour <= 8.2;
  const nearSunset = hour >= 16.4 && hour <= 20;
  const duskFactor = horizonGlow * (nearSunrise || nearSunset ? 1 : 0.25);

  const weatherPresets = {
    sunny: { overcast: 0, wetness: 0, snow: 0, fog: 0, rain: 0, snowfall: 0 },
    rain: { overcast: 0.85, wetness: 1, snow: 0, fog: 0.45, rain: 1, snowfall: 0 },
    fog: { overcast: 0.55, wetness: 0.32, snow: 0, fog: 1, rain: 0, snowfall: 0 },
    snow: { overcast: 0.62, wetness: 0.34, snow: 1, fog: 0.5, rain: 0, snowfall: 1 }
  };
  const preset = weatherPresets[props.weather] || weatherPresets.sunny;

  return { hour, sunDirection, elevation, dayFactor, nightFactor, duskFactor, ...preset };
}

function approach(current, target, delta, speed) {
  return current + (target - current) * Math.min(1, delta * speed);
}

function updateEnvironment(force = false, delta = 0.016) {
  if (!scene || !ambientLight || !sunLight) {
    return;
  }

  const target = getEnvironmentTargets();
  currentWetness = force ? target.wetness : approach(currentWetness, target.wetness, delta, 2.1);
  currentSnow = force ? target.snow : approach(currentSnow, target.snow, delta, 2.1);
  currentNight = force ? target.nightFactor : approach(currentNight, target.nightFactor, delta, 2.4);
  currentDusk = force ? target.duskFactor : approach(currentDusk, target.duskFactor, delta, 2.4);
  currentFogAmount = force ? target.fog : approach(currentFogAmount, target.fog, delta, 1.7);

  const overcast = target.overcast;
  const dayColorTop = new THREE.Color('#2a7fd1').lerp(new THREE.Color('#5b6f80'), overcast);
  const dayColorHorizon = new THREE.Color('#bfe9ff').lerp(new THREE.Color('#96a7b5'), overcast);
  const duskColor = new THREE.Color('#e8783f');

  const skyTop = dayColorTop.clone().lerp(duskColor, currentDusk * 0.35);
  const skyHorizon = dayColorHorizon.clone().lerp(new THREE.Color('#ffb072'), currentDusk * 0.6);
  if (skyDome) {
    skyDome.material.uniforms.uTop.value.copy(skyTop);
    skyDome.material.uniforms.uHorizon.value.copy(skyHorizon);
    skyDome.material.uniforms.uNight.value = currentNight;
    skyDome.material.uniforms.uDusk.value = currentDusk;
    skyDome.position.copy(camera.position);
  }

  const fogColor = skyHorizon.clone().lerp(new THREE.Color('#0a1428'), currentNight * 0.82);
  scene.background = fogColor;
  const fogFar = THREE.MathUtils.lerp(86, 24, currentFogAmount) * THREE.MathUtils.lerp(1, 0.82, currentNight * 0.4);
  const fogNear = THREE.MathUtils.lerp(34, 5, currentFogAmount);
  if (!scene.fog) {
    scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
  } else {
    scene.fog.color.copy(fogColor);
    scene.fog.near = fogNear;
    scene.fog.far = fogFar;
  }

  ambientLight.intensity = force ? target.dayFactor * 0.9 + currentNight * 0.3 : approach(
    ambientLight.intensity,
    target.dayFactor * THREE.MathUtils.lerp(0.9, 1.25, overcast) + currentNight * 0.3,
    delta,
    2.4
  );
  ambientLight.color.copy(new THREE.Color('#d7f0ff').lerp(new THREE.Color('#cdd6e8'), overcast).lerp(new THREE.Color('#3d5680'), currentNight * 0.65));

  if (hemisphereLight) {
    hemisphereLight.intensity = approach(hemisphereLight.intensity, 0.35 + target.dayFactor * 0.35 + currentNight * 0.12, delta, 2.4);
  }

  const sunHeight = Math.max(target.elevation, 0);
  const sunIntensity = target.dayFactor * THREE.MathUtils.lerp(2.7, 0.75, overcast);
  sunLight.intensity = approach(sunLight.intensity, sunIntensity, delta, 2.6);
  sunLight.position.copy(target.sunDirection).multiplyScalar(30);
  const noonColor = new THREE.Color('#ffffff').lerp(new THREE.Color('#cfd9e6'), overcast * 0.8);
  const warmSun = new THREE.Color('#ffb36b');
  sunLight.color.copy(noonColor.lerp(warmSun, currentDusk * 0.7));
  sunLight.target?.updateMatrixWorld();

  if (fillLight) {
    fillLight.intensity = approach(fillLight.intensity, 16 + currentNight * 16 + currentWetness * 6, delta, 2.4);
    fillLight.color.set(currentNight > 0.5 ? '#5a86ff' : '#29d7ff');
  }

  updateWetAndSnowMaterials();
  updateNightLighting(delta);
  updateCelestialVisuals(target, fogColor);
  updateWeatherParticles(target, delta);
}

function updateWetAndSnowMaterials() {
  const wetness = currentWetness;
  const snow = currentSnow;
  const selectedId = props.selectedBuildingId;
  const focusedId = props.focusedBuildingId;

  const dryGround = new THREE.Color('#d8edf5');
  const wetGround = new THREE.Color('#8694a0');
  const groundTarget = dryGround.clone().lerp(wetGround, wetness).lerp(new THREE.Color('#f6faff'), snow * 0.88);
  groundMaterial.color.copy(groundTarget);
  groundMaterial.roughness = THREE.MathUtils.lerp(0.74, 0.14, wetness) + snow * 0.6;
  groundMaterial.metalness = THREE.MathUtils.lerp(0.03, 0.35, wetness);

  const dryRoad = new THREE.Color('#8fa8b7');
  const wetRoad = new THREE.Color('#394755');
  roadMaterial.color.copy(dryRoad.clone().lerp(wetRoad, wetness).lerp(new THREE.Color('#eef4fa'), snow * 0.8));
  roadMaterial.roughness = THREE.MathUtils.lerp(0.82, 0.1, wetness) + snow * 0.55;
  roadMaterial.metalness = THREE.MathUtils.lerp(0.04, 0.6, wetness);

  wetGroup.children.forEach((puddle) => {
    puddle.material.opacity = wetness * 0.8 * (1 - snow * 0.7);
  });
  if (snowGround) {
    snowGround.material.opacity = snow * 0.96;
  }

  wetMaterials.forEach((material) => {
    const ownerId = material.userData.moodBuildingId;
    if (ownerId === selectedId || ownerId === focusedId) {
      return;
    }
    const base = material.userData.baseMoodColor || material.color.clone();
    if (!material.userData.baseMoodColor) {
      material.userData.baseMoodColor = base;
    }
    const wet = base.clone().multiplyScalar(1 - wetness * 0.3);
    material.color.copy(wet.lerp(new THREE.Color('#eef4fb'), snow * 0.14));
    material.roughness = THREE.MathUtils.lerp(0.45, 0.07, wetness);
    material.metalness = THREE.MathUtils.lerp(0.18, 0.62, wetness);
  });

  buildingSnowMaterials.forEach((materials, buildingId) => {
    materials.forEach((material) => {
      if (buildingId === selectedId || buildingId === focusedId) {
        return;
      }
      const base = material.userData.baseMoodColor || material.color.clone();
      if (!material.userData.baseMoodColor) {
        material.userData.baseMoodColor = base;
      }
      material.color.copy(base.clone().lerp(new THREE.Color('#f5f9ff'), snow * 0.92));
      material.roughness = 0.34 + snow * 0.5;
    });
  });
}

function updateNightLighting(delta) {
  const night = currentNight;
  const warmGlow = night * 1.5 + currentDusk * 0.65;

  buildingWindowMaterials.forEach(({ material, buildingId }) => {
    if (buildingId === props.selectedBuildingId || buildingId === props.focusedBuildingId) {
      return;
    }
    if (material.emissive.getHex() === new THREE.Color('#ffcf82').getHex()) {
      material.emissiveIntensity = warmGlow;
    } else {
      material.emissiveIntensity = night * 0.14;
    }
  });

  const [poleMaterial, glowMaterial] = poleLampMaterials;
  if (poleMaterial) {
    poleMaterial.color.copy(new THREE.Color('#3a5a70').lerp(new THREE.Color('#ffd28a'), night));
  }
  if (glowMaterial) {
    glowMaterial.opacity = night * (0.78 + Math.sin(clock.getElapsedTime() * 2.2) * 0.06);
  }
  polePointLights.forEach((light) => {
    light.intensity = approach(light.intensity, night * 17, delta, 3);
  });
}

function updateCelestialVisuals(target, fogColor) {
  const sunWorldPosition = target.sunDirection.clone().multiplyScalar(72).add(camera.position);
  sunSprite.position.copy(sunWorldPosition);
  sunSprite.material.opacity = target.dayFactor * (1 - target.overcast * 0.78);

  const moonDirection = target.sunDirection.clone().multiplyScalar(-1);
  moonSprite.position.copy(moonDirection.multiplyScalar(70).add(camera.position));
  moonSprite.material.opacity = currentNight * (1 - target.fog * 0.85) * (1 - target.overcast * 0.55);

  if (starField) {
    starField.position.copy(camera.position);
    starField.material.opacity = currentNight * (1 - target.fog * 0.92) * (1 - target.overcast * 0.82);
  }
}

function updateWeatherParticles(target, delta) {
  if (rainGroup) {
    rainGroup.visible = target.rain > 0.01;
    rainGroup.material.opacity = approach(rainGroup.material.opacity, target.rain * 0.55, delta, 4);
    if (target.rain > 0.01) {
      const positions = rainGroup.geometry.attributes.position.array;
      const speeds = rainGroup.userData.speeds;
      rainGroup.position.set(camera.position.x, 0, camera.position.z);
      for (let index = 0; index < rainGroup.userData.count; index += 1) {
        positions[index * 6 + 1] -= speeds[index] * delta;
        positions[index * 6 + 4] -= speeds[index] * delta;
        positions[index * 6] -= speeds[index] * delta * 0.12;
        positions[index * 6 + 3] -= speeds[index] * delta * 0.12;
        if (positions[index * 6 + 1] < 0.2) {
          resetRainDrop(positions, index, false);
          positions[index * 6] += camera.position.x - rainGroup.position.x;
          positions[index * 6 + 2] += camera.position.z - rainGroup.position.z;
          positions[index * 6 + 3] = positions[index * 6] - 0.16;
          positions[index * 6 + 5] = positions[index * 6 + 2] + 0.06;
        }
      }
      rainGroup.geometry.attributes.position.needsUpdate = true;
    }
  }

  if (snowSystem) {
    snowSystem.visible = target.snowfall > 0.01;
    snowSystem.material.opacity = approach(snowSystem.material.opacity, target.snowfall * 0.9, delta, 3.5);
    if (target.snowfall > 0.01) {
      const positions = snowSystem.geometry.attributes.position.array;
      const { speeds, drift, count } = snowSystem.userData;
      const elapsed = clock.getElapsedTime();
      snowSystem.position.set(camera.position.x, 0, camera.position.z);
      for (let index = 0; index < count; index += 1) {
        positions[index * 3 + 1] -= speeds[index] * delta;
        positions[index * 3] += Math.sin(elapsed * 0.7 + drift[index]) * delta * 0.7;
        if (positions[index * 3 + 1] < 0.2) {
          positions[index * 3] = THREE.MathUtils.randFloatSpread(46);
          positions[index * 3 + 1] = 18 + Math.random() * 5;
          positions[index * 3 + 2] = THREE.MathUtils.randFloatSpread(36);
        }
      }
      snowSystem.geometry.attributes.position.needsUpdate = true;
    }
  }
}


function updateRoute() {
  if (routeGroup) {
    scene.remove(routeGroup);
    routeGroup.traverse((child) => {
      child.geometry?.dispose();
      child.material?.dispose();
    });
    routeGroup = null;
  }

  if (!props.route) {
    return;
  }

  const routePoints = getRoutePoints();
  if (routePoints.length < 2) {
    return;
  }

  routeGroup = new THREE.Group();
  routeGroup.userData.pulses = [];
  const startPoint = routePoints[0];
  const endPoint = routePoints.at(-1);
  const curve = new THREE.CatmullRomCurve3(routePoints, false, 'catmullrom', 0.08);
  routeGroup.userData.curve = curve;

  const glowTube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 96, 0.22, 18, false),
    new THREE.MeshBasicMaterial({
      color: '#13dfff',
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glowTube.userData.routeGlow = true;
  routeGroup.add(glowTube);

  const coreTube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 96, 0.105, 16, false),
    new THREE.MeshBasicMaterial({
      color: '#e9feff',
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  coreTube.userData.routeCore = true;
  routeGroup.add(coreTube);

  for (let index = 0; index < 10; index += 1) {
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 18, 18),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? '#39ffb6' : '#31eaff',
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    pulse.userData.routePulse = true;
    pulse.userData.offset = index / 7;
    pulse.position.copy(curve.getPoint(pulse.userData.offset));
    routeGroup.userData.pulses.push(pulse);
    routeGroup.add(pulse);
  }

  for (let index = 0; index < 9; index += 1) {
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.56, 3),
      new THREE.MeshBasicMaterial({
        color: '#dffcff',
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    arrow.userData.routeArrow = true;
    arrow.userData.offset = (index + 0.5) / 9;
    routeGroup.add(arrow);
  }

  routePoints.slice(1, -1).forEach((point, index) => {
    const node = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.08, 24),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? '#45ffc3' : '#31eaff',
        transparent: true,
        opacity: 0.84,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    node.position.copy(point);
    node.position.y = 0.44;
    node.userData.routeNode = true;
    routeGroup.add(node);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.1, 1.25, 14),
      new THREE.MeshBasicMaterial({
        color: '#50f2ff',
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    beam.position.copy(point);
    beam.position.y = 1.06;
    beam.userData.routeBeam = true;
    routeGroup.add(beam);
  });

  [startPoint, endPoint].forEach((point) => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 28, 28),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.98 })
    );
    marker.position.copy(point);
    routeGroup.add(marker);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.045, 8, 48),
      new THREE.MeshBasicMaterial({
        color: '#28eaff',
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ring.position.copy(point);
    ring.rotation.x = Math.PI / 2;
    ring.userData.routeRing = true;
    routeGroup.add(ring);
  });

  scene.add(routeGroup);
}

function createGlowTexture(coreColor, haloColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 124);
  gradient.addColorStop(0, coreColor);
  gradient.addColorStop(0.28, haloColor);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function createSkyDome() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color('#2a7fd1') },
      uHorizon: { value: new THREE.Color('#bfe9ff') },
      uNight: { value: 0 },
      uDusk: { value: 0 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform float uNight;
      uniform float uDusk;
      varying vec3 vWorldPosition;
      void main() {
        float h = clamp(normalize(vWorldPosition).y * 1.35, 0.0, 1.0);
        vec3 dayColor = mix(uHorizon, uTop, pow(h, 0.72));
        vec3 duskTint = vec3(1.0, 0.48, 0.28);
        dayColor = mix(dayColor, duskTint, uDusk * (1.0 - h) * 0.72);
        vec3 nightColor = mix(vec3(0.012, 0.025, 0.07), vec3(0.05, 0.09, 0.19), pow(h, 0.8));
        vec3 color = mix(dayColor, nightColor, uNight);
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
  skyDome = new THREE.Mesh(new THREE.SphereGeometry(90, 36, 20), material);
  skyDome.userData.isSky = true;
  scene.add(skyDome);
}

function createCelestialBodies() {
  sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture('rgba(255,247,214,1)', 'rgba(255,196,92,0.55)'),
      transparent: true,
      depthWrite: false,
      fog: false
    })
  );
  sunSprite.scale.set(9, 9, 1);
  scene.add(sunSprite);

  moonSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture('rgba(236,244,255,1)', 'rgba(158,190,255,0.4)'),
      transparent: true,
      depthWrite: false,
      fog: false,
      opacity: 0
    })
  );
  moonSprite.scale.set(6, 6, 1);
  scene.add(moonSprite);

  const starCount = 700;
  const positions = new Float32Array(starCount * 3);
  for (let index = 0; index < starCount; index += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.92 + 0.04);
    const radius = 82;
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starField = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: '#dfeaff',
      size: 0.34,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false
    })
  );
  scene.add(starField);
}

function createWeatherParticles() {
  const rainCount = 900;
  const rainPositions = new Float32Array(rainCount * 6);
  const rainSpeeds = new Float32Array(rainCount);
  for (let index = 0; index < rainCount; index += 1) {
    resetRainDrop(rainPositions, index, true);
    rainSpeeds[index] = 18 + Math.random() * 12;
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  rainGroup = new THREE.LineSegments(
    rainGeometry,
    new THREE.LineBasicMaterial({
      color: '#9fd8ff',
      transparent: true,
      opacity: 0,

    })
  );
  rainGroup.userData.speeds = rainSpeeds;
  rainGroup.userData.count = rainCount;
  rainGroup.visible = false;
  scene.add(rainGroup);

  const snowCount = 650;
  const snowPositions = new Float32Array(snowCount * 3);
  const snowSpeeds = new Float32Array(snowCount);
  const snowDrift = new Float32Array(snowCount);
  for (let index = 0; index < snowCount; index += 1) {
    snowPositions[index * 3] = THREE.MathUtils.randFloatSpread(46);
    snowPositions[index * 3 + 1] = Math.random() * 22;
    snowPositions[index * 3 + 2] = THREE.MathUtils.randFloatSpread(36);
    snowSpeeds[index] = 0.8 + Math.random() * 1.1;
    snowDrift[index] = Math.random() * Math.PI * 2;
  }
  const snowGeometry = new THREE.BufferGeometry();
  snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  snowSystem = new THREE.Points(
    snowGeometry,
    new THREE.PointsMaterial({
      color: '#ffffff',
      size: 0.22,
      transparent: true,
      opacity: 0,
      depthWrite: false
    })
  );
  snowSystem.userData = { speeds: snowSpeeds, drift: snowDrift, count: snowCount };
  snowSystem.visible = false;
  scene.add(snowSystem);
}

function resetRainDrop(positions, index, randomHeight) {
  positions[index * 6] = THREE.MathUtils.randFloatSpread(46);
  positions[index * 6 + 1] = randomHeight ? Math.random() * 22 : 18 + Math.random() * 4;
  positions[index * 6 + 2] = THREE.MathUtils.randFloatSpread(36);
  positions[index * 6 + 3] = positions[index * 6] - 0.16;
  positions[index * 6 + 4] = positions[index * 6 + 1] - 0.9;
  positions[index * 6 + 5] = positions[index * 6 + 2] + 0.06;
}

function createStationLayer() {
  stationLayer = new THREE.Group();
  stationLayer.name = 'monitor-stations';

  props.stationData.forEach(({ station }) => {
    const marker = new THREE.Group();
    marker.position.set(station.position[0], 0, station.position[2]);
    marker.userData.stationId = station.id;

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 1.05, 8),
      new THREE.MeshStandardMaterial({ color: '#cfe6f2', metalness: 0.5, roughness: 0.35 })
    );
    pole.position.y = 0.52;
    marker.add(pole);

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: '#2ecc71',
      emissive: '#2ecc71',
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.2
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 20), coreMaterial);
    core.position.y = 1.18;
    core.userData.stationId = station.id;
    core.userData.stationCore = true;
    marker.add(core);
    interactiveMeshes.push(core);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: '#2ecc71',
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.6, 36), ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    marker.add(ring);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.42, 1.4, 18, 1, true),
      new THREE.MeshBasicMaterial({
        color: '#2ecc71',
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    beam.position.y = 0.78;
    marker.add(beam);

    marker.userData.coreMaterial = coreMaterial;
    marker.userData.ring = ring;
    marker.userData.beam = beam;
    stationLayer.add(marker);
    stationMarkers.set(station.id, marker);
  });

  scene.add(stationLayer);
}

function updateStationVisuals(force = false) {
  if (!stationLayer) {
    return;
  }

  stationLayer.visible = props.layerVisible;
  props.stationData.forEach(({ station, readings }) => {
    const marker = stationMarkers.get(station.id);
    if (!marker) {
      return;
    }
    const regionVisible = props.monitorRegion === 'all' || station.region === props.monitorRegion;
    const isSelected = station.id === props.selectedStationId;
    marker.visible = regionVisible || isSelected;

    const metricKey = props.monitorMetric;
    const result = evaluateMetric(metricKey, readings[metricKey]);
    const color = new THREE.Color(result.color);
    const materials = [marker.userData.coreMaterial, marker.userData.ring.material, marker.userData.beam.material];
    materials.forEach((material) => material.color.copy(color));
    marker.userData.coreMaterial.emissive.copy(color);
    marker.userData.exceeded = result.exceeded;
    marker.userData.colorHex = result.color;

    const scale = isSelected ? 1.32 : 1;
    marker.scale.setScalar(scale);
  });
}

function focusStation(stationId) {
  const marker = stationMarkers.get(stationId);
  if (!marker) {
    return;
  }
  const target = marker.position.clone();
  const direction = camera.position.clone().sub(controls.target).normalize();
  direction.y = THREE.MathUtils.clamp(direction.y + 0.1, 0.24, 0.5);
  direction.normalize();
  startCameraFlight(
    new THREE.Vector3(target.x, 3.4, target.z).add(direction.multiplyScalar(8.4)),
    new THREE.Vector3(target.x, 1.2, target.z),
    1.05
  );
}

function updateStationMarkerAnimations(elapsed) {
  if (!stationLayer || !props.layerVisible) {
    return;
  }

  stationMarkers.forEach((marker, id) => {
    if (!marker.visible) {
      return;
    }
    const isSelected = id === props.selectedStationId;
    const isHovered = id === hoveredStationId;
    const pulse = marker.userData.exceeded
      ? 0.5 + 0.5 * Math.sin(elapsed * 6.4)
      : 0.12 + 0.05 * Math.sin(elapsed * 2 + marker.position.x);

    marker.userData.coreMaterial.emissiveIntensity = (marker.userData.exceeded ? 1.1 + pulse * 1.6 : 0.75) * (isSelected ? 1.25 : 1);
    const ringScale = marker.userData.exceeded ? 1 + pulse * 0.55 : 1 + pulse * 0.18;
    marker.userData.ring.scale.setScalar(ringScale);
    marker.userData.ring.material.opacity = marker.userData.exceeded ? 0.45 + pulse * 0.55 : 0.5;
    marker.userData.beam.material.opacity = marker.userData.exceeded ? 0.12 + pulse * 0.42 : 0.12;

    const targetScale = isSelected ? 1.32 : isHovered ? 1.16 : 1;
    const currentScale = marker.scale.x;
    const nextScale = currentScale + (targetScale - currentScale) * 0.18;
    marker.scale.setScalar(nextScale);
  });
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
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  frameCount += 1;
  updateEnvironment(false, delta);
  updateStationMarkerAnimations(elapsed);
  if (routeGroup) {
    const curve = routeGroup.userData.curve;
    routeGroup.children.forEach((child) => {
      if (child.userData.routeGlow && child.material) {
        child.material.opacity = 0.18 + Math.sin(elapsed * 3.4) * 0.08;
      }
      if (child.userData.routeCore && child.material) {
        child.material.opacity = 0.82 + Math.sin(elapsed * 5) * 0.16;
      }
      if (child.userData.routeRing) {
        const scale = 1 + Math.sin(elapsed * 2.6) * 0.12;
        child.scale.setScalar(scale);
      }
      if (child.userData.routePulse && curve) {
        const t = (elapsed * 0.18 + child.userData.offset) % 1;
        child.position.copy(curve.getPoint(t));
        child.scale.setScalar(0.8 + Math.sin((t + elapsed) * Math.PI * 2) * 0.18);
      }
      if (child.userData.routeArrow && curve) {
        const t = (elapsed * 0.08 + child.userData.offset) % 1;
        const point = curve.getPoint(t);
        const tangent = curve.getTangent(t).normalize();
        child.position.copy(point);
        child.position.y += 0.12;
        child.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        child.rotateY(Math.PI / 2);
      }
      if (child.userData.routeNode || child.userData.routeBeam) {
        child.material.opacity = child.userData.routeNode
          ? 0.66 + Math.sin(elapsed * 3.2) * 0.18
          : 0.18 + Math.sin(elapsed * 2.6) * 0.1;
      }
    });
  }

  if (orbitingBuildingId) {
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

watch(() => props.activeCategory, updateCategoryVisibility);
watch(() => [props.selectedBuildingId, props.focusedBuildingId], updateHighlights);
watch(() => props.focusedBuildingId, (id) => focusBuilding(id));
watch(() => props.route, updateRoute, { deep: true });
watch(() => props.routeFocusKey, () => focusRoute());
watch(() => props.cameraFocusKey, () => focusBuilding(props.selectedBuildingId, props.cameraMode));
watch(
  () => [props.weather, props.timeHours],
  () => updateEnvironment()
);
watch(
  () => [props.layerVisible, props.monitorRegion, props.monitorMetric, props.selectedStationId],
  () => updateStationVisuals()
);
watch(
  () => props.stationData,
  () => updateStationVisuals(),
  { deep: true }
);
watch(() => props.selectedStationId, (id) => {
  if (id) {
    focusStation(id);
  }
});
</script>

<template>
  <div ref="canvasHost" class="campus-scene" aria-label="3D校园导览场景"></div>
</template>
