const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE = 58;

export function encodeBase58(source: Uint8Array): string {
    if (source.length === 0) return '';

    const digits = [0];

    for (let i = 0; i < source.length; i++) {
        for (let j = 0; j < digits.length; j++) {
            digits[j] <<= 8;
        }
        digits[0] += source[i];

        let carry = 0;
        for (let j = 0; j < digits.length; ++j) {
            digits[j] += carry;
            carry = (digits[j] / BASE) | 0;
            digits[j] %= BASE;
        }
        while (carry) {
            digits.push(carry % BASE);
            carry = (carry / BASE) | 0;
        }
    }

    for (let i = 0; i < source.length - 1 && source[i] === 0; i++) {
        digits.push(0);
    }

    return digits.reverse().map(d => ALPHABET[d]).join('');
}

/** Build a Base58 decoder for an alphabet whose first character encodes a leading zero byte. */
export function createBase58Decoder(alphabet: string): (input: string) => Uint8Array {
    const map = new Int8Array(128).fill(-1);
    for (let i = 0; i < alphabet.length; i++) map[alphabet.charCodeAt(i)] = i;
    const leader = alphabet.charCodeAt(0);
    return (input: string): Uint8Array => {
        let leaders = 0;
        while (leaders < input.length && input.charCodeAt(leaders) === leader) leaders++;
        // log(58) / log(256) ~= 0.733, so this bounds the decoded size.
        const bytes = new Uint8Array(((input.length - leaders) * 733) / 1000 + 1 >>> 0);
        let length = 0;
        for (let i = leaders; i < input.length; i++) {
            const code = input.charCodeAt(i);
            const value = code < 128 ? map[code] : -1;
            if (value === -1) throw new Error(`Invalid Base58 character: ${input[i]}`);
            let carry = value;
            let j = 0;
            for (; j < length || carry !== 0; j++) {
                const k = bytes.length - 1 - j;
                carry += BASE * bytes[k];
                bytes[k] = carry & 0xff;
                carry >>>= 8;
            }
            length = j;
        }
        const result = new Uint8Array(leaders + length);
        result.set(bytes.subarray(bytes.length - length), leaders);
        return result;
    };
}

export const decodeBase58 = createBase58Decoder(ALPHABET);
