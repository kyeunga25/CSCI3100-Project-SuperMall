const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');

function load(relative, mocks, options = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const actualRequire = createRequire(filename);
  const module = { exports: {} };
  const logs = [];
  vm.runInNewContext(readFileSync(filename, 'utf8'), {
    module, exports: module.exports, __dirname: path.dirname(filename),
    require: id => Object.hasOwn(mocks, id) ? mocks[id] : actualRequire(id),
    console: { log: (...args) => logs.push(args.join(' ')), error: (...args) => logs.push(args.join(' ')) },
    process: { env: {}, exit: () => {} },
    ...options,
  }, { filename });
  return { exports: module.exports, logs };
}

test('normal startup connects without initializing or deleting data', async () => {
  let connected = 0;
  let initialized = 0;
  let listening = 0;
  const app = { use() {}, listen() { listening++; } };
  const factory = Object.assign(() => app, { json: () => () => {} });
  const mocks = {
    express: factory, cors: () => () => {}, 'cookie-parser': () => () => {},
    './modules/dbInit/dbInit': {
      connectDB: async () => { connected++; }, initDB: async () => { initialized++; },
    },
  };
  for (const route of ['OrderRoutes', 'productRoutes', 'CartRoutes', 'PaymentRoutes', 'userRoutes', 'userProfileRoutes']) {
    mocks[`./routes/${route}`] = () => {};
  }
  mocks['./modules/auth_newUserReg/auth_newUserReg'] = () => {};
  load('app.js', mocks);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(connected, 1);
  assert.equal(initialized, 0);
  assert.equal(listening, 1);
});

test('demo initialization refuses a database containing collections before any write', async () => {
  const { exports: db } = load('modules/dbInit/dbInit.js', {
    './config': { mongoURI: 'mongodb://example.invalid/test' },
    mongoose: { connection: { db: {
      listCollections: () => ({ toArray: async () => [{ name: 'existing' }] }),
      dropCollection: () => assert.fail('must never drop a collection'),
    } } },
    fs: { readdirSync: () => assert.fail('must not read seed files for an existing database') },
  });
  await assert.rejects(db.initDB(), /stopped before writing data/);
});

test('database connection errors do not log connection credentials', async () => {
  const credential = 'mongodb://synthetic:private-value@example.invalid/test';
  const result = load('modules/dbInit/dbInit.js', {
    './config': { mongoURI: credential },
    mongoose: { connect: async () => { throw new Error(credential); } },
  });
  await result.exports.connectDB();
  assert.ok(result.logs.includes('Database connection failed.'));
  assert.ok(result.logs.every(line => !line.includes(credential) && !line.includes('private-value')));
});

test('OTP delivery uses the mail boundary without logging SMTP credentials', async () => {
  const messages = [];
  const result = load('modules/auth_newUserReg/newUserReg.js', {
    dotenv: { config() {} }, '../../models/user': {},
    '../../models/registrationOTP': { findOne: async () => ({ otp: '123456' }) },
    nodemailer: { createTransport: () => ({ sendMail: async message => messages.push(message) }) },
  }, { process: { env: { MAIL_USER: 'sender@example.test', MAIL_PASS: 'synthetic-mail-secret' } } });
  await result.exports.sendOTP('reader@example.test');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, 'reader@example.test');
  assert.ok(result.logs.every(line => !line.includes('synthetic-mail-secret') && !line.includes('123456')));
});

test('multipart parser rejects malformed input and continues accepting a normal upload', async t => {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 } });
  app.post('/upload', upload.single('productPhoto'), (req, res) => res.json({ bytes: req.file.size }));
  app.use((err, req, res, next) => res.status(400).json({ error: 'invalid_upload' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/upload`;
  for (const [contentType, body] of [
    ['multipart/form-data', 'invalid'],
    ['multipart/form-data; boundary=sample', '--sample\r\nContent-Disposition: form-data; name="productPhoto"; filename="x.txt"\r\n\r\ntruncated'],
  ]) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': contentType }, body, signal: AbortSignal.timeout(3000) });
    assert.equal(response.status, 400);
  }
  const form = new FormData();
  form.set('productPhoto', new Blob(['safe']), 'sample.txt');
  const response = await fetch(url, { method: 'POST', body: form, signal: AbortSignal.timeout(3000) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { bytes: 4 });
});

test('updated mail transport creates an ordinary message entirely offline', async () => {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const message = await transport.sendMail({ from: 'sender@example.test', to: 'reader@example.test', subject: 'Test', text: 'Safe message' });
  assert.deepEqual(message.envelope.to, ['reader@example.test']);
  assert.ok(message.message.toString().includes('Safe message'));
});
