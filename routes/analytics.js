const router = require('express').Router();
const AnalyticsService = require('../services/analytics.service');

/**
 * GET /api/analytics/daily-spending?days=7
 * Get daily spending totals for the specified number of days
 */
router.route('/daily-spending').get(async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        
        // Validate days parameter
        if (days < 1 || days > 365) {
            return res.status(400).json({ 
                error: 'Days parameter must be between 1 and 365' 
            });
        }
        
        const dailySpending = await AnalyticsService.getDailySpending(days);
        
        res.json({
            success: true,
            data: dailySpending,
            meta: {
                days: days,
                totalDays: dailySpending.length,
                totalSpending: dailySpending.reduce((sum, day) => sum + day.totalSpent, 0),
                totalTransactions: dailySpending.reduce((sum, day) => sum + day.transactionCount, 0)
            }
        });
    } catch (error) {
        console.error('Daily spending analytics error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch daily spending data',
            details: error.message 
        });
    }
});

/**
 * GET /api/analytics/monthly-comparison
 * Compare current month spending with previous month
 */
router.route('/monthly-comparison').get(async (req, res) => {
    try {
        const comparison = await AnalyticsService.getMonthlyComparison();
        
        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('Monthly comparison analytics error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch monthly comparison data',
            details: error.message 
        });
    }
});

/**
 * GET /api/analytics/weekly-trends?weeks=4
 * Get spending patterns by day of week
 */
router.route('/weekly-trends').get(async (req, res) => {
    try {
        const weeks = parseInt(req.query.weeks) || 4;
        
        // Validate weeks parameter
        if (weeks < 1 || weeks > 52) {
            return res.status(400).json({ 
                error: 'Weeks parameter must be between 1 and 52' 
            });
        }
        
        const weeklyTrends = await AnalyticsService.getWeeklyTrends(weeks);
        
        // Calculate additional insights
        const totalWeeklySpending = weeklyTrends.reduce((sum, day) => sum + day.totalSpent, 0);
        const avgDailySpending = totalWeeklySpending / 7;
        const highestSpendingDay = weeklyTrends.reduce((highest, day) => 
            day.totalSpent > highest.totalSpent ? day : highest
        );
        const lowestSpendingDay = weeklyTrends.reduce((lowest, day) => 
            day.totalSpent < lowest.totalSpent ? day : lowest
        );
        
        res.json({
            success: true,
            data: weeklyTrends,
            meta: {
                weeks: weeks,
                totalSpending: totalWeeklySpending,
                avgDailySpending: Math.round(avgDailySpending * 100) / 100,
                highestSpendingDay: highestSpendingDay.dayName,
                lowestSpendingDay: lowestSpendingDay.dayName,
                weekendVsWeekday: {
                    weekend: weeklyTrends
                        .filter(day => day.dayOfWeek === 1 || day.dayOfWeek === 7)
                        .reduce((sum, day) => sum + day.totalSpent, 0),
                    weekday: weeklyTrends
                        .filter(day => day.dayOfWeek >= 2 && day.dayOfWeek <= 6)
                        .reduce((sum, day) => sum + day.totalSpent, 0)
                }
            }
        });
    } catch (error) {
        console.error('Weekly trends analytics error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch weekly trends data',
            details: error.message 
        });
    }
});

/**
 * GET /api/analytics/spending-trends?months=6
 * Get monthly spending trends over time
 */
router.route('/spending-trends').get(async (req, res) => {
    try {
        const months = parseInt(req.query.months) || 6;
        
        // Validate months parameter
        if (months < 1 || months > 24) {
            return res.status(400).json({ 
                error: 'Months parameter must be between 1 and 24' 
            });
        }
        
        const trends = await AnalyticsService.getSpendingTrends(months);
        
        // Calculate trend direction
        let trendDirection = 'stable';
        if (trends.length >= 2) {
            const recent = trends.slice(-3).reduce((sum, month) => sum + month.totalSpent, 0) / Math.min(3, trends.length);
            const older = trends.slice(0, -3).reduce((sum, month) => sum + month.totalSpent, 0) / Math.max(1, trends.length - 3);
            
            const changePercent = older > 0 ? ((recent - older) / older) * 100 : 0;
            if (changePercent > 5) trendDirection = 'increasing';
            else if (changePercent < -5) trendDirection = 'decreasing';
        }
        
        res.json({
            success: true,
            data: trends,
            meta: {
                months: months,
                totalMonths: trends.length,
                totalSpending: trends.reduce((sum, month) => sum + month.totalSpent, 0),
                avgMonthlySpending: trends.length > 0 
                    ? Math.round((trends.reduce((sum, month) => sum + month.totalSpent, 0) / trends.length) * 100) / 100 
                    : 0,
                trendDirection: trendDirection,
                highestMonth: trends.reduce((highest, month) => 
                    month.totalSpent > highest.totalSpent ? month : highest, 
                    { totalSpent: 0, monthName: 'None' }
                ),
                lowestMonth: trends.reduce((lowest, month) => 
                    month.totalSpent < lowest.totalSpent ? month : lowest,
                    { totalSpent: Infinity, monthName: 'None' }
                )
            }
        });
    } catch (error) {
        console.error('Spending trends analytics error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch spending trends data',
            details: error.message 
        });
    }
});

/**
 * GET /api/analytics/summary
 * Get a summary of key analytics metrics
 */
router.route('/summary').get(async (req, res) => {
    try {
        // Fetch multiple analytics in parallel
        const [dailySpending, monthlyComparison, weeklyTrends] = await Promise.all([
            AnalyticsService.getDailySpending(7),
            AnalyticsService.getMonthlyComparison(),
            AnalyticsService.getWeeklyTrends(4)
        ]);
        
        // Calculate summary metrics
        const last7DaysTotal = dailySpending.reduce((sum, day) => sum + day.totalSpent, 0);
        const dailyAverage = last7DaysTotal / 7;
        const weekendSpending = weeklyTrends
            .filter(day => day.dayOfWeek === 1 || day.dayOfWeek === 7)
            .reduce((sum, day) => sum + day.totalSpent, 0);
        const weekdaySpending = weeklyTrends
            .filter(day => day.dayOfWeek >= 2 && day.dayOfWeek <= 6)
            .reduce((sum, day) => sum + day.totalSpent, 0);
        
        const summary = {
            last7Days: {
                totalSpent: Math.round(last7DaysTotal * 100) / 100,
                dailyAverage: Math.round(dailyAverage * 100) / 100,
                transactionCount: dailySpending.reduce((sum, day) => sum + day.transactionCount, 0)
            },
            monthlyComparison: {
                currentMonth: monthlyComparison.currentMonth.totalSpent,
                previousMonth: monthlyComparison.previousMonth.totalSpent,
                changePercent: monthlyComparison.changes.spending
            },
            spendingPatterns: {
                weekendSpending: Math.round(weekendSpending * 100) / 100,
                weekdaySpending: Math.round(weekdaySpending * 100) / 100,
                weekendVsWeekdayRatio: weekdaySpending > 0 
                    ? Math.round((weekendSpending / weekdaySpending) * 100) / 100 
                    : 0
            }
        };
        
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Analytics summary error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch analytics summary',
            details: error.message 
        });
    }
});

module.exports = router;