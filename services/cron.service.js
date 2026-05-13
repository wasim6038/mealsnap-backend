const cron = require('node-cron');
const User = require('../models/user.model');
const { Notification } = require('../models/secondary.models');
const { sendEmail, emailTemplates } = require('./email.service');
const { getDailyAnalytics } = require('./analytics.service');

const scheduleCronJobs = () => {
  console.log('⏰ Scheduling cron jobs...');

  // ─── Daily water reminder at 10am ─────────────────────────────────────
  cron.schedule('0 10 * * *', async () => {
    try {
      const users = await User.find({
        'notifications.waterReminders': true,
        isBlocked: false,
      }).select('_id name');

      const notifications = users.map((u) => ({
        user: u._id,
        title: 'Stay hydrated! 💧',
        message: "Don't forget to drink water today. Stay on track with your daily water goal!",
        type: 'water_reminder',
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        console.log(`💧 Water reminders sent to ${notifications.length} users`);
      }
    } catch (err) {
      console.error('Water reminder cron error:', err.message);
    }
  });

  // ─── Meal reminder at 12pm (lunch) ───────────────────────────────────
  cron.schedule('0 12 * * *', async () => {
    try {
      const users = await User.find({
        'notifications.mealReminders': true,
        isBlocked: false,
      }).select('_id name');

      const notifications = users.map((u) => ({
        user: u._id,
        title: 'Time for lunch! 🍽',
        message: 'Log your lunch to stay on track with your nutrition goals.',
        type: 'meal_reminder',
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (err) {
      console.error('Meal reminder cron error:', err.message);
    }
  });

  // ─── Weekly report every Monday at 8am ───────────────────────────────
  cron.schedule('0 8 * * 1', async () => {
    try {
      const users = await User.find({
        'notifications.weeklyReport': true,
        isBlocked: false,
      }).select('_id name email');

      for (const user of users) {
        try {
          const stats = await getDailyAnalytics(user._id, 7);
          const template = emailTemplates.weeklyReport(user.name, {
            avgCalories: stats.avgCalories || 0,
            mealsLogged: stats.totalMeals || 0,
            streak: user.currentStreak || 0,
            weightChange: stats.weightChange || 0,
          });
          await sendEmail({ to: user.email, ...template });
        } catch { /* skip individual failures */ }
      }
      console.log(`📊 Weekly reports sent to ${users.length} users`);
    } catch (err) {
      console.error('Weekly report cron error:', err.message);
    }
  });

  // ─── Streak check at midnight ─────────────────────────────────────────
  cron.schedule('0 0 * * *', async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Reset streak for users who didn't log yesterday
      await User.updateMany(
        {
          lastLoggedDate: { $lt: yesterday },
          currentStreak: { $gt: 0 },
        },
        { $set: { currentStreak: 0 } }
      );
      console.log('🔥 Streak check completed');
    } catch (err) {
      console.error('Streak cron error:', err.message);
    }
  });

  console.log('✅ Cron jobs scheduled');
};

module.exports = { scheduleCronJobs };