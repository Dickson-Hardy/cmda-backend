const mongoose = require('mongoose');
require('dotenv').config();

/**
 * PREVIEW TRANSITIONS - Quick validation check
 * Shows how many transitions are valid vs invalid
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

async function previewTransitions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    const transitions = await mongoose.connection.db
      .collection('usertransitions')
      .find({ status: 'pending' })
      .toArray();

    console.log(`Total pending transitions: ${transitions.length}\n`);

    let valid = 0;
    let invalidLicense = 0;
    let invalidSpecialty = 0;
    let invalidBoth = 0;

    const samples = { valid: [], invalid: [] };

    for (const transition of transitions) {
      const licenseValid = isValidLicense(transition.licenseNumber);
      const specialtyValid = isValidSpecialty(transition.specialty);

      if (licenseValid && specialtyValid) {
        valid++;
        if (samples.valid.length < 5) {
          const user = await mongoose.connection.db
            .collection('users')
            .findOne({ _id: transition.user });
          samples.valid.push({ transition, user });
        }
      } else {
        if (!licenseValid && !specialtyValid) {
          invalidBoth++;
        } else if (!licenseValid) {
          invalidLicense++;
        } else {
          invalidSpecialty++;
        }
        
        if (samples.invalid.length < 5) {
          const user = await mongoose.connection.db
            .collection('users')
            .findOne({ _id: transition.user });
          samples.invalid.push({ transition, user, licenseValid, specialtyValid });
        }
      }
    }

    console.log('=== VALIDATION SUMMARY ===');
    console.log(`✅ Valid (ready to approve): ${valid}`);
    console.log(`❌ Invalid license only: ${invalidLicense}`);
    console.log(`❌ Invalid specialty only: ${invalidSpecialty}`);
    console.log(`❌ Invalid both: ${invalidBoth}`);
    console.log(`Total invalid: ${invalidLicense + invalidSpecialty + invalidBoth}\n`);

    if (samples.valid.length > 0) {
      console.log('=== SAMPLE VALID TRANSITIONS ===');
      samples.valid.forEach((item, i) => {
        console.log(`${i + 1}. ${item.user?.fullName || 'Unknown'}`);
        console.log(`   License: ${item.transition.licenseNumber}`);
        console.log(`   Specialty: ${item.transition.specialty}`);
        console.log('');
      });
    }

    if (samples.invalid.length > 0) {
      console.log('=== SAMPLE INVALID TRANSITIONS ===');
      samples.invalid.forEach((item, i) => {
        console.log(`${i + 1}. ${item.user?.fullName || 'Unknown'}`);
        console.log(`   License: ${item.transition.licenseNumber} ${!item.licenseValid ? '❌' : '✅'}`);
        console.log(`   Specialty: ${item.transition.specialty} ${!item.specialtyValid ? '❌' : '✅'}`);
        console.log('');
      });
    }

    console.log('\n=== RECOMMENDATION ===');
    if (valid === transitions.length) {
      console.log('✅ All transitions are valid! You can approve all safely.');
      console.log('Run: node scripts/approve-all-transitions.js');
    } else if (valid > 0) {
      console.log(`✅ ${valid} transitions are valid and can be approved.`);
      console.log(`⚠️  ${transitions.length - valid} transitions have incomplete data.`);
      console.log('\nOptions:');
      console.log('1. Run: node scripts/approve-valid-transitions.js (approve only valid ones)');
      console.log('2. Run: node scripts/approve-all-transitions.js (approve all, including incomplete)');
    } else {
      console.log('⚠️  No valid transitions found. All have incomplete data.');
      console.log('You may want to approve them anyway or ask users to update their info.');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

previewTransitions();
