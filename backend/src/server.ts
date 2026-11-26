import { loadConfig } from './configs/env.js';
import { createApp } from './app.js';

const config = loadConfig();
const server = createApp(config).listen(config.PORT, '127.0.0.1', () => {
  const address = server.address();
  if (address && typeof address !== 'string')
    console.log(`Welcome desk API: http://${address.address}:${address.port}`);
  if (!config.sheetsConfigured)
    console.warn(
      'Google Sheets is not configured; saving visits is unavailable.',
    );
});
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
