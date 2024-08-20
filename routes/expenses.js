const router = require('express').Router();
let Expense = require('../models/expense.model');

router.route('/').get((req, res) => {
    Expense.find()
        .then(expenses => res.json(expenses))
        .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/add').post((req, res) => {
    const { amount, description, category, date } = req.body;

    const newExpense = new Expense({
        amount,
        description,
        category,
        date,
    });

    newExpense.save()
        .then(() => res.json('Expense added!'))
        .catch(err => res.status(400).json('Error: ' + err));
});

// Add more routes for updating and deleting expenses as needed

module.exports = router;