// Script to fix date formats for all conferences in MongoDB
// Usage: node scripts/fix-conference-dates.js

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cmda'; // Update if needed

const eventSchema = new mongoose.Schema({}, { strict: false, collection: 'events' });
const Event = mongoose.model('Event', eventSchema);

function parseDate(dateStr) {
  if (!dateStr) return null;

  // Try to parse DD/MM/YYYY HH:mm
  const ddmmyyyyMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})/);
  if (ddmmyyyyMatch) {
    const [, day, month, year, hour, minute] = ddmmyyyyMatch;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
  }

  // Try to parse YYYY-MM-DDThh:mm without timezone (exactly like in your DB)
  const isoNoTzMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (isoNoTzMatch) {
    return new Date(`${dateStr}:00Z`); // Add seconds and UTC timezone
  }

  // Try as regular Date
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

async function fixDates() {
  await mongoose.connect(MONGO_URI);
  const events = await Event.find({ isConference: true });
  let updated = 0;

  for (const event of events) {
    let changed = false;
    if (event.conferenceConfig) {
      // Log current state
      console.log(`\nConference: ${event.name} (${event.slug})`);
      console.log(
        `  Regular end: ${event.conferenceConfig.regularRegistrationEndDate} (${typeof event.conferenceConfig.regularRegistrationEndDate})`,
      );
      console.log(
        `  Late end: ${event.conferenceConfig.lateRegistrationEndDate} (${typeof event.conferenceConfig.lateRegistrationEndDate})`,
      );
      ['regularRegistrationEndDate', 'lateRegistrationEndDate'].forEach((field) => {
        const val = event.conferenceConfig[field];
        // Check for any string date that needs to be converted to Date object
        if (val && typeof val === 'string') {
          const parsed = parseDate(val);
          if (parsed) {
            event.conferenceConfig[field] = parsed;
            changed = true;
            console.log(
              `Fixed ${field} for event ${event.name}: ${val} -> ${parsed.toISOString()}`,
            );
          }
        }
      });
    }
    if (changed) {
      await event.save();
      updated++;
    }
  }
  console.log(`Done. Updated ${updated} conference(s).`);

  // Verify by getting all conferences again
  const finalEvents = await Event.find({ isConference: true });
  console.log('\nFinal state of conferences:');
  for (const event of finalEvents) {
    if (event.conferenceConfig) {
      console.log(`\nConference: ${event.name} (${event.slug})`);
      console.log(
        `  Regular end: ${event.conferenceConfig.regularRegistrationEndDate} (${typeof event.conferenceConfig.regularRegistrationEndDate})`,
      );
      console.log(
        `  Late end: ${event.conferenceConfig.lateRegistrationEndDate} (${typeof event.conferenceConfig.lateRegistrationEndDate})`,
      );

      // Check if registration should be open based on dates
      const now = new Date();
      const regularEnd = event.conferenceConfig.regularRegistrationEndDate;
      const lateEnd = event.conferenceConfig.lateRegistrationEndDate;
      const eventDate = new Date(event.eventDateTime);

      let status = 'unknown';
      if (regularEnd instanceof Date && now <= regularEnd) {
        status = 'regular';
      } else if (lateEnd instanceof Date && now <= lateEnd) {
        status = 'late';
      } else if (
        !regularEnd &&
        !lateEnd &&
        now <= new Date(eventDate.getTime() - 24 * 60 * 60 * 1000)
      ) {
        status = 'regular (default)';
      } else {
        status = 'closed';
      }

      console.log(`  Registration status: ${status}`);
    }
  }

  await mongoose.disconnect();
}

fixDates().catch((err) => {
  console.error(err);
  process.exit(1);
});
