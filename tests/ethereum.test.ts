import { validateAddress, formatAddress } from '../src';
import { ValidationError } from '../src/types';

describe('Ethereum Validator', () => {
    describe('Valid Addresses', () => {
        // Correct EIP-55 checksum for Vitalik's address
        const checksummed = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
        const lowercase = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';

        test('should validate correct checksummed address', () => {
            const result = validateAddress(checksummed, 'ethereum');

            expect(result.valid).toBe(true);
            expect(result.blockchain).toBe('ethereum');
            expect(result.details?.checksum).toBe(true);
        });

        test('should validate lowercase address (non-checksummed)', () => {
            const result = validateAddress(lowercase, 'ethereum');

            expect(result.valid).toBe(true);
            expect(result.details?.checksum).toBe(false);
        });

        test('should validate non-prefixed checksummed address', () => {
            const result = validateAddress(checksummed.slice(2), 'ethereum');

            expect(result.valid).toBe(true);
            expect(result.details?.checksum).toBe(true);
        });



        test('should validate uppercase address', () => {
            const result = validateAddress(
                '0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045',
                'ethereum'
            );

            expect(result.valid).toBe(true);
            expect(result.details?.checksum).toBe(false);
        });
    });

    describe('Invalid Addresses', () => {
        test('should reject invalid checksum in strict mode', () => {
            const invalid = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
                .replace('A', 'a');

            const result = validateAddress(invalid, 'ethereum', { strict: true });

            expect(result.valid).toBe(false);
            expect(result.details?.errorCode).toBe(ValidationError.INVALID_CHECKSUM);
        });

        test('should reject too short address', () => {
            const result = validateAddress('0x123', 'ethereum');

            expect(result.valid).toBe(false);
            expect(result.details?.errorCode).toBe(ValidationError.INVALID_LENGTH);
        });

        test('should reject invalid hex characters', () => {
            const result = validateAddress(
                '0xd8dA6BF26964aF9D7eEd9e03E53415D37aZ96045',
                'ethereum'
            );

            expect(result.valid).toBe(false);
            expect(result.details?.errorCode).toBe(ValidationError.INVALID_CHARACTERS);
        });

        test('should reject burn address', () => {
            const result = validateAddress(
                '0x0000000000000000000000000000000000000000',
                'ethereum'
            );

            expect(result.valid).toBe(false);
            expect(result.details?.errorCode).toBe(ValidationError.BURN_ADDRESS);
        });
    });

    describe('Formatting', () => {
        test('should apply checksum formatting', () => {
            const formatted = formatAddress(
                '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
                'ethereum',
                { checksum: true }
            );

            expect(formatted).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
        });

        test('should shorten address', () => {
            const shortened = formatAddress(
                '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
                'ethereum',
                { shorten: true }
            );

            expect(shortened).toBe('0xd8dA...6045');
        });
    });
});

describe('EIP-55 checksum reporting', () => {
    // 0x52908400098527886E0F7030069857D2E4169EE7 is an EIP-55 vector whose letters are all uppercase.
    const upperVector = '0x52908400098527886E0F7030069857D2E4169EE7';
    const digitsOnly = '0x' + '1234567890'.repeat(4);

    test('strict mode still verifies uniform-case input against EIP-55', () => {
        expect(validateAddress(upperVector, 'ethereum', { strict: true })).toMatchObject({ valid: true, details: { checksum: true } });
        expect(validateAddress(upperVector.toLowerCase(), 'ethereum', { strict: true }).valid).toBe(false);
    });

    test('non-strict uniform-case input is accepted without claiming a verified checksum', () => {
        expect(validateAddress(upperVector, 'ethereum')).toMatchObject({ valid: true, details: { checksum: false } });
        expect(validateAddress(upperVector.toLowerCase(), 'ethereum')).toMatchObject({ valid: true, details: { checksum: false } });
    });

    test('addresses without hex letters are trivially checksummed', () => {
        expect(validateAddress(digitsOnly, 'ethereum')).toMatchObject({ valid: true, details: { checksum: true } });
        expect(validateAddress(digitsOnly, 'ethereum', { strict: true })).toMatchObject({ valid: true, details: { checksum: true } });
    });
});
