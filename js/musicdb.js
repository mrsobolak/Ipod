/**
 * musicdb.js — IndexedDB-backed persistent music library.
 *
 * Stores imported songs (audio blob + optional cover art blob + metadata)
 * so the iPod keeps your library between launches, fully offline.
 */

const DB_NAME = 'ipod-library';
const DB_VERSION = 1;
const STORE = 'songs';

let dbPromise = null;

function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('title', 'title', { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}

/**
 * Add a song to the persistent library.
 * @param {{title:string, artist:string, album:string, rating?:number}} meta
 * @param {Blob} audioBlob
 * @param {Blob|null} artworkBlob
 * @returns {Promise<number>} new record id
 */
export async function addSong(meta, audioBlob, artworkBlob) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const record = {
            title: meta.title || 'Unknown Title',
            artist: meta.artist || 'Unknown Artist',
            album: meta.album || 'Unknown Album',
            rating: meta.rating || 0,
            audioBlob,
            artworkBlob: artworkBlob || null,
            dateAdded: Date.now()
        };
        const req = store.add(record);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.onerror = () => reject(tx.error);
    });
}

/** Returns all stored songs as raw records (including blobs). */
export async function getAllSongs() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

export async function deleteSong(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function clearAll() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
