const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Sample admin token - replace with actual admin token
const ADMIN_TOKEN = 'your-admin-token-here';

const headers = {
  Authorization: `Bearer ${ADMIN_TOKEN}`,
  'Content-Type': 'application/json',
};

async function testPricingAPI() {
  console.log('🧪 Testing Pricing API Endpoints...\n');

  try {
    // 1. Initialize default pricing data
    console.log('1️⃣ Initializing default pricing data...');
    const initResponse = await axios.post(
      `${API_BASE_URL}/admin/pricing/initialize`,
      {},
      { headers },
    );
    console.log('✅ Default pricing initialized:', initResponse.status);

    // 2. Get all pricing entries
    console.log('\n2️⃣ Fetching all pricing entries...');
    const getAllResponse = await axios.get(`${API_BASE_URL}/admin/pricing`, { headers });
    console.log('✅ Pricing entries fetched:', getAllResponse.data.length, 'entries');

    // 3. Get filtered pricing entries
    console.log('\n3️⃣ Fetching subscription pricing entries...');
    const getFilteredResponse = await axios.get(`${API_BASE_URL}/admin/pricing?type=subscription`, {
      headers,
    });
    console.log('✅ Subscription pricing entries:', getFilteredResponse.data.length, 'entries');

    // 4. Test price retrieval endpoints
    console.log('\n4️⃣ Testing price retrieval endpoints...');

    try {
      const studentPriceResponse = await axios.get(
        `${API_BASE_URL}/admin/pricing/subscription-price?userRole=Student&frequency=annual`,
        { headers },
      );
      console.log('✅ Student annual price:', studentPriceResponse.data);
    } catch (error) {
      console.log('❌ Student price error:', error.message);
    }

    try {
      const doctorPriceResponse = await axios.get(
        `${API_BASE_URL}/admin/pricing/subscription-price?userRole=Doctor&frequency=annual`,
        { headers },
      );
      console.log('✅ Doctor annual price:', doctorPriceResponse.data);
    } catch (error) {
      console.log('❌ Doctor price error:', error.message);
    }

    try {
      const incomeBasedPriceResponse = await axios.get(
        `${API_BASE_URL}/admin/pricing/income-based-price?incomeBracket=less_than_50k&frequency=annual`,
        { headers },
      );
      console.log('✅ Income-based price (less than 50k, annual):', incomeBasedPriceResponse.data);
    } catch (error) {
      console.log('❌ Income-based price error:', error.message);
    }

    try {
      const lifetimePriceResponse = await axios.get(
        `${API_BASE_URL}/admin/pricing/lifetime-price?membershipType=gold`,
        { headers },
      );
      console.log('✅ Lifetime gold price:', lifetimePriceResponse.data);
    } catch (error) {
      console.log('❌ Lifetime price error:', error.message);
    }

    // 5. Create a new pricing entry
    console.log('\n5️⃣ Creating new pricing entry...');
    const newPricing = {
      type: 'subscription',
      userRole: 'Student',
      frequency: 'monthly',
      amount: 100,
      currency: 'NGN',
      description: 'Test monthly student pricing',
      isActive: true,
    };

    try {
      const createResponse = await axios.post(`${API_BASE_URL}/admin/pricing`, newPricing, {
        headers,
      });
      console.log('✅ New pricing entry created:', createResponse.data._id);

      // 6. Update the pricing entry
      console.log('\n6️⃣ Updating pricing entry...');
      const updateData = { amount: 150, description: 'Updated test pricing' };
      const updateResponse = await axios.put(
        `${API_BASE_URL}/admin/pricing/${createResponse.data._id}`,
        updateData,
        { headers },
      );
      console.log('✅ Pricing entry updated:', updateResponse.data.amount);

      // 7. Delete the pricing entry
      console.log('\n7️⃣ Deleting pricing entry...');
      await axios.delete(`${API_BASE_URL}/admin/pricing/${createResponse.data._id}`, { headers });
      console.log('✅ Pricing entry deleted');
    } catch (error) {
      console.log('❌ CRUD operations error:', error.response?.data || error.message);
    }

    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('❌ API Test failed:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.log('\n💡 Note: You need to replace ADMIN_TOKEN with a valid admin token');
      console.log('   1. Login as admin user');
      console.log('   2. Copy the JWT token from the response');
      console.log('   3. Update the ADMIN_TOKEN variable in this script');
    }
  }
}

// Run the test
testPricingAPI();
