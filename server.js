require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database'); // Initialize DB

const authRoutes = require('./routes/auth');
const subjectRoutes = require('./routes/subject');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);

// Fallback route for SPA if needed (but we use separate html files here)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
