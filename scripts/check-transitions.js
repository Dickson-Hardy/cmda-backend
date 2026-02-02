const mongoose = require('mongoose');
require('dotenv').config();

async function checkTransitions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Check transitions collection
    const transitionCount = await mongoose.connection.db.collection('usertransitions').countDocuments();
    console.log(`Total transition requests: ${transitionCount}\n`);

    if (transitionCount > 0) {
      // Get all transitions (first 20)
      const transitions = await mongoose.connection.db
        .collection('usertransitions')
        .find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      console.log('=== RECENT TRANSITION REQUESTS (Last 20) ===\n');
      
      for (let i = 0; i < transitions.length; i++) {
        const transition = transitions[i];
        
        // Fetch user details separately
        let userDetails = null;
        try {
          userDetails = await mongoose.connection.db
            .collection('users')
            .findOne({ _id: transition.user });
        } catch (err) {
          console.log(`Error fetching user for transition ${transition._id}:`, err.message);
        }

        console.log(`${i + 1}. Transition ID: ${transition._id}`);
        if (userDetails) {
          console.log(`   User: ${userDetails.fullName} (${userDetails.membershipId})`);
          console.log(`   Current Role: ${userDetails.role}`);
          console.log(`   Email: ${userDetails.email}`);
        } else {
          console.log(`   User ID: ${transition.user}`);
          console.log(`   ⚠ User details not found`);
        }
        console.log(`   Status: ${transition.status}`);
        console.log(`   Region: ${transition.region}`);
        console.log(`   Specialty: ${transition.specialty}`);
        console.log(`   License Number: ${transition.licenseNumber}`);
        console.log(`   Requested: ${new Date(transition.createdAt).toLocaleString()}`);
        console.log('');
      }

      // Get status breakdown
      const statusBreakdown = await mongoose.connection.db
        .collection('usertransitions')
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

      // Check for pending transitions
      const pendingTransitions = await mongoose.connection.db
        .collection('usertransitions')
        .find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      if (pendingTransitions.length > 0) {
        console.log('=== PENDING TRANSITIONS (Need Admin Action) - First 10 ===\n');
        
        for (let i = 0; i < pendingTransitions.length; i++) {
          const transition = pendingTransitions[i];
          
          // Fetch user details separately
          const userDetails = await mongoose.connection.db
            .collection('users')
            .findOne({ _id: transition.user });

          console.log(`${i + 1}. Transition ID: ${transition._id}`);
          if (userDetails) {
            console.log(`   User: ${userDetails.fullName}`);
            console.log(`   Email: ${userDetails.email}`);
            console.log(`   Current Role: ${userDetails.role}`);
          } else {
            console.log(`   User ID: ${transition.user}`);
          }
          console.log(`   Requested Region: ${transition.region}`);
          console.log(`   Specialty: ${transition.specialty}`);
          console.log(`   License: ${transition.licenseNumber}`);
          console.log(`   Requested: ${new Date(transition.createdAt).toLocaleString()}`);
          console.log('');
        }
      } else {
        console.log('✓ No pending transitions\n');
      }

      // Check for failed transitions
      const failedTransitions = await mongoose.connection.db
        .collection('usertransitions')
        .find({ status: 'failed' })
        .toArray();

      if (failedTransitions.length > 0) {
        console.log('=== FAILED TRANSITIONS ===\n');
        failedTransitions.forEach((transition, i) => {
          console.log(`${i + 1}. User ID: ${transition.user}`);
          console.log(`   Status: ${transition.status}`);
          console.log(`   Region: ${transition.region}`);
          console.log(`   Created: ${new Date(transition.createdAt).toLocaleString()}`);
          console.log('');
        });
      }

    } else {
      console.log('⚠ No transition requests found in database');
    }

    await mongoose.disconnect();
    console.log('\n✓ Database check complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

checkTransitions();
