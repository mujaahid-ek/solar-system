import * as THREE from 'three';
import { BODIES, bodyById, bodyIndex } from '../data/bodies';
import { HOTSPOTS, type Hotspot } from '../data/hotspots';
import { craftById } from '../data/spacecraft';
import { buildBodyStage, downgradeStage, upgradeStage, type BodyStage } from './bodyMesh';
import { buildCraftStage, type CraftStage } from './craftMesh';
import { makeStarfield } from './starfield';

type Stage = BodyStage | CraftStage;
const isBody = (s: Stage): s is BodyStage => 'body' in s;

const BASE_DIST = 4.4;
const SUN_DIST = 5.6;
const CRAFT_DIST = 3.5; // spacecraft models are sparse — frame them a touch closer
const ROT_SPEED = 0.0052;
const PITCH = 0.3; // presentation pitch (see bodyMesh)
const KEY_DEFAULT = new THREE.Vector3(-3.2, 1.8, 4.2).normalize();

interface SlideAnim {
  t: number;
  dur: number;
  incoming: BodyStage;
  outgoing: Stage | null;
  dir: number;
}

interface Marker {
  hs: Hotspot;
  el: HTMLButtonElement;
  local: THREE.Vector3;
  visible: boolean;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * lat/lon°E → local position matching three's SphereGeometry UV layout
 * (equirectangular texture, left edge at 180°W).
 */
function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const u = (lon + 180) / 360;
  const v = (90 - lat) / 180;
  const phi = u * Math.PI * 2;
  const theta = v * Math.PI;
  return new THREE.Vector3(
    -r * Math.cos(phi) * Math.sin(theta),
    r * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

export class DetailView {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  onHotspotOpen: () => void = () => {};

  private stages = new Map<string, BodyStage>();
  private craftStages = new Map<string, CraftStage>();
  private current: Stage | null = null;
  private slide: SlideAnim | null = null;
  private timers: number[] = [];

  private markers: Marker[] = [];
  private card: HTMLElement | null = null;
  private cardMarker: Marker | null = null;

  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private velX = 0;
  private velY = 0;
  private idleFor = 10;
  private pinchDist = 0;
  private pointers = new Map<number, { x: number; y: number }>();

  private dist = BASE_DIST;
  private targetDist = BASE_DIST;
  private offset = new THREE.Vector3();
  private elapsed = 0;
  private v = new THREE.Vector3();
  private v2 = new THREE.Vector3();

  private key: THREE.DirectionalLight;
  private keySettling = false;
  private pitchTarget = PITCH;
  private glideT = -1; // -1 = not gliding

  constructor(
    private renderer: THREE.WebGLRenderer,
    private hotspotLayer: HTMLElement
  ) {
    // fov matches the orrery camera so the zoom handoff frame is identical
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.camera.position.set(0, 0, BASE_DIST);
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.add(makeStarfield(70, 1100));

    this.key = new THREE.DirectionalLight(0xfff3e2, 4.2);
    this.key.position.copy(KEY_DEFAULT).multiplyScalar(6);
    this.scene.add(this.key);
    this.scene.add(new THREE.AmbientLight(0xbcc8e6, 0.2));
  }

  private stageFor(id: string): BodyStage {
    let s = this.stages.get(id);
    if (!s) {
      s = buildBodyStage(bodyById(id), this.renderer, 1, { detail: true });
      this.stages.set(id, s);
    }
    return s;
  }

  currentId(): string | null {
    if (!this.current) return null;
    return isBody(this.current) ? this.current.body.id : this.current.craft.id;
  }

  currentIsBody(): boolean {
    return this.current !== null && isBody(this.current);
  }

  private craftStageFor(id: string): CraftStage {
    let s = this.craftStages.get(id);
    if (!s) {
      s = buildCraftStage(craftById(id), 1);
      this.craftStages.set(id, s);
    }
    return s;
  }

  /** camera distance the detail view will open this body at (also pre-builds the stage) */
  fitFor(id: string): number {
    return this.fitDist(this.stageFor(id));
  }

  /** same, for spacecraft (kicks off the GLB load early) */
  fitForCraft(id: string): number {
    return this.fitDist(this.craftStageFor(id));
  }

  /**
   * Arrival via the orrery zoom: reproduce the exact handoff frame — same
   * body orientation and sunlight direction in camera space — then settle:
   * pitch eases in, light drifts to the studio key, the body glides to its
   * panel-aware offset.
   */
  arrive(id: string, relQuat: THREE.Quaternion, lightDirCam: THREE.Vector3) {
    this.setBody(id, 0);
    const stage = this.current!;
    stage.tilt.rotation.x = 0;
    this.pitchTarget = PITCH;
    const tiltQ = new THREE.Quaternion().setFromEuler(stage.tilt.rotation);
    stage.spinner.rotation.y = 0;
    stage.userGroup.quaternion.copy(tiltQ.invert().multiply(relQuat));
    // sunlight continuity, then settle toward the standard key
    this.key.position.copy(lightDirCam).multiplyScalar(6);
    this.keySettling = true;
    // glide from screen center to the panel-aware offset
    stage.group.position.set(0, 0, 0);
    this.glideT = 0;
  }

  /** show a spacecraft (direct, no transition) */
  setCraft(id: string) {
    if (this.currentId() === id) return;
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    this.clearMarkers();

    const incoming = this.craftStageFor(id);
    const outgoing = this.current;
    if (outgoing) {
      this.scene.remove(outgoing.group);
      if (isBody(outgoing)) downgradeStage(outgoing);
    }
    incoming.userGroup.quaternion.identity();
    this.scene.add(incoming.group);
    this.current = incoming;
    this.velX = this.velY = 0;
    this.idleFor = 10;
    this.glideT = -1;
    this.slide = null;
    this.pitchTarget = 0; // craft carry no presentation pitch
    this.targetDist = this.fitDist(incoming);
    this.dist = this.targetDist;
    incoming.group.position.copy(this.offset);
  }

  /** spacecraft arrival via the orrery zoom — same matched-frame settle as bodies */
  arriveCraft(id: string, relQuat: THREE.Quaternion, lightDirCam: THREE.Vector3) {
    this.setCraft(id);
    const stage = this.current!;
    stage.spinner.rotation.y = 0;
    stage.userGroup.quaternion.copy(relQuat); // tilt is identity for craft
    this.key.position.copy(lightDirCam).multiplyScalar(6);
    this.keySettling = true;
    stage.group.position.set(0, 0, 0);
    this.glideT = 0;
  }

  /** Departure: flatten the presentation pitch, then report the camera-space orientation. */
  exitPrep(done: (relQuat: THREE.Quaternion) => void) {
    this.closeCard();
    this.pitchTarget = 0;
    window.setTimeout(() => {
      const q = new THREE.Quaternion();
      if (this.current) this.current.spinner.getWorldQuaternion(q);
      done(q); // detail camera is identity — world quat *is* the camera-space quat
    }, 210);
  }

  /* ---------- body switching ---------- */

  setBody(id: string, dir: 0 | 1 | -1) {
    if (this.currentId() === id) return;
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    this.clearMarkers();

    const incoming = this.stageFor(id);
    const outgoing = this.current;

    incoming.userGroup.quaternion.identity();
    this.scene.add(incoming.group);
    this.current = incoming;
    this.velX = this.velY = 0;
    this.idleFor = 10; // start auto-rotating immediately
    this.glideT = -1;
    this.pitchTarget = PITCH;
    this.targetDist = this.fitDist(incoming);
    if (dir === 0) {
      this.dist = this.targetDist;
      if (outgoing) {
        this.scene.remove(outgoing.group);
        if (isBody(outgoing)) downgradeStage(outgoing);
      }
      incoming.group.position.copy(this.offset);
      this.slide = null;
    } else {
      this.slide = { t: 0, dur: 620, incoming, outgoing, dir };
      incoming.group.position.copy(this.offset).x += dir * 7.5;
    }

    // heavy work waits until the slide has settled: hi-res upload, then
    // neighbor stage pre-builds so the *next* slide starts warm
    this.timers.push(
      window.setTimeout(() => {
        if (this.current === incoming) {
          upgradeStage(incoming, this.renderer, () => this.current === incoming);
        }
      }, 900),
      window.setTimeout(() => {
        const i = bodyIndex(id);
        for (const j of [i - 1, i + 1]) if (BODIES[j]) this.stageFor(BODIES[j].id);
      }, 1300),
      window.setTimeout(() => this.buildMarkers(incoming), dir === 0 ? 350 : 750)
    );
  }

  private baseDist(stage: Stage): number {
    if (!isBody(stage)) return CRAFT_DIST;
    if (stage.body.kind === 'star') return SUN_DIST;
    if (stage.body.tex.ring) return 5.5; // rings need breathing room
    return BASE_DIST;
  }

  /** camera distance that also fits the body (and its rings) in the viewport */
  private fitDist(stage: Stage): number {
    const vHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect);
    // rings span 2.27× the body radius horizontally but only ~1.35× vertically
    // once the presentation pitch foreshortens them
    const ringed = isBody(stage) && !!stage.body.tex.ring;
    const rH = ringed ? 2.3 : 1.02;
    const rV = ringed ? 1.35 : 1.02;
    const fit = Math.max(rH / Math.sin(hHalf * 0.82), rV / Math.sin(vHalf * 0.82));
    return Math.max(this.baseDist(stage), fit);
  }

  /** viewport offset so the body sits centered in the space beside/above panels */
  setOffset(xFrac: number, yFrac: number) {
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.baseDistSafe();
    const vw = vh * this.camera.aspect;
    this.offset.set(-xFrac * vw * 0.5, yFrac * vh * 0.5, 0);
    if (this.current && !this.slide && this.glideT < 0) {
      this.current.group.position.copy(this.offset);
    }
  }

  private baseDistSafe(): number {
    return this.current ? this.fitDist(this.current) : BASE_DIST;
  }

  /* ---------- surface hotspots ---------- */

  private buildMarkers(stage: BodyStage) {
    if (this.current !== stage) return;
    this.clearMarkers();
    const spots = HOTSPOTS[stage.body.id] ?? [];
    for (const hs of spots) {
      const el = document.createElement('button');
      el.className = 'hot-marker';
      el.innerHTML = '<i></i>';
      el.setAttribute('aria-label', hs.title);
      el.style.display = 'none';
      const marker: Marker = { hs, el, local: latLonToVec3(hs.lat, hs.lon, 1.02), visible: false };
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCard(marker);
      });
      this.hotspotLayer.appendChild(el);
      this.markers.push(marker);
    }
  }

  private clearMarkers() {
    this.closeCard();
    for (const m of this.markers) m.el.remove();
    this.markers = [];
  }

  private toggleCard(marker: Marker) {
    if (this.cardMarker === marker) {
      this.closeCard();
      return;
    }
    this.closeCard();
    const card = document.createElement('div');
    card.className = 'hot-card';
    card.innerHTML = `<h3>${marker.hs.title}</h3><p>${marker.hs.fact}</p><button class="close" aria-label="Close">✕</button>`;
    card.querySelector('.close')!.addEventListener('click', () => this.closeCard());
    card.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.hotspotLayer.appendChild(card);
    this.card = card;
    this.cardMarker = marker;
    marker.el.classList.add('open');
    this.onHotspotOpen();
    this.positionCard();
  }

  closeCard() {
    this.card?.remove();
    this.card = null;
    this.cardMarker?.el.classList.remove('open');
    this.cardMarker = null;
  }

  private positionCard() {
    if (!this.card || !this.cardMarker) return;
    const w = this.hotspotLayer.clientWidth;
    const h = this.hotspotLayer.clientHeight;
    const mx = parseFloat(this.cardMarker.el.dataset.x ?? '0');
    const my = parseFloat(this.cardMarker.el.dataset.y ?? '0');
    const cw = 268;
    const ch = this.card.offsetHeight || 120;
    // keep cards out of the side-panel zones where possible
    const rightEdge = w > 900 ? w - 384 : w - 16;
    const right = mx + 26 + cw < rightEdge;
    const x = Math.max(right ? mx + 26 : mx - 26 - cw, 12);
    const y = Math.min(Math.max(my - ch * 0.35, 84), h - ch - 92);
    this.card.style.left = `${x.toFixed(1)}px`;
    this.card.style.top = `${y.toFixed(1)}px`;
    this.card.style.setProperty('--ox', right ? '0px' : `${cw}px`);
    this.card.style.setProperty('--oy', `${Math.min(Math.max(my - y, 10), ch - 10).toFixed(1)}px`);
  }

  private updateMarkers() {
    if (!this.markers.length || !this.current || !isBody(this.current)) return;
    const stage = this.current;
    const hide = this.slide !== null;
    const w = this.hotspotLayer.clientWidth;
    const h = this.hotspotLayer.clientHeight;
    stage.mesh.updateWorldMatrix(true, false);
    this.camera.updateMatrixWorld();
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
    const center = this.v2;
    stage.group.getWorldPosition(center);

    for (const m of this.markers) {
      if (hide) {
        m.el.style.display = 'none';
        m.visible = false;
        continue;
      }
      const p = this.v.copy(m.local);
      stage.mesh.localToWorld(p);
      // facing test: surface normal vs direction to camera
      const nx = p.x - center.x;
      const ny = p.y - center.y;
      const nz = p.z - center.z;
      const cx = this.camera.position.x - p.x;
      const cy = this.camera.position.y - p.y;
      const cz = this.camera.position.z - p.z;
      const dot =
        (nx * cx + ny * cy + nz * cz) /
        (Math.hypot(nx, ny, nz) * Math.hypot(cx, cy, cz) || 1);
      const facing = dot > 0.25;

      p.project(this.camera);
      const x = (p.x * 0.5 + 0.5) * w;
      const y = (-p.y * 0.5 + 0.5) * h;
      const on = facing && p.z < 1 && x > 10 && x < w - 10 && y > 60 && y < h - 70;
      m.el.style.display = on ? '' : 'none';
      m.visible = on;
      if (on) {
        m.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-20px, -20px)`;
        m.el.dataset.x = String(x);
        m.el.dataset.y = String(y);
      }
      if (this.cardMarker === m && !on) this.closeCard();
    }
    if (this.card) this.positionCard();
  }

  /* ---------- pointer interaction ---------- */

  pointerDown(e: PointerEvent) {
    this.closeCard();
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.velX = this.velY = 0;
    } else if (this.pointers.size === 2) {
      this.dragging = false;
      this.pinchDist = this.pinchSpan();
    }
  }

  pointerMove(e: PointerEvent) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;

    if (this.pointers.size === 2) {
      const span = this.pinchSpan();
      if (this.pinchDist > 0) {
        this.targetDist = THREE.MathUtils.clamp(
          this.targetDist * (this.pinchDist / span),
          2.6,
          8.2
        );
      }
      this.pinchDist = span;
      return;
    }
    if (!this.dragging || !this.current) return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.applyRotation(dx * ROT_SPEED, dy * ROT_SPEED);
    this.velX = dx;
    this.velY = dy;
    this.idleFor = 0;
  }

  pointerUp(e: PointerEvent) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    if (this.pointers.size === 0) this.dragging = false;
  }

  wheel(e: WheelEvent) {
    this.targetDist = THREE.MathUtils.clamp(
      this.targetDist * (1 + e.deltaY * 0.0011),
      2.6,
      8.2
    );
  }

  private pinchSpan(): number {
    const pts = [...this.pointers.values()];
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  /** world-frame drag rotation, converted into the tilted parent's local frame */
  private applyRotation(rx: number, ry: number) {
    if (!this.current) return;
    const g = this.current.userGroup;
    const qWorld = new THREE.Quaternion().setFromEuler(new THREE.Euler(ry, rx, 0, 'XYZ'));
    const parentQ = new THREE.Quaternion();
    g.parent!.getWorldQuaternion(parentQ);
    const invP = parentQ.clone().invert();
    g.quaternion.premultiply(parentQ).premultiply(qWorld).premultiply(invP);
  }

  /* ---------- per-frame ---------- */

  update(dt: number) {
    this.elapsed += dt;
    this.idleFor += dt;

    if (this.slide) {
      const s = this.slide;
      s.t += dt * 1000;
      const k = easeOut(Math.min(1, s.t / s.dur));
      s.incoming.group.position.x = this.offset.x + s.dir * 7.5 * (1 - k);
      s.incoming.group.position.y = this.offset.y;
      if (s.outgoing) {
        s.outgoing.group.position.x = this.offset.x - s.dir * 7.5 * k;
      }
      if (s.t >= s.dur) {
        if (s.outgoing) {
          this.scene.remove(s.outgoing.group);
          if (isBody(s.outgoing)) downgradeStage(s.outgoing);
        }
        s.incoming.group.position.copy(this.offset);
        this.slide = null;
      }
    }

    const cur = this.current;

    // settle animations: presentation pitch, key light drift, center→offset glide
    if (cur) {
      cur.tilt.rotation.x += (this.pitchTarget - cur.tilt.rotation.x) * Math.min(1, dt * 5);
    }
    if (this.keySettling) {
      this.v.copy(KEY_DEFAULT).multiplyScalar(6);
      this.key.position.lerp(this.v, Math.min(1, dt * 1.3));
      if (this.key.position.distanceToSquared(this.v) < 0.002) this.keySettling = false;
    }
    if (this.glideT >= 0 && cur && !this.slide) {
      this.glideT = Math.min(1, this.glideT + dt / 0.5);
      const k = easeOut(this.glideT);
      cur.group.position.copy(this.offset).multiplyScalar(k);
      if (this.glideT >= 1) this.glideT = -1;
    }

    if (cur) {
      if (!this.dragging && (Math.abs(this.velX) > 0.05 || Math.abs(this.velY) > 0.05)) {
        this.applyRotation(this.velX * ROT_SPEED, this.velY * ROT_SPEED);
        const decay = Math.pow(0.06, dt); // ~94% per frame at 60fps
        this.velX *= decay;
        this.velY *= decay;
      }
      if (this.idleFor > 2.6 && !this.dragging) {
        const sign = isBody(cur) && cur.body.rotationHours < 0 ? -1 : 1;
        cur.spinner.rotation.y += dt * (isBody(cur) ? 0.11 : 0.07) * sign;
      }
      if (isBody(cur)) {
        if (cur.clouds) cur.clouds.rotation.y += dt * 0.016;
        if (cur.glow) {
          const m = cur.glow.material as THREE.SpriteMaterial;
          m.opacity = 0.9 + 0.07 * Math.sin(this.elapsed * 0.8);
        }
      }
    }

    // a 0×0 boot resize can NaN the aspect-derived distances; snap back instead
    // of letting the exponential smoothing hold NaN forever
    if (!Number.isFinite(this.dist)) this.dist = this.targetDist;
    this.dist += (this.targetDist - this.dist) * Math.min(1, dt * 7);
    this.camera.position.z = this.dist;

    this.updateMarkers();
  }

  resize(w: number, h: number) {
    if (!w || !h) return; // hidden/zero-sized layout pass — keep the last sane aspect
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.current) this.targetDist = this.fitDist(this.current);
  }
}
