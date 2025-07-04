const { body, param, query, validationResult } = require('express-validator');
const { ALLOWED_STATUS } = require('../models/task');

const validateTask = [
  body('title').isString().notEmpty().withMessage('Title is required'),
  body('description').optional().isString(),
  body('dueDate').optional().isISO8601().toDate(),
  body('status').optional().isIn(ALLOWED_STATUS),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateTaskUpdate = [
  body('title').optional().isString().notEmpty(),
  body('description').optional().isString(),
  body('dueDate').optional().isISO8601().toDate(),
  body('status').optional().isIn(ALLOWED_STATUS),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateQuery = [
  query('status').optional().isIn(ALLOWED_STATUS),
  query('dueDate').optional().isISO8601(),
  query('sortBy').optional().isIn(['dueDate', 'title']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateId = [
  param('id').isUUID().withMessage('Invalid task ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = { validateTask, validateTaskUpdate, validateQuery, validateId }; 