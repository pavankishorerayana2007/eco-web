import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../server/app.js';
import http from 'node:http';

let server;
let baseUrl;

test.before(() => {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(() => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

test('GET /api/health returns 200 and ok status', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.service, 'Quantum Market API');
  assert.ok(data.timestamp);
});

test('GET /api/products returns product catalog', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.products));
  assert.ok(data.products.length > 0);
  // Verify product structure
  const first = data.products[0];
  assert.ok(first.name);
  assert.ok(first.price);
  assert.ok(first.category);
});

test('POST /api/auth/login rejects invalid credentials', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fake@example.com', password: 'wrongpassword' }),
  });
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.success, false);
});

test('POST /api/auth/login succeeds for demo buyer account', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@demo.com', password: 'demo1234' }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.token);
  assert.equal(data.user.role, 'buyer');
});

test('Protected route requires authorization header', async () => {
  const res = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.success, false);
});

test('Role-based protection restricts buyer from accessing admin endpoints', async () => {
  // Login as buyer
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@demo.com', password: 'demo1234' }),
  });
  const { token } = await loginRes.json();

  // Attempt admin endpoint
  const adminRes = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(adminRes.status, 403);
});

test('Admin can access /api/admin/overview with admin credentials', async () => {
  // Login as admin
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@quantum.shop', password: 'demo1234' }),
  });
  const { token } = await loginRes.json();

  const overviewRes = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(overviewRes.status, 200);
  const data = await overviewRes.json();
  assert.equal(data.success, true);
  assert.ok(data.metrics);
});

test('GET non-existent API endpoint returns 404', async () => {
  const res = await fetch(`${baseUrl}/api/non-existent-route`);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.success, false);
});
