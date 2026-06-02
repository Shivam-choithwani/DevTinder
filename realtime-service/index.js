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

// Listen for incoming socket connections
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Listen for client disconnects
    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

const PORT = 8082;
server.listen(PORT, () => {
    console.log(`🚀 Realtime server running on port ${PORT}`);
});