const request = require('supertest');
const app = require('../../../src/app');
const { Task } = require('../../../src/models/task');
const { publishEvent } = require('../../../src/services/queue');

// Do NOT mock the whole models/task module, only mock Task methods
jest.mock('../../../src/services/queue');

beforeEach(() => {
  jest.clearAllMocks();
  // Restore all Task mocks before each test
  if (Task.create.mockRestore) Task.create.mockRestore();
  if (Task.findByPk.mockRestore) Task.findByPk.mockRestore();
});

describe('Task Routes', () => {
  describe('POST /tasks', () => {
    it('should create a task (success)', async () => {
      const newTask = { title: 'Test', description: 'desc', dueDate: '2025-01-01', status: 'open' };
      const createdTask = { id: '1', ...newTask, dueDate: new Date('2025-01-01') };
      jest.spyOn(Task, 'create').mockResolvedValue(createdTask);
      publishEvent.mockResolvedValue();

      const res = await request(app)
        .post('/tasks')
        .send(newTask);

      if (res.statusCode !== 201) {
        // eslint-disable-next-line no-console
        console.log('POST /tasks (success) response:', res.body);
      }
      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject({ ...createdTask, dueDate: createdTask.dueDate.toISOString() });
      expect(Task.create).toHaveBeenCalledWith({ ...newTask, dueDate: new Date('2025-01-01') });
      expect(publishEvent).toHaveBeenCalledWith('task.created', createdTask);
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({}); // Missing required fields
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should handle DB error', async () => {
      jest.spyOn(Task, 'create').mockRejectedValue(new Error('DB error'));
      const validTask = { title: 'Test', description: 'desc', dueDate: '2025-01-01', status: 'open' };
      const res = await request(app)
        .post('/tasks')
        .send(validTask);
      if (res.statusCode !== 500) {
        // eslint-disable-next-line no-console
        console.log('POST /tasks (DB error) response:', res.body);
      }
      expect(res.statusCode).toBe(500);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should return a task if found', async () => {
      const task = { id: 'b1a2c3d4-e5f6-7890-abcd-1234567890ef', title: 'Test', status: 'open' };
      jest.spyOn(Task, 'findByPk').mockResolvedValue(task);
      const res = await request(app).get('/tasks/b1a2c3d4-e5f6-7890-abcd-1234567890ef');
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(task);
    });

    it('should return 404 if not found', async () => {
      jest.spyOn(Task, 'findByPk').mockResolvedValue(null);
      const res = await request(app).get('/tasks/b1a2c3d4-e5f6-7890-abcd-1234567890ef');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error', 'Task not found');
    });

    it('should return 400 for invalid id', async () => {
      const res = await request(app).get('/tasks/not-a-uuid');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('GET /tasks', () => {
    it('should return all tasks (no filters)', async () => {
      const tasks = [
        { id: '1', title: 'A', status: 'open', dueDate: new Date('2025-01-01') },
        { id: '2', title: 'B', status: 'completed', dueDate: new Date('2025-01-02') },
      ];
      jest.spyOn(Task, 'findAll').mockResolvedValue(tasks);
      const res = await request(app).get('/tasks');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
    });
    it('should return filtered tasks', async () => {
      const tasks = [
        { id: '1', title: 'A', status: 'open', dueDate: new Date('2025-01-01') },
      ];
      jest.spyOn(Task, 'findAll').mockResolvedValue(tasks);
      const res = await request(app).get('/tasks?status=open&sortBy=title&sortOrder=asc');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
    });
    it('should return 400 for invalid status', async () => {
      const res = await request(app).get('/tasks?status=notvalid');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
    it('should return 400 for invalid dueDate', async () => {
      const res = await request(app).get('/tasks?dueDate=notadate');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
    it('should return 400 for invalid sortBy', async () => {
      const res = await request(app).get('/tasks?sortBy=invalid');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
    it('should return 400 for invalid sortOrder', async () => {
      const res = await request(app).get('/tasks?sortOrder=invalid');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
    it('should handle DB error', async () => {
      jest.spyOn(Task, 'findAll').mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/tasks');
      expect(res.statusCode).toBe(500);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update a task (success)', async () => {
      const id = 'b1a2c3d4-e5f6-7890-abcd-1234567890ef';
      const oldTask = { id, title: 'Old', status: 'open', update: jest.fn(), status: 'open' };
      jest.spyOn(Task, 'findByPk').mockResolvedValue(oldTask);
      // Simulate update: update the mock's fields and return itself
      oldTask.update.mockImplementation(function (fields) {
        Object.assign(this, fields);
        return Promise.resolve(this);
      });
      publishEvent.mockResolvedValue();
      const res = await request(app)
        .put(`/tasks/${id}`)
        .send({ title: 'New', status: 'completed' });
      expect(res.statusCode).toBe(200);
      expect(oldTask.update).toHaveBeenCalledWith({ title: 'New', status: 'completed' });
      expect(publishEvent).toHaveBeenCalledWith('task.completed', expect.objectContaining({ id, title: 'New', status: 'completed' }));
    });
    it('should return 404 if not found', async () => {
      jest.spyOn(Task, 'findByPk').mockResolvedValue(null);
      const id = 'b1a2c3d4-e5f6-7890-abcd-1234567890ef';
      const res = await request(app).put(`/tasks/${id}`).send({ title: 'New' });
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error', 'Task not found');
    });
    it('should return 400 for invalid id', async () => {
      const res = await request(app).put('/tasks/not-a-uuid').send({ title: 'New' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
    it('should return 400 for invalid body', async () => {
      const id = 'b1a2c3d4-e5f6-7890-abcd-1234567890ef';
      const res = await request(app).put(`/tasks/${id}`).send({ status: 'notvalid' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
    it('should handle DB error', async () => {
      jest.spyOn(Task, 'findByPk').mockRejectedValue(new Error('DB error'));
      const id = 'b1a2c3d4-e5f6-7890-abcd-1234567890ef';
      const res = await request(app).put(`/tasks/${id}`).send({ title: 'New' });
      expect(res.statusCode).toBe(500);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a task (success)', async () => {
      const id = 'b1a2c3d4-e5f6-7890-abcd-1234567890ef';
      const mockTask = { id, destroy: jest.fn().mockResolvedValue() };
      jest.spyOn(Task, 'findByPk').mockResolvedValue(mockTask);
      const res = await request(app).delete(`/tasks/${id}`);
      expect(res.statusCode).toBe(204);
      expect(mockTask.destroy).toHaveBeenCalled();
    });
    it('should return 404 if not found', async () => {
      jest.spyOn(Task, 'findByPk').mockResolvedValue(null);
      const id = 'b1a2c3d4-e5f6-7890-abcd-1234567890ef';
      const res = await request(app).delete(`/tasks/${id}`);
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error', 'Task not found');
    });
    it('should return 400 for invalid id', async () => {
      const res = await request(app).delete('/tasks/not-a-uuid');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
    it('should handle DB error', async () => {
      jest.spyOn(Task, 'findByPk').mockRejectedValue(new Error('DB error'));
      const id = 'b1a2c3d4-e5f6-7890-abcd-1234567890ef';
      const res = await request(app).delete(`/tasks/${id}`);
      expect(res.statusCode).toBe(500);
    });
  });
}); 
