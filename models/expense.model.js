const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const expenseSchema = new Schema({
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: Date, required: true },
}, {
    timestamps: true,
});

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;