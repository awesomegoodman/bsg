import express from 'express';
import { loadConfig } from './src/configs/env.js';
import { createApp } from './src/app.js';

const app = express();

app.use(createApp(loadConfig()));

export default app;