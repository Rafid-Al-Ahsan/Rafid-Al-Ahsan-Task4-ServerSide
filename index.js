const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
// Initialize Firebase Admin with environment variable JSON
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)),
});

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t79plj2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient instance
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect to the MongoDB server
    client.connect();

    const userCollection = client.db('task3').collection('users');

    // API to create a new user
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // API to update last login for a user
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email;
      const { lastlogin } = req.body;

      const filter = { email: email };
      const options = { upsert: false };
      const updatedUser = { $set: { lastlogin: lastlogin } };

      const result = await userCollection.updateOne(filter, updatedUser, options);
      if (result.modifiedCount > 0) {
        res.status(200).send({ message: "Login time updated successfully" });
      } else {
        res.status(404).send({ message: "User not found or not updated" });
      }
    });

    // API to get all users
    app.get('/users', async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // API to get a specific user by email
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      res.send(user);
    });

    // API to delete a user (both in MongoDB and Firebase)
    app.delete('/users/:email', async (req, res) => {
      const email = req.params.email;

      try {
        const firebaseUser = await admin.auth().getUserByEmail(email);
        await admin.auth().deleteUser(firebaseUser.uid);

        const result = await userCollection.deleteOne({ email: email });
        if (result.deletedCount > 0) {
          res.status(200).json({ message: 'User deleted successfully' });
        } else {
          res.status(404).json({ message: 'User not found' });
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // API to block a user
    app.put('/users/block/:email', async (req, res) => {
      const email = req.params.email;

      const filter = { email: email };
      const updateDoc = { $set: { status: 'blocked' } };

      const result = await userCollection.updateOne(filter, updateDoc);
      if (result.modifiedCount > 0) {
        res.status(200).json({ message: 'User blocked successfully' });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    });

    // API to unblock a user
    app.put('/users/unblock/:email', async (req, res) => {
      const email = req.params.email;

      const filter = { email: email };
      const updateDoc = { $set: { status: 'Not-blocked' } };

      const result = await userCollection.updateOne(filter, updateDoc);
      if (result.modifiedCount > 0) {
        res.status(200).json({ message: 'User unblocked successfully' });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    });

    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.error("Error running the server:", error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
