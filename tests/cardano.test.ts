import { bech32, bech32m } from '@scure/base';
import { validateAddress, CardanoValidator } from '../src';
import { decodeBech32 } from '../src/utils/bech32';
import { byronNetwork } from '../src/utils/byron';
import vectors from './fixtures/protocol-vectors.json';

// Published Byron example from CIP-19 (testnet).
const byron = '37btjrVyb4KDXBNC4haBVPCrro8AQPHwvCMp3RFhhSVWwfFmZ6wwzSK6JK1hY6wHNmtrpTf1kdbva8TCneM2YsiXT7mrzT21EacHnPpz5YyUdj64na';
describe('Cardano', () => {
    test('validates a complete Byron envelope and CRC32', () => {
        expect(validateAddress(byron, 'cardano')).toMatchObject({ valid: true, details: { format: 'byron', network: 'testnet' } });
        expect(validateAddress(byron.slice(0, -1) + 'b', 'cardano').valid).toBe(false);
        expect(validateAddress(byron, 'cardano', { network: 'mainnet' }).valid).toBe(false);
    });
    test.each([
        'Ae2tdPwUPEZGvXJ3ebp4LDgBhbxekAH2kqx8Q4Y5aWq9kL2y5X3v7D2GzU5',
        'DdzFFzCqrhtCSZq831x1r9aFh5H1xSZeFzY1HZeZ1R1ZQ9ZeFzY1HZejq831x1r9aFh5H1xSZeFzY1HZeZ1R1ZQ9',
        'Ae2tdPwUPEZGvXJ3ebp',
    ])('rejects fake or truncated Byron strings: %s', address => {
        expect(validateAddress(address, 'cardano').valid).toBe(false);
    });
    test('formats a Cardano address with eight characters by default', () => {
        const address = vectors.cardano[0];
        expect(new CardanoValidator().format(address)).toBe(address);
        expect(new CardanoValidator().format(address, { shorten: true })).toBe(address.slice(0, 8) + '...' + address.slice(-8));
    });

    test('rejects the historical invalid Cardano checksum fixture', () => {
        expect(decodeBech32('addr1qxyxps5q8vquk0xyed9k4w0eunv3c8hsnmxgf7th8qf5lqy4xgj970e4e7h886g8e27csh0lssn35n9p2r8m0xptz8cs22gexj', 256)).toBeNull();
    });
});

// CIP-19 Shelley vectors and constructed edge cases.
const hash = Uint8Array.from({ length: 28 }, (_, i) => i + 1);
const shelley = (header: number, tail: number[] = [], hrp = 'addr', encoder = bech32) =>
    encoder.encode(hrp, encoder.toWords(Uint8Array.from([header, ...hash, ...tail])), 256);

describe('Cardano Shelley', () => {
    test('accepts the CIP-19 mainnet pointer and enterprise vectors', () => {
        for (const address of [
            'addr1gx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer5pnz75xxcrzqf96k',
            'addr1vx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzers66hrl8',
        ]) expect(validateAddress(address, 'cardano')).toMatchObject({ valid: true, details: { format: 'shelley', network: 'mainnet' } });
    });

    test.each([
        ['base address', 0x01, Array.from({ length: 28 }, () => 9), 'addr', 'mainnet'],
        ['testnet enterprise', 0x60, [], 'addr_test', 'testnet'],
        ['pointer (0, 0, 0)', 0x41, [0, 0, 0], 'addr', 'mainnet'],
        ['pointer with multi-byte slot', 0x40, [0x81, 0x00, 1, 2], 'addr_test', 'testnet'],
    ] as const)('accepts %s', (_, header, tail, hrp, network) => {
        expect(validateAddress(shelley(header, [...tail], hrp), 'cardano')).toMatchObject({ valid: true, details: { network } });
    });

    test('accepts stake addresses and reports the stake format', () => {
        expect(validateAddress(shelley(0xe1, [], 'stake'), 'cardano')).toMatchObject({ valid: true, details: { format: 'stake', network: 'mainnet' } });
        expect(validateAddress(shelley(0xf0, [], 'stake_test'), 'cardano')).toMatchObject({ valid: true, details: { format: 'stake', network: 'testnet' } });
    });

    test.each([
        ['network tag that is neither 0 nor 1', shelley(0x62)],
        ['mainnet header with testnet prefix', shelley(0x61, [], 'addr_test')],
        ['payment header with stake prefix', shelley(0x61, [], 'stake')],
        ['base address missing its stake hash', shelley(0x01)],
        ['enterprise address with trailing bytes', shelley(0x61, [0])],
        ['reserved header type 8', shelley(0x81)],
        ['pointer missing fields', shelley(0x41, [0, 0])],
        ['pointer with trailing bytes', shelley(0x41, [0, 0, 0, 0])],
        ['pointer with non-minimal varint', shelley(0x41, [0x80, 0x01, 0, 0])],
        ['pointer with unterminated varint', shelley(0x41, [0, 0, 0x81])],
        ['pointer cert index above 16 bits', shelley(0x41, [0, 0, 0x84, 0x80, 0x00])],
        ['Bech32m checksum', shelley(0x61, [], 'addr', bech32m)],
    ])('rejects %s', (_, address) => {
        expect(validateAddress(address, 'cardano').valid).toBe(false);
    });
});

describe('Byron envelope precheck', () => {
    test('rejects empty and non-array CBOR without parsing', () => {
        for (const data of [new Uint8Array(0), Uint8Array.of(0x00), Uint8Array.of(0x58, 0x1c), Uint8Array.of(0xa1, 0x00)]) {
            expect(byronNetwork(data)).toBeNull();
        }
    });

    test('still parses arrays, including non-minimal array headers, before rejecting them', () => {
        expect(byronNetwork(Uint8Array.of(0x98, 0x02, 0xd8, 0x18))).toBeNull();
        expect(byronNetwork(Uint8Array.of(0x82))).toBeNull();
    });
});
