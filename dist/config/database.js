import mongoose from 'mongoose';
import { ENV } from './env.js';
export const connectDatabase = async () => {
    try {
        mongoose.set('strictQuery', true);
        await mongoose.connect(ENV.MONGODB_URI);
        console.log(`[Database] MongoDB connected successfully to ${ENV.MONGODB_URI}`);
        return true;
    }
    catch (error) {
        console.warn(`[Database] MongoDB connection warning: ${error.message}`);
        if (ENV.NODE_ENV === 'production') {
            console.error('[Database] MongoDB connection failure in production. Exiting.');
            process.exit(1);
        }
        console.warn('[Database] Continuing in development mode with simulated/degraded database.');
        return false;
    }
};
