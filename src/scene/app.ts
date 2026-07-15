import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { bodyIndex } from '../data/bodies';
import { DetailView } from './detail';
import { Orrery } from './orrery';

export type ViewName = 'orrery' | 'detail';

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly orrery: Orrery;
  readonly detail: DetailView;

  /** fired once the view settles (after the dip) */
  onViewChange: (view: ViewName, bodyId: string | null) => void = () => {};

  private mode: ViewName = 'orrery';
  private busy = false;
  private canvas: HTMLCanvasElement;

  constructor(container: HTMLElement, labelLayer: HTMLElement, hotspotLayer: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'gl';
    container.prepend(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.orrery = new Orrery(this.renderer, labelLayer);
    this.detail = new DetailView(this.renderer, hotspotLayer);

    // neutral environment so the spacecraft models' PBR metals have something
    // to reflect (planet materials opt out via envMapIntensity = 0)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.orrery.scene.environment = env;
    this.detail.scene.environment = env;
    pmrem.dispose();

    this.bindPointer();

    const clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (this.mode === 'orrery' || this.busy) this.orrery.update(dt);
      if (this.mode === 'detail') this.detail.update(dt);
      this.render();
    });
  }

  private render() {
    const scene = this.mode === 'detail' ? this.detail.scene : this.orrery.scene;
    const cam = this.mode === 'detail' ? this.detail.camera : this.orrery.camera;
    this.renderer.render(scene, cam);
  }

  get view(): ViewName {
    return this.mode;
  }

  get currentBody(): string | null {
    return this.mode === 'detail' ? this.detail.currentId() : null;
  }

  /* ---------- pointer routing ---------- */

  private bindPointer() {
    const c = this.canvas;
    let downX = 0;
    let downY = 0;
    let moved = false;

    c.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
      moved = false;
      if (this.mode === 'detail') {
        c.setPointerCapture(e.pointerId);
        this.detail.pointerDown(e);
      }
    });
    c.addEventListener('pointermove', (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) moved = true;
      if (this.mode === 'detail') this.detail.pointerMove(e);
      else if (!this.busy) this.orrery.handleMove(e);
    });
    c.addEventListener('pointerup', (e) => {
      if (this.mode === 'detail') this.detail.pointerUp(e);
      else if (!this.busy && !moved) this.orrery.handleClick(e);
    });
    c.addEventListener('pointercancel', (e) => {
      if (this.mode === 'detail') this.detail.pointerUp(e);
    });
    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (this.mode === 'detail') this.detail.wheel(e);
        else if (!this.busy) this.orrery.wheel(e);
      },
      { passive: false }
    );
  }

  /* ---------- view choreography ---------- */

  /**
   * orrery → detail: one continuous zoom. The camera hones onto the body and
   * stops exactly where the detail scene will frame it (same fov, distance
   * scaled by display radius, same orientation and sunlight in camera space)
   * — then the scenes swap on a matched frame and the panels pop up.
   */
  openBody(id: string) {
    if (this.busy) return;
    if (this.mode === 'detail') {
      this.slideTo(id);
      return;
    }
    this.busy = true;
    document.getElementById('app')!.classList.add('moving');
    const dist = this.orrery.displayRadiusOf(id) * this.detail.fitFor(id);
    this.orrery.flyTo(id, 1000, dist, () => {
      const h = this.orrery.handoffOut(id);
      this.detail.arrive(id, h.relQuat, h.lightDirCam);
      this.mode = 'detail';
      this.onViewChange('detail', id);
      this.busy = false;
      document.getElementById('app')!.classList.remove('moving');
    });
  }

  /** neighbor-to-neighbor lateral slide inside the detail view */
  slideTo(id: string) {
    const cur = this.detail.currentId();
    if (!cur || cur === id || this.busy) return;
    if (!this.detail.currentIsBody()) {
      // coming from a spacecraft sheet — no meaningful slide direction
      this.detail.setBody(id, 0);
      this.onViewChange('detail', id);
      return;
    }
    const dir: 1 | -1 = bodyIndex(id) > bodyIndex(cur) ? 1 : -1;
    this.detail.setBody(id, dir);
    this.onViewChange('detail', id);
  }

  /** orrery → spacecraft, same continuous zoom as bodies */
  openCraft(id: string) {
    if (this.busy) return;
    if (this.mode === 'detail') {
      this.detail.setCraft(id);
      this.onViewChange('detail', id);
      return;
    }
    this.busy = true;
    document.getElementById('app')!.classList.add('moving');
    const dist = this.orrery.displayRadiusOf(id) * this.detail.fitForCraft(id);
    this.orrery.flyTo(id, 1000, dist, () => {
      const h = this.orrery.handoffOut(id);
      this.detail.arriveCraft(id, h.relQuat, h.lightDirCam);
      this.mode = 'detail';
      this.onViewChange('detail', id);
      this.busy = false;
      document.getElementById('app')!.classList.remove('moving');
    });
  }

  /** detail → orrery: flatten the pitch, swap on a matched frame, pull back home */
  closeBody() {
    if (this.busy || this.mode !== 'detail') return;
    const fromId = this.detail.currentId();
    if (!fromId) return;
    this.busy = true;
    document.getElementById('app')!.classList.add('moving');
    const wasBody = this.detail.currentIsBody();
    this.detail.exitPrep((relQuat) => {
      const fit = wasBody ? this.detail.fitFor(fromId) : this.detail.fitForCraft(fromId);
      const dist = this.orrery.displayRadiusOf(fromId) * fit;
      this.mode = 'orrery';
      this.orrery.camReturn(fromId, 900, dist);
      this.orrery.applyHandoff(fromId, relQuat);
      this.onViewChange('orrery', null);
      this.busy = false;
      document.getElementById('app')!.classList.remove('moving');
    });
  }

  /** direct entry (deep link) — no choreography */
  jumpToBody(id: string) {
    this.detail.setBody(id, 0);
    this.mode = 'detail';
    this.onViewChange('detail', id);
  }

  jumpToCraft(id: string) {
    this.detail.setCraft(id);
    this.mode = 'detail';
    this.onViewChange('detail', id);
  }

  setCraftVisible(on: boolean) {
    this.orrery.setCraftVisible(on);
  }

  resize(w: number, h: number, panelFrac: number, bottomFrac: number) {
    this.renderer.setSize(w, h);
    this.orrery.resize(w, h);
    this.detail.resize(w, h);
    this.detail.setOffset(panelFrac, bottomFrac);
  }
}
