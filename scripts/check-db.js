const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const count = await mongoose.connection.db.collection('servicesubscriptions').countDocuments();
    console.log(`\nTotal service subscriptions: ${count}`);

    const docs = await mongoose.connection.db.collection('servicesubscriptions').find({}).toArray();

    if (docs.length > 0) {
      console.log('\nAll services:');
      docs.forEach((d, i) => {
        console.log(`${i + 1}. ${d.serviceName} (${d.category})`);
        console.log(`   Provider: ${d.provider}`);
        console.log(`   Cost: ${d.currency} ${d.cost.toLocaleString()}`);
        console.log(`   Renewal: ${new Date(d.renewalDate).toLocaleDateString()}`);
        console.log(`   Status: ${d.status}`);
        console.log('');
      });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkDatabase();
