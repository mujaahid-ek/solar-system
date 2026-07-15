import { BODIES, bodyIndex } from '../data/bodies';

export interface HudCallbacks {
  onSelectBody: (id: string) => void;
  onBack: () => void;
  onToggleCraft: () => void;
  onToggleSound: () => void;
  /** mobile arrow nav: slide to the previous/next body */
  onStep: (delta: 1 | -1) => void;
}

const ORRERY_HINT = 'Click body · scroll zoom · toggle craft';
const DETAIL_HINT = 'Drag rotate · scroll zoom · tap circles · esc back';

/** where the "Built by Mujaahid" watermark points — X/Twitter */
const MADEBY_URL = 'https://x.com/mujaahid_ek';

/** newest first; [version, terse summary]. Only the most recent few are shown. */
const CHANGELOG: [string, string][] = [
  ['0.5', 'Wind bed · previews'],
  ['0.4', 'Mobile hero layout'],
  ['0.3', 'Cyberpunk UI pass'],
  ['0.2', 'Ambient audio'],
  ['0.1', 'Detail catalogue'],
];
const CHANGELOG_SHOWN = 3;

export class Hud {
  private indexEl: HTMLElement;
  private hintEl: HTMLElement;
  private craftBtn: HTMLButtonElement;
  private soundBtn: HTMLButtonElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private items = new Map<string, HTMLButtonElement>();

  constructor(app: HTMLElement, cb: HudCallbacks) {
    app.insertAdjacentHTML(
      'beforeend',
      `
      <header id="topbar">
        <div class="brand">
          <div class="t">Solar <em>System</em></div>
          <span class="s">Index of bodies · distances compressed · not to scale</span>
        </div>
        <div class="toggles">
          <button class="toggle" id="tCraft" aria-pressed="false"><span class="led"></span>Craft</button>
          <button class="toggle" id="tSound" aria-pressed="false"><span class="led"></span>Sound</button>
        </div>
      </header>
      <button id="back"><span class="arr">←</span>Overview</button>
      <aside id="panelL" class="panel" aria-live="polite"></aside>
      <aside id="panelR" class="panel" aria-live="polite"></aside>
      <div id="hotspots"></div>
      <nav id="index" aria-label="Bodies"></nav>
      <nav id="mnav" aria-label="Previous / next body">
        <button id="mPrev"><span class="arr">←</span>Prev</button>
        <button id="mNext">Next<span class="arr">→</span></button>
      </nav>
      <div id="hint">${ORRERY_HINT}</div>
      <div id="credit">Imagery &amp; 3D models NASA · Solar System Scope · Audio U. Iowa (CC BY 4.0) · solarsystem.surf</div>
      <div id="colophon">
        <div id="changelog">
          <div id="clogList" role="region" aria-label="Changelog" hidden>
            ${CHANGELOG.slice(0, CHANGELOG_SHOWN)
              .map(
                ([v, note]) =>
                  `<div class="clog-row"><span class="v">${v}</span><span class="n">${note}</span></div>`
              )
              .join('')}
          </div>
          <button id="clogBtn" aria-expanded="false" aria-controls="clogList">
            <span class="chev" aria-hidden="true"></span>Changelog<span class="cur-v">v${CHANGELOG[0][0]}</span>
          </button>
        </div>
        <a id="madeby" href="${MADEBY_URL}" target="_blank" rel="noopener noreferrer">Built by <b>Mujaahid</b><span class="ext" aria-hidden="true">↗</span></a>
      </div>
      <div id="dip" class="show boot"></div>
    `
    );

    this.indexEl = app.querySelector('#index')!;
    this.hintEl = app.querySelector('#hint')!;
    this.craftBtn = app.querySelector('#tCraft')!;
    this.soundBtn = app.querySelector('#tSound')!;
    this.prevBtn = app.querySelector('#mPrev')!;
    this.nextBtn = app.querySelector('#mNext')!;

    BODIES.forEach((b, i) => {
      const btn = document.createElement('button');
      btn.className = 'idx';
      btn.innerHTML = `<span class="no">${String(i + 1).padStart(2, '0')}</span>${b.name.replace('The ', '')}`;
      btn.addEventListener('click', () => cb.onSelectBody(b.id));
      this.indexEl.appendChild(btn);
      this.items.set(b.id, btn);
    });

    app.querySelector('#back')!.addEventListener('click', cb.onBack);
    this.craftBtn.addEventListener('click', cb.onToggleCraft);
    this.soundBtn.addEventListener('click', cb.onToggleSound);
    this.prevBtn.addEventListener('click', () => cb.onStep(-1));
    this.nextBtn.addEventListener('click', () => cb.onStep(1));

    const clogBtn = app.querySelector<HTMLButtonElement>('#clogBtn')!;
    const clogList = app.querySelector<HTMLElement>('#clogList')!;
    clogBtn.addEventListener('click', () => {
      const open = clogBtn.getAttribute('aria-expanded') === 'true';
      clogBtn.setAttribute('aria-expanded', String(!open));
      clogList.hidden = open;
    });
  }

  setView(view: 'orrery' | 'detail', bodyId: string | null) {
    document.getElementById('app')!.classList.toggle('detail', view === 'detail');
    this.hintEl.textContent = view === 'detail' ? DETAIL_HINT : ORRERY_HINT;
    for (const [id, el] of this.items) el.classList.toggle('cur', id === bodyId);
    const cur = bodyId ? this.items.get(bodyId) : null;
    cur?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    // mobile arrows stop at the ends of the index (craft sheets keep both live)
    const i = bodyId ? bodyIndex(bodyId) : -1;
    this.prevBtn.disabled = i === 0;
    this.nextBtn.disabled = i === BODIES.length - 1;
  }

  setCraft(on: boolean) {
    this.craftBtn.classList.toggle('on', on);
    this.craftBtn.setAttribute('aria-pressed', String(on));
    document.getElementById('app')!.classList.toggle('hide-craft', !on);
  }

  setSound(on: boolean) {
    this.soundBtn.classList.toggle('on', on);
    this.soundBtn.setAttribute('aria-pressed', String(on));
  }
}
