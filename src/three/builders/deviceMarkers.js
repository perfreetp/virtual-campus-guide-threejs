import * as THREE from 'three';
import { deviceTypeMeta } from '../../mock/deviceData';

let glowTexture = null;

export function getGlowTexture() {
  if (glowTexture) {
    return glowTexture;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.28, 'rgba(255,255,255,0.62)');
  gradient.addColorStop(0.62, 'rgba(255,255,255,0.16)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

function solidMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.32,
    roughness: 0.36,
    emissive: color,
    emissiveIntensity: 0.28
  });
}

function darkMaterial() {
  return new THREE.MeshStandardMaterial({ color: '#123049', metalness: 0.4, roughness: 0.5 });
}

function registerPart(group, device, parts) {
  parts.forEach((part) => {
    part.userData.device = device;
    part.userData.baseColor = part.material.color?.clone();
    part.userData.baseEmissive = part.material.emissive?.clone();
    part.userData.baseEmissiveIntensity = part.material.emissiveIntensity;
    group.userData.parts.push(part);
  });
}

function addElevatorBody(group, device) {
  const frameMaterial = solidMaterial('#2f86c4');
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.42, 0.42), frameMaterial);
  shaft.position.y = 0.72;
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: '#dff7ff',
    metalness: 0.72,
    roughness: 0.2,
    emissive: '#14374d',
    emissiveIntensity: 0.2
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.78, 0.03), doorMaterial);
  door.position.set(0, 0.46, 0.22);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), darkMaterial());
  cap.position.y = 1.46;
  registerPart(group, device, [shaft, door, cap]);
  group.add(shaft, door, cap);
}

function addAcBody(group, device) {
  const bodyMaterial = solidMaterial(deviceTypeMeta.ac.color);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.42), bodyMaterial);
  body.position.y = 0.26;
  const fanMaterial = new THREE.MeshStandardMaterial({
    color: '#e8fcff',
    metalness: 0.5,
    roughness: 0.28,
    emissive: '#0c3a52',
    emissiveIntensity: 0.3
  });
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 18), fanMaterial);
  fan.rotation.x = Math.PI / 2;
  fan.position.set(0, 0.26, 0.24);
  fan.userData.isFan = true;
  registerPart(group, device, [body, fan]);
  group.add(body, fan);
}

function addLightingBody(group, device, tall) {
  const poleMaterial = new THREE.MeshStandardMaterial({ color: '#c9e8f4', metalness: 0.55, roughness: 0.3 });
  const poleHeight = tall ? 1.5 : 0.5;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, poleHeight, 8), poleMaterial);
  pole.position.y = poleHeight / 2;
  const bulbMaterial = solidMaterial(deviceTypeMeta.lighting.color);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), bulbMaterial);
  bulb.position.y = poleHeight + 0.08;
  bulb.userData.isBulb = true;
  registerPart(group, device, [pole, bulb]);
  group.add(pole, bulb);
}

function addPumpBody(group, device) {
  const baseMaterial = solidMaterial(deviceTypeMeta.pump.color);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.36), darkMaterial());
  base.position.y = 0.1;
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.34, 18), baseMaterial);
  motor.rotation.z = Math.PI / 2;
  motor.position.y = 0.34;
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.44, 10),
    new THREE.MeshStandardMaterial({ color: '#9fd7e6', metalness: 0.6, roughness: 0.35 })
  );
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(0, 0.34, 0.3);
  registerPart(group, device, [base, motor, pipe]);
  group.add(base, motor, pipe);
}

export function createDeviceMarker(device) {
  const group = new THREE.Group();
  group.name = device.id;
  group.position.set(device.position[0], device.position[1], device.position[2]);
  group.userData.device = device;
  group.userData.deviceId = device.id;
  group.userData.parts = [];
  group.userData.phase = device.id.charCodeAt(device.id.length - 1);

  const typeColor = deviceTypeMeta[device.type].color;

  const baseRingMaterial = new THREE.MeshBasicMaterial({
    color: typeColor,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.024, 8, 32), baseRingMaterial);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.02;
  baseRing.userData.baseRing = true;
  group.add(baseRing);

  if (device.type === 'elevator') {
    addElevatorBody(group, device);
  } else if (device.type === 'ac') {
    addAcBody(group, device);
  } else if (device.type === 'lighting') {
    addLightingBody(group, device, device.position[1] <= 0.6);
  } else {
    addPumpBody(group, device);
  }

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.16, 1.5, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: typeColor,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  beam.position.y = 0.82;
  beam.userData.beam = true;
  group.add(beam);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color: typeColor,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glow.position.y = 0.78;
  glow.scale.setScalar(0.85);
  glow.userData.glow = true;
  group.add(glow);

  const selectedRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.035, 8, 40),
    new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  selectedRing.rotation.x = Math.PI / 2;
  selectedRing.position.y = 0.05;
  selectedRing.userData.selectedRing = true;
  group.add(selectedRing);

  const faultHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.05, 8, 40),
    new THREE.MeshBasicMaterial({
      color: '#ff3b52',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  faultHalo.rotation.x = Math.PI / 2;
  faultHalo.position.y = 0.06;
  faultHalo.userData.faultHalo = true;
  group.add(faultHalo);

  group.traverse((child) => {
    if (child !== group && child.isMesh) {
      child.userData.device = device;
    }
  });

  return group;
}

export function updateDeviceMarker(group, elapsed, options) {
  const device = group.userData.device;
  const phase = group.userData.phase;
  const isFault = device.status === 'fault';
  const isSelected = options.selectedDeviceId === device.id;
  const saving = options.savingMode && !isFault;
  const blink = 0.5 + 0.5 * Math.sin(elapsed * 4.6 + phase);
  const typeColor = deviceTypeMeta[device.type].color;

  group.children.forEach((child) => {
    if (child.userData.glow) {
      if (isFault) {
        child.material.color.set('#ff3148');
        child.material.opacity = 0.45 + blink * 0.5;
        child.scale.setScalar(1 + blink * 0.45);
      } else {
        child.material.color.set(typeColor);
        child.material.opacity = saving ? 0.2 : 0.4 + blink * 0.14;
        child.scale.setScalar(0.8 + blink * 0.08);
      }
    }

    if (child.userData.beam) {
      child.material.color.set(isFault ? '#ff3148' : typeColor);
      child.material.opacity = isFault ? 0.18 + blink * 0.3 : saving ? 0.06 : 0.16 + blink * 0.08;
    }

    if (child.userData.baseRing) {
      child.material.color.set(isFault ? '#ff3148' : typeColor);
      child.material.opacity = isFault ? 0.5 + blink * 0.4 : isSelected ? 0.95 : 0.4 + blink * 0.2;
    }

    if (child.userData.selectedRing) {
      child.material.opacity = isSelected ? 0.7 + blink * 0.3 : 0;
      if (isSelected) {
        const scale = 1 + blink * 0.12;
        child.scale.setScalar(scale);
        child.rotation.z = elapsed * 0.9;
      }
    }

    if (child.userData.faultHalo) {
      if (isFault) {
        const pulse = (elapsed * 0.9 + phase) % 1;
        child.material.opacity = (1 - pulse) * 0.8;
        child.scale.setScalar(0.7 + pulse * 1.1);
      } else {
        child.material.opacity = 0;
        child.scale.setScalar(1);
      }
    }

    if (child.userData.isFan) {
      child.rotation.y = elapsed * (saving ? 1.6 : 5.2) + phase;
    }

    if (child.userData.isBulb) {
      child.material.color.set(isFault ? '#ff5c6e' : saving ? '#8a7a45' : deviceTypeMeta.lighting.color);
      child.material.emissive.set(isFault ? '#ff2f48' : saving ? '#4a3c12' : deviceTypeMeta.lighting.color);
      child.material.emissiveIntensity = saving ? 0.12 : isFault ? 0.4 + blink * 0.5 : 0.6 + blink * 0.25;
    }
  });

  group.userData.parts.forEach((part) => {
    if (part.userData.isBulb) {
      return;
    }
    if (part.material?.emissive) {
      if (isFault) {
        part.material.emissive.set('#ff2f48');
        part.material.emissiveIntensity = 0.35 + blink * 0.75;
      } else if (saving) {
        part.material.emissive.copy(part.userData.baseEmissive);
        part.material.emissiveIntensity = 0.08;
      } else {
        part.material.emissive.copy(part.userData.baseEmissive);
        part.material.emissiveIntensity = part.userData.baseEmissiveIntensity;
      }
    }
  });
}
