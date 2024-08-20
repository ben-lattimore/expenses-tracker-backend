// clearDatabase.js
const mongoose = require('mongoose');
const Expense = require('./models/expense.model');
const readline = require('readline');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://your_username:your_password@cluster0.mongodb.net/expenses_app';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB database connection established successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askForConfirmation() {
    return new Promise((resolve) => {
        rl.question('Are you sure you want to delete all expenses? This action cannot be undone. (yes/no): ', (answer) => {
            resolve(answer.toLowerCase() === 'yes');
        });
    });
}

async function clearExpenses() {
    try {
        const confirmed = await askForConfirmation();
        if (confirmed) {
            await Expense.deleteMany({});
            console.log('All expenses have been deleted from the database.');
        } else {
            console.log('Operation cancelled. No expenses were deleted.');
        }
    } catch (error) {
        console.error('Error clearing expenses:', error);
    } finally {
        rl.close();
        mongoose.connection.close();
    }
}

clearExpenses();