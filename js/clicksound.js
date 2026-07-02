/**
 * clicksound.js — Synthesized click-wheel tick sound.
 *
 * Not a sample of any real device's sound — generates a short, sharp
 * transient on the fly via the Web Audio API. Real iPod click wheels used
 * a piezoelectric element, which produces a very brief, high-frequency
 * "tick" rather than a broad noise burst — this aims for that character:
 * short duration, high-passed, fast decay, and kept quiet so it doesn't
 * spike over music playing at full volume.
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
 * Plays a short synthetic "tick" — a brief high-passed noise burst with a
 * very fast decay, approximating a piezoelectric click.
 * @param {number} pitch - 1.0 = normal, >1 = higher/lighter, <1 = lower/heavier
 * @param {number} volume - peak gain, kept low so it never overpowers audio playback
 */
export function playClick(pitch = 1, volume = 0.06) {
    const audioCtx = getContext();
    if (!audioCtx) return;

    const duration = 0.008; // piezo ticks are very brief — not a "shh", a "tk"
    const sampleCount = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
    const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // High-pass to strip the low end — piezo ticks are all high-frequency snap,
    // no body/boom to them.
    const highpass = audioCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 3500 * pitch;

    const peak = audioCtx.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.value = 5500 * pitch;
    peak.Q.value = 2;
    peak.gain.value = 6;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    source.connect(highpass);
    highpass.connect(peak);
    peak.connect(gain);
    gain.connect(audioCtx.destination);

    source.start();
    source.stop(audioCtx.currentTime + duration);
}

/** Slightly heavier click for physical button presses vs. wheel ticks. */
export function playButtonClick() {
    playClick(0.85, 0.07);
}

/** Lighter, quicker click for each wheel scroll step — quietest of the two
 *  since it fires far more often during a scroll gesture. */
export function playWheelTick() {
    playClick(1.2, 0.045);
}
