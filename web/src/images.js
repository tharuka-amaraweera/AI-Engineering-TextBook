// Images inside notes. A note only stores a short id (<img data-img="id">).
// The picture itself is kept in the browser's IndexedDB, because local storage
// is too small for pictures. With notes sync on, pictures are also uploaded to
// a second secret Gist (see sync.js) and downloaded when a browser misses one.

const DB = 'ai-workbook-images';
const STORE = 'images';
const MAX_SIDE = 1400; // pixels on the longer side
const MAX_CHARS = 700000; // keeps one image well below the 1 MB limit of a Gist file
export const IMAGE_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
export const IMAGE_ID = /^[a-z0-9]{8,40}$/;

const mem = new Map();

function open() {
  return new Promise((resolve, reject) => {
    const rq = indexedDB.open(DB, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore(STORE);
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
}

async function store(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const rq = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(rq.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function putImage(id, url) {
  if (!IMAGE_ID.test(id) || !IMAGE_URL.test(url)) return;
  mem.set(id, url);
  try { await store('readwrite', s => s.put(url, id)); } catch { /* storage unavailable: keep in memory */ }
}

export async function localImage(id) {
  if (mem.has(id)) return mem.get(id);
  try {
    const url = await store('readonly', s => s.get(id));
    if (url) mem.set(id, url);
    return url || null;
  } catch { return null; }
}

export async function allImageIds() {
  try { return (await store('readonly', s => s.getAllKeys())).filter(id => IMAGE_ID.test(id)); } catch { return [...mem.keys()]; }
}

// sync.js registers a function here that downloads missing pictures from the Gist.
let remoteLoader = null;
export const setRemoteLoader = fn => { remoteLoader = fn; };

async function getImage(id) {
  const local = await localImage(id);
  if (local || !remoteLoader) return local;
  try { await remoteLoader(id); } catch { /* offline or no permission: show the placeholder */ }
  return localImage(id);
}

// Fills in the pictures of every <img data-img="id"> inside the element.
export function hydrateImages(root) {
  if (!root) return;
  for (const img of root.querySelectorAll('img[data-img]')) {
    if (img.getAttribute('src')) continue;
    img.alt = 'Loading image…';
    getImage(img.dataset.img).then(url => {
      if (url) { img.src = url; img.alt = 'Image in note'; } else img.alt = 'Image not available in this browser';
    });
  }
}

function draw(bitmap, scale, type, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, quality);
}

// Shrinks and compresses a pasted or chosen picture, saves it, and returns its id.
export async function addImage(file) {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  let quality = 0.85;
  let url = draw(bitmap, scale, 'image/webp', quality);
  const type = url.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'; // older Safari has no WebP export
  if (type !== 'image/webp') url = draw(bitmap, scale, type, quality);
  for (let i = 0; i < 6 && url.length > MAX_CHARS; i++) {
    scale *= 0.8;
    quality = Math.max(0.5, quality - 0.08);
    url = draw(bitmap, scale, type, quality);
  }
  bitmap.close?.();
  if (url.length > MAX_CHARS || !IMAGE_URL.test(url)) throw new Error('This image is too large or cannot be read.');
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  await putImage(id, url);
  return { id, url };
}
