/**
 * Script to fix service subscriptions that are missing the isActive field
 * 
 * Usage:
 * 1. Make sure MongoDB is connected
 * 2. Update the MONGODB_URI in your .env file
 * 3. Run: node scripts/fix-service-subscriptions.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixServiceSubscriptions() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cmda';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Get the collection directly
    const collection = mongoose.connection.collection('servicesubscriptions');

    // Count documents without isActive field
    const missingIsActive = await collection.countDocuments({ isActive: { $exists: false } });
    console.log(`\nFound ${missingIsActive} documents without isActive field`);

    if (missingIsActive > 0) {
      // Update all documents that don't have isActive to set it to true
      const result = await collection.updateMany(
        { isActive: { $exists: false } },
        { $set: { isActive: true } }
      );
      console.log(`✓ Updated ${result.modifiedCount} documents to have isActive: true`);
    }

    // Also update any documents where isActive is false but shouldn't be
    const inactiveCount = await collection.countDocuments({ isActive: false });
    console.log(`\nFound ${inactiveCount} documents with isActive: false`);

    // Show all documents
    const allDocs = await collection.find({}).toArray();
    console.log(`\nTotal service subscriptions: ${allDocs.length}`);
    
    if (allDocs.length > 0) {
      console.log('\nService subscriptions:');
      allDocs.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.serviceName} (isActive: ${doc.isActive}, status: ${doc.status})`);
      });
    }

    console.log('\n✓ Fix completed!');
  } catch (error) {
    console.error('\n✗ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ MongoDB connection closed');
    process.exit(0);
  }
}

fixServiceSubscriptions();
