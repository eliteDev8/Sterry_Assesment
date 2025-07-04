require('dotenv').config();
const express = require('express');
const { sequelize } = require('./models');
const taskRoutes = require('./routes/taskRoutes');
const errorHandler = require('./middlewares/errorHandler');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const { initializeQueue } = require('./services/queue');

const app = express();



app.use(express.json());
app.use('/tasks', taskRoutes);
app.use(errorHandler);

const swaggerDocument = YAML.load(path.join(__dirname, '../openapi.yaml'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Initialize RabbitMQ connection
initializeQueue().catch(console.error);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  sequelize.sync().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  });
}

module.exports = app;
