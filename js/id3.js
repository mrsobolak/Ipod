/**
 * id3.js — Minimal, dependency-free ID3v2 (2.3 / 2.4) tag reader.
 *
 * Reads TIT2 (title), TPE1 (artist), TALB (album), and APIC (cover art)
 * frames directly from an MP3 ArrayBuffer. No network calls, no libraries —
 * works fully offline, which is the whole point on a phone with no signal.
 */

function readSyncSafeOrNormalSize(bytes, isV4) {
    if (isV4) {
        return ((bytes[0] & 0x7f) << 21) | ((bytes[1] & 0x7f) << 14) | ((bytes[2] & 0x7f) << 7) | (bytes[3] & 0x7f);
    }
    return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
}

function decodeText(bytes) {
    if (bytes.length === 0) return '';
    const encodingByte = bytes[0];
    const body = bytes.subarray(1);
    try {
        if (encodingByte === 0) {
            return new TextDecoder('iso-8859-1').decode(body).replace(/\0+$/, '').trim();
        }
        if (encodingByte === 1) {
            // UTF-16 with BOM
            return new TextDecoder('utf-16').decode(body).replace(/\0+$/, '').trim();
        }
        if (encodingByte === 2) {
            return new TextDecoder('utf-16be').decode(body).replace(/\0+$/, '').trim();
        }
        return new TextDecoder('utf-8').decode(body).replace(/\0+$/, '').trim();
    } catch {
        return '';
    }
}

function readNullTerminatedLatin1(bytes, start) {
    let end = start;
    while (end < bytes.length && bytes[end] !== 0) end++;
    return { text: new TextDecoder('iso-8859-1').decode(bytes.subarray(start, end)), next: end + 1 };
}

/**
 * Parse ID3v2 tags from a File/Blob.
 * @param {Blob} file
 * @returns {Promise<{title:string, artist:string, album:string, picture: {blob: Blob}|null}>}
 */
export async function readId3Tags(file) {
    const result = { title: '', artist: '', album: '', picture: null };

    // Only need the header region for tags; read up to 2MB (covers large embedded art).
    const headerSlice = await file.slice(0, Math.min(file.size, 2 * 1024 * 1024)).arrayBuffer();
    const bytes = new Uint8Array(headerSlice);

    if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
        // No ID3v2 header found
        return result;
    }

    const majorVersion = bytes[3]; // 3 = v2.3, 4 = v2.4
    const isV4 = majorVersion >= 4;
    const tagSize = readSyncSafeOrNormalSize(bytes.subarray(6, 10), true); // tag size itself is always syncsafe
    const tagEnd = Math.min(10 + tagSize, bytes.length);

    let offset = 10;
    while (offset + 10 <= tagEnd) {
        const frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
        if (!/^[A-Z0-9]{4}$/.test(frameId)) break; // padding or corrupt

        const frameSize = readSyncSafeOrNormalSize(bytes.subarray(offset + 4, offset + 8), isV4);
        const frameStart = offset + 10;
        const frameEnd = frameStart + frameSize;
        if (frameSize <= 0 || frameEnd > tagEnd) break;

        const frameBytes = bytes.subarray(frameStart, frameEnd);

        if (frameId === 'TIT2') result.title = decodeText(frameBytes);
        else if (frameId === 'TPE1') result.artist = decodeText(frameBytes);
        else if (frameId === 'TALB') result.album = decodeText(frameBytes);
        else if (frameId === 'APIC') {
            try {
                const encodingByte = frameBytes[0];
                const { text: mime, next: afterMime } = readNullTerminatedLatin1(frameBytes, 1);
                const pictureType = frameBytes[afterMime];
                let descEnd;
                if (encodingByte === 1 || encodingByte === 2) {
                    // UTF-16 description terminated by two null bytes
                    let i = afterMime + 1;
                    while (i + 1 < frameBytes.length && !(frameBytes[i] === 0 && frameBytes[i + 1] === 0)) i += 2;
                    descEnd = i + 2;
                } else {
                    let i = afterMime + 1;
                    while (i < frameBytes.length && frameBytes[i] !== 0) i++;
                    descEnd = i + 1;
                }
                const imageBytes = frameBytes.subarray(descEnd);
                const safeMime = mime && mime.startsWith('image/') ? mime : 'image/jpeg';
                result.picture = { blob: new Blob([imageBytes], { type: safeMime }) };
            } catch {
                // malformed APIC frame — skip artwork, keep going
            }
        }

        offset = frameEnd;
    }

    return result;
}
