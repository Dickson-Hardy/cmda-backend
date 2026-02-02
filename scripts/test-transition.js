const mongoose = require('mongoose');
require('dotenv').config();

async function testTransition() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get a pending transition
    const transition = await mongoose.connection.db
      .collection('usertransitions')
      .findOne({ status: 'pending' });

    if (!transition) {
      console.log('❌ No pending transitions found');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('=== TESTING TRANSITION ===\n');
    console.log(`Transition ID: ${transition._id}`);
    console.log(`User ID: ${transition.user}`);
    console.log(`Status: ${transition.status}`);
    console.log(`Region: ${transition.region}`);
    console.log(`Specialty: ${transition.specialty}`);
    console.log(`License: ${transition.licenseNumber}\n`);

    // Get user details
    const user = await mongoose.connection.db
      .collection('users')
      .findOne({ _id: transition.user });

    if (!user) {
      console.log('❌ User not found');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('=== USER BEFORE TRANSITION ===');
    console.log(`Name: ${user.fullName}`);
    console.log(`Email: ${user.email}`);
    console.log(`Current Role: ${user.role}`);
    console.log(`Current Region: ${user.region || 'N/A'}`);
    console.log(`Current Specialty: ${user.specialty || 'N/A'}`);
    console.log(`Current License: ${user.licenseNumber || 'N/A'}\n`);

    // Simulate transition completion
    console.log('=== SIMULATING TRANSITION ===');
    
    const newRole = user.role === 'Student' ? 'Doctor' : 'GlobalNetwork';
    console.log(`New Role: ${newRole}`);
    console.log(`New Region: ${transition.region}`);
    console.log(`New Specialty: ${transition.specialty}`);
    console.log(`New License: ${transition.licenseNumber}\n`);

    // Ask for confirmation
    console.log('⚠️  This is a TEST. No changes will be made to the database.');
    console.log('\nTo actually complete this transition, use the admin panel:');
    console.log(`POST /users/transition/${transition._id}/completed`);
    console.log('\nOr run this command:');
    console.log(`curl -X POST http://localhost:3000/api/users/transition/${transition._id}/completed \\`);
    console.log(`  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"`);

    await mongoose.disconnect();
    console.log('\n✓ Test complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testTransition();
