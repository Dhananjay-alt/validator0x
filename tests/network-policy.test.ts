import { validateAddress, validateBatch, formatAddress, ValidationError } from '../src';

const mainnet = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const testnet = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
const evm = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('Network policy', () => {
    test('network filters addresses that encode a network', () => {
        expect(validateAddress(mainnet, 'bitcoin', { network: 'mainnet' }).valid).toBe(true);
        expect(validateAddress(testnet, 'bitcoin', { network: 'testnet' }).valid).toBe(true);
        expect(validateAddress(mainnet, 'bitcoin', { network: 'auto' }).valid).toBe(true);
        expect(validateAddress(testnet, 'bitcoin', { network: 'auto' }).valid).toBe(true);
    });

    test('mismatches keep format details and report NETWORK_MISMATCH', () => {
        expect(validateAddress(mainnet, 'bitcoin', { network: 'testnet' })).toEqual({
            valid: false,
            error: 'Address network does not match the requested network',
            details: { format: 'legacy', network: 'mainnet', checksum: true, errorCode: ValidationError.NETWORK_MISMATCH },
        });
        expect(validateAddress(testnet, 'bitcoin', { network: 'mainnet' }).details?.errorCode).toBe(ValidationError.NETWORK_MISMATCH);
    });

    test('allowTestnet: false rejects only testnet addresses', () => {
        expect(validateAddress(testnet, 'bitcoin', { allowTestnet: false }).details?.errorCode).toBe(ValidationError.NETWORK_MISMATCH);
        expect(validateAddress(mainnet, 'bitcoin', { allowTestnet: false }).valid).toBe(true);
        expect(validateAddress(testnet, 'bitcoin', { allowTestnet: true }).valid).toBe(true);
    });

    test('network options never reject chains whose addresses carry no network', () => {
        for (const network of ['mainnet', 'testnet'] as const) {
            const result = validateAddress(evm, 'ethereum', { network, allowTestnet: false });
            expect(result.valid).toBe(true);
            expect(result.details?.network).toBeUndefined();
        }
    });

    test('batch validation applies the same policy to every entry', () => {
        expect(validateBatch([mainnet, testnet, 42], 'bitcoin', { network: 'mainnet' }).map(result => result.details?.errorCode))
            .toEqual([undefined, ValidationError.NETWORK_MISMATCH, ValidationError.UNSAFE_INPUT]);
    });
});

describe('Aptos formatting', () => {
    test('normalizes case and collapses special addresses', () => {
        expect(formatAddress('0x' + 'AB'.repeat(32), 'aptos')).toBe('0x' + 'ab'.repeat(32));
        expect(formatAddress('  0x' + '0'.repeat(63) + '1  ', 'aptos')).toBe('0x1');
        expect(formatAddress('0x' + 'ab'.repeat(32), 'aptos', { shorten: true })).toBe('0xabab...abab');
    });

    test('throws on malformed input instead of returning a display string', () => {
        for (const invalid of ['0x123', 'not an address', '0x' + 'g'.repeat(64)]) {
            expect(() => formatAddress(invalid, 'aptos')).toThrow('Invalid Aptos address');
        }
    });
});
