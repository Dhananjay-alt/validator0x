import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { dts } from 'rollup-plugin-dts';

const entries = {
    index: 'src/index.ts', ethereum: 'src/validators/ethereum.ts', evm: 'src/validators/evm.ts',
    bitcoin: 'src/validators/bitcoin.ts', litecoin: 'src/validators/litecoin.ts', dogecoin: 'src/validators/dogecoin.ts',
    solana: 'src/validators/solana.ts', ripple: 'src/validators/ripple.ts', cardano: 'src/validators/cardano.ts',
    tron: 'src/validators/tron.ts', cosmos: 'src/validators/cosmos.ts', move: 'src/validators/move.ts',
    near: 'src/validators/near.ts', formatters: 'src/formatters/index.ts',
};
const plugins = () => [typescript({ declaration: false, declarationMap: false, sourceMap: false }), terser({ maxWorkers: 1 })];
export default [
    {
        input: entries,
        preserveEntrySignatures: 'strict',
        output: ['es', 'cjs'].map(format => {
            const ext = format === 'es' ? 'mjs' : 'cjs';
            return { dir: 'dist', format, exports: 'named', entryFileNames: `[name].${ext}`, chunkFileNames: `shared/[name]-[hash].${ext}` };
        }),
        plugins: plugins(),
    },
    {
        input: entries.index,
        output: { file: 'dist/index.umd.js', format: 'umd', name: 'validator0x' },
        plugins: plugins(),
    },
    {
        input: entries.index,
        output: ['mts', 'cts'].map(ext => ({ file: `dist/index.d.${ext}`, format: 'es' })),
        plugins: [dts()],
    },
];
