/**
 * mediadb.js — IndexedDB storage for imported photos and videos.
 *
 * Separate database from the music library (ipod-library) to keep concerns
 * isolated. Same pattern: raw Blobs in, object URLs out at render time.
 */

const DB_NAME = 'ipod-media';
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('photos')) {
                db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('videos')) {
                db.createObjectStore('videos', { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}

function addItem(storeName, name, blob) {
    return openDb().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).add({ name, blob, dateAdded: Date.now() });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

function getAllItems(storeName) {
    return openDb().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    }));
}

function clearStore(storeName) {
    return openDb().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

export const addPhoto = (name, blob) => addItem('photos', name, blob);
export const addVideo = (name, blob) => addItem('videos', name, blob);
export const getAllPhotos = () => getAllItems('photos');
export const getAllVideos = () => getAllItems('videos');
export const clearPhotos = () => clearStore('photos');
export const clearVideos = () => clearStore('videos');
