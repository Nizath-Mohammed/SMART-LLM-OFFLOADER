import { Router, Request, Response, NextFunction } from 'express';
import { createTask, listTasksForAgent } from '../services/taskService';

const router = Router();

// POST /agents/:agentId/tasks — Assign a task to an agent
router.post('/:agentId/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = createTask(req.params.agentId, req.body);

    // Trigger execution with Ollama immediately in the background
    // Pick the agent's configured model or an available local model
    (async () => {
      try {
        const { getDatabase } = await import('../db/database');
        const { createAndRunExecution } = await import('../services/executionService');
        const { listInstalledModels } = await import('../services/ollamaService');

        const db = getDatabase();
        const agent = db.prepare('SELECT model_ref, system_prompt FROM agents WHERE id = ?').get(req.params.agentId) as { model_ref?: string; system_prompt?: string } | undefined;

        let modelToUse: string = agent?.model_ref || '';
        if (!modelToUse) {
          const installed = await listInstalledModels().catch(() => []);
          if (installed && installed.length > 0) {
            modelToUse = installed[0].name;
          } else {
            modelToUse = 'qwen2.5:1.5b';
          }
        }

        await createAndRunExecution({
          modelName: modelToUse,
          prompt: req.body.prompt,
          agentId: req.params.agentId,
          taskId: task.id,
          systemPrompt: agent?.system_prompt || undefined,
        });
      } catch (execErr) {
        console.error('[Task Execution] Error executing task for agent:', execErr);
      }
    })();

    res.status(201).json({ message: 'Task created successfully and queued for execution.', data: task });
  } catch (err) {
    next(err);
  }
});

// GET /agents/:agentId/tasks — List task history for an agent
router.get('/:agentId/tasks', (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = listTasksForAgent(req.params.agentId);
    res.status(200).json({ message: 'Task history retrieved.', data: tasks });
  } catch (err) {
    next(err);
  }
});

export default router;
