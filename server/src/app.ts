import express from 'express';
import cors from 'cors';
import path from 'path';
import { errorHandler } from './middleware/error';

// Import Routers
import authRoutes from './routes/authRoutes';
import caseRoutes from './routes/caseRoutes';
import repairerRoutes from './routes/repairerRoutes';
import requestRoutes from './routes/requestRoutes';
import reviewRoutes from './routes/reviewRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';
import diagnosticRoutes from './routes/diagnosticRoutes';
import inspectionRoutes from './routes/inspectionRoutes';
import recoveryRoutes from './routes/recoveryRoutes';
import partnerRoutes from './routes/partnerRoutes';
import visionRoutes from './routes/visionRoutes';

const app = express();

// Enable CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5188',
    credentials: true,
  })
);

// Express body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/repair-cases', caseRoutes);
app.use('/api/repairers', repairerRoutes);
app.use('/api/repairers', reviewRoutes);
app.use('/api/repair-requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/inspection', inspectionRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/vision', visionRoutes);

// Simple Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'Healthy', version: '1.0.0' });
});

// Global Error Handler
app.use(errorHandler);

export default app;
