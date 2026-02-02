const mongoose = require('mongoose');
require('dotenv').config();

async function fixTransitionUserIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get all transitions
    const transitions = await mongoose.connection.db
      .collection('usertransitions')
      .find({})
      .toArray();

    console.log(`Found ${transitions.length} transitions to check\n`);

    let fixed = 0;
    let alreadyCorrect = 0;
    let userNotFound = 0;
    let errors = 0;

    for (const transition of transitions) {
      try {
        // Check if user field is a string
        if (typeof transition.user === 'string') {
          // Try to convert to ObjectId
          const userId = new mongoose.Types.ObjectId(transition.user);
          
          // Check if user exists
          const userExists = await mongoose.connection.db
            .collection('users')
            .findOne({ _id: userId });

          if (userExists) {
            // Update the transition with ObjectId
            await mongoose.connection.db
              .collection('usertransitions')
              .updateOne(
                { _id: transition._id },
                { $set: { user: userId } }
              );
            
            fixed++;
            if (fixed % 10 === 0) {
              console.log(`Fixed ${fixed} transitions...`);
            }
          } else {
            console.log(`⚠ User not found for transition ${transition._id} (User ID: ${transition.user})`);
            userNotFound++;
          }
        } else {
          alreadyCorrect++;
        }
      } catch (err) {
        console.error(`❌ Error processing transition ${transition._id}:`, err.message);
        errors++;
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total transitions: ${transitions.length}`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Already correct: ${alreadyCorrect}`);
    console.log(`User not found: ${userNotFound}`);
    console.log(`Errors: ${errors}`);

    await mongoose.disconnect();
    console.log('\n✓ Fix complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

fixTransitionUserIds();
