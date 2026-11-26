import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { networkConfig } from '../config/network.mjs';
const require = createRequire(
  new URL('../frontend/package.json', import.meta.url),
);
const { frontendPort } = networkConfig();
const child = spawn(
  process.execPath,
  [
    require.resolve('next/dist/bin/next'),
    process.argv[2],
    '--port',
    String(frontendPort),
  ],
  { stdio: 'inherit', env: process.env },
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => child.kill(signal));
child.on('error', () => {
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
