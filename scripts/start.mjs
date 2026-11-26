import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const env = { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'production' };
const children = [
  spawn(process.execPath, ['dist/server.js'], {
    cwd: fileURLToPath(new URL('../backend', import.meta.url)),
    env,
    stdio: 'inherit',
  }),
  spawn(
    process.execPath,
    [fileURLToPath(new URL('./frontend.mjs', import.meta.url)), 'start'],
    {
      cwd: fileURLToPath(new URL('../frontend', import.meta.url)),
      env,
      stdio: 'inherit',
    },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
  const timeout = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
  }, 10000);
  timeout.unref();
}
for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => stop());
