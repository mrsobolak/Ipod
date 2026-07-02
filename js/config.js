/**
 * config.js — Application state, menu structure, and element cache.
 *
 * Single source of truth for the song library, navigation state,
 * playback settings, and all DOM references used across modules.
 */

import { elements } from './dom.js';
import { getAllSongs } from './musicdb.js';
import { getAllPhotos, getAllVideos } from './mediadb.js';

// ── Library ──────────────────────────────────────────────────

export let library = [];
export let photos = [];
export let videos = [];

// Track blob URLs we've created so we can revoke them on refresh (avoid leaks).
let activeObjectUrls = [];
let activePhotoUrls = [];
let activeVideoUrls = [];

function revokeActiveObjectUrls() {
    activeObjectUrls.forEach(url => URL.revokeObjectURL(url));
    activeObjectUrls = [];
}

/** Loads the bundled demo library (js/library.json), if present. */
async function loadBundledLibrary() {
    try {
        const response = await fetch('js/library.json');
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

/** Loads user-imported songs from IndexedDB and converts blobs to object URLs. */
async function loadUserLibrary() {
    const records = await getAllSongs();
    return records.map(rec => ({
        id: `user-${rec.id}`,
        dbId: rec.id,
        title: rec.title,
        artist: rec.artist,
        album: rec.album,
        rating: rec.rating || 0,
        src: URL.createObjectURL(rec.audioBlob),
        artwork: rec.artworkBlob ? URL.createObjectURL(rec.artworkBlob) : '',
        isUserImport: true
    }));
}

/** Full load: bundled demo tracks (if any) + everything imported on-device. */
export async function loadLibrary() {
    const [bundled, userSongs] = await Promise.all([loadBundledLibrary(), loadUserLibrary()]);
    revokeActiveObjectUrls();
    activeObjectUrls = userSongs.map(s => s.src).concat(userSongs.filter(s => s.artwork).map(s => s.artwork));
    library.length = 0;
    library.push(...bundled, ...userSongs);
}

/** Re-reads just the on-device library and refreshes in place (used after import/delete). */
export async function refreshUserLibrary() {
    const bundled = library.filter(s => !s.isUserImport);
    const userSongs = await loadUserLibrary();
    revokeActiveObjectUrls();
    activeObjectUrls = userSongs.map(s => s.src).concat(userSongs.filter(s => s.artwork).map(s => s.artwork));
    library.length = 0;
    library.push(...bundled, ...userSongs);
}

// ── Photos / Videos ──────────────────────────────────────────

export async function refreshPhotos() {
    const records = await getAllPhotos();
    activePhotoUrls.forEach(url => URL.revokeObjectURL(url));
    const mapped = records.map(rec => ({ id: rec.id, name: rec.name, url: URL.createObjectURL(rec.blob) }));
    activePhotoUrls = mapped.map(p => p.url);
    photos.length = 0;
    photos.push(...mapped);
}

export async function refreshVideos() {
    const records = await getAllVideos();
    activeVideoUrls.forEach(url => URL.revokeObjectURL(url));
    const mapped = records.map(rec => ({ id: rec.id, name: rec.name, url: URL.createObjectURL(rec.blob) }));
    activeVideoUrls = mapped.map(v => v.url);
    videos.length = 0;
    videos.push(...mapped);
}

// ── Application State ────────────────────────────────────────

export const state = {
    queue: [],
    currentIndex: -1,
    history: [],
    currentMenuKey: 'main',
    selectedIndex: 0,
    scrollOffset: 0,
    isNowPlaying: false,
    lastRenderedMenuKey: null,
    shuffle: 'off',   // 'off' | 'songs'
    repeat: 'off',    // 'off' | 'one' | 'all'
    importStatus: '', // transient status line shown in the Import menu
    isViewingPhoto: false,
    currentPhotoIndex: 0,
    isViewingVideo: false,
    currentVideoIndex: 0,
    isShowingUpdateNotice: false
};

// ── Setting Toggles ──────────────────────────────────────────

function toggleShuffle() {
    state.shuffle = state.shuffle === 'off' ? 'songs' : 'off';
}

function toggleRepeat() {
    const cycle = { off: 'one', one: 'all', all: 'off' };
    state.repeat = cycle[state.repeat];
}

function goToNowPlaying() {
    if (state.queue.length === 0) return;
    state.isNowPlaying = true;
}

// ── Menu Structure ───────────────────────────────────────────

export const menus = {
    main: {
        title: 'iPod',
        items: [
            { label: 'Music', submenu: 'music' },
            { label: 'Photos', submenu: 'photos' },
            { label: 'Videos', submenu: 'videos' },
            { label: 'Extras', disabled: true },
            { label: 'Settings', submenu: 'settings' },
            { label: 'Shuffle Songs', actionName: 'shuffleAndPlay' },
            { label: 'Now Playing', action: goToNowPlaying }
        ]
    },
    music: {
        title: 'Music',
        items: [
            { label: 'Artists', submenu: 'artists' },
            { label: 'Albums', submenu: 'albums' },
            { label: 'Songs', submenu: 'songs' },
            { label: 'Playlists', disabled: true },
            { label: 'Import Music...', actionName: 'importMusic' },
            { label: 'Receive from PC...', actionName: 'receiveFromPC' }
        ]
    },
    settings: {
        title: 'Settings',
        get items() {
            return [
                { label: 'Shuffle', value: state.shuffle === 'off' ? 'Off' : 'Songs', action: toggleShuffle },
                { label: 'Repeat', value: state.repeat === 'off' ? 'Off' : state.repeat === 'one' ? 'One' : 'All', action: toggleRepeat },
                { label: 'Import Music...', actionName: 'importMusic' },
                { label: 'Backup to Files...', actionName: 'backupToFiles' },
                { label: 'Erase Imported Music', actionName: 'clearImportedMusic' }
            ];
        }
    },
    artists: { title: 'Artists', dynamic: 'artists' },
    albums: { title: 'Albums', dynamic: 'albums' },
    songs: { title: 'Songs', dynamic: 'songs' },
    photos: { title: 'Photos', dynamic: 'photos' },
    videos: { title: 'Videos', dynamic: 'videos' }
};

// ── Element Cache ────────────────────────────────────────────
export { elements };
