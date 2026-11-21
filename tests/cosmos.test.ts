import { bech32, bech32m } from '@scure/base';
import { validateAddress, detectBlockchain, CosmosValidator, COSMOS_CHAINS, ValidationError } from '../src';

const prefixes = { cosmos: 'cosmos', osmosis: 'osmo', celestia: 'celestia', injective: 'inj', sei: 'sei' } as const;
const bytes = (length: number, seed = 7) => Uint8Array.from({ length }, (_, i) => (i * 31 + seed) & 255);
const encode = (hrp: string, data: Uint8Array) => bech32.encode(hrp, bech32.toWords(data));

describe('Cosmos SDK account addresses', () => {
    // Published Cosmos Hub account address; independently decodable to a 20-byte account.
    test('accepts a published Cosmos Hub address', () => {
        const address = 'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh';
        expect(validateAddress(address, 'cosmos')).toEqual({ valid: true, blockchain: 'cosmos', details: { format: 'bech32', checksum: true } });
        expect(detectBlockchain(address)).toBe('cosmos');
    });

    test.each(COSMOS_CHAINS)('accepts 20-byte %s accounts and rejects other prefixes', chain => {
        const address = encode(prefixes[chain], bytes(20));
        expect(validateAddress(address, chain)).toMatchObject({ valid: true, blockchain: chain });
        expect(validateAddress(address.toUpperCase(), chain).valid).toBe(true);
        expect(detectBlockchain(address)).toBe(chain);
        for (const other of COSMOS_CHAINS.filter(candidate => candidate !== chain)) {
            expect(validateAddress(address, other).valid).toBe(false);
        }
    });

    test.each([
        ['cosmos', true], ['osmosis', true], ['sei', true], ['injective', false], ['celestia', false],
    ] as const)('32-byte module/ICA account on %s: valid=%s', (chain, expected) => {
        expect(validateAddress(encode(prefixes[chain], bytes(32)), chain).valid).toBe(expected);
    });

    test('rejects wrong payload lengths, Bech32m, bad checksums, and mixed case', () => {
        const address = encode('cosmos', bytes(20));
        for (const invalid of [
            encode('cosmos', bytes(19)),
            encode('cosmos', bytes(21)),
            bech32m.encode('cosmos', bech32m.toWords(bytes(20))),
            address.slice(0, -1) + (address.endsWith('q') ? 'p' : 'q'),
            address.slice(0, 10) + address.slice(10).toUpperCase(),
        ]) {
            expect(validateAddress(invalid, 'cosmos')).toMatchObject({ valid: false, details: { errorCode: ValidationError.INVALID_FORMAT } });
        }
    });

    test('rejects validator operator and consensus prefixes', () => {
        for (const hrp of ['cosmosvaloper', 'cosmosvalcons', 'cosmospub']) {
            expect(validateAddress(encode(hrp, bytes(20)), 'cosmos').valid).toBe(false);
        }
    });

    test('rejects nonzero Bech32 padding', () => {
        // 32 bytes = 256 bits in 52 words, leaving 4 padding bits that must be zero.
        const words = bech32.toWords(bytes(32));
        expect(validateAddress(bech32.encode('cosmos', words), 'cosmos').valid).toBe(true);
        words[words.length - 1] |= 1;
        expect(validateAddress(bech32.encode('cosmos', words), 'cosmos').valid).toBe(false);
    });

    test('rejects unknown chains at construction time', () => {
        expect(() => new CosmosValidator('juno' as never)).toThrow(RangeError);
    });
});
