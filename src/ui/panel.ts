import { BODIES, bodyIndex, type BodyData } from '../data/bodies';
import type { CraftData } from '../data/spacecraft';
import {
  fmtAU,
  fmtDeg,
  fmtDensity,
  fmtDistance,
  fmtEcc,
  fmtEsc,
  fmtG,
  fmtInt,
  fmtKm,
  fmtPeriod,
  fmtRotation,
  fmtTemp,
} from './format';

/** split: intro+physical left, rest right · single/sheet: everything right */
export type PanelMode = 'split' | 'single' | 'sheet';

type Content = { kind: 'body'; body: BodyData } | { kind: 'craft'; craft: CraftData } | null;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function row(label: string, value: string, sub?: string): string {
  return `<div class="row"><dt>${label}</dt><dd>${value}${sub ? `<small>${sub}</small>` : ''}</dd></div>`;
}

export class Panel {
  private mode: PanelMode = 'split';
  private content: Content = null;

  constructor(
    private left: HTMLElement,
    private right: HTMLElement
  ) {}

  setMode(mode: PanelMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.paint(false);
  }

  clear() {
    this.content = null;
    this.paint(false);
  }

  renderBody(b: BodyData) {
    this.content = { kind: 'body', body: b };
    this.paint(true);
  }

  renderCraft(c: CraftData) {
    this.content = { kind: 'craft', craft: c };
    this.paint(true);
  }

  /* ---------- section builders ---------- */

  private bodyIntro(b: BodyData): string {
    const idx = bodyIndex(b.id) + 1;
    return `
      <h1>${esc(b.name)}</h1>
      <p class="sub">${esc(b.designation)}</p>
      <p class="meta-line">Record <b>${String(idx).padStart(2, '0')} / ${BODIES.length}</b> · Solar System</p>
      <p class="desc">${b.description}</p>`;
  }

  private bodyPhysical(b: BodyData): string {
    return `<div class="blk"><div class="sec">Physical data</div><dl class="rows">
      ${row('Diameter', fmtKm(b.diameterKm))}
      ${row('Mass', b.mass)}
      ${row('Density', fmtDensity(b.densityKgM3))}
      ${row('Surface gravity', fmtG(b.gravityMs2))}
      ${row('Escape velocity', fmtEsc(b.escapeKms))}
      ${row('Rotation period', fmtRotation(b.rotationHours))}
      ${row('Axial tilt', fmtDeg(b.axialTiltDeg))}
      ${row(b.kind === 'star' ? 'Photosphere temp' : 'Mean temperature', fmtTemp(b.meanTempC))}
    </dl></div>`;
  }

  /** plain reference-data section: heading + body */
  private blk(title: string, inner: string): string {
    return `<div class="blk"><div class="sec">${title}</div>${inner}</div>`;
  }

  private bodyRest(b: BodyData): string {
    let html = '';
    if (b.star) {
      html += this.blk(
        'Stellar data',
        `<dl class="rows">
          ${row('Spectral class', b.star.spectralClass)}
          ${row('Luminosity', b.star.luminosity)}
          ${row('Core temperature', b.star.coreTemp)}
          ${row('Age', `${b.star.ageGyr} ×10⁹ y`)}
        </dl>`
      );
    }
    if (b.orbit) {
      const parent = b.orbit.parent === 'earth' ? 'Earth' : 'the Sun';
      html += this.blk(
        'Orbital data',
        `<dl class="rows">
          ${row(`Distance from ${b.orbit.parent === 'earth' ? 'Earth' : 'Sun'}`, fmtDistance(b.orbit.semiMajorKm6), fmtAU(b.orbit.semiMajorAU))}
          ${row('Orbital period', fmtPeriod(b.orbit.periodDays))}
          ${row('Eccentricity', fmtEcc(b.orbit.eccentricity))}
          ${row('Inclination', fmtDeg(b.orbit.inclinationDeg))}
        </dl>
        <p class="atm-note">Semi-major axis of the orbit around ${parent}.</p>`
      );
    }
    if (b.atmosphere) {
      const bar = b.atmosphere.map((c) => `<i style="width:${Math.max(c.pct, 1.2)}%"></i>`).join('');
      const legend = b.atmosphere.map((c) => row(c.name, `${c.pct.toFixed(1)}%`)).join('');
      html += this.blk(
        b.kind === 'star' ? 'Composition' : 'Atmosphere',
        `<div class="atm-bar">${bar}</div>
         <dl class="rows">${legend}</dl>
         ${b.atmosphereNote ? `<p class="atm-note">${esc(b.atmosphereNote)}</p>` : ''}`
      );
    } else {
      html += this.blk(
        'Atmosphere',
        `<p class="atm-note" style="margin-top:12px">${esc(b.atmosphereNote ?? 'None')}</p>`
      );
    }
    if (b.moons !== null || b.rings !== 'none') {
      html += this.blk(
        'Satellites &amp; rings',
        `<dl class="rows">
          ${b.moons !== null ? row('Moons', fmtInt(b.moons), b.moonsNote ? esc(b.moonsNote) : undefined) : ''}
          ${row('Rings', b.rings === 'none' ? 'None' : b.rings.replace('yes — ', '').replace(/^./, (c) => c.toUpperCase()))}
        </dl>`
      );
    }
    return html;
  }

  private craftIntro(c: CraftData): string {
    return `
      <h1>${esc(c.shortName)}</h1>
      <p class="sub">${esc(c.agency)}</p>
      <p class="meta-line">Deep space asset · <b>${esc(c.positionLabel)}</b></p>
      <p class="desc">${c.mission}</p>
      <div class="blk">
        <p class="status-line"><span class="dot"></span>${esc(c.status)}</p>
      </div>`;
  }

  private craftRest(c: CraftData): string {
    return `<div class="blk"><div class="sec">Mission data</div><dl class="rows">
      ${row('Launched', c.launched)}
      ${row('Position', esc(c.positionLabel))}
      ${c.stats.map(([k, v]) => row(esc(k), esc(v))).join('')}
    </dl></div>`;
  }

  /* ---------- paint ---------- */

  private paint(animate: boolean) {
    let leftHtml = '';
    let rightHtml = '';
    if (this.content?.kind === 'body') {
      const b = this.content.body;
      if (this.mode === 'split') {
        leftHtml = this.bodyIntro(b) + this.bodyPhysical(b);
        rightHtml = this.bodyRest(b);
      } else {
        rightHtml = this.bodyIntro(b) + this.bodyPhysical(b) + this.bodyRest(b);
      }
    } else if (this.content?.kind === 'craft') {
      const c = this.content.craft;
      if (this.mode === 'split') {
        leftHtml = this.craftIntro(c);
        rightHtml = this.craftRest(c);
      } else {
        rightHtml = this.craftIntro(c) + this.craftRest(c);
      }
    }
    this.fill(this.left, leftHtml, animate);
    this.fill(this.right, rightHtml, animate);
  }

  private fill(el: HTMLElement, html: string, animate: boolean) {
    el.innerHTML = html;
    el.classList.toggle('filled', html !== '');
    el.scrollTop = 0;
    if (!animate) return;
    let i = 0;
    for (const child of Array.from(el.children)) {
      const c = child as HTMLElement;
      c.classList.add('rise');
      c.style.setProperty('--i', String(i++));
    }
  }
}
