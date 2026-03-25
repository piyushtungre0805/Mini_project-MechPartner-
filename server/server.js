const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const mechanicRoutes = require('./routes/mechanic');
const serviceRoutes = require('./routes/service');
const chatRoutes = require('./routes/chat');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', mechanicRoutes);
app.use('/api', serviceRoutes);
app.use('/api', chatRoutes);

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Connect to DB and start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    const server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });

    // Graceful Shutdown
    const shutdown = async (signal) => {
        console.log(`\n${signal} received. Shutting down gracefully...`);
        server.close(async () => {
            console.log('HTTP server closed.');
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed.');
                process.exit(0);
            } catch (err) {
                console.error('Error during DB closing:', err);
                process.exit(1);
            }
        });

        // Force close if it takes too long
        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 5000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

}).catch(err => {
    console.error('Failed to connect to database:', err);
});
