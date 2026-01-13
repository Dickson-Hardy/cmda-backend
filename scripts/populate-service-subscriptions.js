/**
 * Script to populate initial service subscriptions
 * Run this script after setting up the service subscriptions module
 *
 * Usage:
 * 1. Make sure MongoDB is connected
 * 2. Update the MONGODB_URI in your .env file
 * 3. Run: node scripts/populate-service-subscriptions.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Service Subscription Schema
const serviceSubscriptionSchema = new mongoose.Schema(
  {
    serviceName: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'domain',
        'hosting',
        'ssl_certificate',
        'software_license',
        'cloud_service',
        'api_service',
        'email_service',
        'payment_gateway',
        'other',
      ],
      required: true,
    },
    provider: { type: String, required: true },
    serviceUrl: { type: String },
    purchaseDate: { type: Date },
    renewalDate: { type: Date, required: true },
    cost: { type: Number, required: true },
    currency: { type: String, enum: ['NGN', 'USD'], default: 'USD' },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'semi-annually', 'annually', 'biennially'],
      default: 'monthly',
    },
    autoRenewal: { type: Boolean, default: false },
    paymentMethod: { type: String },
    accountEmail: { type: String },
    accountUsername: { type: String },
    reminderDays: { type: Number, default: 7, min: 1, max: 90 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'expiring_soon', 'expired', 'cancelled', 'suspended'],
      default: 'active',
    },
    renewalHistory: [
      {
        renewedAt: Date,
        oldRenewalDate: Date,
        newRenewalDate: Date,
        oldCost: Number,
        newCost: Number,
        notes: String,
      },
    ],
  },
  { timestamps: true },
);

const ServiceSubscription = mongoose.model('ServiceSubscription', serviceSubscriptionSchema);

// CMDA 2026 Service Renewals
const sampleSubscriptions = [
  {
    serviceName: 'Elementor Pro Plugin',
    description: 'WordPress page builder plugin for website design',
    category: 'software_license',
    provider: 'Elementor',
    serviceUrl: 'https://elementor.com',
    purchaseDate: new Date('2025-01-16'),
    renewalDate: new Date('2026-01-16'),
    cost: 127500,
    currency: 'NGN',
    billingCycle: 'annually',
    autoRenewal: false,
    paymentMethod: 'Credit Card',
    accountEmail: 'admin@cmda.org',
    accountUsername: 'cmda_elementor',
    reminderDays: 14,
    notes: 'WordPress page builder plugin - NGN 127,500',
    status: 'expiring_soon',
  },
  {
    serviceName: 'Fluent Forms Pro + Addon Pack',
    description: 'WordPress forms plugin with premium addons',
    category: 'software_license',
    provider: 'Fluent Forms',
    serviceUrl: 'https://fluentforms.com',
    purchaseDate: new Date('2025-01-16'),
    renewalDate: new Date('2026-01-16'),
    cost: 118500,
    currency: 'NGN',
    billingCycle: 'annually',
    autoRenewal: false,
    paymentMethod: 'Credit Card',
    accountEmail: 'admin@cmda.org',
    accountUsername: 'cmda_fluentforms',
    reminderDays: 14,
    notes: 'WordPress forms plugin with addons - NGN 118,500',
    status: 'expiring_soon',
  },
  {
    serviceName: 'Elastic Mail (First Renewal)',
    description: 'Email delivery service - first half of year',
    category: 'email_service',
    provider: 'Elastic Mail',
    serviceUrl: 'https://elasticemail.com',
    purchaseDate: new Date('2025-02-18'),
    renewalDate: new Date('2026-02-18'),
    cost: 75000,
    currency: 'NGN',
    billingCycle: 'semi-annually',
    autoRenewal: true,
    paymentMethod: 'Credit Card',
    accountEmail: 'tech@cmda.org',
    accountUsername: 'cmda_elasticmail',
    reminderDays: 14,
    notes: 'Email service - First semi-annual renewal - NGN 75,000 (Total yearly: NGN 150,000)',
    status: 'active',
  },
  {
    serviceName: 'Elastic Mail (Second Renewal)',
    description: 'Email delivery service - second half of year',
    category: 'email_service',
    provider: 'Elastic Mail',
    serviceUrl: 'https://elasticemail.com',
    purchaseDate: new Date('2025-02-18'),
    renewalDate: new Date('2026-08-18'),
    cost: 75000,
    currency: 'NGN',
    billingCycle: 'semi-annually',
    autoRenewal: true,
    paymentMethod: 'Credit Card',
    accountEmail: 'tech@cmda.org',
    accountUsername: 'cmda_elasticmail',
    reminderDays: 14,
    notes: 'Email service - Second semi-annual renewal - NGN 75,000',
    status: 'active',
  },
  {
    serviceName: 'WordPress Plus Hosting',
    description: 'WordPress optimized web hosting plan',
    category: 'hosting',
    provider: 'Bluehost',
    serviceUrl: 'https://bluehost.com',
    purchaseDate: new Date('2025-03-28'),
    renewalDate: new Date('2026-03-28'),
    cost: 305820,
    currency: 'NGN',
    billingCycle: 'annually',
    autoRenewal: false,
    paymentMethod: 'Credit Card',
    accountEmail: 'admin@cmda.org',
    accountUsername: 'cmda_bluehost',
    reminderDays: 30,
    notes: 'WordPress hosting plan - NGN 305,820',
    status: 'active',
  },
  {
    serviceName: '.NET Domain Renewal',
    description: '.NET domain name registration and renewal',
    category: 'domain',
    provider: 'Bluehost',
    serviceUrl: 'https://bluehost.com',
    purchaseDate: new Date('2025-03-28'),
    renewalDate: new Date('2026-03-28'),
    cost: 29985,
    currency: 'NGN',
    billingCycle: 'annually',
    autoRenewal: false,
    paymentMethod: 'Credit Card',
    accountEmail: 'admin@cmda.org',
    accountUsername: 'cmda_bluehost',
    reminderDays: 30,
    notes: '.NET domain registration - NGN 29,985',
    status: 'active',
  },
  {
    serviceName: 'Domain Privacy + Protection',
    description: 'WHOIS privacy protection for domain registration',
    category: 'domain',
    provider: 'Bluehost',
    serviceUrl: 'https://bluehost.com',
    purchaseDate: new Date('2025-03-28'),
    renewalDate: new Date('2026-03-28'),
    cost: 22500,
    currency: 'NGN',
    billingCycle: 'annually',
    autoRenewal: false,
    paymentMethod: 'Credit Card',
    accountEmail: 'admin@cmda.org',
    accountUsername: 'cmda_bluehost',
    reminderDays: 30,
    notes: 'Domain privacy protection service - NGN 22,500',
    status: 'active',
  },
  {
    serviceName: 'ICANN Fee',
    description: 'Internet Corporation for Assigned Names and Numbers annual fee',
    category: 'domain',
    provider: 'Bluehost',
    serviceUrl: 'https://bluehost.com',
    purchaseDate: new Date('2025-03-28'),
    renewalDate: new Date('2026-03-28'),
    cost: 270,
    currency: 'NGN',
    billingCycle: 'annually',
    autoRenewal: false,
    paymentMethod: 'Credit Card',
    accountEmail: 'admin@cmda.org',
    accountUsername: 'cmda_bluehost',
    reminderDays: 30,
    notes: 'ICANN domain registration fee - NGN 270',
    status: 'active',
  },
  {
    serviceName: 'Bluehost Tax',
    description: 'Tax and fees on Bluehost services',
    category: 'hosting',
    provider: 'Bluehost',
    serviceUrl: 'https://bluehost.com',
    purchaseDate: new Date('2025-03-28'),
    renewalDate: new Date('2026-03-28'),
    cost: 72000,
    currency: 'NGN',
    billingCycle: 'annually',
    autoRenewal: false,
    paymentMethod: 'Credit Card',
    accountEmail: 'admin@cmda.org',
    accountUsername: 'cmda_bluehost',
    reminderDays: 30,
    notes: 'Tax on Bluehost services - NGN 72,000',
    status: 'active',
  },
  {
    serviceName: 'Domain Name (.org)',
    description: 'Organization domain name registration',
    category: 'domain',
    provider: 'Namecheap',
    serviceUrl: 'https://namecheap.com',
    purchaseDate: new Date('2025-12-01'),
    renewalDate: new Date('2026-12-01'),
    cost: 24500,
    currency: 'NGN',
    billingCycle: 'annually',
    autoRenewal: false,
    paymentMethod: 'Credit Card',
    accountEmail: 'admin@cmda.org',
    accountUsername: 'cmda_namecheap',
    reminderDays: 30,
    notes: '.org domain registration - NGN 24,500',
    status: 'active',
  },
  {
    serviceName: 'Domain Name (.com)',
    description: 'Commercial domain name registration',
    category: 'domain',
    provider: 'Namecheap',
    serviceUrl: 'https://namecheap.com',
    purchaseDate: new Date('2025-01-01'),
    renewalDate: new Date('2026-06-01'),
    cost: 24500,
    currency: 'NGN',
    billingCycle: 'annually',
    autoRenewal: false,
    paymentMethod: 'Credit Card',
    accountEmail: 'admin@cmda.org',
    accountUsername: 'cmda_namecheap',
    reminderDays: 30,
    notes: '.com domain registration - NGN 24,500',
    status: 'active',
  },
  {
    serviceName: 'Digital Ocean Server',
    description: 'Cloud server hosting and infrastructure',
    category: 'cloud_service',
    provider: 'Digital Ocean',
    serviceUrl: 'https://digitalocean.com',
    purchaseDate: new Date('2025-01-01'),
    renewalDate: new Date('2026-02-01'),
    cost: 11250,
    currency: 'NGN',
    billingCycle: 'monthly',
    autoRenewal: true,
    paymentMethod: 'Credit Card',
    accountEmail: 'tech@cmda.org',
    accountUsername: 'cmda_digitalocean',
    reminderDays: 7,
    notes: 'Cloud server hosting - NGN 11,250/month (Total yearly: NGN 135,000)',
    status: 'active',
  },
  {
    serviceName: 'Linode Server',
    description: 'Cloud VPS hosting and compute services',
    category: 'cloud_service',
    provider: 'Linode',
    serviceUrl: 'https://linode.com',
    purchaseDate: new Date('2025-01-01'),
    renewalDate: new Date('2026-02-01'),
    cost: 7500,
    currency: 'NGN',
    billingCycle: 'monthly',
    autoRenewal: true,
    paymentMethod: 'Credit Card',
    accountEmail: 'tech@cmda.org',
    accountUsername: 'cmda_linode',
    reminderDays: 7,
    notes: 'Cloud server hosting - NGN 7,500/month (Total yearly: NGN 90,000)',
    status: 'active',
  },
];

// Connect to MongoDB and populate data
async function populateServiceSubscriptions() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cmda';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Clear existing subscriptions (optional - comment out if you want to keep existing data)
    const existingCount = await ServiceSubscription.countDocuments();
    console.log(`\nFound ${existingCount} existing service subscriptions`);

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (existingCount > 0) {
      const answer = await new Promise((resolve) => {
        readline.question('Do you want to clear existing data? (yes/no): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        await ServiceSubscription.deleteMany({});
        console.log('✓ Cleared existing service subscriptions');
      } else {
        console.log('Keeping existing data...');
      }
    }

    // Insert sample subscriptions
    console.log('\nInserting sample service subscriptions...');
    const insertedDocs = await ServiceSubscription.insertMany(sampleSubscriptions);
    console.log(`✓ Successfully inserted ${insertedDocs.length} service subscriptions`);

    // Display summary
    console.log('\n=== Summary ===');
    const categories = await ServiceSubscription.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log('\nServices by Category:');
    categories.forEach((cat) => {
      console.log(`  - ${cat._id}: ${cat.count} service(s), $${cat.totalCost.toFixed(2)}`);
    });

    const statuses = await ServiceSubscription.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log('\nServices by Status:');
    statuses.forEach((status) => {
      console.log(`  - ${status._id}: ${status.count} service(s)`);
    });

    // Calculate monthly cost
    const allSubscriptions = await ServiceSubscription.find();
    let totalMonthlyCost = 0;
    allSubscriptions.forEach((sub) => {
      let monthlyCost = 0;
      switch (sub.billingCycle) {
        case 'monthly':
          monthlyCost = sub.cost;
          break;
        case 'quarterly':
          monthlyCost = sub.cost / 3;
          break;
        case 'semi-annually':
          monthlyCost = sub.cost / 6;
          break;
        case 'annually':
          monthlyCost = sub.cost / 12;
          break;
        case 'biennially':
          monthlyCost = sub.cost / 24;
          break;
      }
      totalMonthlyCost += monthlyCost;
    });

    console.log(`\nTotal Monthly Cost: $${totalMonthlyCost.toFixed(2)}`);
    console.log(`Total Yearly Cost: $${(totalMonthlyCost * 12).toFixed(2)}`);

    console.log('\n✓ Service subscriptions populated successfully!');
    console.log('\nYou can now view them in the admin dashboard at:');
    console.log('  /project/service-subscriptions');
  } catch (error) {
    console.error('\n✗ Error populating service subscriptions:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n✓ MongoDB connection closed');
    process.exit(0);
  }
}

// Run the script
populateServiceSubscriptions();
