import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'cli/edge-tts': 'src/cli/edge-tts.ts',
    'cli/edge-playback': 'src/cli/edge-playback.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  minify: false,
  target: 'node16',
  external: ['ws', 'isomorphic-ws', 'sound-play'],
});
