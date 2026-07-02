/**
 * pcsync.js — "Receive from PC" over a Cloudflare quick tunnel.
 *
 * The iPod PWA is served over HTTPS, so it can't fetch from a plain
 * http:// server on your LAN (browsers block that as mixed content).
 * The PC dumper script gets tunneled to a temporary https:// address via
 * `cloudflared tunnel --url http://localhost:8420`, and this module talks
 * to that address instead. Everything downloaded goes through the same
 * ID3-read + IndexedDB-save path as a manual import.
 */

import { readId3Tags } from './id3.js';
import { addSong, findDuplicate } from './musicdb.js';
import { refreshUserLibrary, state } from './config.js';
import { renderMenu } from './ui.js';

const STORAGE_KEY = 'ipod-pc-dumper-address';

function normalizeAddress(input) {
    let address = input.trim();
    if (!address) return '';
    if (!/^https?:\/\//i.test(address)) address = `https://${address}`;
    return address.replace(/\/+$/, '');
}

export async function receiveFromPC() {
    const saved = localStorage.getItem(STORAGE_KEY) || '';
    const input = window.prompt(
        'Enter the PC dumper address (the https://...trycloudflare.com link printed when you ran the cloudflared tunnel):',
        saved
    );
    if (!input) return;

    const address = normalizeAddress(input);
    localStorage.setItem(STORAGE_KEY, address);

    state.importStatus = 'Connecting to PC...';
    renderMenu();

    let list;
    try {
        const res = await fetch(`${address}/songs`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        list = await res.json();
    } catch (err) {
        console.warn('PC dumper connection failed:', err);
        window.alert(
            `Could not reach the PC dumper at ${address}.\n\nMake sure dumper.py is running and the cloudflared tunnel is up.`
        );
        state.importStatus = '';
        renderMenu();
        return;
    }

    if (!Array.isArray(list) || list.length === 0) {
        window.alert('No songs are queued on the PC dumper right now.');
        state.importStatus = '';
        renderMenu();
        return;
    }

    let done = 0;
    let skipped = 0;
    for (const item of list) {
        state.importStatus = `Receiving ${done + skipped + 1} of ${list.length}...`;
        renderMenu();

        try {
            const fileRes = await fetch(`${address}/songs/${encodeURIComponent(item.filename)}`);
            if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status}`);
            const blob = await fileRes.blob();
            const file = new File([blob], item.filename, { type: 'audio/mpeg' });

            const tags = await readId3Tags(file);
            const meta = {
                title: tags.title || item.filename.replace(/\.[^/.]+$/, ''),
                artist: tags.artist || 'Unknown Artist',
                album: tags.album || 'Unknown Album',
                rating: 0
            };

            const dup = await findDuplicate(meta);
            if (dup) {
                skipped++;
            } else {
                await addSong(meta, file, tags.picture ? tags.picture.blob : null);
                done++;
            }

            // Tell the PC it can archive this one out of the dump folder.
            fetch(`${address}/consume/${encodeURIComponent(item.filename)}`, { method: 'POST' }).catch(() => {});
        } catch (err) {
            console.warn(`Failed to receive "${item.filename}":`, err);
        }
    }

    await refreshUserLibrary();
    state.importStatus = skipped > 0
        ? `Received ${done}, skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}.`
        : `Received ${done} song${done === 1 ? '' : 's'} from PC.`;
    renderMenu();
    renderMenu();

    setTimeout(() => {
        state.importStatus = '';
        renderMenu();
    }, 2500);
}
