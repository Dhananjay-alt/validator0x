export const BECH32_ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

export enum Bech32Encoding {
    BECH32 = 'bech32',
    BECH32M = 'bech32m',
}

const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;
const CHARSET_REV = new Int8Array(128).fill(-1);
for (let i = 0; i < BECH32_ALPHABET.length; i++) CHARSET_REV[BECH32_ALPHABET.charCodeAt(i)] = i;

function polymodStep(chk: number, value: number): number {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GENERATOR[i];
    return chk;
}

export interface Decoded {
    hrp: string;
    data: number[];
    encoding: Bech32Encoding;
}

export function decodeBech32(str: string, limit = 90): Decoded | null {
    if (str.length < 8 || str.length > limit) return null;
    const lower = str.toLowerCase();

    // Mixed case check
    if (str !== lower && str !== str.toUpperCase()) return null;

    const pos = lower.lastIndexOf('1');
    if (pos < 1 || pos + 7 > lower.length) return null;

    // Checksum over the expanded HRP (high bits, separator, low bits), then the data words.
    let chk = 1;
    for (let i = 0; i < pos; i++) {
        const code = lower.charCodeAt(i);
        if (code < 0x21 || code > 0x7e) return null;
        chk = polymodStep(chk, code >>> 5);
    }
    chk = polymodStep(chk, 0);
    for (let i = 0; i < pos; i++) chk = polymodStep(chk, lower.charCodeAt(i) & 31);

    const data: number[] = [];
    for (let i = pos + 1; i < lower.length; i++) {
        const code = lower.charCodeAt(i);
        const d = code < 128 ? CHARSET_REV[code] : -1;
        if (d === -1) return null;
        chk = polymodStep(chk, d);
        data.push(d);
    }

    // One pass decides both variants: the residue is 1 for Bech32 and 0x2bc830a3 for Bech32m.
    const encoding = chk === BECH32_CONST ? Bech32Encoding.BECH32 : chk === BECH32M_CONST ? Bech32Encoding.BECH32M : null;
    if (!encoding) return null;
    data.length -= 6;
    return { hrp: lower.substring(0, pos), data, encoding };
}

/** Convert Bech32 words to bytes, rejecting excess or nonzero padding (BIP-173). */
export function wordsToBytes(words: readonly number[]): Uint8Array | null {
    let acc = 0;
    let bits = 0;
    const bytes: number[] = [];
    for (const word of words) {
        if (!Number.isInteger(word) || word < 0 || word > 31) return null;
        acc = ((acc << 5) | word) & 0xffff;
        bits += 5;
        if (bits >= 8) {
            bits -= 8;
            bytes.push((acc >>> bits) & 255);
        }
    }
    if (bits >= 5 || ((acc << (8 - bits)) & 255) !== 0) return null;
    return Uint8Array.from(bytes);
}
