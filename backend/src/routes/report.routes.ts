import { Router, Request, Response } from 'express';
import { authenticate, clientScope } from '../middleware/auth.middleware';
import { reportService } from '../services/report.service';

const router = Router();

router.get('/overview', authenticate, clientScope, async (req: Request, res: Response) => {
  try {
    const report = await reportService.getOverview({
      user: req.user,
      contractNumber: req.query.contractNumber as string,
      days: Number.parseInt(String(req.query.days || '30'), 10),
    });
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
