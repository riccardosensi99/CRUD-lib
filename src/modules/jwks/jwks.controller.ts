import { Router } from 'express';
import { getJwks } from '../../utils/jwks.js';

/** Exposes `GET /.well-known/jwks.json` so other services can verify RS256 tokens without sharing a secret. */
export function createJwksRouter() {
  const router = Router();

  router.get('/.well-known/jwks.json', (_req, res) => {
    res.json(getJwks());
  });

  return router;
}
