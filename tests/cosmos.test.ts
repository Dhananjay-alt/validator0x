import { bech32 } from '@scure/base';
import { validateAddress, CosmosValidator, COSMOS_CHAINS, ValidationError } from '../src';

// Accounts are encoded with @scure/base so expectations do not depend on the decoder under test.
const account = (hrp: string, length: number) => bech32.encode(hrp, bech32.toWords(Uint8Array.from({ length }, (_, i) => (i * 31 + 7) & 255)));

// chain, account prefix, whether 32-byte (module/ICA) accounts are accepted
const table = [
    ['cosmos', 'cosmos', true],
    ['osmosis', 'osmo', true],
    ['sei', 'sei', true],
    ['injective', 'inj', false],
    ['celestia', 'celestia', false],
] as const;

describe('Cosmos SDK account addresses', () => {
    test('the table covers every Cosmos chain', () => {
        expect(table.map(([chain]) => chain).sort()).toEqual([...COSMOS_CHAINS].sort());
    });

    test.each(table)('%s returns the public result for a 20-byte %s account', (chain, prefix) => {
        expect(validateAddress(account(prefix, 20), chain)).toEqual({ valid: true, blockchain: chain, details: { format: 'bech32', checksum: true } });
    });

    test.each(table)('%s (%s) 32-byte account accepted: %s', (chain, prefix, allows32) => {
        const result = validateAddress(account(prefix, 32), chain);
        expect(result.valid).toBe(allows32);
        if (!allows32) expect(result.details?.errorCode).toBe(ValidationError.INVALID_FORMAT);
    });

    test.each(table)('%s rejects the other chains’ prefixes', (chain) => {
        for (const [, otherPrefix] of table.filter(([other]) => other !== chain)) {
            expect(validateAddress(account(otherPrefix, 20), chain)).toMatchObject({ valid: false, details: { errorCode: ValidationError.INVALID_FORMAT } });
        }
    });

    test('the constructor rejects an unsupported chain identifier', () => {
        expect(() => new CosmosValidator('juno' as never)).toThrow(RangeError);
    });
});
