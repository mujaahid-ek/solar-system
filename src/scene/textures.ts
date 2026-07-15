import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const cache = new Map<string, Promise<THREE.Texture>>();

function prepare(tex: THREE.Texture, renderer: THREE.WebGLRenderer): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); // typically 16 — sharper at glancing angles, negligible cost
  // pre-upload to the GPU now, so the first frame that samples it doesn't hitch
  renderer.initTexture(tex);
  return tex;
}

export function loadTexture(url: string, renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url).then((tex) => prepare(tex, renderer));
    cache.set(url, p);
    p.catch(() => cache.delete(url));
  }
  return p;
}

/**
 * Hi-res maps are deliberately NOT cached as live textures: they're huge on
 * the GPU, get disposed when leaving a body, and re-fetches hit the HTTP cache.
 */
export function loadTextureUncached(
  url: string,
  renderer: THREE.WebGLRenderer
): Promise<THREE.Texture> {
  return loader.loadAsync(url).then((tex) => prepare(tex, renderer));
}
