/**
 * backup.js — "Backup to Files": save every imported song back out to the
 * phone's Files app as MP3s, one at a time. This gives you a second local
 * copy independent of IndexedDB, in addition to the archive kept on the PC
 * dumper. iOS Safari's handling of triggered blob downloads can be
 * inconsistent — some files may prompt a Save dialog, others may just open
 * inline (from which you can still use the Share sheet to save to Files).
 */

import { getAllSongs } from './musicdb.js';
import { state } from './config.js';
import { renderMenu } from './ui.js';

function sanitizeFilename(str) {
    return String(str || 'Unknown').replace(/[\\/:*?"<>|]/g, '_').trim();
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function backupToFiles() {
    const songs = await getAllSongs();
    if (!songs.length) {
        window.alert('No imported songs to back up yet.');
        return;
    }

    const ok = window.confirm(
        `This will save ${songs.length} MP3 file(s) one at a time. Some may prompt "Save to Files", others may just open — use Share \u2192 Save to Files on those. Continue?`
    );
    if (!ok) return;

    for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        state.importStatus = `Backing up ${i + 1} of ${songs.length}...`;
        renderMenu();

        const url = URL.createObjectURL(song.audioBlob);
        const filename = `${sanitizeFilename(song.artist)} - ${sanitizeFilename(song.title)}.mp3`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();

        // Give the browser time to actually start the save before revoking
        // the blob URL and moving on to the next file.
        await wait(900);
        URL.revokeObjectURL(url);
    }

    state.importStatus = `Backed up ${songs.length} song${songs.length === 1 ? '' : 's'}.`;
    renderMenu();
    setTimeout(() => {
        state.importStatus = '';
        renderMenu();
    }, 2500);
}
