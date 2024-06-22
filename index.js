import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import userRouter from './routes/VideosRoute.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Static files (uploads and trim directories)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/trim', express.static(path.join(__dirname, 'public', 'trim')));

// Routes
app.use('/api', userRouter);

// Database connection and server start
const PORT = process.env.PORT || 4000;
const MONGODB_URI = "mongodb+srv://ibrahimsidtechno:ibrahim123@cluster0.e5wtkps.mongodb.net/your-database-name";

const connectWithRetry = () => {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log(`Database connected successfully. App running on port ${PORT}`);
    })
    .catch((err) => {
      console.error("Database connection unsuccessful, retrying in 5 seconds:", err);
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
