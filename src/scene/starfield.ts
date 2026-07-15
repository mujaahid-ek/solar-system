import * as THREE from 'three';

/** Faint, static starfield — points on a distant sphere, no nebula theatrics. */
export function makeStarfield(radius: number, count = 1400): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    // uniform on sphere
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    positions[i * 3] = radius * s * Math.cos(phi);
    positions[i * 3 + 1] = radius * u;
    positions[i * 3 + 2] = radius * s * Math.sin(phi);
    // mostly dim neutral-white, a few brighter and cooler
    const bright = Math.random();
    const v = bright > 0.96 ? 0.9 : 0.18 + Math.random() * 0.3;
    c.setRGB(v, v, v * (0.96 + Math.random() * 0.08));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.6,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.renderOrder = -10;
  return points;
}
