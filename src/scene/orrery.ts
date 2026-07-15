import * as THREE from 'three';
import { BODIES, type BodyData } from '../data/bodies';
import { SPACECRAFT, type CraftData } from '../data/spacecraft';
import { buildBodyStage, type BodyStage } from './bodyMesh';
import { buildCraftStage, type CraftStage } from './craftMesh';
import { makeStarfield } from './starfield';

/** display radius of spacecraft minis — cheated scale, like everything here */
const CRAFT_R = 0.45;

/** days of simulated time per real second — one Earth year ≈ 61 s */
const DAYS_PER_SEC = 6.0;

/** log-compressed orbit radius from semi-major axis in AU */
function orbitRadius(au: number): number {
  return 9 + 18.43 * (Math.log10(au) + 0.412);
}

/** log-compressed display radius from diameter in km */
function displayRadius(body: BodyData): number {
  if (body.kind === 'star') return 2.9;
  return 0.3 + 0.62 * Math.log10(body.diameterKm / 2000 + 1);
}

/** ascending node angles (real Ω, deg) — gives each orbit plane its own cross line */
const NODE_DEG: Record<string, number> = {
  mercury: 48.3, venus: 76.7, earth: 0, mars: 49.6, jupiter: 100.5,
  saturn: 113.7, uranus: 74.0, neptune: 131.8, pluto: 110.3, moon: 125,
};

/** starting mean anomaly (deg) — a deliberately pleasant opening composition */
const PHASE_DEG: Record<string, number> = {
  mercury: 25, venus: 190, earth: 305, mars: 250, jupiter: 64,
  saturn: 148, uranus: 88, neptune: 12, pluto: 205, moon: 40,
};

interface OrreryBody {
  data: BodyData;
  stage: BodyStage;
  holder: THREE.Group; // moves along the orbit
  orbitRoot?: THREE.Group;
  a: number;
  b: number;
  cx: number;
  pick: THREE.Mesh;
  label: HTMLButtonElement;
  labelW2?: number;
}

interface OrreryCraft {
  data: CraftData;
  el: HTMLButtonElement;
  holder: THREE.Group;
  stage: CraftStage;
  pick: THREE.Mesh;
}

interface CamAnim {
  t: number;
  dur: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromLook: THREE.Vector3;
  toLook: THREE.Vector3;
  /** keep re-aiming at a moving target (spacecraft orbit fast) */
  track?: { id: string; dist: number };
  onDone?: () => void;
}

const HOME_POS = new THREE.Vector3(0, 64, 94);
const HOME_LOOK = new THREE.Vector3(0, 0, 8);

/** long camera flights collapse to a fast cut for reduced-motion users */
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Orrery {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  onPickBody: (id: string) => void = () => {};
  onPickCraft: (id: string) => void = () => {};
  /** pointer moved onto a body or craft in the 3D scene */
  onHover: () => void = () => {};

  private bodies: OrreryBody[] = [];
  private craft: OrreryCraft[] = [];
  private elapsedDays = 0;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private camAnim: CamAnim | null = null;
  private look = HOME_LOOK.clone();
  private craftVisible = false;
  private labelLayer: HTMLElement;
  private hotId: string | null = null;
  private v = new THREE.Vector3();
  private zoom = 1;
  private zoomTarget = 1;
  private aspectComp = 1;
  private atHome = true;

  constructor(
    private renderer: THREE.WebGLRenderer,
    labelLayer: HTMLElement
  ) {
    this.labelLayer = labelLayer;
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 600);
    this.camera.position.copy(HOME_POS);
    this.camera.lookAt(this.look);

    // opaque background — transparent canvas compositing crushes WebGL output
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.add(makeStarfield(320, 1500));

    // a point light at the sun sells the "lit from within" read on nearby planets,
    // plus gentle ambient so far bodies stay legible
    const sunLight = new THREE.PointLight(0xfff2dd, 2400, 0, 1.9);
    this.scene.add(sunLight);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.32));

    BODIES.forEach((data, i) => this.addBody(data, i));
    SPACECRAFT.forEach((c) => this.addCraft(c));
    this.setCraftVisible(false);
  }

  private addBody(data: BodyData, index: number) {
    const r = displayRadius(data);
    const stage = buildBodyStage(data, this.renderer, r, { detail: false });

    const holder = new THREE.Group();
    holder.add(stage.group);

    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(r * 1.7, 1.35), 12, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    pick.userData.bodyId = data.id;
    holder.add(pick);

    const label = document.createElement('button');
    label.className = 'body-label';
    label.innerHTML = `<span class="no">${String(index + 1).padStart(2, '0')}</span>${data.name.replace('The ', '')}`;
    label.setAttribute('aria-label', `Inspect ${data.name}`);
    label.addEventListener('click', () => this.onPickBody(data.id));
    this.labelLayer.appendChild(label);

    const entry: OrreryBody = { data, stage, holder, a: 0, b: 0, cx: 0, pick, label };

    if (!data.orbit) {
      // the Sun
      this.scene.add(holder);
    } else {
      const au = data.orbit.semiMajorAU;
      const a = data.orbit.parent === 'earth' ? 1.9 : orbitRadius(au);
      const e = data.orbit.parent === 'earth' ? 0.06 : data.orbit.eccentricity;
      const b = a * Math.sqrt(1 - e * e);
      const cx = -a * e;

      const orbitRoot = new THREE.Group();
      orbitRoot.rotation.order = 'YXZ';
      orbitRoot.rotation.y = THREE.MathUtils.degToRad(NODE_DEG[data.id] ?? 0);
      orbitRoot.rotation.x = THREE.MathUtils.degToRad(data.orbit.inclinationDeg);

      const curve = new THREE.EllipseCurve(cx, 0, a, b, 0, Math.PI * 2);
      const pts = curve.getPoints(220);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0xdce4f5, transparent: true, opacity: 0.14 })
      );
      line.rotation.x = -Math.PI / 2;
      orbitRoot.add(line);
      orbitRoot.add(holder);

      entry.orbitRoot = orbitRoot;
      entry.a = a;
      entry.b = b;
      entry.cx = cx;

      if (data.orbit.parent === 'earth') {
        // attach to Earth's holder so the Moon rides along
        const earth = this.bodies.find((x) => x.data.id === 'earth');
        earth?.holder.add(orbitRoot);
      } else {
        this.scene.add(orbitRoot);
      }
    }

    this.bodies.push(entry);
  }

  private addCraft(data: CraftData) {
    const el = document.createElement('button');
    el.className = `craft-marker craft-${data.id}`;
    const dist =
      data.position.type === 'escape'
        ? `${data.position.au} AU`
        : data.position.type === 'l2'
          ? 'L2'
          : data.position.type === 'earth-orbit'
            ? `${data.position.altKm} km`
            : 'SOLAR ORBIT';
    el.innerHTML = `<span class="x"><span></span></span>${data.shortName}<small>${dist}</small>`;
    el.setAttribute('aria-label', `Inspect ${data.name}`);
    el.addEventListener('click', () => this.onPickCraft(data.id));
    this.labelLayer.appendChild(el);

    const holder = new THREE.Group();
    const stage = buildCraftStage(data, CRAFT_R, () => el.classList.add('has-model'));
    holder.add(stage.group);
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 12, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    pick.userData.craftId = data.id;
    holder.add(pick);
    this.scene.add(holder);

    this.craft.push({ data, el, holder, stage, pick });
  }

  setCraftVisible(on: boolean) {
    this.craftVisible = on;
    // DOM markers fade via the #app.hide-craft class; only the 3D minis toggle here
    for (const c of this.craft) {
      if (on) c.stage.load(); // lazy: fetch the GLBs only when craft mode is first shown
      c.holder.visible = on;
    }
  }

  /* ---------- per-frame ---------- */

  update(dt: number) {
    this.elapsedDays += dt * DAYS_PER_SEC;

    for (const b of this.bodies) {
      if (b.data.orbit) {
        const phase = THREE.MathUtils.degToRad(PHASE_DEG[b.data.id] ?? 0);
        const th = phase + (this.elapsedDays / b.data.orbit.periodDays) * Math.PI * 2;
        b.holder.position.set(b.cx + b.a * Math.cos(th), 0, -b.b * Math.sin(th));
      }
      // slow cosmetic axial spin
      b.stage.spinner.rotation.y += dt * 0.05 * (b.data.rotationHours < 0 ? -1 : 1);
    }

    for (const c of this.craft) {
      this.craftWorldPos(c);
      c.holder.position.copy(this.v);
      c.stage.spinner.rotation.y += dt * 0.12;
    }

    this.updateCamera(dt);
    this.updateOverlay();
  }

  private homePos(): THREE.Vector3 {
    return HOME_POS.clone().multiplyScalar(this.aspectComp * this.zoom);
  }

  wheel(e: WheelEvent) {
    if (this.camAnim || !this.atHome) return;
    this.zoomTarget = THREE.MathUtils.clamp(this.zoomTarget * (1 + e.deltaY * 0.0012), 0.45, 1.65);
  }

  private updateCamera(dt: number) {
    if (this.camAnim) {
      const a = this.camAnim;
      a.t += dt * 1000;
      const k = easeInOut(Math.min(1, a.t / a.dur));
      if (a.track) {
        const end = this.flyEnd(a.track.id, a.track.dist);
        a.toPos.copy(end.pos);
        a.toLook.copy(end.look);
      }
      this.camera.position.lerpVectors(a.fromPos, a.toPos, k);
      this.look.lerpVectors(a.fromLook, a.toLook, k);
      this.camera.lookAt(this.look);
      if (a.t >= a.dur) {
        const done = a.onDone;
        this.camAnim = null;
        done?.();
      }
      return;
    }
    if (this.atHome) {
      // smooth scroll-zoom dolly along the home axis
      this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt * 7);
      this.camera.position.copy(this.homePos());
      this.camera.lookAt(this.look);
    }
  }

  private updateOverlay() {
    const w = this.labelLayer.clientWidth;
    const h = this.labelLayer.clientHeight;
    this.camera.updateMatrixWorld();
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();

    for (const b of this.bodies) {
      b.holder.getWorldPosition(this.v);
      const r = b.stage.radius;
      this.v.project(this.camera);
      if (this.v.z > 1) {
        b.label.style.display = 'none';
        continue;
      }
      b.label.style.display = '';
      const x = (this.v.x * 0.5 + 0.5) * w;
      const y = (-this.v.y * 0.5 + 0.5) * h;
      // the Moon's label goes to the right of the body — below collides with Earth's
      const t =
        b.data.id === 'moon'
          ? `translate3d(${(x + 9).toFixed(1)}px, ${(y - 13).toFixed(1)}px, 0)`
          : `translate3d(${x.toFixed(1)}px, ${(y + r * 9 + 6).toFixed(1)}px, 0) translateX(-50%)`;
      b.label.style.transform = t;
    }

    if (this.craftVisible) {
      for (const c of this.craft) {
        this.v.copy(c.holder.position);
        this.v.project(this.camera);
        if (this.v.z > 1) {
          c.el.style.visibility = 'hidden';
          continue;
        }
        let x = (this.v.x * 0.5 + 0.5) * w;
        let y = (-this.v.y * 0.5 + 0.5) * h;
        if (c.data.position.type === 'escape') {
          // deep-space craft pin to the frame edge instead of vanishing;
          // each gets its own vertical slot so corner pins don't stack
          const slot = this.craft.filter((k) => k.data.position.type === 'escape').indexOf(c);
          const cx = Math.min(Math.max(x, 26), w - 176);
          const cy = Math.min(Math.max(y, 76 + slot * 24), h - 96 - slot * 24);
          c.el.classList.toggle('edge', cx !== x || cy !== y);
          x = cx;
          y = cy;
          c.el.style.visibility = '';
        } else {
          const off = x < 8 || x > w - 8 || y < 8 || y > h - 8;
          c.el.style.visibility = off ? 'hidden' : '';
        }
        const tail =
          c.data.id === 'iss' ? 'translate(calc(-100% + 14px), -7px)' : 'translate(-7px, -7px)';
        c.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) ${tail}`;
      }
    }
  }

  /** computes into this.v */
  private craftWorldPos(c: OrreryCraft) {
    const p = c.data.position;
    const earth = this.bodies.find((b) => b.data.id === 'earth')!;
    const t = this.elapsedDays;
    if (p.type === 'earth-orbit') {
      earth.holder.getWorldPosition(this.v);
      const r = p.altKm < 450 ? 1.15 : 1.7;
      const th = p.phase + t * (p.altKm < 450 ? 0.55 : 0.4);
      this.v.x += r * Math.cos(th);
      this.v.z += r * Math.sin(th);
      this.v.y += p.altKm < 450 ? 0.2 : 0.65;
    } else if (p.type === 'l2') {
      earth.holder.getWorldPosition(this.v);
      const dir = this.v.clone().setY(0).normalize();
      this.v.addScaledVector(dir, 2.4).setY(this.v.y - 0.55);
    } else if (p.type === 'inner-solar-orbit') {
      const a = 9, e = 0.5;
      const b = a * Math.sqrt(1 - e * e);
      const th = t * ((Math.PI * 2) / 88) + 2.1;
      this.v.set(-a * e + a * Math.cos(th), 0.4, -b * Math.sin(th) * 0.999);
      this.v.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(3.4));
    } else {
      const R = orbitRadius(p.au);
      const lon = THREE.MathUtils.degToRad(p.eclipticLonDeg);
      const lat = THREE.MathUtils.degToRad(p.eclipticLatDeg);
      this.v.set(
        R * Math.cos(lat) * Math.cos(lon),
        R * Math.sin(lat) * 0.75, // slight damp; edge-pinning handles the rest
        -R * Math.cos(lat) * Math.sin(lon)
      );
    }
  }

  /* ---------- picking ---------- */

  handleMove(e: PointerEvent) {
    const hit = this.raycastBodies(e);
    const id = (hit?.userData.bodyId ?? hit?.userData.craftId ?? null) as string | null;
    if (id !== this.hotId) {
      this.hotId = id;
      this.renderer.domElement.style.cursor = id ? 'pointer' : '';
      for (const b of this.bodies) b.label.classList.toggle('hot', b.data.id === id);
      if (id) this.onHover();
    }
  }

  handleClick(e: PointerEvent) {
    const hit = this.raycastBodies(e);
    if (!hit) return;
    if (hit.userData.bodyId) this.onPickBody(hit.userData.bodyId as string);
    else if (hit.userData.craftId) this.onPickCraft(hit.userData.craftId as string);
  }

  private raycastBodies(e: PointerEvent): THREE.Object3D | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const picks: THREE.Object3D[] = this.bodies.map((b) => b.pick);
    if (this.craftVisible) for (const c of this.craft) picks.push(c.pick);
    const hits = this.raycaster.intersectObjects(picks, false);
    return hits[0]?.object ?? null;
  }

  /* ---------- camera choreography ---------- */

  /** bodies and spacecraft are both zoomable entities */
  private entity(id: string): { stage: BodyStage | CraftStage; obj: THREE.Object3D; tiltDeg: number } {
    const b = this.bodies.find((x) => x.data.id === id);
    if (b) return { stage: b.stage, obj: b.holder, tiltDeg: b.data.axialTiltDeg };
    const c = this.craft.find((x) => x.data.id === id)!;
    return { stage: c.stage, obj: c.holder, tiltDeg: 0 };
  }

  entityWorldPos(id: string, out: THREE.Vector3) {
    this.entity(id).obj.getWorldPosition(out);
  }

  displayRadiusOf(id: string): number {
    return this.entity(id).stage.radius;
  }

  private flyEnd(id: string, dist: number): { pos: THREE.Vector3; look: THREE.Vector3 } {
    const target = new THREE.Vector3();
    this.entityWorldPos(id, target);
    const dir = HOME_POS.clone().sub(target).normalize();
    return { pos: target.clone().addScaledVector(dir, dist), look: target };
  }

  /** dolly toward an entity, stopping at `dist` — matched to the detail view's framing */
  flyTo(id: string, dur: number, dist: number, onDone?: () => void) {
    if (REDUCED_MOTION.matches) dur = Math.min(dur, 220);
    const end = this.flyEnd(id, dist);
    this.atHome = false;
    this.camAnim = {
      t: 0,
      dur,
      fromPos: this.camera.position.clone(),
      toPos: end.pos,
      fromLook: this.look.clone(),
      toLook: end.look,
      track: { id, dist }, // spacecraft keep moving — chase them
      onDone,
    };
  }

  /**
   * Handoff to the detail scene: the entity's orientation and the sunlight
   * direction, both expressed in the current camera's frame — so the detail
   * scene (whose camera is identity) can reproduce the exact same frame.
   */
  handoffOut(id: string): { relQuat: THREE.Quaternion; lightDirCam: THREE.Vector3 } {
    const e = this.entity(id);
    this.camera.updateMatrixWorld();
    const camInv = this.camera.quaternion.clone().invert();
    const q = new THREE.Quaternion();
    e.stage.spinner.getWorldQuaternion(q);
    const relQuat = camInv.clone().multiply(q);
    const pos = new THREE.Vector3();
    e.obj.getWorldPosition(pos);
    const lightDirCam = pos.negate().normalize().applyQuaternion(camInv); // toward the Sun at origin
    return { relQuat, lightDirCam };
  }

  /** reverse handoff: make the orrery entity face the camera exactly as it faced the detail camera */
  applyHandoff(id: string, relQuat: THREE.Quaternion) {
    const e = this.entity(id);
    this.camera.updateMatrixWorld();
    const worldQ = this.camera.quaternion.clone().multiply(relQuat);
    const tiltQ = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, THREE.MathUtils.degToRad(-e.tiltDeg))
    );
    e.stage.spinner.rotation.y = 0;
    e.stage.userGroup.quaternion.copy(tiltQ.invert().multiply(worldQ));
  }

  /** place camera near the body we're leaving, then pull back home */
  camReturn(fromId: string | null, dur: number, dist?: number) {
    if (REDUCED_MOTION.matches) dur = Math.min(dur, 220);
    if (fromId && dist !== undefined) {
      const end = this.flyEnd(fromId, dist);
      this.camera.position.copy(end.pos);
      this.look.copy(end.look);
      this.camera.lookAt(this.look);
    }
    this.zoom = this.zoomTarget = 1;
    this.camAnim = {
      t: 0,
      dur,
      fromPos: this.camera.position.clone(),
      toPos: this.homePos(),
      fromLook: this.look.clone(),
      toLook: HOME_LOOK.clone(),
      onDone: () => {
        this.atHome = true;
      },
    };
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    // keep the whole system in frame on narrow screens by backing off
    this.aspectComp = Math.max(1, 1.55 - this.camera.aspect * 0.35);
    this.camera.updateProjectionMatrix();
    if (this.atHome && !this.camAnim) this.camera.position.copy(this.homePos());
  }
}
