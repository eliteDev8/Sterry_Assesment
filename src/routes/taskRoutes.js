const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { validateTask, validateTaskUpdate, validateQuery, validateId } = require('../middlewares/validate');

router.post('/', validateTask, taskController.createTask);
router.get('/', validateQuery, taskController.getTasks);
router.get('/:id', validateId, taskController.getTaskById);
router.put('/:id', validateId, validateTaskUpdate, taskController.updateTask);
router.delete('/:id', validateId, taskController.deleteTask);

module.exports = router; 