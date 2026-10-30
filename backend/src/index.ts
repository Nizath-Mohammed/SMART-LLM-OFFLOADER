import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './db/database';
import agentRouter from './routes/agentRoutes';
import taskRouter from './routes/taskRoutes';
import decisionRouter from './routes/decisionRoutes';
import runtimeRouter from './routes/runtimeRoutes';
import huggingFaceRouter from './routes/huggingFaceRoutes';
import executionRouter from './routes/executionRoutes';
import { initHardwareDetector } from './services/hardwareDetector';
import { errorHandler } from './middleware/errorHandler';
import schedulerRouter     from './routes/schedulerRoutes';
import lifecycleRouter     from './routes/lifecycleRoutes';
import collaborationRouter from './routes/collaborationRoutes';
import benchmarkRouter     from './routes/benchmarkRoutes';
import kvCacheRouter       from './routes/kvCacheRoutes';
import experimentalRouter  from './routes/experimentalRoutes';
import { initScheduler, getQueue }  from './services/schedulerService';
import { initModelLifecycle, setSchedulerQueueAccessor } from './services/modelLifecycleService';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Database ─────────────────────────────────────────────────────────────────
initDatabase(process.env.DB_PATH || 'edgellm.db');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API Routes ────────────────────────────────────────────────────────────────
// Agent CRUD routes: GET/POST/PATCH/DELETE /api/v1/agents[/:agentId/...]
app.use('/api/v1/agents', agentRouter);

// Task routes: POST/GET /api/v1/agents/:agentId/tasks
// taskRouter uses /:agentId/tasks paths so it also mounts under /api/v1/agents
app.use('/api/v1/agents', taskRouter);

// Decision Engine routes: GET /hardware, GET /models, POST/GET /recommendations
app.use('/api/v1', decisionRouter);

// VS3 Runtime routes: /api/v1/runtime/*
app.use('/api/v1/runtime', runtimeRouter);

// VS3 Hugging Face model discovery: /api/v1/huggingface/*
app.use('/api/v1/huggingface', huggingFaceRouter);

// VS3 Task execution & history: /api/v1/executions/*
app.use('/api/v1/executions', executionRouter);

// VS4 Scheduler: /api/v1/scheduler/*
app.use('/api/v1/scheduler',      schedulerRouter);

// VS4 Model lifecycle: /api/v1/models/*
app.use('/api/v1/models',         lifecycleRouter);

// VS4 Collaboration: /api/v1/collaboration/*
app.use('/api/v1/collaboration',  collaborationRouter);

// VS4 Benchmarks: /api/v1/benchmarks/*
app.use('/api/v1/benchmarks',     benchmarkRouter);

// VS4 KV-cache estimates: /api/v1/kvcache/*
app.use('/api/v1/kvcache',        kvCacheRouter);

// VS4 Experimental: /api/v1/experimental/*
app.use('/api/v1/experimental',   experimentalRouter);

// ── Static frontend (production only) ────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(staticPath));

  // Serve index.html for all non-API routes (client-side routing)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Start server (not in test mode) ──────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const initTimeout = new Promise<void>((resolve) => setTimeout(resolve, 5000));
  Promise.race([initHardwareDetector(), initTimeout])
    .catch(() => {})
    .then(async () => {
      await initScheduler();
      initModelLifecycle();
      setSchedulerQueueAccessor(getQueue);
    })
    .catch(() => {})
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`[EdgeLLM] Server listening on http://localhost:${PORT}`);
      });
    });
}

export { app };
