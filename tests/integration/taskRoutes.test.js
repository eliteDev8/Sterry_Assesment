const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/models');
const { Task } = require('../../src/models/task');

describe('Task API Integration', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true }); // Ensure DB is clean
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await Task.destroy({ where: {} }); // Clean up tasks after each test
  });

  describe('POST /tasks', () => {
    it('should create a task (201)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Integration Task',
          description: 'Details',
          dueDate: '2025-01-01',
          status: 'open'
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Integration Task');
    });

    it('should fail with 400 for missing title', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ description: 'No title' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('GET /tasks', () => {
    it('should retrieve a list of tasks', async () => {
      await Task.create({ title: 'Task 1', status: 'open' });
      await Task.create({ title: 'Task 2', status: 'completed' });
      const res = await request(app).get('/tasks');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
    it('should filter tasks by status', async () => {
      await Task.create({ title: 'Task 1', status: 'open' });
      await Task.create({ title: 'Task 2', status: 'completed' });
      const res = await request(app).get('/tasks?status=completed');
      expect(res.statusCode).toBe(200);
      expect(res.body.every(task => task.status === 'completed')).toBe(true);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should get a task by id (200)', async () => {
      const task = await Task.create({ title: 'Get Task', status: 'open' });
      const res = await request(app).get(`/tasks/${task.id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id', task.id);
    });
    it('should return 404 for non-existent task', async () => {
      const res = await request(app).get('/tasks/00000000-0000-0000-0000-000000000000');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update a task (200)', async () => {
      const task = await Task.create({ title: 'To Update', status: 'open' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Title', status: 'completed' });
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.status).toBe('completed');
    });
    it('should return 404 for updating non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/00000000-0000-0000-0000-000000000000')
        .send({ title: 'No Task' });
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a task (204)', async () => {
      const task = await Task.create({ title: 'To Delete', status: 'open' });
      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.statusCode).toBe(204);
    });
    it('should return 404 for deleting non-existent task', async () => {
      const res = await request(app).delete('/tasks/00000000-0000-0000-0000-000000000000');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });
}); 