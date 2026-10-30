/**
 * storage.js
 * -----------------------------------------------------------------------
 * Capa de persistencia. HOY: IndexedDB en el navegador (funciona 100%
 * estático en GitHub Pages, sin servidor).
 *
 * MAÑANA: si Codere decide centralizar las inspecciones de todas las
 * salas en un solo lugar (para que un supervisor vea el estado de todas
 * desde un panel), esta es la ÚNICA pieza que hay que reemplazar.
 * Todas las funciones son async y devuelven la misma forma de datos,
 * así que se puede sustituir el cuerpo de cada función por llamadas a
 * Firebase Firestore o Supabase sin tocar app.js, export.js ni el HTML.
 *
 * Contrato que debe cumplir cualquier backend de reemplazo:
 *   init()                                -> Promise<void>
 *   saveInspection(inspection)             -> Promise<string id>
 *   getInspection(id)                      -> Promise<Object|null>
 *   listInspections()                      -> Promise<Array<Object>> (resumen)
 *   deleteInspection(id)                   -> Promise<void>
 *   savePhoto(inspectionId, itemKey, blob) -> Promise<string photoId>
 *   getPhoto(photoId)                      -> Promise<Blob|null>
 *   deletePhoto(photoId)                   -> Promise<void>
 *   listPhotos(inspectionId)               -> Promise<Array<{id, itemKey, blob}>>
 * -----------------------------------------------------------------------
 */

const DB_NAME = "codere_inspecciones_bomberos";
const DB_VERSION = 1;
const STORE_INSPECTIONS = "inspections";
const STORE_PHOTOS = "photos";

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE_INSPECTIONS)) {
        const store = db.createObjectStore(STORE_INSPECTIONS, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
        store.createIndex("sala", "sala", { unique: false });
        store.createIndex("estado", "estado", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        const pstore = db.createObjectStore(STORE_PHOTOS, { keyPath: "id" });
        pstore.createIndex("inspectionId", "inspectionId", { unique: false });
      }
    };
    req.onsuccess = (ev) => resolve(ev.target.result);
    req.onerror = (ev) => reject(ev.target.error);
  });
  return dbPromise;
}

function uid() {
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10)
  );
}

const Storage = {
  async init() {
    await openDb();
  },

  async saveInspection(inspection) {
    const db = await openDb();
    if (!inspection.id) inspection.id = uid();
    inspection.updatedAt = new Date().toISOString();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_INSPECTIONS, "readwrite");
      tx.objectStore(STORE_INSPECTIONS).put(inspection);
      tx.oncomplete = () => resolve(inspection.id);
      tx.onerror = (ev) => reject(ev.target.error);
    });
  },

  async getInspection(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_INSPECTIONS, "readonly");
      const req = tx.objectStore(STORE_INSPECTIONS).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (ev) => reject(ev.target.error);
    });
  },

  async listInspections() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_INSPECTIONS, "readonly");
      const req = tx.objectStore(STORE_INSPECTIONS).getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        all.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
        resolve(all);
      };
      req.onerror = (ev) => reject(ev.target.error);
    });
  },

  async deleteInspection(id) {
    const db = await openDb();
    const photos = await this.listPhotos(id);
    await Promise.all(photos.map((p) => this.deletePhoto(p.id)));
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_INSPECTIONS, "readwrite");
      tx.objectStore(STORE_INSPECTIONS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (ev) => reject(ev.target.error);
    });
  },

  async savePhoto(inspectionId, itemKey, blob, meta) {
    const db = await openDb();
    const photo = {
      id: uid(),
      inspectionId,
      itemKey,
      blob,
      name: (meta && meta.name) || "foto.jpg",
      type: blob.type || "image/jpeg",
      createdAt: new Date().toISOString(),
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PHOTOS, "readwrite");
      tx.objectStore(STORE_PHOTOS).put(photo);
      tx.oncomplete = () => resolve(photo.id);
      tx.onerror = (ev) => reject(ev.target.error);
    });
  },

  async getPhoto(photoId) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PHOTOS, "readonly");
      const req = tx.objectStore(STORE_PHOTOS).get(photoId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (ev) => reject(ev.target.error);
    });
  },

  async deletePhoto(photoId) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PHOTOS, "readwrite");
      tx.objectStore(STORE_PHOTOS).delete(photoId);
      tx.oncomplete = () => resolve();
      tx.onerror = (ev) => reject(ev.target.error);
    });
  },

  async listPhotos(inspectionId) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PHOTOS, "readonly");
      const idx = tx.objectStore(STORE_PHOTOS).index("inspectionId");
      const req = idx.getAll(inspectionId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (ev) => reject(ev.target.error);
    });
  },
};

window.Storage = Storage;
