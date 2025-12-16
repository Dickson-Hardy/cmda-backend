const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

// User Schema (simplified for seeding)
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  fullName: String,
  email: String,
  password: String,
  role: String,
  membershipId: String,
  emailVerified: Boolean,
  phoneNumber: String,
  memberCategory: String,
  createdAt: Date,
  updatedAt: Date,
});

const User = mongoose.model('User', userSchema);

async function seedMemberManager() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'member@cmdanigeria.net';
    const password = 'Admin@2025';

    // Check if user already exists
    const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    
    if (existingUser) {
      console.log('⚠️  Member Manager user already exists');
      console.log('Email:', existingUser.email);
      console.log('Role:', existingUser.role);
      
      // Update password if needed
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.findByIdAndUpdate(existingUser._id, {
        password: hashedPassword,
        role: 'MemberManager',
        updatedAt: new Date(),
      });
      console.log('✅ Updated password and ensured MemberManager role');
    } else {
      // Hash password
      console.log('Hashing password...');
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('✅ Password hashed');

      // Create user
      console.log('Creating Member Manager user...');
      const memberManager = await User.create({
        firstName: 'Member',
        lastName: 'Manager',
        fullName: 'Member Manager',
        email: email,
        password: hashedPassword,
        role: 'MemberManager',
        membershipId: 'MM-' + Date.now(),
        emailVerified: true,
        phoneNumber: '+234',
        memberCategory: 'Senior Member',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ Member Manager user created successfully!');
      console.log('\n📧 Login Credentials:');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Role:', memberManager.role);
      console.log('Membership ID:', memberManager.membershipId);
    }

    console.log('\n🎉 Seeding completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

seedMemberManager();
