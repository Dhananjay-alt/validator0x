import { bech32 } from '@scure/base';
import { validateAddress, detectBlockchain, EVM_CHAINS, SUPPORTED_CHAINS, ValidationOptions } from '../src';
import vectors from './fixtures/protocol-vectors.json';

describe('Polygon Validator', () => {
    test('should validate Polygon address', () => {
        const result = validateAddress('0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', 'polygon');
        expect(result.valid).toBe(true);
        expect(result.blockchain).toBe('polygon');
    });
});

describe('Chain Detector', () => {
    test('should detect Ethereum and EVM chains', () => {
        expect(detectBlockchain('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toEqual(EVM_CHAINS);
    });

    test('should detect Solana', () => {
        expect(detectBlockchain('HN7cABqLq46Es1jh92dQQy4aWDtG751BHhP1K2HWT7k1')).toBe('solana');
    });

    test('should detect Bitcoin Legacy', () => {
        expect(detectBlockchain('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe('bitcoin');
    });

    test('should detect Bitcoin SegWit', () => {
        expect(detectBlockchain('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe('bitcoin');
    });

    test('should detect Ripple', () => {
        expect(detectBlockchain('rG1QQv2nh2gr7RCZ1P8YYcBUKCCN633jCn')).toBe('ripple');
    });

    test('should detect Cardano', () => {
        expect(detectBlockchain('addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8')).toBe('cardano');
    });

    test('should detect Litecoin', () => {
        expect(detectBlockchain('LVg2kJoFNg45Nbpy53h7Fe1wKyeXVRhMH9')).toBe('litecoin');
    });

    test('should detect Dogecoin', () => {
        expect(detectBlockchain('D59T4ioHyHdJ6SDzpE8mdz7ssh3atQqjiG')).toBe('dogecoin');
    });

    test('should return null for unknown', () => {
        expect(detectBlockchain('invalid-address-string')).toBe(null);
    });
});

describe('Detection prechecks', () => {
    // Reference: validate every chain with no shortcuts, in registry order.
    const nearShape = (s: string) => /(\.near|\.testnet)$/.test(s) || /^[0-9a-f]{64}$/.test(s) || /^0[xs][0-9a-f]{40}$/.test(s) || /^0u[0-9a-hjkmnp-tv-z]{51}[0g]$/.test(s);
    function exhaustive(input: string, options?: ValidationOptions) {
        const safe = input.trim();
        if (!safe) return null;
        const matches = SUPPORTED_CHAINS.filter(chain => {
            if (chain === 'near' && !nearShape(safe)) return false;
            return validateAddress(input, chain, options).valid;
        });
        return matches.length === 0 ? null : matches.length === 1 ? matches[0] : matches;
    }

    const seeds = [
        ...vectors.bitcoinValid, ...vectors.bitcoinInvalid, ...vectors.cardano,
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', 'ltc1qg82tj3j9n0cc3d8rzc5ql9w2ma6s0sz0j6l6pm', 'LM2WMpR1Rp6j3Sa59cMXMs1SPzj9eXpGc1',
        'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L', 'HN7cABqLq46Es1jh92dQQy4aWDtG751BHhP1K2HWT7k1', '11111111111111111111111111111111',
        'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY', 'TNPeeaaFB7K9cmo4uQpcU32zGK8G1NYqeL', '418840E6C55B9ADA326D211D818C34A994AECED808',
        'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh', 'stake1uyehkck0lajq8gr28t9uxnuvgcqrc6070x3k9r8048z8y5gh6ffgw',
        '0x' + 'ab'.repeat(32), '0xa', 'alice.near', 'a'.repeat(64), '0s' + 'b'.repeat(40), 'root', ' 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 ',
        ...['cosmos', 'osmo', 'celestia', 'inj', 'sei'].map(hrp => bech32.encode(hrp, bech32.toWords(Uint8Array.from({ length: 20 }, (_, i) => i)))),
    ];
    // Single-character edits, case flips and prefix swaps around every seed.
    const alphabet = '0123456789abcdefABCDEFxrTlLO_1q';
    const corpus = new Set<string>(seeds);
    for (const seed of seeds) {
        corpus.add(seed.toUpperCase());
        corpus.add(seed.toLowerCase());
        corpus.add(seed.slice(1));
        corpus.add(seed.slice(0, -1));
        for (let i = 0; i < seed.length; i += 3) corpus.add(seed.slice(0, i) + alphabet[(i * 7) % alphabet.length] + seed.slice(i + 1));
    }

    test(`matches exhaustive validation across ${corpus.size} inputs`, () => {
        for (const input of corpus) expect([input, detectBlockchain(input)]).toEqual([input, exhaustive(input)]);
        for (const network of ['mainnet', 'testnet'] as const) {
            for (const input of seeds) expect([input, detectBlockchain(input, { network })]).toEqual([input, exhaustive(input, { network })]);
        }
    });

    test('the Ripple alphabet uses the same characters as Bitcoin Base58', () => {
        const sort = (s: string) => [...s].sort().join('');
        expect(sort('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz')).toBe(sort('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'));
    });
});
