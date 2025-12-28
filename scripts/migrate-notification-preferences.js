/**
 * Migration script to add default notification preferences to all existing users
 * Run with: node scripts/migrate-notification-preferences.js
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cmdassociationnigeria:hAI6Os9uW2QE2zU8@cluster0.5nfcr.mongodb.net/live?retryWrites=true&w=majority&appName=Cluster0';

// Default notification preferences - all enabled except marketing
const DEFAULT_NOTIFICATION_PREFERENCES = {
  pushNotifications: true,
  emailNotifications: true,
  events: true,
  payments: true,
  announcements: true,
  reminders: true,
  marketing: false,
};

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // 1. Check current state
    console.log('=== CURRENT STATE ===');
    const totalUsers = await db.collection('users').countDocuments();
    const usersWithPrefs = await db.collection('users').countDocuments({
      notificationPreferences: { $exists: true }
    });
    
    console.log(`Total users: ${totalUsers}`);
    console.log(`Users with notification preferences: ${usersWithPrefs}`);
    console.log(`Users needing migration: ${totalUsers - usersWithPrefs}\n`);
    
    if (totalUsers === usersWithPrefs) {
      console.log('✅ All users already have notification preferences. No migration needed.');
      return;
    }
    
    // 2. Perform migration
    console.log('=== STARTING MIGRATION ===');
    console.log('Adding default notification preferences to users...\n');
    
    const result = await db.collection('users').updateMany(
      { notificationPreferences: { $exists: false } },
      { 
        $set: { 
          notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
          updatedAt: new Date()
        } 
      }
    );
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`Updated ${result.modifiedCount} users\n`);
    
    // 3. Verify migration
    console.log('=== VERIFICATION ===');
    const usersAfterMigration = await db.collection('users').countDocuments({
      notificationPreferences: { $exists: true }
    });
    
    console.log(`Users with notification preferences after migration: ${usersAfterMigration}`);
    
    if (usersAfterMigration === totalUsers) {
      console.log('✅ Migration verification successful - all users now have notification preferences');
    } else {
      console.log('❌ Migration verification failed - some users still missing preferences');
    }
    
    // 4. Show sample of migrated users
    console.log('\n=== SAMPLE MIGRATED USERS ===');
    const sampleUsers = await db.collection('users')
      .find({ notificationPreferences: { $exists: true } })
      .limit(5)
      .toArray();
    
    for (const user of sampleUsers) {
      console.log(`- ${user.fullName} (${user.email})`);
      console.log(`  Push: ${user.notificationPreferences.pushNotifications}`);
      console.log(`  Email: ${user.notificationPreferences.emailNotifications}`);
      console.log(`  Events: ${user.notificationPreferences.events}`);
      console.log(`  Payments: ${user.notificationPreferences.payments}`);
      console.log(`  Announcements: ${user.notificationPreferences.announcements}`);
      console.log(`  Reminders: ${user.notificationPreferences.reminders}`);
      console.log(`  Marketing: ${user.notificationPreferences.marketing}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { main, DEFAULT_NOTIFICATION_PREFERENCES };