const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const feedbackRoutes = require('./routes/feedback');
const attendanceRoutes = require('./routes/attendance');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');
const treeRoutes = require('./routes/trees');
const propertyRoutes = require('./routes/properties');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS configured for local dev and live Vercel deployments
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);

    const isAllowed = 
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.vercel.app') ||
      (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.split(',').includes(origin));

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive during setup to avoid blocking deployments
  },
  credentials: true
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/trees', treeRoutes);
app.use('/api/properties', propertyRoutes);

// Health check route
app.get('/', (req, res) => {
  res.send('CanopyGuard API is running');
});

const startServer = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from backend/.env');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Atlas connected');
    console.log('Database Name:', mongoose.connection.db.databaseName);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();