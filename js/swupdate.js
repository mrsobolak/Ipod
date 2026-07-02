/**
 * swupdate.js — Native on-screen "iPod Updated" notice.
 *
 * Listens for the 'sw-update-ready' event dispatched by index.html when a
 * new service worker has taken control. Instead of silently reloading in
 * the background, shows a proper in-screen dialog and only reloads once
 * the user taps OK (or presses the center button / Menu on the wheel).
 */

import { state, elements } from './config.js';

export function showUpdateNotice() {
    state.isShowingUpdateNotice = true;
    if (elements.updateNotice) elements.updateNotice.classList.add('active');
}

export function dismissUpdateNotice() {
    if (!state.isShowingUpdateNotice) return;
    state.isShowingUpdateNotice = false;
    if (elements.updateNotice) elements.updateNotice.classList.remove('active');
    window.location.reload();
}

export function initSwUpdate() {
    window.addEventListener('sw-update-ready', showUpdateNotice);

    if (elements.updateNoticeOk) {
        elements.updateNoticeOk.addEventListener('pointerup', (e) => {
            e.stopPropagation();
            dismissUpdateNotice();
        });
    }
}
