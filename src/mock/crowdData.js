const crowdProfiles = {
  gate: { capacity: 220, base: 0.32 },
  'teaching-a': { capacity: 680, base: 0.66 },
  library: { capacity: 820, base: 0.72 },
  lab: { capacity: 420, base: 0.5 },
  academy: { capacity: 360, base: 0.46 },
  innovation: { capacity: 260, base: 0.38 },
  'dorm-north': { capacity: 960, base: 0.58 },
  'dorm-south': { capacity: 720, base: 0.52 },
  canteen: { capacity: 540, base: 0.74 },
  market: { capacity: 300, base: 0.42 },
  playground: { capacity: 380, base: 0.34 },
  gym: { capacity: 320, base: 0.36 },
  pool: { capacity: 180, base: 0.22 },
  service: { capacity: 200, base: 0.28 },
  admin: { capacity: 240, base: 0.24 },
  clinic: { capacity: 150, base: 0.18 },
  'twin-center': { capacity: 300, base: 0.44 },
  auditorium: { capacity: 900, base: 0.2 },
  clocktower: { capacity: 120, base: 0.14 },
  'solar-hub': { capacity: 340, base: 0.4 },
  parking: { capacity: 420, base: 0.3 }
};

function hourFactor(hour) {
  if (hour >= 7.5 && hour < 9) return 1.05;
  if (hour >= 9.5 && hour < 11.5) return 0.92;
  if (hour >= 11.5 && hour < 13) return 1.22;
  if (hour >= 14 && hour < 16.5) return 0.98;
  if (hour >= 17 && hour < 19) return 1.18;
  if (hour >= 19 && hour < 21.5) return 1.02;
  return 0.42;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createCrowdSnapshot(buildings, date = new Date()) {
  const factor = hourFactor(date.getHours() + date.getMinutes() / 60);
  const entries = buildings.map((building) => {
    const profile = crowdProfiles[building.id] || { capacity: 300, base: 0.3 };
    const jitter = 0.9 + Math.random() * 0.2;
    const density = clamp(profile.base * factor * jitter, 0.04, 0.99);
    const people = Math.round(profile.capacity * density);
    const warning = density >= 0.86 ? 'red' : density >= 0.72 ? 'yellow' : '';
    return {
      id: building.id,
      capacity: profile.capacity,
      density: Math.round(density * 100) / 100,
      people,
      warning
    };
  });

  return {
    time: date.toISOString(),
    total: entries.reduce((sum, entry) => sum + entry.people, 0),
    entries
  };
}

export function getCrowdEntry(snapshot, buildingId) {
  return snapshot?.entries.find((entry) => entry.id === buildingId) || null;
}
