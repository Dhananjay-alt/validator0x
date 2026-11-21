import { performance } from 'node:perf_hooks';
import { validateAddress, detectBlockchain } from '../dist/index.mjs';

function measure(label, iterations, fn) {
    for (let warmup = 0; warmup < 500; warmup++) fn();
    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    const elapsed = performance.now() - start;
    console.log(`${label}: ${(iterations / elapsed * 1000).toFixed(0)} ops/s (${elapsed.toFixed(1)}ms for ${iterations})`);
}

const validations = [
    ['ethereum', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
    ['ethereum (lowercase)', '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', 'ethereum'],
    ['bitcoin', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'],
    ['bitcoin (bech32)', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', 'bitcoin'],
    ['solana', 'HN7cABqLq46Es1jh92dQQy4aWDtG751BHhP1K2HWT7k1'],
    ['tron', 'TNPeeaaFB7K9cmo4uQpcU32zGK8G1NYqeL'],
    ['cosmos', 'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh'],
];
for (const [label, address, chain = label] of validations) {
    if (!validateAddress(address, chain).valid) throw new Error(`Invalid benchmark fixture: ${label}`);
    measure(label, 10000, () => validateAddress(address, chain));
}
for (const [label, address] of [
    ['EVM detection', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
    ['bitcoin detection', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'],
    ['solana detection', 'HN7cABqLq46Es1jh92dQQy4aWDtG751BHhP1K2HWT7k1'],
    ['invalid detection', 'not-a-wallet-address'],
]) {
    measure(label, 2000, () => detectBlockchain(address));
}
