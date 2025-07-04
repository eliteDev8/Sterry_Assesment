const { Task, ALLOWED_STATUS } = require('../models/task');
const { Op } = require('sequelize');
const { publishEvent } = require('../services/queue');

/**
 * Create a new task.
 * @route POST /tasks
 * @param {Request} req - Express request object, expects body: { title, description, dueDate, status }
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {201} Task created successfully
 * @returns {400} Validation error
 * @example
 * // Request body
 * {
 *   "title": "Write documentation",
 *   "description": "Document the API using OpenAPI and JSDoc.",
 *   "dueDate": "2025-01-01",
 *   "status": "open"
 * }
 */
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, dueDate, status } = req.body;
    const task = await Task.create({ title, description, dueDate, status });
    await publishEvent('task.created', task);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

/**
 * Get all tasks, with optional filtering and sorting.
 * @route GET /tasks
 * @param {Request} req - Express request object, supports query: status, dueDate, sortBy, sortOrder
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {200} Array of tasks
 * @returns {400} Validation error
 * @example
 * // GET /tasks?status=open&sortBy=title&sortOrder=asc
 */
exports.getTasks = async (req, res, next) => {
  try {
    const { status, dueDate, sortBy = 'dueDate', sortOrder = 'asc' } = req.query;
    const where = {};
    if (status) where.status = status;
    if (dueDate) where.dueDate = dueDate;
    const allowedSort = ['dueDate', 'title'];
    const order = allowedSort.includes(sortBy) ? [[sortBy, sortOrder.toUpperCase()]] : [['dueDate', 'ASC']];
    const tasks = await Task.findAll({ where, order });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

/**
 * Get a specific task by its ID.
 * @route GET /tasks/:id
 * @param {Request} req - Express request object, expects param: id
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {200} Task object
 * @returns {400} Validation error (invalid ID)
 * @returns {404} Task not found
 * @example
 * // GET /tasks/b1a2c3d4-e5f6-7890-abcd-1234567890ef
 */
exports.getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing task by its ID.
 * @route PUT /tasks/:id
 * @param {Request} req - Express request object, expects param: id and body: { title, description, dueDate, status }
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {200} Updated task object
 * @returns {400} Validation error (invalid ID or body)
 * @returns {404} Task not found
 * @example
 * // PUT /tasks/b1a2c3d4-e5f6-7890-abcd-1234567890ef
 * // Request body
 * {
 *   "title": "Update docs",
 *   "status": "completed"
 * }
 */
exports.updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, status } = req.body;
    const task = await Task.findByPk(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const prevStatus = task.status;
    await task.update({ title, description, dueDate, status });
    if (status === 'completed' && prevStatus !== 'completed') {
      await publishEvent('task.completed', task);
    }
    res.json(task);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a task by its ID.
 * @route DELETE /tasks/:id
 * @param {Request} req - Express request object, expects param: id
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {204} Task deleted
 * @returns {400} Validation error (invalid ID)
 * @returns {404} Task not found
 * @example
 * // DELETE /tasks/b1a2c3d4-e5f6-7890-abcd-1234567890ef
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await task.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}; 
