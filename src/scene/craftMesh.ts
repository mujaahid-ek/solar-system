import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CraftData } from '../data/spacecraft';

/**
 * A spacecraft stage mirrors the BodyStage hierarchy (group > tilt > user >
 * spinner) so the orrery↔detail handoff math treats craft and planets alike.
 * The GLB loads async; `ready` flips once the normalized model is attached.
 */
export interface CraftStage {
  craft: CraftData;
  group: THREE.Group;
  tilt: THREE.Group; // identity for craft — kept for structural parity
  userGroup: THREE.Group;
  spinner: THREE.Group;
  radius: number;
  ready: boolean;
  /** kick off the GLB fetch — lazy so hidden craft don't cost ~29 MB at boot */
  load: () => void;
}

const loader = new GLTFLoader();
// NASA's ISS and JWST models ship Draco-compressed geometry
const draco = new DRACOLoader();
draco.setDecoderPath('/draco/');
loader.setDRACOLoader(draco);
const templates = new Map<string, Promise<THREE.Group>>();

/**
 * The NASA VTAD ISS model ships all 19 materials as the same flat gray —
 * the geometry is detailed but reads as unpainted clay. Repaint by material
 * name (parts identified visually): amber solar wings, white modules and
 * radiators, metallic truss. [color, metalness, roughness]
 */
const ISS_PAINT: Record<string, [number, number, number]> = {
  'lambert7SG.001': [0x91622f, 0.45, 0.4], // US solar wings — amber bronze
  'lambert4SG.001': [0x7a5028, 0.45, 0.42], // Russian segment arrays
  'lambert6SG.001': [0x63451f, 0.45, 0.45], // docked-craft arrays
  'lambert3SG.001': [0xd3d6dc, 0.55, 0.42], // main truss backbone
  'soyuz_blinn4SG.001': [0xe9edf2, 0.15, 0.6], // thermal radiators
  'blinn1SG.001': [0xdcdde2, 0.25, 0.5], // pressurized modules
  'blinn3SG.001': [0xc6cad1, 0.3, 0.5], // connector nodes
  'anisotropic1SG.001': [0xa9adb5, 0.65, 0.38], // truss equipment clusters
  'soyuz_blinn2SG.001': [0x878c7c, 0.3, 0.55], // Soyuz hull
  'soyuz_blinn3SG.001': [0x767b6d, 0.3, 0.55],
  'bendedtruss_blin.001': [0x9ba0a8, 0.7, 0.4], // truss end segments
};
const ISS_DEFAULT: [number, number, number] = [0xbfc3ca, 0.35, 0.5];

/** stray disc meshes that float disconnected above the station in the source GLB */
const ISS_HIDE = new Set(['bendedtruss_bli1.001']);

const PAINT: Record<string, Record<string, [number, number, number]>> = { iss: ISS_PAINT };

function repaint(craftId: string, mesh: THREE.Mesh, mat: THREE.MeshStandardMaterial) {
  const map = PAINT[craftId];
  if (!map) return;
  if (craftId === 'iss' && ISS_HIDE.has(mat.name)) {
    mesh.visible = false;
    return;
  }
  const [color, metalness, roughness] = map[mat.name] ?? ISS_DEFAULT;
  mat.color.set(color);
  mat.metalness = metalness;
  mat.roughness = roughness;
}

function loadTemplate(url: string): Promise<THREE.Group> {
  let p = templates.get(url);
  if (!p) {
    p = loader.loadAsync(url).then((gltf) => gltf.scene);
    templates.set(url, p);
    p.catch(() => templates.delete(url));
  }
  return p;
}

/**
 * Center the model on its (volume-weighted) visual mass center — box centers
 * drift badly on asymmetric craft like the ISS — then scale so everything
 * fits inside `radius`.
 */
function normalize(instance: THREE.Object3D, radius: number): THREE.Group {
  instance.updateWorldMatrix(true, true);
  const spheres: THREE.Sphere[] = [];
  instance.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      const s = new THREE.Box3().setFromObject(o).getBoundingSphere(new THREE.Sphere());
      if (isFinite(s.radius) && s.radius > 0) spheres.push(s);
    }
  });
  const center = new THREE.Vector3();
  let weight = 0;
  for (const s of spheres) {
    const w = s.radius ** 3;
    center.addScaledVector(s.center, w);
    weight += w;
  }
  if (weight > 0) center.divideScalar(weight);
  let extent = 0.001;
  for (const s of spheres) extent = Math.max(extent, s.center.distanceTo(center) + s.radius);

  const wrapper = new THREE.Group();
  wrapper.scale.setScalar(radius / extent);
  instance.position.sub(center);
  wrapper.add(instance);
  return wrapper;
}

export function buildCraftStage(
  craft: CraftData,
  radius: number,
  onReady?: () => void
): CraftStage {
  const group = new THREE.Group();
  const tilt = new THREE.Group();
  const userGroup = new THREE.Group();
  const spinner = new THREE.Group();
  group.add(tilt);
  tilt.add(userGroup);
  userGroup.add(spinner);

  let started = false;
  const stage: CraftStage = {
    craft,
    group,
    tilt,
    userGroup,
    spinner,
    radius,
    ready: false,
    // deferred: the orrery builds all seven skeletons at boot, but the heavy
    // GLBs only fetch when craft mode is shown or a craft is opened
    load() {
      if (started) return;
      started = true;
      loadTemplate(craft.model)
        .then((template) => {
          const instance = template.clone(true);
          instance.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              if (mat?.isMeshStandardMaterial) {
                mat.envMapIntensity = 1.3;
                repaint(craft.id, mesh, mat);
              }
            }
          });
          spinner.add(normalize(instance, radius));
          stage.ready = true;
          onReady?.();
        })
        .catch(() => {
          /* model is optional — the crosshair marker remains the affordance */
        });
    },
  };

  return stage;
}
