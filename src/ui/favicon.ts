/**
 * Animated tab favicon: the *real* app Neptune, scaled to icon size and rotating.
 *
 * A tiny dedicated WebGL renderer draws the same textured sphere the detail
 * view uses (`2k_neptune.jpg`, MeshStandardMaterial, the studio key light and
 * tone mapping) onto a small transparent canvas, spun on its tilted axis, and
 * swaps the `<link rel="icon">` data-URL each tick — browsers freeze SVG/SMIL
 * favicon animation, so frame-swapping is the only way to make a tab icon move.
 * Pauses when the tab is hidden and honours prefers-reduced-motion.
 */
import * as THREE from 'three';

const RES = 64; // browsers downscale to 16/32; rendering larger keeps the limb crisp
const NEPTUNE_TILT_DEG = 28.32; // matches BODIES.neptune.axialTiltDeg

export function startFaviconAnimation() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = RES;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true, // required for toDataURL after render
    });
  } catch {
    return; // no WebGL — the static favicon.svg stays
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  // orthographic so the disc reads flat and round, like a planet icon
  const camera = new THREE.OrthographicCamera(-1.1, 1.1, 1.1, -1.1, 0.1, 10);
  camera.position.set(0, 0, 4);
  camera.lookAt(0, 0, 0);

  const key = new THREE.DirectionalLight(0xfff3e2, 3.8);
  key.position.set(-3.2, 1.8, 4.2);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xbcc8e6, 0.32));

  const tilt = new THREE.Group();
  tilt.rotation.z = THREE.MathUtils.degToRad(-NEPTUNE_TILT_DEG);
  const spinner = new THREE.Group();
  tilt.add(spinner);
  scene.add(tilt);

  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, envMapIntensity: 0 });
  spinner.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), mat));

  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  document.head.appendChild(link);

  let ready = false;
  const paint = () => {
    renderer.render(scene, camera);
    link.href = canvas.toDataURL('image/png');
  };

  new THREE.TextureLoader().load('/textures/2k_neptune.jpg', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    mat.map = tex;
    mat.needsUpdate = true;
    ready = true;
    paint();
    run();
  });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let last = performance.now();
  let timer = 0;

  const tick = () => {
    const now = performance.now();
    spinner.rotation.y += ((now - last) / 1000) * ((Math.PI * 2) / 22); // ~22s / rotation
    last = now;
    paint();
  };
  const run = () => {
    if (timer || !ready || reduce.matches || document.hidden) return;
    last = performance.now();
    timer = window.setInterval(tick, 90); // ~11fps is plenty for a tab icon
  };
  const stop = () => {
    if (!timer) return;
    window.clearInterval(timer);
    timer = 0;
  };

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));
  reduce.addEventListener('change', () => {
    stop();
    if (reduce.matches) paint();
    else run();
  });

  // render a single frame at an arbitrary size — used to bake the static PNG
  // fallbacks (apple-touch-icon, favicon-32) from the same real Neptune
  const snapshot = (size: number): string => {
    const r2 = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    r2.setSize(size, size);
    r2.setClearColor(0x000000, 0);
    r2.toneMapping = THREE.ACESFilmicToneMapping;
    r2.toneMappingExposure = 1.05;
    r2.render(scene, camera);
    const url = r2.domElement.toDataURL('image/png');
    r2.dispose();
    return url;
  };
  Object.assign(window as never, { __neptuneFavicon: { snapshot } });
}
