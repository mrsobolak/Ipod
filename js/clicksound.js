/**
 * clicksound.js — Synthesized click-wheel tick sound.
 *
 * Not a sample of any real device's sound — this generates a short,
 * filtered noise burst on the fly via the Web Audio API to approximate
 * that mechanical "tick" feel. AudioContext is created lazily on first
 * user interaction (required by browser autoplay policies).
 */

let ctx = null;

function getContext() {
    if (!ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
}

/**
 * Plays a short synthetic "tick" — a brief bandpass-filtered noise burst
 * with a fast exponential decay, roughly mimicking a mechanical click.
 * @param {number} pitch - 1.0 = normal, >1 = higher/lighter, <1 = lower/heavier
 */
export function playClick(pitch = 1) {
    const audioCtx = getContext();
    if (!audioCtx) return;

    const duration = 0.02;
    const sampleCount = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2800 * pitch;
    filter.Q.value = 1.2;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    source.start();
    source.stop(audioCtx.currentTime + duration);
}

/** Slightly heavier click for physical button presses vs. wheel ticks. */
export function playButtonClick() {
    playClick(0.75);
}

/** Lighter, quicker click for each wheel scroll step. */
export function playWheelTick() {
    playClick(1.15);
}
