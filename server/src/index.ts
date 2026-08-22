import dotenv from 'dotenv';
import path from 'path';

// Load environment configuration
dotenv.config({ path: path.join(__dirname, '../.env') });

import app from './app';
import { connectDB } from './config/db';
import { User } from './models/User';
import { seedDatabase } from './seed/seed';

const PORT = process.env.PORT || 5005;

const bootstrap = async () => {
  try {
    await connectDB();

    // Check if database needs auto-seeding
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Database is empty. Initiating automatic seed procedure...');
      await seedDatabase();
    }

    app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });
  } catch (error) {
    console.error('Failed to bootstrap server application:', error);
    process.exit(1);
  }
};

bootstrap();
