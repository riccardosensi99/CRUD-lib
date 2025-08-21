import { Router } from 'express';
import { isAuth, type AuthRequest } from '../../middleware/isAuth.js';
import { hasRole, isSelfOrAdmin } from '../../middleware/hasRole.js';
import { z } from 'zod';
import {
    listUsersQuerySchema,
    updateMeSchema,
    adminCreateUserSchema,
    adminUpdateUserSchema,
} from './user.schemas.js';
import {
    listUsers,
    getUserById,
    updateMe,
    adminCreateUser,
    adminUpdateUser,
    adminDeleteUser,
} from './user.service.js';

export function createUserRouter() {
    const router = Router();

    router.get('/', isAuth, hasRole('ADMIN'), async (req, res) => {
        try {
            const q = listUsersQuerySchema.parse(req.query);
            const data = await listUsers(q);
            res.json(data);
        } catch (e: any) {
            if (e?.issues) return res.status(400).json({ error: 'ValidationError', details: e.issues });
            res.status(500).json({ error: 'InternalError' });
        }
    });

    router.get('/:id', isAuth, isSelfOrAdmin(), async (req: AuthRequest, res) => {
        const id = Number(req.params.id);
        const data = await getUserById(id);
        if (!data) return res.status(404).json({ error: 'User not found' });
        res.json(data);
    });

    router.get('/me/self', isAuth, async (req: AuthRequest, res) => {
        const data = await getUserById(req.user!.id);
        if (!data) return res.status(404).json({ error: 'User not found' });
        res.json(data);
    });

    router.put('/me', isAuth, async (req: AuthRequest, res) => {
        try {
            const body = updateMeSchema.parse(req.body);
            const data = await updateMe(req.user!.id, body);
            res.json(data);
        } catch (e: any) {
            if (e?.issues) return res.status(400).json({ error: 'ValidationError', details: e.issues });
            res.status(500).json({ error: 'InternalError' });
        }
    });

    router.post('/', isAuth, hasRole('ADMIN'), async (req, res) => {
        try {
            const body = adminCreateUserSchema.parse(req.body);
            const data = await adminCreateUser(body);
            res.status(201).json(data);
        } catch (e: any) {
            if (e?.message === 'EMAIL_TAKEN') return res.status(409).json({ error: 'Email already in use' });
            if (e?.issues) return res.status(400).json({ error: 'ValidationError', details: e.issues });
            res.status(500).json({ error: 'InternalError' });
        }
    });

    router.put('/:id', isAuth, isSelfOrAdmin(), async (req: AuthRequest, res) => {
        try {
            const id = Number(req.params.id);
            const body = adminUpdateUserSchema.parse(req.body);

            if (req.user!.role !== 'ADMIN' && body.role) {
                return res.status(403).json({ error: 'Forbidden: cannot change role' });
            }

            const data = await adminUpdateUser(id, body);
            res.json(data);
        } catch (e: any) {
            if (e?.issues) return res.status(400).json({ error: 'ValidationError', details: e.issues });
            res.status(500).json({ error: 'InternalError' });
        }
    });

    router.delete('/:id', isAuth, hasRole('ADMIN'), async (req, res) => {
        try {
            const id = Number(req.params.id);
            const data = await adminDeleteUser(id);
            res.json(data);
        } catch {
            res.status(500).json({ error: 'InternalError' });
        }
    });

    return router;
}
