const mongoose = require('mongoose');
require('dotenv').config();

async function checkPaymentIntents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Check payment intents collection
    const intentCount = await mongoose.connection.db.collection('paymentintents').countDocuments();
    console.log(`Total payment intents: ${intentCount}\n`);

    if (intentCount > 0) {
      // Get recent payment intents
      const recentIntents = await mongoose.connection.db
        .collection('paymentintents')
        .find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      console.log('=== RECENT PAYMENT INTENTS (Last 10) ===\n');
      recentIntents.forEach((intent, i) => {
        console.log(`${i + 1}. Intent Code: ${intent.intentCode}`);
        console.log(`   Email: ${intent.email}`);
        console.log(`   Amount: ${intent.currency} ${intent.amount?.toLocaleString()}`);
        console.log(`   Provider: ${intent.provider}`);
        console.log(`   Status: ${intent.status}`);
        console.log(`   Context: ${intent.context}`);
        console.log(`   Reference: ${intent.providerReference || 'N/A'}`);
        console.log(`   Created: ${new Date(intent.createdAt).toLocaleString()}`);
        console.log('');
      });

      // Get status breakdown
      const statusBreakdown = await mongoose.connection.db
        .collection('paymentintents')
        .aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
        .toArray();

      console.log('=== STATUS BREAKDOWN ===');
      statusBreakdown.forEach(stat => {
        console.log(`${stat._id}: ${stat.count}`);
      });
      console.log('');

      // Get context breakdown
      const contextBreakdown = await mongoose.connection.db
        .collection('paymentintents')
        .aggregate([
          { $group: { _id: '$context', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
        .toArray();

      console.log('=== CONTEXT BREAKDOWN ===');
      contextBreakdown.forEach(ctx => {
        console.log(`${ctx._id}: ${ctx.count}`);
      });
      console.log('');

      // Check for pending intents
      const pendingIntents = await mongoose.connection.db
        .collection('paymentintents')
        .find({ status: 'PENDING' })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      if (pendingIntents.length > 0) {
        console.log('=== PENDING INTENTS (Last 5) ===\n');
        pendingIntents.forEach((intent, i) => {
          console.log(`${i + 1}. ${intent.intentCode} - ${intent.email}`);
          console.log(`   Amount: ${intent.currency} ${intent.amount?.toLocaleString()}`);
          console.log(`   Context: ${intent.context}`);
          console.log(`   Created: ${new Date(intent.createdAt).toLocaleString()}`);
          console.log('');
        });
      }
    } else {
      console.log('⚠ No payment intents found in database');
    }

    await mongoose.disconnect();
    console.log('\n✓ Database check complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkPaymentIntents();
