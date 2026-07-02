/**
 * media.js — Photo/video import and the on-screen viewer overlay.
 *
 * Deliberately low-fi: images render at the tiny click-wheel screen size
 * with pixelated scaling and a slightly washed-out filter, and videos just
 * play back at native codec quality inside that same tiny frame — same
 * "looks charmingly bad on a 2-inch LCD" energy as the real thing.
 */

import { addPhoto, addVideo, getAllPhotos, getAllVideos } from './mediadb.js';
import { elements, state, refreshPhotos, refreshVideos, photos, videos } from './config.js';
import { renderMenu } from './ui.js';

let photoInput = null;
let videoInput = null;

function stripExtension(filename) {
    return filename.replace(/\.[^/.]+$/, '');
}

async function handlePhotoFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    state.importStatus = `Importing 0 of ${files.length} photo(s)...`;
    renderMenu();
    let done = 0;
    for (const file of files) {
        try {
            await addPhoto(stripExtension(file.name), file);
        } catch (err) {
            console.warn(`Failed to import photo "${file.name}":`, err);
        }
        done++;
        state.importStatus = `Importing ${done} of ${files.length} photo(s)...`;
        renderMenu();
    }
    await refreshPhotos();
    state.importStatus = `Added ${done} photo${done === 1 ? '' : 's'}.`;
    renderMenu();
    setTimeout(() => { state.importStatus = ''; renderMenu(); }, 2000);
}

async function handleVideoFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    state.importStatus = `Importing 0 of ${files.length} video(s)...`;
    renderMenu();
    let done = 0;
    for (const file of files) {
        try {
            await addVideo(stripExtension(file.name), file);
        } catch (err) {
            console.warn(`Failed to import video "${file.name}":`, err);
        }
        done++;
        state.importStatus = `Importing ${done} of ${files.length} video(s)...`;
        renderMenu();
    }
    await refreshVideos();
    state.importStatus = `Added ${done} video${done === 1 ? '' : 's'}.`;
    renderMenu();
    setTimeout(() => { state.importStatus = ''; renderMenu(); }, 2000);
}

export function triggerImportPhotos() {
    if (!photoInput) return;
    photoInput.value = '';
    photoInput.click();
}

export function triggerImportVideos() {
    if (!videoInput) return;
    videoInput.value = '';
    videoInput.click();
}

// ── Viewer ────────────────────────────────────────────────────

export function openPhotoViewer(index) {
    if (!photos.length) return;
    state.currentPhotoIndex = Math.max(0, Math.min(index, photos.length - 1));
    state.isViewingPhoto = true;
    const photo = photos[state.currentPhotoIndex];
    elements.photoViewerImg.src = photo.url;
    elements.photoViewerCaption.textContent = `${photo.name}  (${state.currentPhotoIndex + 1}/${photos.length})`;
    elements.photoViewer.classList.add('active');
}

export function nextPhoto() {
    if (!state.isViewingPhoto || !photos.length) return;
    openPhotoViewer((state.currentPhotoIndex + 1) % photos.length);
}

export function prevPhoto() {
    if (!state.isViewingPhoto || !photos.length) return;
    openPhotoViewer((state.currentPhotoIndex - 1 + photos.length) % photos.length);
}

export function closePhotoViewer() {
    state.isViewingPhoto = false;
    elements.photoViewer.classList.remove('active');
    elements.photoViewerImg.src = '';
}

export function openVideoViewer(index) {
    if (!videos.length) return;
    state.currentVideoIndex = Math.max(0, Math.min(index, videos.length - 1));
    state.isViewingVideo = true;
    const video = videos[state.currentVideoIndex];
    elements.videoViewerEl.src = video.url;
    elements.videoViewer.classList.add('active');
    elements.videoViewerEl.play().catch(() => {});
}

export function toggleVideoPlayback() {
    if (!state.isViewingVideo) return;
    if (elements.videoViewerEl.paused) elements.videoViewerEl.play().catch(() => {});
    else elements.videoViewerEl.pause();
}

export function closeVideoViewer() {
    state.isViewingVideo = false;
    elements.videoViewerEl.pause();
    elements.videoViewer.classList.remove('active');
    elements.videoViewerEl.src = '';
}

export function initMedia() {
    photoInput = document.getElementById('photo-file-input');
    videoInput = document.getElementById('video-file-input');
    if (photoInput) photoInput.addEventListener('change', (e) => handlePhotoFiles(e.target.files));
    if (videoInput) videoInput.addEventListener('change', (e) => handleVideoFiles(e.target.files));
}
