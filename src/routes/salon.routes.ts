import { Router } from 'express';
import {
  getProcedures,
  createProcedure,
  getSpecialists,
  createSpecialist,
  getCertificates,
} from '../controllers/salon.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/procedures', getProcedures);
router.post('/procedures', authenticateToken, requireAdmin, createProcedure);

router.get('/specialists', getSpecialists);
router.post('/specialists', authenticateToken, requireAdmin, createSpecialist);

router.get('/certificates', getCertificates);

export default router;
