const mongoose = require('mongoose');
require('dotenv').config();

/**
 * BULK APPROVE ALL PENDING TRANSITIONS
 * 
 * This script will:
 * 1. Fetch all pending transitions
 * 2. For each transition:
 *    - Update user role (Student → Doctor or Doctor → GlobalNetwork)
 *    - Update region, specialty, license
 *    - Clear student fields (admissionYear, yearOfStudy)
 *    - Delete transition record
 *    - Send success email (optional - can be disabled for bulk)
 * 
 * WARNING: This will approve ALL pending transitions without validation!
 * Use with caution in production.
 */

async function approveAllTransitions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get all pending transitions
    const transitions = await mongoose.connection.db
      .collection('usertransitions')
      .find({ status: 'pending' })
      .toArray();

    console.log(`Found ${transitions.length} pending transitions to approve\n`);

    if (transitions.length === 0) {
      console.log('No pending transitions to process');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Ask for confirmation
    console.log('⚠️  WARNING: This will approve ALL pending transitions!');
    console.log('⚠️  User roles will be updated and transition records will be deleted.');
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    let approved = 0;
    let failed = 0;
    let errors = [];

    console.log('Starting bulk approval...\n');

    for (const transition of transitions) {
      try {
        // Get user details
        const user = await mongoose.connection.db
          .collection('users')
          .findOne({ _id: transition.user });

        if (!user) {
          console.log(`❌ User not found for transition ${transition._id}`);
          failed++;
          errors.push({
            transitionId: transition._id,
            error: 'User not found',
          });
          continue;
        }

        // Determine new role
        const newRole = user.role === 'Student' ? 'Doctor' : 'GlobalNetwork';

        // Update user profile
        const updateData = {
          role: newRole,
          region: transition.region,
          specialty: transition.specialty,
          licenseNumber: transition.licenseNumber,
        };

        // Clear student fields if transitioning from Student
        if (user.role === 'Student') {
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
        console.log(`✅ ${approved}/${transitions.length} - ${user.fullName} (${user.role} → ${newRole})`);

        // Optional: Send email notification
        // Note: Disabled for bulk operations to avoid email rate limits
        // You can enable this if needed, but be aware of Gmail SMTP limits
        /*
        try {
          // Email sending code would go here
          // await sendTransitionSuccessEmail(user, transition, newRole);
        } catch (emailError) {
          console.log(`   ⚠️  Email failed: ${emailError.message}`);
        }
        */

      } catch (err) {
        console.error(`❌ Error processing transition ${transition._id}:`, err.message);
        failed++;
        errors.push({
          transitionId: transition._id,
          userId: transition.user,
          error: err.message,
        });
      }
    }

    console.log('\n=== BULK APPROVAL SUMMARY ===');
    console.log(`Total transitions: ${transitions.length}`);
    console.log(`✅ Successfully approved: ${approved}`);
    console.log(`❌ Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach((err, i) => {
        console.log(`${i + 1}. Transition ID: ${err.transitionId}`);
        console.log(`   Error: ${err.error}`);
        if (err.userId) console.log(`   User ID: ${err.userId}`);
        console.log('');
      });
    }

    console.log('\n✅ Bulk approval complete!');
    console.log('\nNext steps:');
    console.log('1. Verify user profiles have been updated');
    console.log('2. Check that transition records have been deleted');
    console.log('3. Optionally send notification emails to users');
    console.log('4. Run: node scripts/check-transitions.js to verify');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

approveAllTransitions();
