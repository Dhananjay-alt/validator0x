import { BlockchainType, ValidationOptions, EVM_CHAINS, COSMOS_CHAINS } from '../types';
import { getValidator } from '../registry';
import { InputSanitizer } from '../security/sanitizer';

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const COSMOS_PREFIXES: Readonly<Record<(typeof COSMOS_CHAINS)[number], string>> = { cosmos: 'cosmos1', osmosis: 'osmo1', celestia: 'celestia1', injective: 'inj1', sei: 'sei1' };

interface Features { lower: string; base58: boolean; hex0x: boolean }

/**
 * Cheap necessary conditions for each non-EVM chain, so detection skips decoders and
 * checksums that cannot succeed. Every gate must be implied by the validator accepting
 * the input; `tests/detector.test.ts` checks equivalence with exhaustive validation.
 */
const CANDIDATES: ReadonlyArray<readonly [BlockchainType, (input: string, f: Features) => boolean]> = [
    ...COSMOS_CHAINS.map(chain => [chain, (_: string, f: Features) => f.lower.startsWith(COSMOS_PREFIXES[chain])] as const),
    ['bitcoin', (_, f) => f.base58 || f.lower.startsWith('bc1') || f.lower.startsWith('tb1')],
    ['litecoin', (_, f) => f.base58 || f.lower.startsWith('ltc1') || f.lower.startsWith('tltc1')],
    ['dogecoin', (_, f) => f.base58],
    ['solana', (_, f) => f.base58],
    ['ripple', (input, f) => f.base58 && input.startsWith('r')],
    ['cardano', (_, f) => f.base58 || /^(addr|stake)(_test)?1/.test(f.lower)],
    ['tron', (input, f) => f.base58 || input.startsWith('41')],
    ['sui', (_, f) => f.hex0x],
    ['aptos', (_, f) => f.hex0x],
    // Plain NEAR names are too broad for useful auto-detection. Explicit validation still accepts them.
    ['near', input => /(\.near|\.testnet)$/.test(input) || /^[0-9a-f]{64}$/.test(input) || /^0[xs][0-9a-f]{40}$/.test(input) || /^0u[0-9a-hjkmnp-tv-z]{51}[0g]$/.test(input)],
];

/** Format candidates only: never use detection as proof of a destination's chain. */
export function detectBlockchain(address: unknown, options?: ValidationOptions): BlockchainType | BlockchainType[] | null {
    let safe: string;
    try { safe = InputSanitizer.sanitize(address); } catch { return null; }
    if (!safe) return null;
    const matches: BlockchainType[] = [];
    // All EVM chains share one check. Avoid repeating Keccak for each alias.
    if (getValidator('ethereum').validate(safe, options).valid) matches.push(...EVM_CHAINS);
    const features: Features = { lower: safe.toLowerCase(), base58: BASE58.test(safe), hex0x: safe.startsWith('0x') };
    for (const [chain, gate] of CANDIDATES) {
        if (gate(safe, features) && getValidator(chain).validate(safe, options).valid) matches.push(chain);
    }
    return matches.length === 0 ? null : matches.length === 1 ? matches[0] : matches;
}
