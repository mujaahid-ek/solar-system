// Surface features as (lat, lon°E) on each body's *texture* — verified against
// the shipped maps where features are visible (Jupiter's GRS, Pluto's heart).

export interface Hotspot {
  lat: number;
  lon: number;
  title: string;
  fact: string;
}

export const HOTSPOTS: Record<string, Hotspot[]> = {
  sun: [
    {
      lat: 12,
      lon: 30,
      title: 'Photosphere',
      fact: 'The visible “surface” is a boiling grid of convection cells — each granule is roughly the size of Texas and lasts about ten minutes before churning back under.',
    },
    {
      lat: -35,
      lon: -70,
      title: 'Differential rotation',
      fact: 'The Sun is not solid, so it rotates in pieces: about 25 days at the equator but 35 days near the poles. The shear winds up magnetic field lines until they snap into flares.',
    },
  ],
  mercury: [
    {
      lat: 30.5,
      lon: 170,
      title: 'Caloris Basin',
      fact: 'A 1,550 km impact scar — one of the largest in the solar system. The blow was so violent it raised chaotic “weird terrain” at the exact opposite point of the planet.',
    },
    {
      lat: -50,
      lon: -38,
      title: 'Great scarps',
      fact: 'Cliff systems hundreds of kilometres long wrinkle the surface. Mercury’s iron core is slowly cooling, and the whole planet has shrunk about 7 km in radius.',
    },
  ],
  venus: [
    {
      lat: 65,
      lon: 3,
      title: 'Maxwell Montes',
      fact: 'Venus’s highest range rises 11 km — taller than Everest. Its peaks are frosted with “snow” of heavy metals like galena, condensed from the scorching lower air.',
    },
    {
      lat: -8,
      lon: 100,
      title: 'Aphrodite Terra',
      fact: 'A highland “continent” the size of Africa, mapped by Magellan’s radar through clouds that never break. A day here outlasts the planet’s entire year.',
    },
  ],
  earth: [
    {
      lat: 28,
      lon: 84,
      title: 'Himalaya',
      fact: 'The planet’s tallest range is still growing — India ploughs into Asia at about 5 cm a year, lifting Everest a few millimetres annually.',
    },
    {
      lat: -3,
      lon: -60,
      title: 'Amazon basin',
      fact: 'One river system carries roughly a fifth of all the fresh water that reaches Earth’s oceans, draining a forest visible from the Moon.',
    },
    {
      lat: 11.3,
      lon: 142.2,
      title: 'Mariana Trench',
      fact: 'The deepest point on the planet: 10.9 km down, where the pressure is over a thousand atmospheres. More people have walked on the Moon than reached it.',
    },
  ],
  moon: [
    {
      lat: 0.7,
      lon: 23.5,
      title: 'Mare Tranquillitatis',
      fact: 'On this ancient lava plain, on 20 July 1969, Apollo 11 set down with about 25 seconds of fuel to spare. The bootprints are still there — and will be for millions of years.',
    },
    {
      lat: -43.3,
      lon: -11.4,
      title: 'Tycho',
      fact: 'A young crater — only 108 million years old — whose bright ejecta rays streak a quarter of the way around the Moon. You can see them with the naked eye at full moon.',
    },
  ],
  mars: [
    {
      lat: 18.6,
      lon: -134,
      title: 'Olympus Mons',
      fact: 'The tallest volcano known: 21 km high and as wide as France. Its slopes are so gradual that, standing on it, you couldn’t tell you were on a mountain at all.',
    },
    {
      lat: -14,
      lon: -60,
      title: 'Valles Marineris',
      fact: 'A canyon system that would stretch from New York to Los Angeles — 4,000 km long and up to 7 km deep. The Grand Canyon would be a minor side channel.',
    },
    {
      lat: 82,
      lon: 0,
      title: 'North polar cap',
      fact: 'Layers of water ice and dust the size of Texas, topped each winter by a metre of frozen carbon dioxide — the atmosphere itself, snowing out.',
    },
  ],
  jupiter: [
    {
      lat: -22.5,
      lon: -49,
      title: 'Great Red Spot',
      fact: 'A storm wider than Earth that has raged for at least 190 years, with winds over 400 km/h. It is slowly shrinking — a century ago it was twice this size.',
    },
    {
      lat: 20,
      lon: 60,
      title: 'Belts and zones',
      fact: 'The stripes are jet streams: pale zones are rising ammonia ice, dark belts are sinking, drier air. Adjacent bands blow in opposite directions at hundreds of km/h.',
    },
  ],
  saturn: [
    {
      lat: 80,
      lon: 0,
      title: 'North polar hexagon',
      fact: 'A six-sided jet stream 30,000 km across — wider than two Earths — that has held its bizarre geometric shape since Voyager first saw it in 1981.',
    },
    {
      lat: -33,
      lon: 40,
      title: 'Storm alley',
      fact: 'Roughly once each Saturn year a “Great White Spot” erupts here and wraps the entire planet in a storm band within weeks.',
    },
  ],
  uranus: [
    {
      lat: 75,
      lon: 0,
      title: 'A pole facing the Sun',
      fact: 'Knocked on its side by an ancient impact, Uranus rolls around its orbit — each pole gets 42 years of daylight followed by 42 years of night.',
    },
    {
      lat: -15,
      lon: 60,
      title: 'Methane haze',
      fact: 'The featureless cyan is a deep methane atmosphere over an ocean of superionic ice. It is the coldest planetary atmosphere measured: −224 °C.',
    },
  ],
  neptune: [
    {
      lat: -22,
      lon: 10,
      title: 'Great Dark Spot',
      fact: 'Voyager 2 photographed an Earth-sized storm here in 1989. By the time Hubble looked five years later it had vanished — Neptune’s storms live fast.',
    },
    {
      lat: -50,
      lon: -70,
      title: 'Supersonic winds',
      fact: 'The fastest winds in the solar system — up to 2,100 km/h — on the planet farthest from the Sun’s heat. What powers them is still an open question.',
    },
  ],
  pluto: [
    {
      lat: 20,
      lon: -2,
      title: 'Sputnik Planitia',
      fact: 'The left lobe of Pluto’s “heart”: a nitrogen-ice glacier the size of Texas with no craters at all — its surface is refreshed within the last million years.',
    },
    {
      lat: 4,
      lon: -24,
      title: 'Water-ice mountains',
      fact: 'Ranges rising 5 km at the heart’s edge. At −230 °C water ice is hard as granite — on Pluto, mountains are built of it, floating on nitrogen ice.',
    },
    {
      lat: -75,
      lon: 0,
      title: 'Terra incognita',
      fact: 'The southern hemisphere was in decades-long polar night when New Horizons flew past in 2015. No human instrument has ever seen it.',
    },
  ],
};
