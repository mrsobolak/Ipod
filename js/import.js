/**
 * import.js — Wires the on-device "Import Music" flow.
 *
 * User picks MP3 files from the iOS Files/share sheet (works fully offline,
 * no server involved). Each file is tag-read locally, stored in IndexedDB
 * as a Blob, and merged into the live library. Nothing ever leaves the device.
 */

import { readId3Tags } from './id3.js';
import { addSong, clearAll } from './musicdb.js';
import { refreshUserLibrary, state } from './config.js';
import { renderMenu } from './ui.js';

let fileInput = null;

function stripExtension(filename) {
    return filename.replace(/\.[^/.]+$/, '');
}

async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    state.importStatus = `Importing 0 of ${files.length}...`;
    renderMenu();

    let done = 0;
    for (const file of files) {
        try {
            const tags = await readId3Tags(file);
            const meta = {
                title: tags.title || stripExtension(file.name),
                artist: tags.artist || 'Unknown Artist',
                album: tags.album || 'Unknown Album',
                rating: 0
            };
            await addSong(meta, file, tags.picture ? tags.picture.blob : null);
        } catch (err) {
            console.warn(`Failed to import "${file.name}":`, err);
        }
        done++;
        state.importStatus = `Importing ${done} of ${files.length}...`;
        renderMenu();
    }

    await refreshUserLibrary();
    state.importStatus = `Added ${done} song${done === 1 ? '' : 's'}.`;
    renderMenu();

    setTimeout(() => {
        state.importStatus = '';
        renderMenu();
    }, 2500);
}

export function triggerImport() {
    if (!fileInput) return;
    fileInput.value = '';
    fileInput.click();
}

export async function clearImportedMusic() {
    const ok = window.confirm('Erase all imported songs from this device? This cannot be undone.');
    if (!ok) return;
    await clearAll();
    await refreshUserLibrary();
    state.importStatus = 'Imported library erased.';
    renderMenu();
    setTimeout(() => {
        state.importStatus = '';
        renderMenu();
    }, 2000);
}

export function initImport() {
    fileInput = document.getElementById('music-file-input');
    if (!fileInput) return;
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
}
