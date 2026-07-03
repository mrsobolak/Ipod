/**
 * clicksound.js — Synthesized click-wheel tick sound.
 *
 * Not a sample of any real device's sound — generates a short, sharp
 * transient on the fly via the Web Audio API: a brief tonal "tick" (piezo
 * clickers are percussive and tonal, not noisy/gritty) plus a touch of
 * high-frequency noise for texture. Gated behind the Click Sounds setting
 * (off by default) and volume kept low regardless.
 */

import { state } from './config.js';

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
 * Plays a short synthetic "tick" — a brief tonal blip with a touch of
 * high-passed noise for texture, fast exponential decay throughout.
 * @param {number} pitch - 1.0 = normal, >1 = higher/lighter, <1 = lower/heavier
 * @param {number} volume - peak gain, kept low so it never overpowers audio playback
 */
export function playClick(pitch = 1, volume = 0.05) {
    if (!state.clickSoundEnabled) return;

    const audioCtx = getContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const duration = 0.012;

    // Tonal component — a very short, fast-decaying triangle blip. This is
    // what makes it read as a clean "tick" rather than a noisy hiss.
    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(4200 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(2600 * pitch, now + duration);

    const oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(volume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);

    // A whisper of high-passed noise layered underneath for a bit of
    // mechanical "snap" texture, much quieter than the tone.
    const noiseDuration = 0.006;
    const sampleCount = Math.max(1, Math.floor(audioCtx.sampleRate * noiseDuration));
    const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;

    const highpass = audioCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 5000 * pitch;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + noiseDuration);

    noiseSource.connect(highpass);
    highpass.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noiseSource.start(now);
    noiseSource.stop(now + noiseDuration);
}

/** Slightly heavier click for physical button presses vs. wheel ticks. */
export function playButtonClick() {
    playClick(0.85, 0.06);
}

/** Lighter, quicker click for each wheel scroll step — quietest of the two
 *  since it fires far more often during a scroll gesture. */
export function playWheelTick() {
    playClick(1.2, 0.04);
}
