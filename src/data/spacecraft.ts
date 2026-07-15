// Positions and distances are approximate as of mid-2026.
// Sources: NASA mission pages; Voyager/New Horizons distances extrapolated
// from published trajectories.

export type CraftPosition =
  | { type: 'earth-orbit'; altKm: number; phase: number }
  | { type: 'l2' }
  | { type: 'inner-solar-orbit'; perihelionKm6: number; aphelionKm6: number }
  | { type: 'escape'; au: number; eclipticLonDeg: number; eclipticLatDeg: number };

export interface CraftData {
  id: string;
  name: string;
  shortName: string;
  agency: string;
  launched: string;
  status: string;
  position: CraftPosition;
  positionLabel: string;
  stats: [string, string][];
  mission: string;
  /** NASA VTAD glTF model (public domain) */
  model: string;
}

export const SPACECRAFT: CraftData[] = [
  {
    id: 'iss',
    name: 'International Space Station',
    shortName: 'ISS',
    agency: 'NASA · Roscosmos · ESA · JAXA · CSA',
    launched: '20 Nov 1998',
    status: 'Operational — crewed continuously since Nov 2000',
    position: { type: 'earth-orbit', altKm: 408, phase: 0 },
    positionLabel: 'Low Earth orbit · 408 km',
    stats: [
      ['Orbit', 'LEO, 408 km, 51.6° incl.'],
      ['Orbital period', '92.9 min'],
      ['Speed', '7.66 km/s'],
      ['Mass', '≈ 420,000 kg'],
      ['Span', '109 m'],
    ],
    mission:
      'The largest structure humans have placed in space — a permanently crewed orbital laboratory assembled from 40+ launches, circling Earth 15.5 times a day.',
    model: '/models/iss.glb',
  },
  {
    id: 'hubble',
    name: 'Hubble Space Telescope',
    shortName: 'Hubble',
    agency: 'NASA · ESA',
    launched: '24 Apr 1990',
    status: 'Operational — 35+ years of observations',
    position: { type: 'earth-orbit', altKm: 520, phase: 2.2 },
    positionLabel: 'Low Earth orbit · ≈ 520 km',
    stats: [
      ['Orbit', 'LEO, ≈ 520 km, 28.5° incl.'],
      ['Mirror', '2.4 m primary'],
      ['Mass', '11,110 kg'],
      ['Range', 'Ultraviolet · visible · near-IR'],
      ['Serviced', '5 shuttle missions (1993–2009)'],
    ],
    mission:
      'The observatory that measured the universe’s expansion rate and imaged galaxies 13 billion light-years away. Over 1.6 million observations and counting.',
    model: '/models/hubble.glb',
  },
  {
    id: 'jwst',
    name: 'James Webb Space Telescope',
    shortName: 'JWST',
    agency: 'NASA · ESA · CSA',
    launched: '25 Dec 2021',
    status: 'Operational',
    position: { type: 'l2' },
    positionLabel: 'Sun–Earth L2 halo orbit · 1.5 M km',
    stats: [
      ['Orbit', 'Halo orbit around Sun–Earth L2'],
      ['Distance', '1.5×10⁶ km from Earth'],
      ['Mirror', '6.5 m segmented, gold-coated Be'],
      ['Mass', '6,200 kg'],
      ['Range', 'Infrared, 0.6–28.5 µm'],
    ],
    mission:
      'The most powerful space telescope ever flown, cold enough (−233 °C) to see the first galaxies form and to read the atmospheres of exoplanets.',
    model: '/models/jwst.glb',
  },
  {
    id: 'parker',
    name: 'Parker Solar Probe',
    shortName: 'Parker',
    agency: 'NASA',
    launched: '12 Aug 2018',
    status: 'Operational — closest approach 6.9 M km (2024)',
    position: { type: 'inner-solar-orbit', perihelionKm6: 6.9, aphelionKm6: 109 },
    positionLabel: 'Elliptical solar orbit, inside Mercury’s',
    stats: [
      ['Orbit', 'Heliocentric, 88-day period'],
      ['Perihelion', '6.9×10⁶ km from Sun'],
      ['Top speed', '192 km/s — fastest human object'],
      ['Heat shield', '11.4 cm carbon, faces 1,377 °C'],
      ['Mass', '685 kg'],
    ],
    mission:
      'The first spacecraft to fly through the Sun’s corona, repeatedly diving closer to the Sun than any object before it to trace how the solar wind is born.',
    model: '/models/parker.glb',
  },
  {
    id: 'newhorizons',
    name: 'New Horizons',
    shortName: 'New Horizons',
    agency: 'NASA',
    launched: '19 Jan 2006',
    status: 'Operational — extended Kuiper belt mission',
    position: { type: 'escape', au: 64, eclipticLonDeg: 293, eclipticLatDeg: 2 },
    positionLabel: 'Kuiper belt',
    stats: [
      ['Distance', '≈ 64 AU (9.6×10⁹ km)'],
      ['Speed', '13.9 km/s'],
      ['Pluto flyby', '14 Jul 2015'],
      ['Arrokoth flyby', '1 Jan 2019'],
      ['Signal delay', '≈ 8.9 hours one-way'],
    ],
    mission:
      'Returned the first close-up images of Pluto, then flew past Arrokoth — the most distant world ever explored — and continues outward through the Kuiper belt.',
    model: '/models/newhorizons.glb',
  },
  {
    id: 'voyager2',
    name: 'Voyager 2',
    shortName: 'Voyager 2',
    agency: 'NASA',
    launched: '20 Aug 1977',
    status: 'Operational — interstellar space since Nov 2018',
    position: { type: 'escape', au: 142, eclipticLonDeg: 310, eclipticLatDeg: -35 },
    positionLabel: 'Interstellar space',
    stats: [
      ['Distance', '≈ 142 AU (2.1×10¹⁰ km)'],
      ['Speed', '15.4 km/s'],
      ['Grand Tour', 'Jupiter · Saturn · Uranus · Neptune'],
      ['Signal delay', '≈ 19.7 hours one-way'],
      ['Power', 'RTG, declining ≈ 4 W/year'],
    ],
    mission:
      'The only spacecraft to visit all four giant planets. It crossed the heliopause in 2018 and now samples true interstellar space, still whispering home daily.',
    model: '/models/voyager.glb',
  },
  {
    id: 'voyager1',
    name: 'Voyager 1',
    shortName: 'Voyager 1',
    agency: 'NASA',
    launched: '5 Sep 1977',
    status: 'Operational — interstellar space since Aug 2012',
    position: { type: 'escape', au: 169, eclipticLonDeg: 255, eclipticLatDeg: 35 },
    positionLabel: 'Interstellar space',
    stats: [
      ['Distance', '≈ 169 AU (2.5×10¹⁰ km)'],
      ['Speed', '17.0 km/s'],
      ['Milestone', 'First craft in interstellar space'],
      ['Signal delay', '≈ 23.4 hours one-way'],
      ['Carries', 'The Golden Record'],
    ],
    mission:
      'The most distant human-made object. Launched in 1977, it photographed the “Pale Blue Dot,” left the heliosphere in 2012, and still reports from the space between stars.',
    model: '/models/voyager.glb',
  },
];

export const craftById = (id: string): CraftData => {
  const c = SPACECRAFT.find((x) => x.id === id);
  if (!c) throw new Error(`unknown craft: ${id}`);
  return c;
};
