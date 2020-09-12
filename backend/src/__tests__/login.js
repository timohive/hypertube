const mongoose = require('mongoose');
const supertest = require('supertest');
const app = require('../app');

const User = require('../models/User');
const { hashPassword } = require('../utils/auth');

const api = supertest(app);

const validAccount = {
  username: 'test123',
  password: 'asdASD123',
  firstName: 'Test',
  lastName: 'Account',
  email: 'test@example.com'
};

describe('Logging in', () => {
  test('Login success', async () => {
    const response = await api
      .post('/api/auth/login')
      .send({username: validAccount.username, password: validAccount.password})
      .expect(200);

    expect(response.body.token).toBeDefined();
  });

  test("Login failure with incorrect username", async () => {
    const response = await api
      .post('/api/auth/login')
      .send(validAccount)
      .send({username: 'invalidUsername', password: validAccount.password})
      .expect(400);

    expect(response.body).toBe(false);
  });

  test("Login failure with incorrect password", async () => {
    const response = await api
      .post('/api/auth/login')
      .send(validAccount)
      .send({username: validAccount.username, password: '123'})
      .expect(400);

    expect(response.body).toBe(false);
  });

  beforeAll(async done => {
    await User.deleteMany({});
    const hashedPassword = await hashPassword(validAccount.password);
    const user = User({...validAccount, password: hashedPassword});
    const res = await user.save();
    if (res) {
      done();
    }
  });

  afterAll(() => {
    mongoose.connection.close();
  });
});
