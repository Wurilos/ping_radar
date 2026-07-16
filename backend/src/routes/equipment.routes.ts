// ==============================================
// PingAlert Pro — Equipment Routes
// ==============================================

import { Router, Request, Response } from 'express';
import { equipmentService } from '../services/equipment.service';
import { authenticate, authorize, clientScope } from '../middleware/auth.middleware';
import { monitoringWorker } from '../workers/monitoring.worker';

const router = Router();

// GET /api/equipments - List all
router.get('/', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const result = await equipmentService.findAll({
      user: req.user,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      search: req.query.search as string,
      status: req.query.status as string,
      clientId: req.query.clientId as string,
      group: req.query.group as string,
      checkType: req.query.checkType as string,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/equipments/stats - Dashboard stats
router.get('/stats', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const stats = await equipmentService.getStats(req.user);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/equipments/groups - Get unique groups
router.get('/groups', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const groups = await equipmentService.getGroups(req.user);
    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/equipments/:id - Get by ID
router.get('/:id', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const equipment = await equipmentService.findById(req.params.id, req.user);
    res.json(equipment);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// POST /api/equipments - Create
router.post('/', authenticate, authorize('ADMIN', 'TECH'), async (req: Request, res: Response) => {
  try {
    const equipment = await equipmentService.create(req.body);
    res.status(201).json(equipment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/equipments/:id - Update
router.put('/:id', authenticate, authorize('ADMIN', 'TECH'), async (req: Request, res: Response) => {
  try {
    const equipment = await equipmentService.update(req.params.id, req.body);
    res.json(equipment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/equipments/:id - Delete
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    await equipmentService.delete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/equipments/bulk-delete - Delete multiple
router.post('/bulk-delete', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }
    const result = await equipmentService.deleteBulk(ids);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/equipments/:id/test - Test equipment now
router.post('/:id/test', authenticate, authorize('ADMIN', 'TECH'), async (req: Request, res: Response) => {
  try {
    const result = await monitoringWorker.testEquipment(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/equipments/:id/maintenance - Toggle maintenance
router.post('/:id/maintenance', authenticate, authorize('ADMIN', 'TECH'), async (req: Request, res: Response) => {
  try {
    const { enabled, reason } = req.body;
    const equipment = await equipmentService.setMaintenance(
      req.params.id,
      enabled,
      req.user!.userId,
      reason
    );
    res.json(equipment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/equipments/:id/history - Get check history
router.get('/:id/history', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const history = await equipmentService.getHistory(req.params.id, {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 100,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/equipments/:id/response-time - Get response time chart data
router.get('/:id/response-time', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const data = await equipmentService.getResponseTimeHistory(req.params.id, hours);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
