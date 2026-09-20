// ⚠️ dotenv MUST be first — before any require() that reads process.env
const dotenv = require('dotenv');
dotenv.config(); // Reloaded with active Razorpay credentials

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const feedbackRoutes = require('./routes/feedback');
const attendanceRoutes = require('./routes/attendance');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');
const treeRoutes = require('./routes/trees');
const propertyRoutes = require('./routes/properties');
const adoptionRoutes = require('./routes/adoptions');
const rewardRoutes = require('./routes/rewards');
const goalRoutes = require('./routes/goals');
const chatRoutes = require('./routes/chat');
const subscriptionRoutes = require('./routes/subscriptions');
const wasteIntakeRoutes = require('./routes/wasteIntakes');
const compostBatchRoutes = require('./routes/compostBatches');
const ecoProductRoutes = require('./routes/ecoProducts');
const ecoOrderRoutes = require('./routes/ecoOrders');
const timberAuctionRoutes = require('./routes/timberAuctions');

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
      origin.includes('vercel.app') ||
      origin.includes('onrender.com');

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

// Serve uploaded images (auto-routing legacy /uploads/ requests to Cloudinary if mapped)
app.use('/uploads', (req, res, next) => {
  const mapPath = path.join(__dirname, 'uploads_map.json');
  if (fs.existsSync(mapPath)) {
    try {
      const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      const filename = req.path.replace(/^\//, '');
      if (map[filename]) {
        return res.redirect(302, map[filename]);
      }
    } catch (_) {}
  }
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/trees', treeRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/adoptions', adoptionRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/waste-intakes', wasteIntakeRoutes);
app.use('/api/compost-batches', compostBatchRoutes);
app.use('/api/eco-products', ecoProductRoutes);
app.use('/api/eco-orders', ecoOrderRoutes);
app.use('/api/timber-auctions', timberAuctionRoutes);

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