const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testDeleteApartment() {
  try {
    // First, let's get all apartments to find a valid ID
    console.log('Fetching apartments...');
    const listResponse = await axios.get(`${API_URL}/apartments`);
    console.log(`Found ${listResponse.data.apartments.length} apartments`);

    if (listResponse.data.apartments.length === 0) {
      console.log('No apartments found to delete. Creating a test apartment first...');
      
      // Create a test apartment
      const createResponse = await axios.post(`${API_URL}/apartments`, {
        title: '🧪 Test Apartment for Deletion',
        description: 'This is a test apartment for testing deletion',
        images: [],
        price: 5000,
        priceUnit: 'month',
        wilaya: 'Test Wilaya',
        wilayaId: 1,
        municipality: 'Test Municipality',
        rooms: 2,
        bathrooms: 1,
        area: 100,
        amenities: [],
        isFeatured: false,
        isActive: true,
        landlordId: 'test-landlord-123',
        landlordPhone: '+21312345678',
        landlordName: 'Test User',
      });
      
      console.log('✅ Test apartment created:', createResponse.data.id);
    }

    // Get fresh list
    const freshList = await axios.get(`${API_URL}/apartments`);
    const apartmentToDelete = freshList.data.apartments[0];
    
    if (!apartmentToDelete) {
      console.log('Still no apartments. Something is wrong.');
      return;
    }

    console.log('\n--- Testing DELETE ---');
    console.log('Apartment ID:', apartmentToDelete.id);
    console.log('Apartment Title:', apartmentToDelete.title);

    // Try to delete
    console.log(`Attempting to delete apartment ${apartmentToDelete.id}...`);
    const deleteResponse = await axios.delete(`${API_URL}/apartments/${apartmentToDelete.id}`);
    
    console.log('✅ DELETE successful');
    console.log('Response:', deleteResponse.data);

    // Verify deletion
    console.log('\nVerifying deletion...');
    const finalList = await axios.get(`${API_URL}/apartments`);
    const stillExists = finalList.data.apartments.find(apt => apt.id === apartmentToDelete.id);
    
    if (stillExists) {
      console.log('❌ Apartment still exists after deletion!');
    } else {
      console.log('✅ Apartment confirmed deleted');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDeleteApartment();
