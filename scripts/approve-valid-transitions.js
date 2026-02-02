const mongoose = require('mongoose');
require('dotenv').config();

/**
 * SMART BULK APPROVE - Only approve transitions with valid data
 * 
 * This script will:
 * 1. Fetch all pending transitions
 * 2. Validate each transition (license, specialty, region)
 * 3. Approve only valid transitions
 * 4. Skip incomplete transitions (they remain pending)
 * 
 * Validation Rules:
 * - License number must not be "Awaiting", "N/A", or empty
 * - Specialty must not be "Awaiting" or empty
 * - Region must be specified
 */

function isValidLicense(license) {
  if (!license) return false;
  const invalid = ['awaiting', 'n/a', 'pending', 'nil', 'none', ''];
  return !invalid.includes(license.toLowerCase().trim());
}

function isValidSpecialty(specialty) {
  if (!specialty) return false;
  const invalid = ['awaiting', 'pending', 'nil', 'none', ''];
  return !invalid.includes(specialty.toLowerCase().trim());
}

function isValidRegion(region) {
  return region && region.trim().length > 0;
}

async function approveValidTransitions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get all pending transitions
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

    // Validate transitions
    const validTransitions = [];
    const invalidTransitions = [];

    for (const transition of transitions) {
      const user = await mongoose.connection.db
        .collection('users')
        .findOne({ _id: transition.user });

      if (!user) {
        invalidTransitions.push({
          transition,
          reason: 'User not found',
        });
        continue;
      }

      const isValid = 
        isValidLicense(transition.licenseNumber) &&
        isValidSpecialty(transition.specialty) &&
        isValidRegion(transition.region);

      if (isValid) {
        validTransitions.push({ transition, user });
      } else {
        const reasons = [];
        if (!isValidLicense(transition.licenseNumber)) reasons.push('Invalid license');
        if (!isValidSpecialty(transition.specialty)) reasons.push('Invalid specialty');
        if (!isValidRegion(transition.region)) reasons.push('Invalid region');
        
        invalidTransitions.push({
          transition,
          user,
          reason: reasons.join(', '),
        });
      }
    }

    console.log('=== VALIDATION RESULTS ===');
    console.log(`✅ Valid transitions (will be approved): ${validTransitions.length}`);
    console.log(`⚠️  Invalid transitions (will be skipped): ${invalidTransitions.length}\n`);

    if (invalidTransitions.length > 0) {
      console.log('=== INVALID TRANSITIONS (Will be skipped) ===');
      invalidTransitions.forEach((item, i) => {
        console.log(`${i + 1}. ${item.user?.fullName || 'Unknown'}`);
        console.log(`   License: ${item.transition.licenseNumber}`);
        console.log(`   Specialty: ${item.transition.specialty}`);
        console.log(`   Region: ${item.transition.region}`);
        console.log(`   Reason: ${item.reason}`);
        console.log('');
      });
    }

    if (validTransitions.length === 0) {
      console.log('No valid transitions to approve');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('=== VALID TRANSITIONS (Will be approved) ===');
    validTransitions.slice(0, 10).forEach((item, i) => {
      console.log(`${i + 1}. ${item.user.fullName} (${item.user.role})`);
      console.log(`   License: ${item.transition.licenseNumber}`);
      console.log(`   Specialty: ${item.transition.specialty}`);
      console.log(`   Region: ${item.transition.region}`);
      console.log('');
    });
    if (validTransitions.length > 10) {
      console.log(`... and ${validTransitions.length - 10} more\n`);
    }

    // Ask for confirmation
    console.log(`\n⚠️  Ready to approve ${validTransitions.length} valid transitions`);
    console.log('⚠️  User roles will be updated and transition records will be deleted.');
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    let approved = 0;
    let failed = 0;
    let errors = [];

    console.log('Starting approval process...\n');

    for (const { transition, user } of validTransitions) {
      try {
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
        console.log(`✅ ${approved}/${validTransitions.length} - ${user.fullName} (${user.role} → ${newRole})`);

      } catch (err) {
        console.error(`❌ Error processing ${user.fullName}:`, err.message);
        failed++;
        errors.push({
          userName: user.fullName,
          transitionId: transition._id,
          error: err.message,
        });
      }
    }

    console.log('\n=== APPROVAL SUMMARY ===');
    console.log(`Total pending transitions: ${transitions.length}`);
    console.log(`✅ Valid and approved: ${approved}`);
    console.log(`⚠️  Invalid (skipped): ${invalidTransitions.length}`);
    console.log(`❌ Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err.userName}`);
        console.log(`   Transition ID: ${err.transitionId}`);
        console.log(`   Error: ${err.error}`);
        console.log('');
      });
    }

    console.log('\n✅ Approval process complete!');
    console.log('\nNext steps:');
    console.log('1. Run: node scripts/check-transitions.js to see remaining transitions');
    console.log('2. Review invalid transitions and ask users to update their info');
    console.log('3. Verify user profiles have been updated correctly');
    console.log('4. Optionally send notification emails to approved users');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

approveValidTransitions();
