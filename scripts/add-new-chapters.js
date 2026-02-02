const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Add new chapters to the database
 * 
 * Doctor Chapters:
 * - Lagos chapter
 * 
 * Student Chapters:
 * - BDTH-KASU
 * - UDUTH
 * - ABUTH
 * - EBSUTH
 * - ABSUTH
 * - GUTH
 * - JUTH
 * - AE-FUTH
 * - LASUTH
 * - GSUTH
 * - AKTH
 * - AAU/ISTH
 * - IMSUTH
 * - FUTH-LAFIA
 * - RSUTH
 */

const newChapters = [
  // Doctor Chapter
  {
    name: 'Lagos chapter',
    type: 'Doctor',
    description: 'Lagos Doctor Chapter',
  },
  
  // Student Chapters
  {
    name: 'BDTH-KASU',
    type: 'Student',
    description: 'Barau Dikko Teaching Hospital - Kaduna State University',
  },
  {
    name: 'UDUTH',
    type: 'Student',
    description: 'Usmanu Danfodiyo University Teaching Hospital',
  },
  {
    name: 'ABUTH',
    type: 'Student',
    description: 'Ahmadu Bello University Teaching Hospital',
  },
  {
    name: 'EBSUTH',
    type: 'Student',
    description: 'Ebonyi State University Teaching Hospital',
  },
  {
    name: 'ABSUTH',
    type: 'Student',
    description: 'Abia State University Teaching Hospital',
  },
  {
    name: 'GUTH',
    type: 'Student',
    description: 'Gombe State University Teaching Hospital',
  },
  {
    name: 'JUTH',
    type: 'Student',
    description: 'Jos University Teaching Hospital',
  },
  {
    name: 'AE-FUTH',
    type: 'Student',
    description: 'Alex Ekwueme Federal University Teaching Hospital',
  },
  {
    name: 'LASUTH',
    type: 'Student',
    description: 'Lagos State University Teaching Hospital',
  },
  {
    name: 'GSUTH',
    type: 'Student',
    description: 'Gombe State University Teaching Hospital',
  },
  {
    name: 'AKTH',
    type: 'Student',
    description: 'Aminu Kano Teaching Hospital',
  },
  {
    name: 'AAU/ISTH',
    type: 'Student',
    description: 'Ambrose Alli University / Irrua Specialist Teaching Hospital',
  },
  {
    name: 'IMSUTH',
    type: 'Student',
    description: 'Imo State University Teaching Hospital',
  },
  {
    name: 'FUTH-LAFIA',
    type: 'Student',
    description: 'Federal University Teaching Hospital Lafia',
  },
  {
    name: 'RSUTH',
    type: 'Student',
    description: 'Rivers State University Teaching Hospital',
  },
];

async function addNewChapters() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    console.log(`Adding ${newChapters.length} new chapters...\n`);

    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (const chapter of newChapters) {
      try {
        // Check if chapter already exists
        const exists = await mongoose.connection.db
          .collection('chapters')
          .findOne({ name: chapter.name, type: chapter.type });

        if (exists) {
          console.log(`⚠️  Skipped: ${chapter.name} (${chapter.type}) - already exists`);
          skipped++;
          continue;
        }

        // Add chapter
        await mongoose.connection.db
          .collection('chapters')
          .insertOne({
            ...chapter,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

        added++;
        console.log(`✅ Added: ${chapter.name} (${chapter.type})`);

      } catch (err) {
        console.error(`❌ Error adding ${chapter.name}:`, err.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total chapters to add: ${newChapters.length}`);
    console.log(`✅ Successfully added: ${added}`);
    console.log(`⚠️  Skipped (already exist): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);

    // Show current chapter counts
    const studentCount = await mongoose.connection.db
      .collection('chapters')
      .countDocuments({ type: 'Student' });
    
    const doctorCount = await mongoose.connection.db
      .collection('chapters')
      .countDocuments({ type: 'Doctor' });
    
    const globalCount = await mongoose.connection.db
      .collection('chapters')
      .countDocuments({ type: 'GlobalNetwork' });

    console.log('\n📊 CURRENT CHAPTER COUNTS:');
    console.log(`   Student chapters: ${studentCount}`);
    console.log(`   Doctor chapters: ${doctorCount}`);
    console.log(`   GlobalNetwork chapters: ${globalCount}`);
    console.log(`   Total: ${studentCount + doctorCount + globalCount}`);

    console.log('\n✅ Done!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

addNewChapters();
