const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const APPLY = process.argv.includes('--apply');
const UPDATE_USER_SUBSCRIBED = process.argv.includes('--update-user-subscribed');
const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();

function normalizeFrequencyValue(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;

  const lower = trimmed.toLowerCase();
  if (lower === 'annually' || lower === 'annual' || lower === 'yearly') return 'Annually';
  if (lower === 'monthly' || lower === 'month') return 'Monthly';

  return trimmed;
}

function isValidDate(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isCalendarYearExpiryDate(value) {
  if (!isValidDate(value)) return false;
  const date = new Date(value);
  return date.getUTCMonth() === 11 && date.getUTCDate() === 31;
}

function inferSubscriptionYear(subscription) {
  if (Number.isInteger(subscription.subscriptionYear)) {
    return subscription.subscriptionYear;
  }

  if (isValidDate(subscription.createdAt)) {
    return new Date(subscription.createdAt).getUTCFullYear();
  }

  if (isValidDate(subscription.updatedAt)) {
    return new Date(subscription.updatedAt).getUTCFullYear();
  }

  if (isValidDate(subscription.expiryDate)) {
    const expiryDate = new Date(subscription.expiryDate);
    const expiryYear = expiryDate.getUTCFullYear();
    return isCalendarYearExpiryDate(expiryDate) ? expiryYear : expiryYear - 1;
  }

  if (isValidDate(subscription.subscriptionExpiry)) {
    const expiryDate = new Date(subscription.subscriptionExpiry);
    const expiryYear = expiryDate.getUTCFullYear();
    return isCalendarYearExpiryDate(expiryDate) ? expiryYear : expiryYear - 1;
  }

  return null;
}

function isPaidSubscription(subscription) {
  // Exclude explicitly unpaid (isPaid: false) and unconfirmed PENDING payments
  // Note: isPaid: null is treated as paid — most admin/Paystack records are stored this way
  if (subscription.isPaid === false) return false;
  if (subscription.reference === 'PENDING') return false;
  return true;
}

function contributesToCurrentYearCoverage(subscription) {
  if (!isPaidSubscription(subscription)) return false;
  if (subscription.isLifetime === true) return true;

  const inferredYear = inferSubscriptionYear(subscription);
  return inferredYear === CURRENT_YEAR;
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
          userId: 1,
          isPaid: 1,
          isLifetime: 1,
          subscriptionYear: 1,
          expiryDate: 1,
          subscriptionExpiry: 1,
          frequency: 1,
          reference: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    )
    .toArray();

  const users = await usersCol
    .find(
      {},
      {
        projection: {
          _id: 1,
          membershipId: 1,
          fullName: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          role: 1,
          subscribed: 1,
          hasLifetimeMembership: 1,
          subscriptionExpiry: 1,
        },
      },
    )
    .toArray();

  const userById = new Map(users.map((u) => [String(u._id), u]));

  const subscriptionUpdates = [];
  const frequencyUpdates = [];

  const activeUserIdsFromSubscriptions = new Set();
  const activeSubscriptions = [];

  for (const sub of subscriptions) {
    const subId = String(sub._id);
    const inferredYear = inferSubscriptionYear(sub);
    const hasYear = Number.isInteger(sub.subscriptionYear);

    if (!hasYear && inferredYear !== null && sub.isLifetime !== true && isPaidSubscription(sub)) {
      subscriptionUpdates.push({
        subscriptionId: subId,
        userId: sub.userId ? String(sub.userId) : null,
        oldSubscriptionYear: sub.subscriptionYear ?? null,
        newSubscriptionYear: inferredYear,
      });
    }

    const normalizedFrequency = normalizeFrequencyValue(sub.frequency);
    if (normalizedFrequency !== sub.frequency) {
      frequencyUpdates.push({
        subscriptionId: subId,
        userId: sub.userId ? String(sub.userId) : null,
        oldFrequency: sub.frequency ?? null,
        newFrequency: normalizedFrequency,
      });
    }

    if (contributesToCurrentYearCoverage(sub)) {
      const userId = sub.userId ? String(sub.userId) : null;
      if (userId) {
        activeUserIdsFromSubscriptions.add(userId);

        const owner = userById.get(userId);
        activeSubscriptions.push({
          subscriptionId: subId,
          userId,
          membershipId: owner?.membershipId || null,
          fullName:
            owner?.fullName ||
            [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') ||
            null,
          email: owner?.email || null,
          role: owner?.role || null,
          isLifetime: sub.isLifetime === true,
          subscriptionYear: Number.isInteger(sub.subscriptionYear)
            ? sub.subscriptionYear
            : inferSubscriptionYear(sub),
          expiryDate: sub.expiryDate || null,
        });
      }
    }
  }

  const shouldBeSubscribedUserIds = new Set(activeUserIdsFromSubscriptions);
  for (const user of users) {
    if (user.hasLifetimeMembership === true) {
      shouldBeSubscribedUserIds.add(String(user._id));
    }
  }

  const currentlySubscribedUserIds = new Set(
    users.filter((u) => u.subscribed === true).map((u) => String(u._id)),
  );

  const falsePositives = [];
  const falseNegatives = [];
  const userSubscribedUpdates = [];

  for (const user of users) {
    const userId = String(user._id);
    const shouldBe = shouldBeSubscribedUserIds.has(userId);
    const current = user.subscribed === true;

    if (current && !shouldBe) {
      falsePositives.push({
        userId,
        membershipId: user.membershipId || null,
        fullName:
          user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
        email: user.email || null,
        role: user.role || null,
        currentSubscribed: true,
        shouldBeSubscribed: false,
      });
    }

    if (!current && shouldBe) {
      falseNegatives.push({
        userId,
        membershipId: user.membershipId || null,
        fullName:
          user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
        email: user.email || null,
        role: user.role || null,
        currentSubscribed: false,
        shouldBeSubscribed: true,
      });
    }

    if (current !== shouldBe) {
      userSubscribedUpdates.push({
        userId,
        membershipId: user.membershipId || null,
        oldSubscribed: current,
        newSubscribed: shouldBe,
      });
    }
  }

  if (APPLY) {
    if (subscriptionUpdates.length > 0) {
      const ops = subscriptionUpdates.map((item) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(item.subscriptionId) },
          update: { $set: { subscriptionYear: item.newSubscriptionYear } },
        },
      }));
      await subscriptionsCol.bulkWrite(ops, { ordered: false });
    }

    if (frequencyUpdates.length > 0) {
      const ops = frequencyUpdates.map((item) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(item.subscriptionId) },
          update: { $set: { frequency: item.newFrequency } },
        },
      }));
      await subscriptionsCol.bulkWrite(ops, { ordered: false });
    }

    if (UPDATE_USER_SUBSCRIBED && userSubscribedUpdates.length > 0) {
      const ops = userSubscribedUpdates.map((item) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(item.userId) },
          update: { $set: { subscribed: item.newSubscribed } },
        },
      }));
      await usersCol.bulkWrite(ops, { ordered: false });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    updateUserSubscribed: UPDATE_USER_SUBSCRIBED,
    currentYear: CURRENT_YEAR,
    totals: {
      subscriptions: subscriptions.length,
      users: users.length,
      activeUsersByCurrentYearCoverage: shouldBeSubscribedUserIds.size,
      currentlySubscribedUsers: currentlySubscribedUserIds.size,
      subscriptionYearBackfillCandidates: subscriptionUpdates.length,
      frequencyNormalizationCandidates: frequencyUpdates.length,
      usersSubscribedFlipCandidates: userSubscribedUpdates.length,
      falsePositives: falsePositives.length,
      falseNegatives: falseNegatives.length,
    },
    samples: {
      activeSubscriptions: activeSubscriptions.slice(0, 50),
      falsePositives: falsePositives.slice(0, 100),
      falseNegatives: falseNegatives.slice(0, 100),
      subscriptionYearBackfill: subscriptionUpdates.slice(0, 100),
      frequencyNormalization: frequencyUpdates.slice(0, 100),
    },
    fullLists: {
      activeSubscriptions,
      falsePositives,
      falseNegatives,
      subscriptionYearBackfill: subscriptionUpdates,
      frequencyNormalization: frequencyUpdates,
      usersSubscribedUpdates: userSubscribedUpdates,
    },
  };

  const reportDir = path.join(process.cwd(), 'backups', 'migration-reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(
    reportDir,
    `subscription-year-migration-${new Date().toISOString().replace(/[:.]/g, '-')}-${APPLY ? 'apply' : 'dry-run'}.json`,
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('========================================');
  console.log(`Subscription migration report (${report.mode})`);
  console.log('========================================');
  console.log(`Current Year: ${CURRENT_YEAR}`);
  console.log(`Subscriptions: ${subscriptions.length}`);
  console.log(`Users: ${users.length}`);
  console.log(`Active users (should be subscribed): ${shouldBeSubscribedUserIds.size}`);
  console.log(`Currently subscribed users: ${currentlySubscribedUserIds.size}`);
  console.log(`Backfill subscriptionYear candidates: ${subscriptionUpdates.length}`);
  console.log(`Normalize frequency candidates: ${frequencyUpdates.length}`);
  console.log(`Users subscribed flag flip candidates: ${userSubscribedUpdates.length}`);
  console.log(`Will update users.subscribed in apply mode: ${UPDATE_USER_SUBSCRIBED}`);
  console.log(`False positives (subscribed=true but should be false): ${falsePositives.length}`);
  console.log(`False negatives (subscribed=false but should be true): ${falseNegatives.length}`);
  console.log(`Report written to: ${reportPath}`);

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Migration audit failed:', error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
