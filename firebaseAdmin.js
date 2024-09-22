const admin = require('firebase-admin');
const path = require('path');

// Load Firebase service account key from environment variable or file path
const serviceAccount = require(path.resolve(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS));

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
