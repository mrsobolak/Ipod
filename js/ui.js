/**
 * ui.js — Menu rendering, navigation transitions, and dynamic menu generation.
 *
 * Handles the iPod menu hierarchy: static menus from config,
 * dynamically generated Artist/Album/Song lists from the library,
 * and the slide-left/slide-right transition between menu levels.
 */

import { library, photos, videos, menus, state, elements, goToNowPlaying } from './config.js';
import * as player from './player.js';
import * as media from './media.js';

// ── Dynamic Menu Items ───────────────────────────────────────

const EMPTY_LIBRARY_ITEM = { label: 'No Songs — Import Music...', actionName: 'importMusic' };

function getDynamicItems(key) {
    if (key === 'artists') {
        const artists = [...new Set(library.map(s => s.artist))].sort((a, b) => a.localeCompare(b));
        if (artists.length === 0) return [EMPTY_LIBRARY_ITEM];
        return artists.map(artist => ({
            label: artist,
            submenu: `artist:${artist}`
        }));
    }

    if (key === 'albums') {
        const albums = [...new Set(library.map(s => s.album))].sort((a, b) => a.localeCompare(b));
        if (albums.length === 0) return [EMPTY_LIBRARY_ITEM];
        return albums.map(album => ({
            label: album,
            submenu: `album:${album}`
        }));
    }

    if (key === 'songs') {
        const sorted = [...library].sort((a, b) => a.title.localeCompare(b.title));
        if (sorted.length === 0) return [EMPTY_LIBRARY_ITEM];
        return sorted.map((song, idx) => ({
            label: song.title,
            action: () => player.playQueue(sorted, idx)
        }));
    }

    // Artist detail → "All Songs" + per-album submenus
    if (key.startsWith('artist:')) {
        const name = key.slice(7);
        const songs = library.filter(s => s.artist === name).sort((a, b) => a.title.localeCompare(b.title));
        const albums = [...new Set(songs.map(s => s.album))].sort((a, b) => a.localeCompare(b));
        return [
            { label: 'All Songs', action: () => player.playQueue(songs, 0) },
            ...albums.map(album => ({ label: album, submenu: `artist-album:${name}::${album}` }))
        ];
    }

    // Album detail → track list
    if (key.startsWith('album:')) {
        const name = key.slice(6);
        const songs = library.filter(s => s.album === name);
        return songs.map((song, idx) => ({
            label: song.title,
            action: () => player.playQueue(songs, idx)
        }));
    }

    // Artist-specific album detail → track list
    if (key.startsWith('artist-album:')) {
        const payload = key.slice('artist-album:'.length);
        const [artistName, albumName] = payload.split('::');
        const songs = library.filter(s => s.artist === artistName && s.album === albumName);
        return songs.map((song, idx) => ({
            label: song.title,
            action: () => player.playQueue(songs, idx)
        }));
    }

    if (key === 'photos') {
        const items = [{ label: 'Import Photos...', actionName: 'importPhotos' }];
        photos.forEach((photo, idx) => {
            items.push({ label: photo.name, action: () => media.openPhotoViewer(idx) });
        });
        return items;
    }

    if (key === 'videos') {
        const items = [{ label: 'Import Videos...', actionName: 'importVideos' }];
        videos.forEach((video, idx) => {
            items.push({ label: video.name, action: () => media.openVideoViewer(idx) });
        });
        return items;
    }

    return [];
}

// ── Menu Resolution ──────────────────────────────────────────

/** Resolves any menu key (static or dynamic) to { title, items }. */
function resolveMenuRaw(key) {
    if (menus[key]) {
        return {
            title: menus[key].title,
            items: menus[key].items || getDynamicItems(key)
        };
    }
    if (key.startsWith('artist:')) return { title: key.slice(7), items: getDynamicItems(key) };
    if (key.startsWith('album:')) return { title: key.slice(6), items: getDynamicItems(key) };
    if (key.startsWith('artist-album:')) {
        const payload = key.slice('artist-album:'.length);
        const [, albumName] = payload.split('::');
        return { title: albumName || 'Album', items: getDynamicItems(key) };
    }
    return { title: key, items: [] };
}

// Every menu except Main and Now Playing itself gets a "Now Playing"
// shortcut pinned to the top whenever a queue is active -- lets you jump
// straight back to playback from anywhere without backing all the way up.
export function resolveMenu(key) {
    const resolved = resolveMenuRaw(key);
    if (key === 'main' || state.queue.length === 0) return resolved;

    return {
        title: resolved.title,
        items: [
            { label: '\u25B6 Now Playing', action: goToNowPlaying },
            ...resolved.items
        ]
    };
}

// ── Render ────────────────────────────────────────────────────

const DEFAULT_MAX_VISIBLE = 7;
let cachedNaturalItemHeight = null;

function getVisibleCount(pane) {
    const targetPane = pane || elements.menuPrimary;
    if (!targetPane) return DEFAULT_MAX_VISIBLE;

    const paneHeight = targetPane.clientHeight;
    if (!paneHeight) return DEFAULT_MAX_VISIBLE;

    if (!cachedNaturalItemHeight) {
        const probe = document.createElement('div');
        probe.className = 'menu-item';
        probe.style.visibility = 'hidden';
        probe.style.position = 'absolute';
        probe.style.pointerEvents = 'none';
        probe.innerHTML = '<span>Sample</span>';
        targetPane.appendChild(probe);

        cachedNaturalItemHeight = probe.getBoundingClientRect().height;
        probe.remove();
    }

    if (!cachedNaturalItemHeight) return DEFAULT_MAX_VISIBLE;

    return Math.max(1, Math.round(paneHeight / cachedNaturalItemHeight));
}

// Optional: clear cache on window resize if the iPod can be resized
window.addEventListener('resize', () => {
    cachedNaturalItemHeight = null;
});

export function renderMenu(targetPane) {
    if (state.isNowPlaying) {
        elements.screenContainer.style.transform = 'translateX(-50%)';
        elements.headerTitle.innerText = 'Now Playing';
        state.lastRenderedMenuKey = 'now-playing';
        return;
    }

    elements.screenContainer.style.transform = 'translateX(0)';

    const { title, items } = resolveMenu(state.currentMenuKey);
    elements.headerTitle.innerText = state.importStatus || title;

    const pane = targetPane || elements.menuPrimary;
    const visibleCount = getVisibleCount(pane);

    // Clamp scrollOffset so the selected item stays visible
    if (state.selectedIndex < state.scrollOffset) {
        state.scrollOffset = state.selectedIndex;
    } else if (state.selectedIndex >= state.scrollOffset + visibleCount) {
        state.scrollOffset = state.selectedIndex - visibleCount + 1;
    }
    state.scrollOffset = Math.max(0, Math.min(state.scrollOffset, Math.max(0, items.length - visibleCount)));

    const visible = items.slice(state.scrollOffset, state.scrollOffset + visibleCount);
    pane.innerHTML = '';

    const fragment = document.createDocumentFragment();
    const itemHeight = pane.clientHeight ? (pane.clientHeight / visibleCount) : null;

    visible.forEach((item, i) => {
        const realIndex = i + state.scrollOffset;
        const div = document.createElement('div');
        div.className = 'menu-item'
            + (realIndex === state.selectedIndex ? ' selected' : '')
            + (item.disabled ? ' disabled' : '');

        if (itemHeight) div.style.height = `${itemHeight}px`;

        let right = '';
        if (item.submenu) right = '<span class="material-icons arrow">chevron_right</span>';
        else if (item.value) right = `<span class="value">${item.value}</span>`;

        div.innerHTML = `<span>${item.label}</span>${right}`;
        fragment.appendChild(div);
    });
    pane.appendChild(fragment);
    state.lastRenderedMenuKey = state.currentMenuKey;
}

// ── Menu Transitions ─────────────────────────────────────────

export function switchMenu(newMenuKey, direction = 'forward', targetIndex = 0) {
    elements.menuSlider.style.transition = 'none';

    if (direction === 'forward') {
        state.currentMenuKey = newMenuKey;
        state.selectedIndex = targetIndex;
        renderMenu(elements.menuSecondary);
        elements.menuSlider.style.transform = 'translateX(0)';
        elements.menuSlider.offsetHeight; // Force reflow

        setTimeout(() => {
            elements.menuSlider.style.transition = 'transform 150ms ease-out';
            elements.menuSlider.style.transform = 'translateX(-50%)';
            const onEnd = () => {
                elements.menuSlider.removeEventListener('transitionend', onEnd);
                elements.menuSlider.style.transition = 'none';
                elements.menuPrimary.innerHTML = elements.menuSecondary.innerHTML;
                elements.menuSlider.style.transform = 'translateX(0)';
            };
            elements.menuSlider.addEventListener('transitionend', onEnd);
        }, 20);
    } else {
        elements.menuSecondary.innerHTML = elements.menuPrimary.innerHTML;
        state.currentMenuKey = newMenuKey;
        state.selectedIndex = targetIndex;
        renderMenu(elements.menuPrimary);
        elements.menuSlider.style.transform = 'translateX(-50%)';
        elements.menuSlider.offsetHeight; // Force reflow
        setTimeout(() => {
            elements.menuSlider.style.transition = 'transform 150ms ease-out';
            elements.menuSlider.style.transform = 'translateX(0)';
        }, 20);
    }
}

// ── Header Icons ─────────────────────────────────────────────

export function updateHeaderIcons() {
    elements.playIcon.classList.toggle('active', !elements.audio.paused && !elements.audio.ended);

    const repeatEl = elements.nowPlayingScreen.querySelector('.repeat-indicator');
    if (repeatEl) {
        const labels = { one: 'REPEAT 1', all: 'REPEAT ALL' };
        repeatEl.textContent = labels[state.repeat] || '';
        repeatEl.classList.toggle('active', state.repeat !== 'off');
    }
