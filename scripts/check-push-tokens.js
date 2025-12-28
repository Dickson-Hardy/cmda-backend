/**
 * Script to check push tokens and admin notifications in the database
 * Run with: node scripts/check-push-tokens.js
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cmdassociationnigeria:hAI6Os9uW2QE2zU8@cluster0.5nfcr.mongodb.net/live?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // 1. Check push tokens
    console.log('=== PUSH TOKENS ===');
    const pushTokens = await db.collection('pushtokens').find({}).toArray();
    console.log(`Total push tokens: ${pushTokens.length}`);
    
    if (pushTokens.length > 0) {
      console.log('\nRegistered tokens:');
      for (const token of pushTokens) {
        const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(token.userId) });
        console.log(`- User: ${user?.fullName || token.userId}`);
        console.log(`  Platform: ${token.platform}`);
        console.log(`  Active: ${token.active}`);
        console.log(`  Device: ${token.deviceId}`);
        console.log(`  Token: ${token.token.substring(0, 30)}...`);
        console.log('');
      }
    } else {
      console.log('No push tokens registered yet.\n');
    }
    
    // 2. Check admin notifications
    console.log('=== ADMIN NOTIFICATIONS ===');
    const notifications = await db.collection('adminnotifications')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    console.log(`Total admin notifications: ${await db.collection('adminnotifications').countDocuments()}`);
    console.log(`Showing last 10:\n`);
    
    for (const notif of notifications) {
      console.log(`- Title: ${notif.title}`);
      console.log(`  Target: ${notif.targetAudience}`);
      console.log(`  Sent: ${notif.sentAt || 'Not sent'}`);
      console.log(`  Push Sent: ${notif.pushSent || false}`);
      console.log(`  Recipients: ${notif.recipientCount || 0}`);
      console.log(`  Created: ${notif.createdAt}`);
      console.log('');
    }
    
    // 3. Check users collection for any push-related fields
    console.log('=== USERS WITH PUSH DATA ===');
    const usersWithPushToken = await db.collection('users').find({
      $or: [
        { pushToken: { $exists: true, $ne: null } },
        { expoPushToken: { $exists: true, $ne: null } },
        { fcmToken: { $exists: true, $ne: null } },
        { deviceToken: { $exists: true, $ne: null } }
      ]
    }).toArray();
    console.log(`Users with push token fields: ${usersWithPushToken.length}`);
    
    if (usersWithPushToken.length > 0) {
      for (const user of usersWithPushToken.slice(0, 10)) {
        console.log(`- ${user.fullName} (${user.email})`);
        if (user.pushToken) console.log(`  pushToken: ${user.pushToken}`);
        if (user.expoPushToken) console.log(`  expoPushToken: ${user.expoPushToken}`);
        if (user.fcmToken) console.log(`  fcmToken: ${user.fcmToken}`);
        if (user.deviceToken) console.log(`  deviceToken: ${user.deviceToken}`);
      }
    }
    
    // 4. Check notification preferences
    console.log('\n=== NOTIFICATION PREFERENCES ===');
    const usersWithPrefs = await db.collection('users').find({
      notificationPreferences: { $exists: true }
    }).limit(5).toArray();
    
    console.log(`Users with notification preferences: ${usersWithPrefs.length > 0 ? 'Found' : 'None'}`);
    if (usersWithPrefs.length > 0) {
      console.log('Sample notification preferences:');
      for (const user of usersWithPrefs.slice(0, 3)) {
        console.log(`- ${user.fullName}:`);
        console.log(`  Events: ${user.notificationPreferences?.events || 'N/A'}`);
        console.log(`  Payments: ${user.notificationPreferences?.payments || 'N/A'}`);
        console.log(`  Announcements: ${user.notificationPreferences?.announcements || 'N/A'}`);
        console.log(`  Reminders: ${user.notificationPreferences?.reminders || 'N/A'}`);
      }
    }
    
    // 5. Check user schema fields
    console.log('\n=== USER SCHEMA SAMPLE ===');
    const sampleUser = await db.collection('users').findOne({});
    if (sampleUser) {
      console.log('Fields in user document:', Object.keys(sampleUser).join(', '));
    }
    
    // 6. Summary
    console.log('\n=== SUMMARY ===');
    const totalUsers = await db.collection('users').countDocuments();
    const usersWithNotifPrefs = await db.collection('users').countDocuments({ 
      notificationPreferences: { $exists: true } 
    });
    const iosPushTokens = await db.collection('pushtokens').countDocuments({ platform: 'ios', active: true });
    const androidPushTokens = await db.collection('pushtokens').countDocuments({ platform: 'android', active: true });
    console.log(`Total users: ${totalUsers}`);
    console.log(`Users with notification preferences: ${usersWithNotifPrefs}`);
    console.log(`Active iOS tokens: ${iosPushTokens}`);
    console.log(`Active Android tokens: ${androidPushTokens}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

main();
