const db = require('./db');

async function testFetch() {
  try {
    console.log('Testing apartment fetch...');
    
    const result = await db.query(
      "SELECT * FROM apartments WHERE id::text = $1 OR firebase_id = $1",
      ['80b3e5e6-3f7b-433a-82ed-599fc3e6d947']
    );

    console.log('Query result:', result);
    console.log('Rows:', result.rows);
    
    if (result.rows.length === 0) {
      console.log('No apartment found');
      return;
    }

    const apartment = result.rows[0];
    console.log('Apartment found:', apartment);

    // Try to update views
    const updateResult = await db.query(
      "UPDATE apartments SET views = views + 1 WHERE id = $1::uuid",
      [apartment.id]
    );

    console.log('Update result:', updateResult);
    console.log('Success!');
    
  } catch (err) {
    console.error('Error:', err);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
  }
  
  process.exit(0);
}

testFetch();
