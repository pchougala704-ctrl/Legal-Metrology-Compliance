const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  createInspection,
  getInspectionById,
  listInspections,
  deleteInspection
} = require('../controllers/inspectionController');

const router = express.Router();
const validId = param('id').isInt({ min: 1 }).withMessage('Inspection ID must be a positive integer');
const validStatus = body('inspection_status')
  .optional()
  .isIn(['pending', 'passed', 'failed'])
  .withMessage('Inspection status must be pending, passed or failed');
const validDates = [
  body('manufacturing_date').optional({ values: 'falsy' }).isISO8601().withMessage('Manufacturing date must be YYYY-MM-DD'),
  body('expiry_date').optional({ values: 'falsy' }).isISO8601().withMessage('Expiry date must be YYYY-MM-DD')
];

router.use(authMiddleware);
router.post('/', upload.single('image'), [validStatus, ...validDates], createInspection);
router.get('/', listInspections);
router.get('/:id', validId, getInspectionById);
router.delete('/:id', validId, deleteInspection);

module.exports = router;
