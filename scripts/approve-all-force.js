const mongoose = require('mongoose');
require('dotenv').config();

/**
 * FORCE APPROVE ALL TRANSITIONS
 * 
 * This will approve ALL pending transitions, even those with incomplete data.
 * Incomplete fields (Awaiting, N/A) will be preserved in user profiles.
 * 
 * Use this when:
 * - Users are waiting for license numbers
 * - Users haven't decided on specialty yet
 * - You want to transition them now and let them update later
 */

async function forceApproveAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    const transitions = await mongoose.connection.db
      .collection('usertransitions')
      .find({ status: 'pending' })
      .toArray();

    console.log(`Found ${transitions.length} pending transitions\n`);

    if (transitions.length === 0) {
      console.log('No pending transitions to process');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('⚠️  FORCE APPROVAL MODE');
    console.log('⚠️  This will approve ALL transitions, including incomplete ones.');
    console.log('⚠️  Users can update their license/specialty later in their profile.');
    console.log(`\n📊 About to approve ${transitions.length} transitions`);
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    let approved = 0;
    let failed = 0;
    const errors = [];
    const summary = {
      studentToDoctor: 0,
      doctorToGlobal: 0,
      withIncompleteData: 0,
    };

    console.log('Starting bulk approval...\n');

    for (const transition of transitions) {
      try {
        const user = await mongoose.connection.db
          .collection('users')
          .findOne({ _id: transition.user });

        if (!user) {
          console.log(`❌ User not found for transition ${transition._id}`);
          failed++;
          errors.push({ transitionId: transition._id, error: 'User not found' });
          continue;
        }

        // Determine new role
        const oldRole = user.role;
        const newRole = oldRole === 'Student' ? 'Doctor' : 'GlobalNetwork';

        // Track statistics
        if (oldRole === 'Student') summary.studentToDoctor++;
        else summary.doctorToGlobal++;

        // Check if data is incomplete
        const hasIncompleteData = 
          !transition.licenseNumber || 
          transition.licenseNumber.toLowerCase().includes('awaiting') ||
          !transition.specialty ||
          transition.specialty.toLowerCase().includes('awaiting');

        if (hasIncompleteData) summary.withIncompleteData++;

        // Update user profile
        const updateData = {
          role: newRole,
          region: transition.region,
          specialty: transition.specialty || 'Awaiting',
          licenseNumber: transition.licenseNumber || 'Awaiting',
        };

        // Clear student fields if transitioning from Student
        if (oldRole === 'Student') {
          updateData.admissionYear = null;
          updateData.yearOfStudy = null;
        }

        await mongoose.connection.db
          .collection('users')
          .updateOne({ _id: user._id }, { $set: updateData });

        // Delete transition record
        await mongoose.connection.db
          .collection('usertransitions')
          .deleteOne({ _id: transition._id });

        approved++;
        const status = hasIncompleteData ? '⚠️ ' : '✅';
        console.log(`${status} ${approved}/${transitions.length} - ${user.fullName} (${oldRole} → ${newRole})`);

      } catch (err) {
        console.error(`❌ Error processing transition ${transition._id}:`, err.message);
        failed++;
        errors.push({ transitionId: transition._id, error: err.message });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('BULK APPROVAL COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📊 STATISTICS:`);
    console.log(`   Total processed: ${transitions.length}`);
    console.log(`   ✅ Successfully approved: ${approved}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`\n👥 ROLE CHANGES:`);
    console.log(`   Student → Doctor: ${summary.studentToDoctor}`);
    console.log(`   Doctor → GlobalNetwork: ${summary.doctorToGlobal}`);
    console.log(`\n⚠️  DATA QUALITY:`);
    console.log(`   Transitions with incomplete data: ${summary.withIncompleteData}`);
    console.log(`   (These users should update their license/specialty in their profile)`);

    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach((err, i) => {
        console.log(`   ${i + 1}. Transition ${err.transitionId}: ${err.error}`);
      });
    }

    console.log('\n✅ All transitions have been processed!');
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Run: node scripts/check-transitions.js (should show 0 pending)');
    console.log('   2. Verify user profiles have been updated');
    console.log('   3. Notify users to update their license/specialty if incomplete');
    console.log('   4. Users can update their profile in the mobile app or web dashboard');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

forceApproveAll();
