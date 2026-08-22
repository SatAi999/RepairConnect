import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import { User } from '../../models/User';
import { RepairCase } from '../../models/RepairCase';

const TEST_DB_URI = 'mongodb://localhost:27017/repairconnect_test';

describe('RepairConnect API Route Integration Tests', () => {
  let customerToken: string;
  let customerId: string;
  let caseId: string;

  let secondaryCustomerToken: string;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }
    // Clean collections
    await User.deleteMany({});
    await RepairCase.deleteMany({});
  });

  afterAll(async () => {
    // Clear and close connection
    await User.deleteMany({});
    await RepairCase.deleteMany({});
    await mongoose.disconnect();
  });

  it('should successfully register a customer account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Integration',
        email: 'jane_test@example.com',
        password: 'password123',
        role: 'CUSTOMER',
        phone: '9999999999',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('jane_test@example.com');
    
    customerToken = res.body.data.token;
    customerId = res.body.data.user.id;
  });

  it('should prevent registration with a duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate User',
        email: 'jane_test@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
  });

  it('should successfully login user and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'jane_test@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('should create a repair case for logged-in customer', async () => {
    const res = await request(app)
      .post('/api/repair-cases')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        itemName: 'Broken Screen iPhone',
        category: 'Smartphone',
        brand: 'Apple',
        model: 'iPhone 13',
        problemDescription: 'The screen is shattered and flickering green lines.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.itemName).toBe('Broken Screen iPhone');
    
    caseId = res.body.data._id;
  });

  it('should reject unauthorized access to case creation', async () => {
    const res = await request(app)
      .post('/api/repair-cases')
      .send({
        itemName: 'Unauthorized laptop',
        category: 'Laptop',
        brand: 'HP',
        problemDescription: 'No power.',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should enforce case ownership boundary: User A cannot read User B case', async () => {
    // 1. Register a secondary customer account
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Secondary Customer',
        email: 'secondary_test@example.com',
        password: 'password123',
        role: 'CUSTOMER',
      });
    
    secondaryCustomerToken = regRes.body.data.token;

    // 2. Query Jane's case using secondary token
    const fetchRes = await request(app)
      .get(`/api/repair-cases/${caseId}`)
      .set('Authorization', `Bearer ${secondaryCustomerToken}`);

    // Expect 403 Forbidden
    expect(fetchRes.status).toBe(403);
    expect(fetchRes.body.success).toBe(false);
    expect(fetchRes.body.error.code).toBe('FORBIDDEN');
  });
});
