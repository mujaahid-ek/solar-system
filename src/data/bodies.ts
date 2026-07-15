// Values from NASA planetary fact sheets (nssdc.gsfc.nasa.gov/planetary/factsheet)
// and NASA Sun fact sheet. Rotation periods are sidereal; negative = retrograde.

export interface Composition {
  name: string;
  pct: number;
}

export interface OrbitData {
  parent: 'sun' | 'earth';
  semiMajorKm6: number; // 10^6 km
  semiMajorAU: number;
  periodDays: number;
  eccentricity: number;
  inclinationDeg: number;
}

export interface StarData {
  spectralClass: string;
  luminosity: string;
  coreTemp: string;
  ageGyr: number;
}

export interface BodyData {
  id: string;
  name: string;
  kind: 'star' | 'planet' | 'dwarf planet' | 'moon';
  designation: string;
  description: string;
  diameterKm: number;
  mass: string;
  densityKgM3: number;
  gravityMs2: number;
  escapeKms: number;
  rotationHours: number;
  axialTiltDeg: number;
  meanTempC: number;
  orbit?: OrbitData;
  atmosphere: Composition[] | null;
  atmosphereNote?: string;
  moons: number | null;
  moonsNote?: string;
  rings: string;
  star?: StarData;
  tex: {
    base: string;
    hi?: string;
    clouds?: string;
    ring?: string;
    emissive?: boolean;
  };
}

export const BODIES: BodyData[] = [
  {
    id: 'sun',
    name: 'Sol',
    kind: 'star',
    designation: 'G2V main-sequence star',
    description:
      'The Sun holds 99.86% of the solar system’s mass and fuses roughly 600 million tonnes of hydrogen every second. Its photosphere — the visible surface — churns with convection cells the size of continents.',
    diameterKm: 1391400,
    mass: '1.989×10³⁰ kg',
    densityKgM3: 1408,
    gravityMs2: 274,
    escapeKms: 617.6,
    rotationHours: 609.12,
    axialTiltDeg: 7.25,
    meanTempC: 5505,
    atmosphere: [
      { name: 'H₂', pct: 73.5 },
      { name: 'He', pct: 24.9 },
      { name: 'O, C, Fe…', pct: 1.6 },
    ],
    atmosphereNote: 'Photospheric composition by mass',
    moons: null,
    rings: 'none',
    star: {
      spectralClass: 'G2V',
      luminosity: '3.828×10²⁶ W',
      coreTemp: '15.7×10⁶ °C',
      ageGyr: 4.6,
    },
    tex: { base: '/textures/2k_sun.jpg', hi: '/textures/8k_sun.jpg', emissive: true },
  },
  {
    id: 'mercury',
    name: 'Mercury',
    kind: 'planet',
    designation: 'SOL-1 · terrestrial',
    description:
      'The smallest planet and the closest to the Sun, Mercury is a cratered iron world with almost no atmosphere. A single day–night cycle lasts 176 Earth days — longer than its year.',
    diameterKm: 4879,
    mass: '3.30×10²³ kg',
    densityKgM3: 5429,
    gravityMs2: 3.7,
    escapeKms: 4.3,
    rotationHours: 1407.6,
    axialTiltDeg: 0.034,
    meanTempC: 167,
    orbit: {
      parent: 'sun',
      semiMajorKm6: 57.9,
      semiMajorAU: 0.387,
      periodDays: 88.0,
      eccentricity: 0.206,
      inclinationDeg: 7.0,
    },
    atmosphere: null,
    atmosphereNote: 'Trace exosphere — O₂, Na, H₂, He, K',
    moons: 0,
    rings: 'none',
    tex: { base: '/textures/2k_mercury.jpg', hi: '/textures/8k_mercury.jpg' },
  },
  {
    id: 'venus',
    name: 'Venus',
    kind: 'planet',
    designation: 'SOL-2 · terrestrial',
    description:
      'A runaway greenhouse trapped beneath 92 atmospheres of carbon dioxide, Venus is the hottest planet in the system. It spins backwards, so slowly that its day outlasts its year. Surface shown from Magellan radar mapping.',
    diameterKm: 12104,
    mass: '4.87×10²⁴ kg',
    densityKgM3: 5243,
    gravityMs2: 8.87,
    escapeKms: 10.4,
    rotationHours: -5832.5,
    axialTiltDeg: 177.4,
    meanTempC: 464,
    orbit: {
      parent: 'sun',
      semiMajorKm6: 108.2,
      semiMajorAU: 0.723,
      periodDays: 224.7,
      eccentricity: 0.007,
      inclinationDeg: 3.4,
    },
    atmosphere: [
      { name: 'CO₂', pct: 96.5 },
      { name: 'N₂', pct: 3.5 },
    ],
    moons: 0,
    rings: 'none',
    tex: { base: '/textures/2k_venus_surface.jpg', hi: '/textures/8k_venus_surface.jpg' },
  },
  {
    id: 'earth',
    name: 'Earth',
    kind: 'planet',
    designation: 'SOL-3 · terrestrial',
    description:
      'The only known world to host life, and the only planet with stable liquid water at its surface. Two-thirds ocean, one large moon, and a magnetic field that deflects the solar wind.',
    diameterKm: 12756,
    mass: '5.97×10²⁴ kg',
    densityKgM3: 5514,
    gravityMs2: 9.81,
    escapeKms: 11.2,
    rotationHours: 23.9345,
    axialTiltDeg: 23.44,
    meanTempC: 15,
    orbit: {
      parent: 'sun',
      semiMajorKm6: 149.6,
      semiMajorAU: 1.0,
      periodDays: 365.25,
      eccentricity: 0.017,
      inclinationDeg: 0.0,
    },
    atmosphere: [
      { name: 'N₂', pct: 78.1 },
      { name: 'O₂', pct: 20.9 },
      { name: 'Ar', pct: 0.9 },
    ],
    moons: 1,
    rings: 'none',
    tex: {
      base: '/textures/2k_earth_daymap.jpg',
      hi: '/textures/8k_earth_daymap.jpg',
      clouds: '/textures/2k_earth_clouds.jpg',
    },
  },
  {
    id: 'moon',
    name: 'The Moon',
    kind: 'moon',
    designation: 'SOL-3-I · satellite of Earth',
    description:
      'Earth’s companion, likely born from a giant impact 4.5 billion years ago. Tidally locked, it always shows us the same face — the far side was first seen by spacecraft in 1959.',
    diameterKm: 3475,
    mass: '7.35×10²² kg',
    densityKgM3: 3340,
    gravityMs2: 1.62,
    escapeKms: 2.4,
    rotationHours: 655.7,
    axialTiltDeg: 6.68,
    meanTempC: -20,
    orbit: {
      parent: 'earth',
      semiMajorKm6: 0.384,
      semiMajorAU: 0.00257,
      periodDays: 27.32,
      eccentricity: 0.055,
      inclinationDeg: 5.1,
    },
    atmosphere: null,
    atmosphereNote: 'Essentially none — a vanishingly thin exosphere',
    moons: null,
    rings: 'none',
    tex: { base: '/textures/2k_moon.jpg', hi: '/textures/8k_moon.jpg' },
  },
  {
    id: 'mars',
    name: 'Mars',
    kind: 'planet',
    designation: 'SOL-4 · terrestrial',
    description:
      'The rust-coloured desert world, home to the solar system’s tallest volcano (Olympus Mons, 21 km) and its deepest canyon system (Valles Marineris). Ancient riverbeds record a wetter past.',
    diameterKm: 6792,
    mass: '6.42×10²³ kg',
    densityKgM3: 3934,
    gravityMs2: 3.71,
    escapeKms: 5.0,
    rotationHours: 24.6229,
    axialTiltDeg: 25.19,
    meanTempC: -65,
    orbit: {
      parent: 'sun',
      semiMajorKm6: 228.0,
      semiMajorAU: 1.524,
      periodDays: 687.0,
      eccentricity: 0.094,
      inclinationDeg: 1.8,
    },
    atmosphere: [
      { name: 'CO₂', pct: 95.1 },
      { name: 'N₂', pct: 2.6 },
      { name: 'Ar', pct: 1.9 },
    ],
    moons: 2,
    rings: 'none',
    tex: { base: '/textures/2k_mars.jpg', hi: '/textures/8k_mars.jpg' },
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    kind: 'planet',
    designation: 'SOL-5 · gas giant',
    description:
      'More massive than every other planet combined, Jupiter is a ball of hydrogen and helium with no solid surface. The Great Red Spot — a storm wider than Earth — has raged for at least 190 years.',
    diameterKm: 142984,
    mass: '1.898×10²⁷ kg',
    densityKgM3: 1326,
    gravityMs2: 24.79,
    escapeKms: 59.5,
    rotationHours: 9.925,
    axialTiltDeg: 3.13,
    meanTempC: -110,
    orbit: {
      parent: 'sun',
      semiMajorKm6: 778.5,
      semiMajorAU: 5.204,
      periodDays: 4331,
      eccentricity: 0.049,
      inclinationDeg: 1.3,
    },
    atmosphere: [
      { name: 'H₂', pct: 89.8 },
      { name: 'He', pct: 10.2 },
    ],
    moons: 95,
    rings: 'yes — faint dust rings',
    tex: { base: '/textures/2k_jupiter.jpg', hi: '/textures/8k_jupiter.jpg' },
  },
  {
    id: 'saturn',
    name: 'Saturn',
    kind: 'planet',
    designation: 'SOL-6 · gas giant',
    description:
      'The least dense planet — it would float in water — wrapped in the system’s grandest ring structure: hundreds of thousands of icy ringlets spanning 280,000 km yet averaging only ~10 m thick.',
    diameterKm: 120536,
    mass: '5.68×10²⁶ kg',
    densityKgM3: 687,
    gravityMs2: 10.44,
    escapeKms: 35.5,
    rotationHours: 10.656,
    axialTiltDeg: 26.73,
    meanTempC: -140,
    orbit: {
      parent: 'sun',
      semiMajorKm6: 1432.0,
      semiMajorAU: 9.573,
      periodDays: 10747,
      eccentricity: 0.052,
      inclinationDeg: 2.5,
    },
    atmosphere: [
      { name: 'H₂', pct: 96.3 },
      { name: 'He', pct: 3.3 },
    ],
    moons: 274,
    moonsNote: '128 confirmed in 2025',
    rings: 'yes — principal ring system',
    tex: {
      base: '/textures/2k_saturn.jpg',
      hi: '/textures/8k_saturn.jpg',
      ring: '/textures/2k_saturn_ring_alpha.png',
    },
  },
  {
    id: 'uranus',
    name: 'Uranus',
    kind: 'planet',
    designation: 'SOL-7 · ice giant',
    description:
      'An ice giant knocked onto its side — its axis is tilted 98°, so its poles take turns facing the Sun for 42 years at a stretch. Methane in the upper atmosphere gives it its pale cyan cast.',
    diameterKm: 51118,
    mass: '8.68×10²⁵ kg',
    densityKgM3: 1270,
    gravityMs2: 8.87,
    escapeKms: 21.3,
    rotationHours: -17.24,
    axialTiltDeg: 97.77,
    meanTempC: -195,
    orbit: {
      parent: 'sun',
      semiMajorKm6: 2867.0,
      semiMajorAU: 19.16,
      periodDays: 30589,
      eccentricity: 0.047,
      inclinationDeg: 0.8,
    },
    atmosphere: [
      { name: 'H₂', pct: 82.5 },
      { name: 'He', pct: 15.2 },
      { name: 'CH₄', pct: 2.3 },
    ],
    moons: 28,
    rings: 'yes — 13 narrow rings',
    tex: { base: '/textures/2k_uranus.jpg' },
  },
  {
    id: 'neptune',
    name: 'Neptune',
    kind: 'planet',
    designation: 'SOL-8 · ice giant',
    description:
      'The outermost planet, found by mathematics before telescopes — its position was predicted from irregularities in Uranus’s orbit. Its winds reach 2,100 km/h, the fastest in the solar system.',
    diameterKm: 49528,
    mass: '1.02×10²⁶ kg',
    densityKgM3: 1638,
    gravityMs2: 11.15,
    escapeKms: 23.5,
    rotationHours: 16.11,
    axialTiltDeg: 28.32,
    meanTempC: -200,
    orbit: {
      parent: 'sun',
      semiMajorKm6: 4515.0,
      semiMajorAU: 30.18,
      periodDays: 59800,
      eccentricity: 0.01,
      inclinationDeg: 1.8,
    },
    atmosphere: [
      { name: 'H₂', pct: 80.0 },
      { name: 'He', pct: 18.5 },
      { name: 'CH₄', pct: 1.5 },
    ],
    moons: 16,
    rings: 'yes — 5 faint rings',
    tex: { base: '/textures/2k_neptune.jpg' },
  },
  {
    id: 'pluto',
    name: 'Pluto',
    kind: 'dwarf planet',
    designation: '134340 · Kuiper belt',
    description:
      'The best-known dwarf planet, reclassified in 2006. New Horizons’ 2015 flyby revealed a young heart-shaped nitrogen glacier, water-ice mountains, and a hazy blue-tinged atmosphere. The blank band on this map is real: the southern hemisphere was in polar night during the flyby and remains unimaged.',
    diameterKm: 2376,
    mass: '1.30×10²² kg',
    densityKgM3: 1850,
    gravityMs2: 0.62,
    escapeKms: 1.3,
    rotationHours: -153.3,
    axialTiltDeg: 122.53,
    meanTempC: -225,
    orbit: {
      parent: 'sun',
      semiMajorKm6: 5906.4,
      semiMajorAU: 39.48,
      periodDays: 90560,
      eccentricity: 0.244,
      inclinationDeg: 17.2,
    },
    atmosphere: [
      { name: 'N₂', pct: 99.0 },
      { name: 'CH₄, CO', pct: 1.0 },
    ],
    atmosphereNote: 'Thin — ~10 µbar, varies with season',
    moons: 5,
    rings: 'none',
    tex: { base: '/textures/2k_pluto.jpg' },
  },
];

export const bodyById = (id: string): BodyData => {
  const b = BODIES.find((x) => x.id === id);
  if (!b) throw new Error(`unknown body: ${id}`);
  return b;
};

export const bodyIndex = (id: string): number => BODIES.findIndex((x) => x.id === id);
