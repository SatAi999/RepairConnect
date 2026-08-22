import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/repairconnect';
  
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully.');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};
