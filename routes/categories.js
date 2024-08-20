const router = require('express').Router();
let Expense = require('../models/expense.model');

router.route('/').get((req, res) => {
    Expense.distinct('category')
        .then(categories => res.json(categories))
        .catch(err => res.status(400).json('Error: ' + err));
});

module.exports = router;