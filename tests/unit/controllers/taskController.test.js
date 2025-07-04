const taskController = require('../../src/controllers/taskController');
const { Task } = require('../../src/models/task');
const { publishEvent } = require('../../src/services/queue');

jest.mock('../../src/models/task');
jest.mock('../../src/services/queue');

describe('taskController', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {}, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task and publish event (success)', async () => {
      req.body = { title: 'Test', description: 'desc', dueDate: '2025-01-01', status: 'open' };
      const mockTask = { id: '1', ...req.body };
      Task.create.mockResolvedValue(mockTask);
      publishEvent.mockResolvedValue();

      await taskController.createTask(req, res, next);

      expect(Task.create).toHaveBeenCalledWith(req.body);
      expect(publishEvent).toHaveBeenCalledWith('task.created', mockTask);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockTask);
    });

    it('should call next with error if Task.create fails', async () => {
      const error = new Error('DB error');
      Task.create.mockRejectedValue(error);
      await taskController.createTask(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getTaskById', () => {
    it('should return a task if found', async () => {
      req.params.id = '1';
      const mockTask = { id: '1', title: 'Test' };
      Task.findByPk.mockResolvedValue(mockTask);
      await taskController.getTaskById(req, res, next);
      expect(Task.findByPk).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith(mockTask);
    });

    it('should return 404 if task not found', async () => {
      req.params.id = '1';
      Task.findByPk.mockResolvedValue(null);
      await taskController.getTaskById(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Task not found' });
    });

    it('should call next with error if Task.findByPk fails', async () => {
      const error = new Error('DB error');
      Task.findByPk.mockRejectedValue(error);
      req.params.id = '1';
      await taskController.getTaskById(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getTasks', () => {
    it('should return tasks (success)', async () => {
      req.query = {};
      const mockTasks = [{ id: '1', title: 'A' }, { id: '2', title: 'B' }];
      Task.findAll.mockResolvedValue(mockTasks);
      await taskController.getTasks(req, res, next);
      expect(Task.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockTasks);
    });
    it('should call next with error if Task.findAll fails', async () => {
      Task.findAll.mockRejectedValue(new Error('DB error'));
      await taskController.getTasks(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateTask', () => {
    it('should update a task and publish event if status changes to completed', async () => {
      req.params.id = '1';
      req.body = { title: 'Updated', status: 'completed' };
      const mockTask = {
        status: 'open',
        update: jest.fn().mockImplementation(function (fields) {
          Object.assign(this, fields);
          return Promise.resolve(this);
        }),
        title: 'Old',
      };
      Task.findByPk.mockResolvedValue(mockTask);
      await taskController.updateTask(req, res, next);
      expect(mockTask.update).toHaveBeenCalledWith(req.body);
      expect(publishEvent).toHaveBeenCalledWith('task.completed', mockTask);
      expect(res.json).toHaveBeenCalledWith(mockTask);
    });
    it('should update a task and not publish event if status does not change to completed', async () => {
      req.params.id = '1';
      req.body = { title: 'Updated', status: 'open' };
      const mockTask = { status: 'open', update: jest.fn().mockResolvedValue(), ...req.body };
      Task.findByPk.mockResolvedValue(mockTask);
      await taskController.updateTask(req, res, next);
      expect(mockTask.update).toHaveBeenCalledWith(req.body);
      expect(publishEvent).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockTask);
    });
    it('should return 404 if task not found', async () => {
      Task.findByPk.mockResolvedValue(null);
      req.params.id = '1';
      await taskController.updateTask(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Task not found' });
    });
    it('should call next with error if Task.findByPk fails', async () => {
      Task.findByPk.mockRejectedValue(new Error('DB error'));
      req.params.id = '1';
      await taskController.updateTask(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
    it('should call next with error if update fails', async () => {
      req.params.id = '1';
      req.body = { title: 'Updated' };
      const mockTask = { status: 'open', update: jest.fn().mockRejectedValue(new Error('Update error')) };
      Task.findByPk.mockResolvedValue(mockTask);
      await taskController.updateTask(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
    it('should call next with error if publishEvent fails', async () => {
      req.params.id = '1';
      req.body = { title: 'Updated', status: 'completed' };
      const mockTask = {
        status: 'open',
        update: jest.fn().mockImplementation(function (fields) {
          Object.assign(this, fields);
          return Promise.resolve(this);
        }),
        title: 'Old',
      };
      Task.findByPk.mockResolvedValue(mockTask);
      publishEvent.mockRejectedValue(new Error('Event error'));
      await taskController.updateTask(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('deleteTask', () => {
    it('should delete a task (success)', async () => {
      req.params.id = '1';
      const mockTask = { destroy: jest.fn().mockResolvedValue() };
      Task.findByPk.mockResolvedValue(mockTask);
      await taskController.deleteTask(req, res, next);
      expect(mockTask.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
    it('should return 404 if task not found', async () => {
      Task.findByPk.mockResolvedValue(null);
      req.params.id = '1';
      await taskController.deleteTask(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Task not found' });
    });
    it('should call next with error if Task.findByPk fails', async () => {
      Task.findByPk.mockRejectedValue(new Error('DB error'));
      req.params.id = '1';
      await taskController.deleteTask(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
    it('should call next with error if destroy fails', async () => {
      req.params.id = '1';
      const mockTask = { destroy: jest.fn().mockRejectedValue(new Error('Destroy error')) };
      Task.findByPk.mockResolvedValue(mockTask);
      await taskController.deleteTask(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
}); 