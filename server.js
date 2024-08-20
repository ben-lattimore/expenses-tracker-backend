const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://your_username:your_password@cluster0.mongodb.net/expenses_app';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB database connection established successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
const expensesRouter = require('./routes/expenses');
const categoriesRouter = require('./routes/categories');

app.use('/api/expenses', expensesRouter);
app.use('/api/categories', categoriesRouter);

// Error handling for port in use
const server = app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Trying port ${PORT + 1}`);
        server.listen(PORT + 1);
    } else {
        console.error('Server error:', err);
    }
});