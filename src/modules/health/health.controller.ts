import { Router } from 'express';
import type { UserRepo } from '../../core/ports/user.repo.js';

/**
 * Exposes `GET /health` (liveness — always 200, no dependencies) and
 * `GET /ready` (readiness — 200 only if `userRepo` responds, 503 otherwise).
 * Intended for orchestrator probes (Kubernetes, ECS, etc.).
 */
export function createHealthRouter(deps: { userRepo: UserRepo }) {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  router.get('/ready', async (_req, res) => {
    try {
      await deps.userRepo.count({});
      res.status(200).json({ status: 'ok' });
    } catch (err) {
      res.status(503).json({
        status: 'error',
        error: err instanceof Error ? err.message : 'Readiness check failed',
      });
    }
  });

  return router;
}
