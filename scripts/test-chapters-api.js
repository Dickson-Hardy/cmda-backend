const axios = require('axios');

// Test script to verify chapters API is working
async function testChaptersAPI() {
  const baseURL = process.env.API_URL || 'http://localhost:3000';
  
  console.log('🧪 Testing Chapters API...\n');
  console.log(`Base URL: ${baseURL}\n`);

  try {
    // Test 1: Get all chapters
    console.log('📋 Test 1: Fetching all chapters...');
    const allChapters = await axios.get(`${baseURL}/chapters`);
    console.log('   Raw response:', JSON.stringify(allChapters.data, null, 2));
    
    // Check if endpoint exists
    if (allChapters.status === 404 || allChapters.data.statusCode === 404) {
      console.log('❌ Chapters endpoint not found (404)');
      console.log('   Backend needs to be deployed with chapters module');
      throw new Error('Chapters API not deployed yet');
    }
    
    const totalItems = allChapters.data.data?.meta?.totalItems || allChapters.data.meta?.totalItems || 0;
    console.log(`✅ Success! Total chapters: ${totalItems}`);
    console.log(`   Response structure:`, {
      success: allChapters.data.success,
      itemsCount: allChapters.data.data?.items?.length || allChapters.data.items?.length || 0,
      meta: allChapters.data.data?.meta || allChapters.data.meta
    });
    console.log('');

    // Test 2: Get Student chapters
    console.log('📋 Test 2: Fetching Student chapters...');
    const studentChapters = await axios.get(`${baseURL}/chapters?type=Student`);
    console.log(`✅ Success! Student chapters: ${studentChapters.data.data.meta.totalItems}`);
    console.log(`   First 3 chapters:`, studentChapters.data.data.items.slice(0, 3).map(c => c.name));
    console.log('');

    // Test 3: Get Doctor chapters
    console.log('📋 Test 3: Fetching Doctor chapters...');
    const doctorChapters = await axios.get(`${baseURL}/chapters?type=Doctor`);
    console.log(`✅ Success! Doctor chapters: ${doctorChapters.data.data.meta.totalItems}`);
    console.log(`   First 3 chapters:`, doctorChapters.data.data.items.slice(0, 3).map(c => c.name));
    console.log('');

    // Test 4: Get GlobalNetwork chapters
    console.log('📋 Test 4: Fetching GlobalNetwork chapters...');
    const globalChapters = await axios.get(`${baseURL}/chapters?type=GlobalNetwork`);
    console.log(`✅ Success! GlobalNetwork chapters: ${globalChapters.data.data.meta.totalItems}`);
    if (globalChapters.data.data.items.length > 0) {
      console.log(`   Chapters:`, globalChapters.data.data.items.map(c => c.name));
    } else {
      console.log(`   ⚠️  No GlobalNetwork chapters found in database`);
    }
    console.log('');

    // Test 5: Get chapters stats
    console.log('📋 Test 5: Fetching chapters statistics...');
    const stats = await axios.get(`${baseURL}/chapters/stats`);
    console.log(`✅ Success! Statistics:`, stats.data.data);
    console.log('');

    // Summary
    console.log('📊 SUMMARY:');
    console.log('═══════════════════════════════════════');
    console.log(`Total Chapters: ${allChapters.data.data.meta.totalItems}`);
    console.log(`  - Student: ${studentChapters.data.data.meta.totalItems}`);
    console.log(`  - Doctor: ${doctorChapters.data.data.meta.totalItems}`);
    console.log(`  - GlobalNetwork: ${globalChapters.data.data.meta.totalItems}`);
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('✅ All tests passed! Chapters API is working correctly.');
    console.log('');
    console.log('💡 Frontend forms will now be able to load chapters dynamically.');
    console.log('');

  } catch (error) {
    console.error('❌ Error testing chapters API:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.message}`);
      console.error(`   URL: ${error.config.url}`);
    } else if (error.request) {
      console.error('   No response received from server');
      console.error('   Make sure the backend is running!');
    } else {
      console.error(`   ${error.message}`);
    }
    console.log('');
    console.log('⚠️  If backend is not deployed yet:');
    console.log('   1. Deploy backend code to production');
    console.log('   2. Chapters are already in database (104 total)');
    console.log('   3. Once deployed, this test should pass');
    process.exit(1);
  }
}

// Run the test
testChaptersAPI();
