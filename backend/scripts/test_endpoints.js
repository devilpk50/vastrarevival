const http = require('http');

function post(path, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data || {});
    const req = http.request({ hostname: 'localhost', port: 3001, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }, timeout: 5000 }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(payload);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve) => {
    http.get({ hostname: 'localhost', port: 3001, path, timeout: 5000 }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

(async () => {
  console.log('=== API ENDPOINT TEST SUITE ===\n');

  // Test 1: Health
  console.log('1. GET /api/health');
  const health = await get('/api/health');
  console.log('   Status:', health.status);
  if (health.body) console.log('   Body:', health.body);
  console.log('');

  // Test 2: Register
  console.log('2. POST /api/auth/register');
  const register = await post('/api/auth/register', {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  });
  console.log('   Status:', register.status);
  const regData = register.body ? JSON.parse(register.body) : {};
  console.log('   Response:', regData);
  const userId = regData.userId;
  console.log('');

  // Test 3: Login (attempt)
  console.log('3. POST /api/auth/login');
  const login = await post('/api/auth/login', {
    email: 'test@example.com',
    password: 'password123'
  });
  console.log('   Status:', login.status);
  const loginData = login.body ? JSON.parse(login.body) : {};
  console.log('   Response:', loginData);
  console.log('');

  // Test 4: Get all products
  console.log('4. GET /api/products');
  const products = await get('/api/products');
  console.log('   Status:', products.status);
  const prodData = products.body ? JSON.parse(products.body) : {};
  console.log('   Products count:', prodData.products?.length || 0);
  console.log('');

  // Test 5: Add product (for testing)
  console.log('5. POST /api/products (create sample product)');
  const product = await post('/api/products', {
    name: 'Sample Shirt',
    description: 'Vintage shirt',
    price: 25.99,
    image: '/assets/placeholder.png',
    category: 'shirts',
    stock: 10
  });
  console.log('   Status:', product.status);
  const prodCreated = product.body ? JSON.parse(product.body) : {};
  const productId = prodCreated.product?._id;
  console.log('   Created product ID:', productId);
  console.log('');

  // Test 6: Get products again
  console.log('6. GET /api/products (after create)');
  const products2 = await get('/api/products');
  const prodData2 = products2.body ? JSON.parse(products2.body) : {};
  console.log('   Products count:', prodData2.products?.length || 0);
  console.log('');

  // Test 7: Get cart
  if (userId) {
    console.log('7. GET /api/cart/:userId');
    const cart = await get(`/api/cart/${userId}`);
    console.log('   Status:', cart.status);
    const cartData = cart.body ? JSON.parse(cart.body) : {};
    console.log('   Cart items:', cartData.cart?.items?.length || 0);
    console.log('');

    // Test 8: Add to cart
    if (productId) {
      console.log('8. POST /api/cart/:userId/add');
      const addCart = await post(`/api/cart/${userId}/add`, {
        productId,
        quantity: 2
      });
      console.log('   Status:', addCart.status);
      const addData = addCart.body ? JSON.parse(addCart.body) : {};
      console.log('   Cart items after add:', addData.cart?.items?.length || 0);
      console.log('');
    }
  }

  console.log('=== TEST COMPLETE ===');
})();
