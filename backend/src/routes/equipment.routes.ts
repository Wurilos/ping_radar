// ==============================================
// PingAlert Pro — Equipment Routes
// ==============================================

import { Router, Request, Response } from 'express';
import { equipmentService } from '../services/equipment.service';
import { contractScanService } from '../services/contract-scan.service';
import { vpnWatchdogStatusService } from '../services/vpn-watchdog-status.service';
import { authenticate, authorize, clientScope } from '../middleware/auth.middleware';
import { monitoringWorker } from '../workers/monitoring.worker';
import { getRouteParam } from '../utils/request';

const router = Router();

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

router.get('/stats', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const stats = await equipmentService.getStats(req.user);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/groups', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const groups = await equipmentService.getGroups(req.user);
    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/contracts', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const contracts = await contractScanService.listContracts(req.user);
    res.json({ data: contracts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/contracts/:name/scan', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const name = getRouteParam(req.params.name, 'name');
    const result = await contractScanService.scanContract(name, req.user);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vpn-status', authenticate, clientScope, async (_req: Request, res: Response) => {
  try {
    const status = await vpnWatchdogStatusService.getPresentation();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const equipment = await equipmentService.findById(getRouteParam(req.params.id, 'id'), req.user);
    res.json(equipment);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', authenticate, authorize('ADMIN', 'TECH'), async (req: Request, res: Response) => {
  try {
    const equipment = await equipmentService.create(req.body);
    res.status(201).json(equipment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticate, authorize('ADMIN', 'TECH'), async (req: Request, res: Response) => {
  try {
    const equipment = await equipmentService.update(getRouteParam(req.params.id, 'id'), req.body);
    res.json(equipment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    await equipmentService.delete(getRouteParam(req.params.id, 'id'));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

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

router.post('/:id/test', authenticate, authorize('ADMIN', 'TECH'), async (req: Request, res: Response) => {
  try {
    const result = await monitoringWorker.testEquipment(getRouteParam(req.params.id, 'id'));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/maintenance', authenticate, authorize('ADMIN', 'TECH'), async (req: Request, res: Response) => {
  try {
    const { enabled, reason } = req.body;
    const equipment = await equipmentService.setMaintenance(
      getRouteParam(req.params.id, 'id'),
      enabled,
      req.user!.userId,
      reason
    );
    res.json(equipment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id/history', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const history = await equipmentService.getHistory(getRouteParam(req.params.id, 'id'), {
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

router.get('/:id/response-time', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const data = await equipmentService.getResponseTimeHistory(getRouteParam(req.params.id, 'id'), hours);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
