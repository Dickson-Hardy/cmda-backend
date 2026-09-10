const mongoose = require('mongoose');
require('dotenv').config();

const APPLY = process.argv.includes('--apply');

const locationGroups = [
  // Doctor chapters
  { type: 'Doctor', location: 'Abia State', names: ['Abia - Umahia'] },
  { type: 'Doctor', location: 'Adamawa State', names: ['Adamawa'] },
  { type: 'Doctor', location: 'Akwa Ibom State', names: ['Akwa Ibom', 'CMDA Uyo'] },
  { type: 'Doctor', location: 'Anambra State', names: ['Anambra (COOUTH)', 'Anambra (NAUTH)'] },
  { type: 'Doctor', location: 'Bauchi State', names: ['Bauchi'] },
  { type: 'Doctor', location: 'Bayelsa State', names: ['Bayelsa'] },
  { type: 'Doctor', location: 'Benue State', names: ['Benue'] },
  { type: 'Doctor', location: 'Borno State', names: ['Borno'] },
  { type: 'Doctor', location: 'Cross River State', names: ['Cross River'] },
  {
    type: 'Doctor',
    location: 'Delta State',
    names: ['Delta - DELSUTH, Oghara', 'Delta FMC, Asaba'],
  },
  { type: 'Doctor', location: 'Ebonyi State', names: ['Ebonyi'] },
  { type: 'Doctor', location: 'Edo State', names: ['Edo-Benin', 'Edo-Irrua', 'Edo-SHMB'] },
  { type: 'Doctor', location: 'Ekiti State', names: ['Ekiti - Ido', 'Ekiti-Ado'] },
  { type: 'Doctor', location: 'Enugu State', names: ['Enugu'] },
  {
    type: 'Doctor',
    location: 'Federal Capital Territory',
    names: ['FCT Gwagwalada', 'FCT Municipal'],
  },
  { type: 'Doctor', location: 'Gombe State', names: ['Gombe'] },
  { type: 'Doctor', location: 'Imo State', names: ['Imo'] },
  { type: 'Doctor', location: 'Kaduna State', names: ['Kaduna - Kaduna', 'Kaduna - Zaria'] },
  { type: 'Doctor', location: 'Kano State', names: ['Kano'] },
  { type: 'Doctor', location: 'Kebbi State', names: ['Kebbi'] },
  { type: 'Doctor', location: 'Kogi State', names: ['Kogi'] },
  { type: 'Doctor', location: 'Kwara State', names: ['Kwara'] },
  {
    type: 'Doctor',
    location: 'Lagos State',
    names: ['Lagos', 'Lagos chapter', 'Lagos-Lasuth', 'Lagos-Luth'],
  },
  { type: 'Doctor', location: 'Nasarawa State', names: ['Nasarawa - Keffi', 'Nasarawa - Lafiya'] },
  { type: 'Doctor', location: 'Niger State', names: ['Niger-Bida'] },
  { type: 'Doctor', location: 'Ogun State', names: ['Ogun - Abeokuta', 'Ogun - Shagamu'] },
  { type: 'Doctor', location: 'Ondo State', names: ['Ondo - Owo', 'ONDO – UNIMEDTH'] },
  { type: 'Doctor', location: 'Osun State', names: ['Osun-Ife', 'Osun-Osogbo'] },
  { type: 'Doctor', location: 'Oyo State', names: ['Oyo', 'LAUTECH'] },
  { type: 'Doctor', location: 'Plateau State', names: ['Plateau'] },
  { type: 'Doctor', location: 'Rivers State', names: ['Rivers'] },
  { type: 'Doctor', location: 'Sokoto State', names: ['Sokoto'] },
  { type: 'Doctor', location: 'Taraba State', names: ['Taraba'] },

  // Global chapters
  { type: 'Global', location: 'Africa', names: ['Africa Region'] },
  { type: 'Global', location: 'Australasia', names: ['Australasia Region'] },
  { type: 'Global', location: 'Middle East', names: ['Middle East Region'] },
  { type: 'Global', location: 'The Americas', names: ['The Americas Region'] },
  { type: 'Global', location: 'United Kingdom and Europe', names: ['UK/Europe region'] },

  // Student chapters, including abbreviation records already present in production.
  {
    type: 'Student',
    location: 'Abia State',
    names: [
      'ABSUTH',
      'Abia State University Teaching Hospital - ABSUTH',
      'Gregory University Teaching Hospital - GUTH',
    ],
  },
  {
    type: 'Student',
    location: 'Anambra State',
    names: [
      'Chukwuemeka Odumegwu Ojukwu University Teaching Hospital - COOUTH',
      'Nnamdi Azikiwe University Teaching Hospital - NAUTH',
    ],
  },
  {
    type: 'Student',
    location: 'Akwa Ibom State',
    names: ['University of Uyo Teaching Hospital – UUTH'],
  },
  {
    type: 'Student',
    location: 'Bauchi State',
    names: ['Abubakar Tafawa Balewa University Teaching Hospital - ATBUTH'],
  },
  {
    type: 'Student',
    location: 'Bayelsa State',
    names: ['Niger Delta University Teaching Hospital - NDUTH'],
  },
  {
    type: 'Student',
    location: 'Benue State',
    names: ['Benue State University Teaching Hospital - BSUTH'],
  },
  {
    type: 'Student',
    location: 'Borno State',
    names: ['University of Maiduguri Teaching Hospital - UMTH'],
  },
  {
    type: 'Student',
    location: 'Cross River State',
    names: ['University of Calabar Teaching Hospital - UCTH'],
  },
  {
    type: 'Student',
    location: 'Delta State',
    names: ['Delta State University Teaching Hospital - DELSUTH'],
  },
  {
    type: 'Student',
    location: 'Ebonyi State',
    names: [
      'AE-FUTH',
      'Alex Ekwueme University Teaching Hospital - AEFUTH',
      'EBSUTH',
      'Ebonyi State University Teaching Hospital - EBSUTH',
    ],
  },
  {
    type: 'Student',
    location: 'Edo State',
    names: [
      'AAU/ISTH',
      'Ambrose Alli University/ Irrua Specialist Teaching Hospital - AAU/ISTH',
      'Igbinedion University Teaching Hospital - IUTH',
      'University of Benin Teaching Hospital - UBTH',
    ],
  },
  {
    type: 'Student',
    location: 'Ekiti State',
    names: [
      'Afe Babalola University Teaching Hospital - ABUADTH',
      'Ekiti State University Teaching Hospital - EKSUTH',
    ],
  },
  {
    type: 'Student',
    location: 'Enugu State',
    names: [
      'Enugu State University Teaching Hospital - ESUTH',
      'University of Nigeria Teaching Hospital - UNTH',
    ],
  },
  {
    type: 'Student',
    location: 'Federal Capital Territory',
    names: ['University of Abuja Teaching Hospital - UATH'],
  },
  {
    type: 'Student',
    location: 'Gombe State',
    names: ['GSUTH', 'GUTH', 'Gombe State University Teaching Hospital - GSUTH'],
  },
  {
    type: 'Student',
    location: 'Imo State',
    names: ['IMSUTH', 'Imo State University Teaching Hospital - IMSUTH'],
  },
  {
    type: 'Student',
    location: 'Kaduna State',
    names: [
      'ABUTH',
      'Ahmadu Bello University Teaching Hospital - ABUTH',
      'BDTH-KASU',
      'Barau-Dikko University Teaching Hospital - BDTH-KASU',
    ],
  },
  {
    type: 'Student',
    location: 'Kano State',
    names: ['AKTH', 'Aminu Kano University Teaching Hospital - AKTH'],
  },
  {
    type: 'Student',
    location: 'Kwara State',
    names: ['University of Ilorin Teaching Hospital - UITH'],
  },
  {
    type: 'Student',
    location: 'Lagos State',
    names: [
      'LASUTH',
      'Lagos State University Teaching Hospital - LASUTH',
      'Lagos University Teaching Hospital - LUTH',
    ],
  },
  {
    type: 'Student',
    location: 'Nasarawa State',
    names: ['FUTH-LAFIA'],
  },
  {
    type: 'Student',
    location: 'Ogun State',
    names: ['Olabisi Onabanjo University Teaching Hospital - OOUTH'],
  },
  {
    type: 'Student',
    location: 'Ondo State',
    names: ['University of Medical Sciences Teaching Hospital (UNIMEDTH)'],
  },
  {
    type: 'Student',
    location: 'Osun State',
    names: [
      'Obafemi Awolowo University Teaching Hospital - OAUTH',
      'Osun State University Teaching Hospital - UNIOSUNTH',
    ],
  },
  {
    type: 'Student',
    location: 'Oyo State',
    names: [
      'Bowen University Teaching Hospital - BUTH',
      'Lautech Teaching Hospital - LTH',
      'University College Hospital - UCH',
    ],
  },
  {
    type: 'Student',
    location: 'Plateau State',
    names: [
      'Bingham University Teaching Hospital - BHUTH',
      'JUTH',
      'Jos University Teaching Hospital - JUTH',
    ],
  },
  {
    type: 'Student',
    location: 'Rivers State',
    names: ['RSUTH', 'University of Port Harcourt Teaching Hospital - UPTH'],
  },
  {
    type: 'Student',
    location: 'Sokoto State',
    names: ['UDUTH', 'Usman Dan Fodio University Teaching Hospital - UDUTH'],
  },
];

const locationSeeds = locationGroups.flatMap(({ type, location, names }) =>
  names.map((name) => ({ name, type, location })),
);

const keyFor = ({ name, type }) => `${type}\u0000${name}`;
const isMissingLocation = (location) =>
  location === undefined ||
  location === null ||
  (typeof location === 'string' && (location.trim() === '' || location === 'N/A'));

async function seedChapterLocations() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const chaptersCollection = mongoose.connection.db.collection('chapters');
  const chapters = await chaptersCollection
    .find({}, { projection: { name: 1, type: 1, location: 1 } })
    .toArray();
  const locationsByChapter = new Map(locationSeeds.map((seed) => [keyFor(seed), seed.location]));

  const updates = chapters
    .filter(
      (chapter) => locationsByChapter.has(keyFor(chapter)) && isMissingLocation(chapter.location),
    )
    .map((chapter) => ({ ...chapter, nextLocation: locationsByChapter.get(keyFor(chapter)) }));
  const preserved = chapters.filter(
    (chapter) => locationsByChapter.has(keyFor(chapter)) && !isMissingLocation(chapter.location),
  );
  const unmapped = chapters.filter((chapter) => !locationsByChapter.has(keyFor(chapter)));

  console.log(APPLY ? 'APPLY MODE' : 'DRY RUN');
  console.log(`Chapters found: ${chapters.length}`);
  console.log(`Locations to update: ${updates.length}`);
  console.log(`Existing locations preserved: ${preserved.length}`);
  console.log(`Unmapped chapters: ${unmapped.length}`);

  for (const chapter of updates) {
    console.log(
      `  ${chapter.name} (${chapter.type}): ${chapter.location || 'missing'} -> ${chapter.nextLocation}`,
    );
  }

  if (unmapped.length > 0) {
    console.log('\nUnmapped chapters (no changes made):');
    for (const chapter of unmapped) console.log(`  ${chapter.name} (${chapter.type})`);
  }

  if (!APPLY || updates.length === 0) {
    if (!APPLY) console.log('\nDry run complete. Re-run with --apply to write these updates.');
    return;
  }

  const result = await chaptersCollection.bulkWrite(
    updates.map(({ _id, nextLocation }) => ({
      updateOne: {
        filter: {
          _id,
          $or: [
            { location: { $exists: false } },
            { location: null },
            { location: '' },
            { location: 'N/A' },
          ],
        },
        update: { $set: { location: nextLocation, updatedAt: new Date() } },
      },
    })),
    { ordered: false },
  );

  console.log(`\nUpdated ${result.modifiedCount} chapter locations.`);
}

if (require.main === module) {
  seedChapterLocations()
    .catch((error) => {
      console.error(`Chapter location seed failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = { locationSeeds };
