const amqp = require('amqplib');

let connection, channel;

// Initialize RabbitMQ connection
async function initializeQueue() {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    
    // Declare exchange for task events
    await channel.assertExchange('task.events', 'topic', { durable: true });
    
    // Declare queues for different event types
    await channel.assertQueue('task.created', { durable: true });
    await channel.assertQueue('task.completed', { durable: true });
    
    // Bind queues to exchange with routing keys
    await channel.bindQueue('task.created', 'task.events', 'task.created');
    await channel.bindQueue('task.completed', 'task.events', 'task.completed');
    
    // Set up consumers for mock use cases
    if (process.env.NODE_ENV !== 'test') {
      await setupConsumers();
    }
    
    console.log('[Queue] RabbitMQ connection established');
  } catch (error) {
    console.error('[Queue] Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

// Set up consumers for different event types
async function setupConsumers() {
  // Consumer for task.created events
  await channel.consume('task.created', (msg) => {
    if (msg) {
      const event = JSON.parse(msg.content.toString());
      console.log(`[Queue] Task Created Event:`, event);
      
      // Mock: Send notification
      console.log(`[Mock] Sending notification for new task: ${event.payload.title}`);
      
      // Mock: Offload analytics event
      console.log(`[Mock] Sending analytics event: task_created`);
      
      channel.ack(msg);
    }
  });
  
  // Consumer for task.completed events
  await channel.consume('task.completed', (msg) => {
    if (msg) {
      const event = JSON.parse(msg.content.toString());
      console.log(`[Queue] Task Completed Event:`, event);
      
      // Mock: Send notification
      console.log(`[Mock] Sending notification for completed task: ${event.payload.title}`);
      
      // Mock: Offload email event
      console.log(`[Mock] Sending email notification: task_completed`);
      
      channel.ack(msg);
    }
  });
}

// Publish event to RabbitMQ
async function publishEvent(type, payload) {
  try {
    if (!channel) {
      await initializeQueue();
    }
    
    const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
    const routingKey = `task.${type}`;
    
    await channel.publish('task.events', routingKey, Buffer.from(message), {
      persistent: true,
      contentType: 'application/json'
    });
    
    console.log(`[Queue] Published event: ${type}`);
  } catch (error) {
    console.error('[Queue] Failed to publish event:', error);
    throw error;
  }
}

// Close RabbitMQ connection
async function closeConnection() {
  if (channel) await channel.close();
  if (connection) await connection.close();
}

// Initialize queue on module load
if (process.env.NODE_ENV !== 'test') {
  initializeQueue().catch(console.error);
}

module.exports = { 
  publishEvent, 
  initializeQueue, 
  closeConnection 
}; 