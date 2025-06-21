require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

mongoose.set('strictQuery', false);
const app = express();

// 0) COOP/COEP for FedCM
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// 1) CORS for your API
app.use(cors({
  origin: 'https://edurack.onrender.com',
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json());

// 2) Serve static files *with* CORP so they’re not blocked
app.use(express.static(path.join(__dirname,'public'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
  }
}));

// ──────────────────────────────────────────────────────────────────────────────
// 3. Root HTML route
// ──────────────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. MongoDB Connection
// ──────────────────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ──────────────────────────────────────────────────────────────────────────────
// 5. Routes
// ──────────────────────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth');
const contactRoutes   = require('./routes/contacts');
const userRoutes      = require('./routes/users');
const questionRoutes  = require('./routes/questions');
const paymentRoutes   = require('./routes/payment');
const couponRoutes    = require('./routes/coupons');
const ticketsRoutes   = require('./routes/tickets');

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/tickets', ticketsRoutes);

// ──────────────────────────────────────────────────────────────────────────────
// 6. Handle 404 for unknown routes
// ──────────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ──────────────────────────────────────────────────────────────────────────────
// 7. Server Listener
// ──────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
