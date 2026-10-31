import dns from 'node:dns';
import mongoose from 'mongoose';
import { ENV } from './env.js';
// Resolve DNS SRV records reliably (especially on Windows where c-ares defaults to 127.0.0.1)
const configureDns = () => {
    try {
        const servers = dns.getServers();
        const hasLoopbackOnly = !servers.length || servers.every((s) => s.startsWith('127.') || s === '::1');
        if (hasLoopbackOnly || process.env.DNS_SERVERS) {
            const customServers = process.env.DNS_SERVERS
                ? process.env.DNS_SERVERS.split(',').map((s) => s.trim())
                : ['8.8.8.8', '1.1.1.1', '8.8.4.4'];
            dns.setServers(customServers);
        }
    }
    catch (err) {
        console.warn('[Database] Custom DNS resolver initialization notice:', err.message);
    }
};
const getSanitizedHost = (uri) => {
    try {
        const match = uri.match(/@([^/?#]+)/);
        if (match)
            return match[1];
        return 'cluster-configured';
    }
    catch {
        return 'cluster-configured';
    }
};
export const connectDatabase = async () => {
    configureDns();
    mongoose.set('strictQuery', true);
    // Setup connection event listeners once
    if (mongoose.connection.listenerCount('error') === 0) {
        mongoose.connection.on('error', (err) => {
            console.error('[Database] MongoDB connection error:', err.message);
        });
        mongoose.connection.on('disconnected', () => {
            console.warn('[Database] MongoDB disconnected.');
        });
        mongoose.connection.on('reconnected', () => {
            console.log('[Database] MongoDB reconnected.');
        });
    }
    const connectOptions = {
        serverSelectionTimeoutMS: 5000,
    };
    try {
        await mongoose.connect(ENV.MONGODB_URI, connectOptions);
        console.log(`[Database] MongoDB connected successfully to ${getSanitizedHost(ENV.MONGODB_URI)}`);
        return true;
    }
    catch (error) {
        const msg = error.message;
        console.error(`[Database] MongoDB connection attempt failed: ${msg}`);
        // If querySrv ECONNREFUSED or DNS lookup failed, retry once with public DNS fallback
        if (msg.includes('querySrv') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
            try {
                console.warn('[Database] Retrying with public DNS fallback (8.8.8.8, 1.1.1.1)...');
                dns.setServers(['8.8.8.8', '1.1.1.1']);
                await mongoose.connect(ENV.MONGODB_URI, connectOptions);
                console.log(`[Database] MongoDB connected successfully via fallback DNS to ${getSanitizedHost(ENV.MONGODB_URI)}`);
                return true;
            }
            catch (retryErr) {
                console.error(`[Database] MongoDB fallback retry failed: ${retryErr.message}`);
            }
        }
        // Fail fast with clear actionable diagnostics
        throw new Error(`[Database] Unable to connect to MongoDB Atlas cluster.\n` +
            `Root cause: ${msg}\n` +
            `Checklist:\n` +
            `1. MongoDB Atlas Network Access: Whitelist current IP address or allow 0.0.0.0/0 (for cloud hosting like Render).\n` +
            `2. Database User: Ensure database user credentials in MONGODB_URI are valid and have readWrite access on the target database.\n` +
            `3. Cluster Hostname: Ensure Atlas cluster hostname is active and resolves via SRV record.`);
    }
};
export const disconnectDatabase = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        console.log('[Database] MongoDB connection closed.');
    }
};
export const isDatabaseConnected = () => {
    return mongoose.connection.readyState === 1;
};
