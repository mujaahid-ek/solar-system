import './styles.css';
import { Sound } from './audio/sound';
import { startFaviconAnimation } from './ui/favicon';
import { BODIES, bodyById, bodyIndex } from './data/bodies';
import { craftById, SPACECRAFT } from './data/spacecraft';
import { World } from './scene/app';
import { Hud } from './ui/hud';
import { Panel } from './ui/panel';

const app = document.getElementById('app')!;

// WebGL guard
try {
  const test = document.createElement('canvas');
  if (!test.getContext('webgl2') && !test.getContext('webgl')) throw new Error();
} catch {
  app.innerHTML = `<div id="nogl">SOLAR SYSTEM needs WebGL.<br/>Your browser or GPU configuration has it disabled.</div>`;
  throw new Error('WebGL unavailable');
}

const sound = new Sound();
let craftOn = false;

const hud = new Hud(app, {
  onSelectBody: (id) => {
    sound.select();
    openBody(id);
  },
  onBack: () => {
    sound.select();
    world.closeBody();
  },
  onToggleCraft: () => {
    craftOn = !craftOn;
    hud.setCraft(craftOn);
    world.setCraftVisible(craftOn);
    sound.select();
  },
  onToggleSound: () => {
    const on = sound.toggle();
    if (on) sound.select(); // audible confirmation the moment sound goes live
    hud.setSound(on);
  },
  onStep: (delta) => stepBody(delta),
  onZoom: (dir) => world.detail.zoomStep(dir),
});

/** slide to a neighbouring body; from a craft sheet, step lands on Earth */
function stepBody(delta: 1 | -1) {
  if (world.view !== 'detail' || !world.currentBody) return;
  const cur = world.currentBody;
  const next = isBodyId(cur) ? BODIES[bodyIndex(cur) + delta] : bodyById('earth');
  if (next) {
    sound.select();
    world.slideTo(next.id);
  }
}

hud.setCraft(craftOn); // markers hide via the #app.hide-craft class from frame one
hud.setSound(sound.enabled); // sound is on by default (bed arms on first gesture)

const labels = document.createElement('div');
labels.id = 'labels';
app.prepend(labels);

const panel = new Panel(document.getElementById('panelL')!, document.getElementById('panelR')!);
const dip = document.getElementById('dip')!; // boot reveal only — view changes are seamless
const world = new World(app, labels, document.getElementById('hotspots')!);
world.detail.onHotspotOpen = () => sound.select();

const isBodyId = (id: string) => BODIES.some((b) => b.id === id);
const isCraftId = (id: string) => SPACECRAFT.some((c) => c.id === id);

world.orrery.onPickBody = (id) => {
  sound.select();
  openBody(id);
};
world.orrery.onPickCraft = (id) => {
  sound.select();
  world.openCraft(id);
};
world.orrery.onHover = () => sound.hover();

// every interactive control is a <button> (labels, markers, nav, toggles);
// accordion summaries are the one exception
let hovered: Element | null = null;
document.addEventListener('pointerover', (e) => {
  const el = (e.target as Element | null)?.closest?.('button, details.acc summary') ?? null;
  if (el && el !== hovered) sound.hover();
  hovered = el;
});

function openBody(id: string) {
  if (world.view === 'detail') {
    world.slideTo(id);
  } else {
    world.openBody(id);
  }
}

world.onViewChange = (view, id) => {
  hud.setView(view, id && isBodyId(id) ? id : null);
  if (view === 'detail' && id) {
    if (isBodyId(id)) {
      panel.renderBody(bodyById(id));
    } else {
      panel.renderCraft(craftById(id));
    }
    history.replaceState(null, '', `#/${id}`);
  } else {
    panel.clear();
    history.replaceState(null, '', '#/');
  }
};

/* ---------- keyboard ---------- */

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (isMobile()) return; // stage-only on mobile — nowhere to go back to
    world.closeBody();
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    stepBody(e.key === 'ArrowLeft' ? -1 : 1);
  }
});

/* ---------- resize ---------- */

const isMobile = () => window.innerWidth <= 900;

function layout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const mobile = isMobile();
  const split = w > 1200;
  // split mode balances a panel on each side, so the body stays centered
  const panelFrac = mobile || split ? 0 : Math.min(356, w * 0.42) / w;
  const bottomFrac = mobile ? 0.42 : 0; // 32vh card + inset arrow box — planet stays hero
  world.resize(w, h, panelFrac, bottomFrac);
  panel.setMode(split ? 'split' : mobile ? 'sheet' : 'single');
  document.getElementById('app')!.classList.toggle('mobile', mobile);
  // mobile is stage-only: the orrery never shows there
  if (mobile && world.view === 'orrery') {
    world.jumpToBody(world.currentBody ?? 'sun');
  }
}
window.addEventListener('resize', layout);

/* ---------- deep link + boot ---------- */

const hashId = location.hash.replace(/^#\//, '');
if (hashId && isBodyId(hashId)) {
  world.jumpToBody(hashId);
} else if (hashId && isCraftId(hashId)) {
  world.jumpToCraft(hashId);
} else if (isMobile()) {
  world.jumpToBody('sun');
}
layout();

// hand-edited URLs (hash-only navigations don't reload the page)
window.addEventListener('hashchange', () => {
  const id = location.hash.replace(/^#\//, '');
  if (!id || world.currentBody === id) return;
  if (isBodyId(id)) openBody(id);
  else if (isCraftId(id)) world.openCraft(id);
});

// boot reveal: hold the black overlay for a few frames while first textures
// arrive, then fade it out slowly and return it to transition duty
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.setTimeout(() => {
      dip.classList.remove('show');
      window.setTimeout(() => dip.classList.remove('boot'), 1200);
    }, 350);
  });
});

startFaviconAnimation(); // rotating Neptune in the tab

// debug handles (kept: invaluable when poking the live scene from devtools)
Object.assign(window as never, { __world: world, __sound: sound });
