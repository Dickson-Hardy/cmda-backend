const mongoose = require('mongoose');
require('dotenv').config();

async function diagnoseTransitions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get a sample of transitions
    const sampleTransitions = await mongoose.connection.db
      .collection('usertransitions')
      .find({ status: 'pending' })
      .limit(5)
      .toArray();

    console.log('=== DIAGNOSING TRANSITION ISSUES ===\n');

    for (const transition of sampleTransitions) {
      console.log(`Transition ID: ${transition._id}`);
      console.log(`User ID in transition: ${transition.user}`);
      console.log(`User ID type: ${typeof transition.user}`);
      
      // Try to find user with exact ID
      const userById = await mongoose.connection.db
        .collection('users')
        .findOne({ _id: transition.user });
      
      console.log(`User found by _id: ${userById ? 'YES' : 'NO'}`);
      
      if (userById) {
        console.log(`  Name: ${userById.fullName}`);
        console.log(`  Role: ${userById.role}`);
        console.log(`  Email: ${userById.email}`);
      } else {
        // Try converting to ObjectId using mongoose
        try {
          const objectId = mongoose.Types.ObjectId(transition.user);
          const userByObjectId = await mongoose.connection.db
            .collection('users')
            .findOne({ _id: objectId });
          
          console.log(`User found by ObjectId conversion: ${userByObjectId ? 'YES' : 'NO'}`);
          
          if (userByObjectId) {
            console.log(`  Name: ${userByObjectId.fullName}`);
            console.log(`  Role: ${userByObjectId.role}`);
          }
        } catch (err) {
          console.log(`  Error converting to ObjectId: ${err.message}`);
        }
        
        // Check if user exists at all
        const userCount = await mongoose.connection.db
          .collection('users')
          .countDocuments({});
        console.log(`  Total users in database: ${userCount}`);
      }
      
      console.log('');
    }

    // Check the structure of a user document
    const sampleUser = await mongoose.connection.db
      .collection('users')
      .findOne({});
    
    if (sampleUser) {
      console.log('=== SAMPLE USER DOCUMENT STRUCTURE ===');
      console.log(`_id type: ${typeof sampleUser._id}`);
      console.log(`_id value: ${sampleUser._id}`);
      console.log(`_id constructor: ${sampleUser._id.constructor.name}`);
      console.log('');
    }

    // Check if there are any completed transitions
    const completedCount = await mongoose.connection.db
      .collection('usertransitions')
      .countDocuments({ status: 'completed' });
    
    console.log(`Completed transitions: ${completedCount}`);
    console.log(`Pending transitions: ${sampleTransitions.length > 0 ? '156' : '0'}`);
    console.log('');

    // Check the admin endpoint availability
    console.log('=== ADMIN ENDPOINTS FOR TRANSITIONS ===');
    console.log('GET /users/transition/all - Get all transitions (Admin only)');
    console.log('POST /users/transition/:id/completed - Approve transition');
    console.log('POST /users/transition/:id/failed - Reject transition');
    console.log('');

    await mongoose.disconnect();
    console.log('✓ Diagnosis complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

diagnoseTransitions();
