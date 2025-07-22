const https = require('https');

// Test the rating system API endpoint
const testRatingSystem = async () => {
  const testEmail = 'komekkotime@gmail.com';
  const url = `https://hawaiissbu.onrender.com/api/test-rating-system?playerEmail=${encodeURIComponent(testEmail)}`;
  
  console.log('Testing rating system API...');
  console.log('URL:', url);
  
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response headers:', res.headers);
        
        try {
          const result = JSON.parse(data);
          console.log('Response data:', JSON.stringify(result, null, 2));
          resolve(result);
        } catch (error) {
          console.error('Error parsing response:', error);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      console.error('Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

// Run the test
testRatingSystem()
  .then((result) => {
    console.log('✅ Rating system test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Rating system test failed:', error);
    process.exit(1);
  }); 