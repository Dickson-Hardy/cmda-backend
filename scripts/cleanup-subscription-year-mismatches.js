const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const APPLY = process.argv.includes('--apply');

function isValidDate(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isCalendarYearExpiryDate(value) {
  if (!isValidDate(value)) return false;
  const date = new Date(value);
  return date.getUTCMonth() === 11 && date.getUTCDate() === 31;
}

function isEligibleAnnualSubscription(subscription) {
  if (subscription.isLifetime === true) return false;
  if (subscription.isVisionPartner === true) return false;
  if (subscription.isPaid === false) return false;
  if (subscription.reference === 'PENDING') return false;
  return true;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const subscriptionsCol = db.collection('subscriptions');
  const usersCol = db.collection('users');

  const subscriptions = await subscriptionsCol
    .find(
      {},
      {
        projection: {
          _id: 1,
          user: 1,
          reference: 1,
          isPaid: 1,
          isLifetime: 1,
          isVisionPartner: 1,
          subscriptionYear: 1,
          expiryDate: 1,
          createdAt: 1,
        },
      },
    )
    .toArray();

  const userIds = [
    ...new Set(subscriptions.map((s) => (s.user ? String(s.user) : null)).filter(Boolean)),
  ];
  const users = await usersCol
    .find(
      { _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } },
      {
        projection: {
          _id: 1,
          membershipId: 1,
          fullName: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
        },
      },
    )
    .toArray();
  const usersById = new Map(users.map((u) => [String(u._id), u]));

  const mismatchFixes = [];
  const missingYearBackfills = [];

  for (const subscription of subscriptions) {
    if (!isEligibleAnnualSubscription(subscription)) continue;
    if (!isCalendarYearExpiryDate(subscription.expiryDate)) continue;

    const expiryYear = new Date(subscription.expiryDate).getUTCFullYear();
    const hasStoredYear = Number.isInteger(subscription.subscriptionYear);

    if (!hasStoredYear) {
      missingYearBackfills.push({
        subscriptionId: String(subscription._id),
        userId: subscription.user ? String(subscription.user) : null,
        previousSubscriptionYear: null,
        correctedSubscriptionYear: expiryYear,
      });
      continue;
    }

    if (subscription.subscriptionYear !== expiryYear) {
      mismatchFixes.push({
        subscriptionId: String(subscription._id),
        userId: subscription.user ? String(subscription.user) : null,
        previousSubscriptionYear: subscription.subscriptionYear,
        correctedSubscriptionYear: expiryYear,
      });
    }
  }

  const allFixes = [...mismatchFixes, ...missingYearBackfills].map((item) => {
    const owner = item.userId ? usersById.get(item.userId) : null;
    return {
      ...item,
      membershipId: owner?.membershipId || null,
      fullName:
        owner?.fullName || [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || null,
      email: owner?.email || null,
    };
  });

  if (APPLY && allFixes.length > 0) {
    const ops = allFixes.map((item) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(item.subscriptionId) },
        update: { $set: { subscriptionYear: item.correctedSubscriptionYear } },
      },
    }));
    await subscriptionsCol.bulkWrite(ops, { ordered: false });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    totals: {
      scannedSubscriptions: subscriptions.length,
      mismatchFixCandidates: mismatchFixes.length,
      missingYearBackfillCandidates: missingYearBackfills.length,
      totalUpdateCandidates: allFixes.length,
    },
    samples: {
      mismatchFixes: allFixes.slice(0, 100),
    },
    fullLists: {
      mismatchFixes: allFixes,
    },
  };

  const reportDir = path.join(process.cwd(), 'backups', 'migration-reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(
    reportDir,
    `subscription-year-mismatch-cleanup-${new Date().toISOString().replace(/[:.]/g, '-')}-${APPLY ? 'apply' : 'dry-run'}.json`,
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('========================================');
  console.log(`Subscription year mismatch cleanup (${report.mode})`);
  console.log('========================================');
  console.log(`Scanned subscriptions: ${report.totals.scannedSubscriptions}`);
  console.log(`Mismatch fix candidates: ${report.totals.mismatchFixCandidates}`);
  console.log(`Missing-year backfill candidates: ${report.totals.missingYearBackfillCandidates}`);
  console.log(`Total update candidates: ${report.totals.totalUpdateCandidates}`);
  console.log(`Report written to: ${reportPath}`);

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Subscription year cleanup failed:', error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
