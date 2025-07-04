const { DataTypes, UUIDV4 } = require('sequelize');
const { sequelize } = require('./index');

const ALLOWED_STATUS = ['open', 'in progress', 'completed', 'blocked'];

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM(...ALLOWED_STATUS),
    allowNull: false,
    defaultValue: 'open',
  },
});

module.exports = { Task, ALLOWED_STATUS }; 