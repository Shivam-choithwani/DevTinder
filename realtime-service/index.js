import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
    res.send({ status: 'Realtime service is active' });
});

const server = http.createServer(app);

// Initialize Socket.io with CORS enabled
const io = new Server(server, {
    cors: {
        origin: '*', // Allows React app to connect
        methods: ['GET', 'POST']
    }
});

// Map to store online users: Map of [userId -> socket.id]
const onlineUsers = new Map();

// Listen for incoming socket connections
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // 1. User joins presence (logs in)
    socket.on('join_presence', (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId; // Save userId inside this specific socket session
        console.log(`👤 User ${userId} is now ONLINE`);

        // Broadcast to all other clients that this user is online
        io.emit('user_status_changed', { userId, status: 'online' });
    });

    // 2. Fetch online status for a list of userIds (e.g. your matches)
    socket.on('check_online_status', (userIds, callback) => {
        const statuses = {};
        userIds.forEach(id => {
            statuses[id] = onlineUsers.has(id) ? 'online' : 'offline';
        });
        // Return result back to the frontend request
        callback(statuses);
    });

    // 3. User disconnects (logs out / closes tab)
    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
        
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
            console.log(`👤 User ${socket.userId} is now OFFLINE`);

            // Broadcast to all other clients that this user went offline
            io.emit('user_status_changed', { userId: socket.userId, status: 'offline' });
        }
    });
});

const PORT = 8082;
server.listen(PORT, () => {
    console.log(`🚀 Realtime server running on port ${PORT}`);
});