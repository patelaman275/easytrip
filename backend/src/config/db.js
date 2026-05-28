const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/easytrip';
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully to:', mongoURI);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.log('Server is running in offline-fallback mode. Some database interactions may fail, please start a local MongoDB instance or set MONGO_URI.');
  }
};

module.exports = connectDB;
