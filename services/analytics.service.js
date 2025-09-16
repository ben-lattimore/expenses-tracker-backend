const Expense = require('../models/expense.model');

class AnalyticsService {
    /**
     * Get daily spending totals for the last N days
     * @param {number} days - Number of days to look back (default: 7)
     * @returns {Promise<Array>} Array of {date, totalSpent, transactionCount}
     */
    static async getDailySpending(days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const pipeline = [
            {
                $match: {
                    date: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$date"
                        }
                    },
                    totalSpent: { $sum: "$amount" },
                    transactionCount: { $sum: 1 },
                    avgTransaction: { $avg: "$amount" }
                }
            },
            {
                $project: {
                    date: "$_id",
                    totalSpent: { $round: ["$totalSpent", 2] },
                    transactionCount: 1,
                    avgTransaction: { $round: ["$avgTransaction", 2] },
                    _id: 0
                }
            },
            {
                $sort: { date: 1 }
            }
        ];

        const results = await Expense.aggregate(pipeline);
        
        // Fill in missing days with zero spending
        const filledResults = this.fillMissingDays(results, days);
        return filledResults;
    }

    /**
     * Compare current month spending with previous month
     * @returns {Promise<Object>} Comparison data with current/previous month totals and change
     */
    static async getMonthlyComparison() {
        const now = new Date();
        
        // Current month start/end
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        // Previous month start/end
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const pipeline = [
            {
                $match: {
                    date: {
                        $gte: previousMonthStart,
                        $lte: currentMonthEnd
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        month: { $month: "$date" }
                    },
                    totalSpent: { $sum: "$amount" },
                    transactionCount: { $sum: 1 },
                    avgTransaction: { $avg: "$amount" },
                    categories: { $addToSet: "$category" }
                }
            },
            {
                $project: {
                    year: "$_id.year",
                    month: "$_id.month",
                    totalSpent: { $round: ["$totalSpent", 2] },
                    transactionCount: 1,
                    avgTransaction: { $round: ["$avgTransaction", 2] },
                    categoryCount: { $size: "$categories" },
                    _id: 0
                }
            },
            {
                $sort: { year: 1, month: 1 }
            }
        ];

        const results = await Expense.aggregate(pipeline);
        
        const currentMonth = results.find(r => 
            r.year === currentMonthStart.getFullYear() && 
            r.month === currentMonthStart.getMonth() + 1
        ) || { totalSpent: 0, transactionCount: 0, avgTransaction: 0, categoryCount: 0 };

        const previousMonth = results.find(r => 
            r.year === previousMonthStart.getFullYear() && 
            r.month === previousMonthStart.getMonth() + 1
        ) || { totalSpent: 0, transactionCount: 0, avgTransaction: 0, categoryCount: 0 };

        const spendingChange = previousMonth.totalSpent > 0 
            ? ((currentMonth.totalSpent - previousMonth.totalSpent) / previousMonth.totalSpent) * 100 
            : 0;

        const transactionChange = previousMonth.transactionCount > 0
            ? ((currentMonth.transactionCount - previousMonth.transactionCount) / previousMonth.transactionCount) * 100
            : 0;

        return {
            currentMonth: {
                ...currentMonth,
                monthName: currentMonthStart.toLocaleString('default', { month: 'long', year: 'numeric' })
            },
            previousMonth: {
                ...previousMonth,
                monthName: previousMonthStart.toLocaleString('default', { month: 'long', year: 'numeric' })
            },
            changes: {
                spending: Math.round(spendingChange * 100) / 100,
                transactions: Math.round(transactionChange * 100) / 100
            }
        };
    }

    /**
     * Get weekly spending trends (spending by day of week)
     * @param {number} weeks - Number of weeks to analyze (default: 4)
     * @returns {Promise<Array>} Array of spending by day of week
     */
    static async getWeeklyTrends(weeks = 4) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (weeks * 7));
        startDate.setHours(0, 0, 0, 0);

        const pipeline = [
            {
                $match: {
                    date: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$date" }, // 1=Sunday, 2=Monday, etc.
                    totalSpent: { $sum: "$amount" },
                    transactionCount: { $sum: 1 },
                    avgTransaction: { $avg: "$amount" }
                }
            },
            {
                $project: {
                    dayOfWeek: "$_id",
                    dayName: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$_id", 1] }, then: "Sunday" },
                                { case: { $eq: ["$_id", 2] }, then: "Monday" },
                                { case: { $eq: ["$_id", 3] }, then: "Tuesday" },
                                { case: { $eq: ["$_id", 4] }, then: "Wednesday" },
                                { case: { $eq: ["$_id", 5] }, then: "Thursday" },
                                { case: { $eq: ["$_id", 6] }, then: "Friday" },
                                { case: { $eq: ["$_id", 7] }, then: "Saturday" }
                            ]
                        }
                    },
                    totalSpent: { $round: ["$totalSpent", 2] },
                    transactionCount: 1,
                    avgTransaction: { $round: ["$avgTransaction", 2] },
                    _id: 0
                }
            },
            {
                $sort: { dayOfWeek: 1 }
            }
        ];

        const results = await Expense.aggregate(pipeline);
        
        // Ensure all days of the week are represented
        const daysOfWeek = [
            { dayOfWeek: 1, dayName: "Sunday" },
            { dayOfWeek: 2, dayName: "Monday" },
            { dayOfWeek: 3, dayName: "Tuesday" },
            { dayOfWeek: 4, dayName: "Wednesday" },
            { dayOfWeek: 5, dayName: "Thursday" },
            { dayOfWeek: 6, dayName: "Friday" },
            { dayOfWeek: 7, dayName: "Saturday" }
        ];

        return daysOfWeek.map(day => {
            const found = results.find(r => r.dayOfWeek === day.dayOfWeek);
            return found || {
                ...day,
                totalSpent: 0,
                transactionCount: 0,
                avgTransaction: 0
            };
        });
    }

    /**
     * Get spending trends over time (monthly totals for last N months)
     * @param {number} months - Number of months to analyze (default: 6)
     * @returns {Promise<Array>} Array of monthly spending totals
     */
    static async getSpendingTrends(months = 6) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        const pipeline = [
            {
                $match: {
                    date: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$date" },
                        month: { $month: "$date" }
                    },
                    totalSpent: { $sum: "$amount" },
                    transactionCount: { $sum: 1 },
                    avgTransaction: { $avg: "$amount" }
                }
            },
            {
                $project: {
                    year: "$_id.year",
                    month: "$_id.month",
                    monthYear: {
                        $dateFromParts: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: 1
                        }
                    },
                    totalSpent: { $round: ["$totalSpent", 2] },
                    transactionCount: 1,
                    avgTransaction: { $round: ["$avgTransaction", 2] },
                    _id: 0
                }
            },
            {
                $sort: { year: 1, month: 1 }
            }
        ];

        const results = await Expense.aggregate(pipeline);
        
        // Add month names for frontend display
        return results.map(result => ({
            ...result,
            monthName: new Date(result.year, result.month - 1).toLocaleString('default', { 
                month: 'long', 
                year: 'numeric' 
            })
        }));
    }

    /**
     * Helper function to fill in missing days with zero spending
     * @param {Array} results - Results from aggregation
     * @param {number} days - Number of days to fill
     * @returns {Array} Complete array with all days
     */
    static fillMissingDays(results, days) {
        const filledResults = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            
            const found = results.find(r => r.date === dateString);
            filledResults.push(found || {
                date: dateString,
                totalSpent: 0,
                transactionCount: 0,
                avgTransaction: 0
            });
        }
        
        return filledResults;
    }
}

module.exports = AnalyticsService;