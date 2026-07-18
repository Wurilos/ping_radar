import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { vpnWatchdogStatusService } from '../services/vpn-watchdog-status.service';

const router = Router();

router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const presentation = await vpnWatchdogStatusService.getPresentation();
    res.json(presentation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
