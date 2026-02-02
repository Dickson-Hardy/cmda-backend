const mongoose = require('mongoose');
require('dotenv').config();

const studentChapters = [
  "Abia State University Teaching Hospital - ABSUTH",
  "Ahmadu Bello University Teaching Hospital - ABUTH",
  "Afe Babalola University Teaching Hospital - ABUADTH",
  "Abubakar Tafawa Balewa University Teaching Hospital - ATBUTH",
  "Aminu Kano University Teaching Hospital - AKTH",
  "Alex Ekwueme University Teaching Hospital - AEFUTH",
  "Ambrose Alli University/ Irrua Specialist Teaching Hospital - AAU/ISTH",
  "Bowen University Teaching Hospital - BUTH",
  "Barau-Dikko University Teaching Hospital - BDTH-KASU",
  "Bingham University Teaching Hospital - BHUTH",
  "Benue State University Teaching Hospital - BSUTH",
  "Chukwuemeka Odumegwu Ojukwu University Teaching Hospital - COOUTH",
  "Delta State University Teaching Hospital - DELSUTH",
  "Ebonyi State University Teaching Hospital - EBSUTH",
  "Ekiti State University Teaching Hospital - EKSUTH",
  "Enugu State University Teaching Hospital - ESUTH",
  "Gombe State University Teaching Hospital - GSUTH",
  "Gregory University Teaching Hospital - GUTH",
  "Igbinedion University Teaching Hospital - IUTH",
  "Imo State University Teaching Hospital - IMSUTH",
  "Jos University Teaching Hospital - JUTH",
  "University of Medical Sciences Teaching Hospital (UNIMEDTH)",
  "Lagos State University Teaching Hospital - LASUTH",
  "Lagos University Teaching Hospital - LUTH",
  "Lautech Teaching Hospital - LTH",
  "Niger Delta University Teaching Hospital - NDUTH",
  "Nnamdi Azikiwe University Teaching Hospital - NAUTH",
  "Obafemi Awolowo University Teaching Hospital - OAUTH",
  "Olabisi Onabanjo University Teaching Hospital - OOUTH",
  "Osun State University Teaching Hospital - UNIOSUNTH",
  "University of Abuja Teaching Hospital - UATH",
  "Usman Dan Fodio University Teaching Hospital - UDUTH",
  "University College Hospital - UCH",
  "University of Nigeria Teaching Hospital - UNTH",
  "University of Benin Teaching Hospital - UBTH",
  "University of Calabar Teaching Hospital - UCTH",
  "University of Ilorin Teaching Hospital - UITH",
  "University of Maiduguri Teaching Hospital - UMTH",
  "University of Port Harcourt Teaching Hospital - UPTH",
  "University of Uyo Teaching Hospital – UUTH",
];

const doctorChapters = [
  "Abia - Umahia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra (COOUTH)",
  "Anambra (NAUTH)",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "CMDA Uyo",
  "Cross River",
  "Delta - DELSUTH, Oghara",
  "Delta FMC, Asaba",
  "Ebonyi",
  "Edo-Benin",
  "Edo-SHMB",
  "Edo-Irrua",
  "Ekiti - Ido",
  "Ekiti-Ado",
  "Enugu",
  "FCT Gwagwalada",
  "FCT Municipal",
  "Gombe",
  "Imo",
  "Kaduna - Kaduna",
  "Kaduna - Zaria",
  "Kano",
  "Kogi",
  "Kwara",
  "Lagos-Lasuth",
  "Lagos-Luth",
  "Nasarawa - Keffi",
  "Nasarawa - Lafiya",
  "Niger-Bida",
  "Ogun - Abeokuta",
  "Ogun - Shagamu",
  "Ondo - Owo",
  "ONDO – UNIMEDTH",
  "Osun-Ife",
  "Osun-Osogbo",
  "Oyo",
  "LAUTECH",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Kebbi",
];

const globalChapters = [
  "The Americas Region",
  "UK/Europe region",
  "Australasia Region",
  "Middle East Region",
  "Africa Region",
];

async function populateChapters() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    const chaptersCollection = mongoose.connection.db.collection('chapters');

    // Check if chapters already exist
    const existingCount = await chaptersCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠ ${existingCount} chapters already exist in database`);
      console.log('Do you want to continue? This will skip duplicates.\n');
    }

    let studentAdded = 0;
    let doctorAdded = 0;
    let globalAdded = 0;
    let skipped = 0;

    // Add student chapters
    console.log('Adding student chapters...');
    for (const name of studentChapters) {
      const existing = await chaptersCollection.findOne({ name, type: 'Student' });
      if (!existing) {
        await chaptersCollection.insertOne({
          name,
          type: 'Student',
          isActive: true,
          memberCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        studentAdded++;
      } else {
        skipped++;
      }
    }

    // Add doctor chapters
    console.log('Adding doctor chapters...');
    for (const name of doctorChapters) {
      const existing = await chaptersCollection.findOne({ name, type: 'Doctor' });
      if (!existing) {
        await chaptersCollection.insertOne({
          name,
          type: 'Doctor',
          isActive: true,
          memberCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        doctorAdded++;
      } else {
        skipped++;
      }
    }

    // Add global chapters
    console.log('Adding global chapters...');
    for (const name of globalChapters) {
      const existing = await chaptersCollection.findOne({ name, type: 'Global' });
      if (!existing) {
        await chaptersCollection.insertOne({
          name,
          type: 'Global',
          isActive: true,
          memberCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        globalAdded++;
      } else {
        skipped++;
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Student chapters added: ${studentAdded}`);
    console.log(`Doctor chapters added: ${doctorAdded}`);
    console.log(`Global chapters added: ${globalAdded}`);
    console.log(`Skipped (already exist): ${skipped}`);
    console.log(`Total chapters in database: ${await chaptersCollection.countDocuments()}`);

    await mongoose.disconnect();
    console.log('\n✓ Population complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

populateChapters();
