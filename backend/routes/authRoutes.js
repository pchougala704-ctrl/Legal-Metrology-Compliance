const express = require('express');
const { body } = require('express-validator');
const { register, login } = require('../controllers/authController');

const router = express.Router();

const authValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  ...authValidation
], register);
router.post('/login', authValidation, login);

module.exports = router;
