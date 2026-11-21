import { AddressValidator, formatPlainAddress } from './base';
import { ValidationResult, ValidationOptions, FormatOptions, ValidationError } from '../types';
import { stripHexPrefix, addHexPrefix } from '../utils/hex';
import { keccak256 } from '../utils/keccak256';
import { InputSanitizer } from '../security/sanitizer';

export class EthereumValidator extends AddressValidator {
    protected validateImplementation(address: string, options?: ValidationOptions): ValidationResult {
        const cleanAddress = stripHexPrefix(address);

        // Check length
        if (cleanAddress.length !== 40) {
            return { valid: false, error: 'Invalid length', details: { errorCode: ValidationError.INVALID_LENGTH } };
        }

        // Exactly 40 hex digits after removing at most one 0x prefix. Do not use isHex here: it strips
        // a prefix itself, so '0x0x' + 38 digits would pass as 40 characters of "hex".
        if (!/^[0-9a-fA-F]{40}$/.test(cleanAddress)) {
            return { valid: false, error: 'Invalid hex characters', details: { errorCode: ValidationError.INVALID_CHARACTERS } };
        }

        // Burn Address Check
        if (!options?.allowBurnAddress && /^0+$/.test(cleanAddress)) {
            return { valid: false, error: 'Burn address detected', details: { errorCode: ValidationError.BURN_ADDRESS } };
        }

        // Uniform-case input carries no checksum, so outside strict mode skip the Keccak hash.
        // Without hex letters the address equals its EIP-55 form, so the checksum trivially holds.
        const mixedCase = cleanAddress !== cleanAddress.toLowerCase() && cleanAddress !== cleanAddress.toUpperCase();
        const checksum = options?.strict || mixedCase ? this.isChecksummed(cleanAddress) : !/[a-fA-F]/.test(cleanAddress);
        if (!checksum && (options?.strict || mixedCase)) {
            return { valid: false, error: 'Invalid checksum', details: { errorCode: ValidationError.INVALID_CHECKSUM } };
        }

        return {
            valid: true,
            blockchain: 'ethereum',
            details: {
                checksum
            }
        };
    }

    format(address: string, options?: FormatOptions): string {
        let formatted = addHexPrefix(InputSanitizer.sanitize(address));

        if (options?.checksum) {
            formatted = this.toChecksumAddress(formatted);
        }

        return formatPlainAddress(formatted, options);
    }

    private isChecksummed(address: string): boolean {
        const clean = stripHexPrefix(address);
        return addHexPrefix(clean) === this.toChecksumAddress(clean);
    }

    private toChecksumAddress(address: string): string {
        const clean = stripHexPrefix(address).toLowerCase();
        if (!/^[0-9a-f]{40}$/.test(clean)) throw new Error('Expected a 20-byte hexadecimal address');
        const hash = keccak256(clean);
        let result = '0x';
        // A hash nibble of 8-f (char code >= '8') marks a letter that must be uppercase.
        for (let i = 0; i < 40; i++) result += hash.charCodeAt(i) >= 56 ? clean[i].toUpperCase() : clean[i];
        return result;
    }
}
