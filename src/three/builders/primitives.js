import * as THREE from 'three';

export function createBuildingMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.18,
    roughness: 0.45,
    emissive: '#0a3a66',
    emissiveIntensity: 0.05
  });
}

export function createRoof(width, height, depth, color = '#eef8ff') {
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.35, 0.28, depth + 0.35),
    new THREE.MeshStandardMaterial({ color, metalness: 0.22, roughness: 0.34 })
  );
  roof.position.y = height + 0.2;
  roof.castShadow = true;
  return roof;
}

export function createPodium(width, depth, color = '#dbeaf5') {
  const podium = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.8, 0.35, depth + 0.9),
    new THREE.MeshStandardMaterial({ color, metalness: 0.18, roughness: 0.42 })
  );
  podium.position.y = 0.18;
  podium.castShadow = true;
  podium.receiveShadow = true;
  return podium;
}

export function addWindowGrid(group, width, height, depth, windowMaterial) {
  const rows = Math.max(2, Math.floor(height));
  const cols = Math.max(4, Math.floor(width * 1.35));
  const material = windowMaterial || new THREE.MeshBasicMaterial({ color: '#e8fbff' });

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.035), material);
      windowMesh.position.set(
        -width / 2 + 0.65 + col * (width - 1.3) / Math.max(1, cols - 1),
        0.8 + row * 0.72,
        depth / 2 + 0.025
      );
      group.add(windowMesh);
    }
  }
}
