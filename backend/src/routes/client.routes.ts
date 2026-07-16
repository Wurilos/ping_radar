// ==============================================
// PingAlert Pro — Client Routes
// ==============================================

import { Router, Request, Response } from 'express';
import { clientService } from '../services/client.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getRouteParam } from '../utils/request';

const router = Router();

// GET /api/clients
router.get('/', authenticate, authorize('ADMIN', 'TECH'), async (req: Request, res: Response) => {
  try {
    const result = await clientService.findAll({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      search: req.query.search as string,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/clients/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = getRouteParam(req.params.id, 'id');

    if (req.user?.role === 'CLIENT' && req.user.clientId !== id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const client = await clientService.findById(id);
    res.json(client);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// POST /api/clients
router.post('/', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const client = await clientService.create(req.body);
    res.status(201).json(client);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/clients/:id
router.put('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const client = await clientService.update(getRouteParam(req.params.id, 'id'), req.body);
    res.json(client);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    await clientService.delete(getRouteParam(req.params.id, 'id'));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/clients/bulk-delete
router.post('/bulk-delete', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }
    const result = await clientService.deleteBulk(ids);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
