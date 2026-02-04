const mongoose = require('mongoose');

async function connectDB(uri) {
  if (!uri) {
    console.warn('No MONGODB_URI provided; skipping mongoose connect.');
    return null;
  }
  try {
    // Add connection options for better reliability
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 30000, // 30 seconds connection timeout
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections in the pool
      retryWrites: true,
      retryReads: true,
    };

    const conn = await mongoose.connect(uri, options);
    console.log('MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Don't throw - let the app continue without DB
    console.warn('Continuing without MongoDB connection. Some features may not work.');
    return null;
  }
}

module.exports = { connectDB, mongoose };
