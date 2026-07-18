import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { contractScanService } from '../services/contract-scan.service';
import { getRouteParam } from '../utils/request';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const contracts = await contractScanService.listContracts(req.user);
    res.json({ data: contracts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:name/scan', authenticate, async (req: Request, res: Response) => {
  try {
    const name = getRouteParam(req.params.name, 'name');
    const result = await contractScanService.scanContract(name, req.user);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
