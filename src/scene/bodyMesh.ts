import * as THREE from 'three';
import type { BodyData } from '../data/bodies';
import { loadTexture, loadTextureUncached } from './textures';

export interface BodyStage {
  body: BodyData;
  /** outermost — position this */
  group: THREE.Group;
  /** axial tilt + presentation pitch */
  tilt: THREE.Group;
  /** free user tumble is applied here */
  userGroup: THREE.Group;
  /** idle axial spin is applied here */
  spinner: THREE.Group;
  mesh: THREE.Mesh;
  clouds?: THREE.Mesh;
  glow?: THREE.Sprite;
  material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
  radius: number;
  baseTex?: THREE.Texture;
  hiTex?: THREE.Texture;
  upgrading: boolean;
}

let glowTexture: THREE.Texture | null = null;
function getGlowTexture(): THREE.Texture {
  if (glowTexture) return glowTexture;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255, 214, 140, 0.85)');
  g.addColorStop(0.25, 'rgba(255, 178, 80, 0.38)');
  g.addColorStop(0.55, 'rgba(255, 150, 60, 0.12)');
  g.addColorStop(1, 'rgba(255, 140, 50, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

/** Ring geometry with UVs remapped so u runs inner→outer edge (texture is a radial strip). */
function makeRingGeometry(inner: number, outer: number): THREE.RingGeometry {
  const geo = new THREE.RingGeometry(inner, outer, 176, 1);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = (v.length() - inner) / (outer - inner);
    uv.setXY(i, t, 0.5);
  }
  return geo;
}

export function buildBodyStage(
  body: BodyData,
  renderer: THREE.WebGLRenderer,
  radius: number,
  opts: { detail: boolean }
): BodyStage {
  const group = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.z = THREE.MathUtils.degToRad(-body.axialTiltDeg);
  // presentation pitch on the detail stage: opens ring planes and shows the
  // pole instead of a perfectly edge-on equator
  if (opts.detail) tilt.rotation.x = 0.3;
  group.add(tilt);
  const userGroup = new THREE.Group();
  tilt.add(userGroup);
  const spinner = new THREE.Group();
  userGroup.add(spinner);

  const segments = opts.detail ? 128 : 48; // smoother limb up close; still trivial geometry
  const geo = new THREE.SphereGeometry(radius, segments, segments / 2);

  const material = body.tex.emissive
    ? new THREE.MeshBasicMaterial()
    : new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, envMapIntensity: 0 });
  const mesh = new THREE.Mesh(geo, material);
  spinner.add(mesh);

  const stage: BodyStage = {
    body,
    group,
    tilt,
    userGroup,
    spinner,
    mesh,
    material,
    radius,
    upgrading: false,
  };

  loadTexture(body.tex.base, renderer).then((tex) => {
    stage.baseTex = tex;
    material.map = tex;
    material.needsUpdate = true;
  });

  // Earth cloud layer
  if (body.tex.clouds && opts.detail) {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0,
    });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.008, segments, segments / 2), cloudMat);
    loadTexture(body.tex.clouds, renderer).then((tex) => {
      tex.colorSpace = THREE.NoColorSpace;
      cloudMat.alphaMap = tex;
      cloudMat.opacity = 0.85;
      cloudMat.needsUpdate = true;
    });
    spinner.add(clouds);
    stage.clouds = clouds;
  }

  // Saturn (or any ringed texture) ring plane
  if (body.tex.ring) {
    const ringGeo = makeRingGeometry(radius * 1.24, radius * 2.27);
    const ringMat = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0,
      emissive: 0x352d23, // rings scatter light; pure key lighting leaves them too dark edge-on
    });
    loadTexture(body.tex.ring, renderer).then((tex) => {
      ringMat.map = tex;
      ringMat.needsUpdate = true;
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    userGroup.add(ring);
  }

  // Sun glow
  if (body.tex.emissive) {
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: opts.detail ? 0.95 : 0.8,
      })
    );
    const s = radius * (opts.detail ? 4.6 : 5.2);
    glow.scale.set(s, s, 1);
    group.add(glow);
    stage.glow = glow;
  }

  return stage;
}

/** Kick off the 2k → hi-res swap for a stage (detail view only). */
export function upgradeStage(
  stage: BodyStage,
  renderer: THREE.WebGLRenderer,
  isCurrent: () => boolean
): void {
  if (stage.hiTex || stage.upgrading || !stage.body.tex.hi) return;
  stage.upgrading = true;
  loadTextureUncached(stage.body.tex.hi, renderer)
    .then((tex) => {
      stage.upgrading = false;
      if (!isCurrent()) {
        tex.dispose();
        return;
      }
      stage.hiTex = tex;
      stage.material.map = tex;
      stage.material.needsUpdate = true;
    })
    .catch(() => {
      stage.upgrading = false; // hi-res is optional — 2k stays
    });
}

/** Drop the hi-res map when a body leaves the stage — 8k textures are ~130 MB of GPU each. */
export function downgradeStage(stage: BodyStage): void {
  if (!stage.hiTex) return;
  stage.material.map = stage.baseTex ?? null;
  stage.material.needsUpdate = true;
  stage.hiTex.dispose();
  stage.hiTex = undefined;
}
