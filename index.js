const express = require('express')
const app = express()
const port = process.env.port || 5000;
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const admin = require('firebase-admin');
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS); // Initialize Firebase Admin

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t79plj2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const userCollection = client.db('task3').collection('users');

    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.put('/users/:email', async (req, res) => {
      const email = req.params.email;
      const { lastlogin } = req.body; // Destructuring the lastlogin from the request body
    
      // Create the filter to find the user by email
      const filter = { email: email }; // No need for ObjectId, email is a string
      const options = { upsert: false }; // If you don't want to create new users on PUT, set this to false
    
      // Define what should be updated
      const updatedUser = {
        $set: {
          lastlogin: lastlogin, // Only update the lastlogin field
        },
      };
    
      // Perform the update operation
      const result = await userCollection.updateOne(filter, updatedUser, options);
    
      // Send the result back to the client
      if (result.modifiedCount > 0) {
        res.status(200).send({ message: "Login time updated successfully" });
      } else {
        res.status(404).send({ message: "User not found or not updated" });
      }
    });

    app.get('/users', async(req,res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      res.send(user);
    });



    app.delete('/users/:email', async (req, res) => {
      const email = req.params.email;

      try {
        // Delete user from Firebase Authentication
        const firebaseUser = await admin.auth().getUserByEmail(email);
        await admin.auth().deleteUser(firebaseUser.uid);
        console.log(`Deleted Firebase user with UID: ${firebaseUser.uid}`);

        // Delete user from MongoDB
        const result = await userCollection.deleteOne({ email: email });

        if (result.deletedCount > 0) {
          res.status(200).json({ message: 'User deleted successfully from Firebase and MongoDB' });
        } else {
          res.status(404).json({ message: 'User not found in MongoDB' });
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    app.put('/users/block/:email', async (req, res) => {
      const email = req.params.email;
      
      try {
        const filter = { email: email }; // Filter by email
        const updateDoc = {
          $set: { status: 'blocked' },  // Set the status to 'blocked'
        };
    
        const result = await userCollection.updateOne(filter, updateDoc);
    
        if (result.modifiedCount > 0) {
          res.status(200).json({ message: 'User blocked successfully' });
        } else {
          res.status(404).json({ message: 'User not found' });
        }
      } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    app.put('/users/unblock/:email', async (req, res) => {
      const email = req.params.email;
      
      try {
        const filter = { email: email }; // Filter by email
        const updateDoc = {
          $set: { status: 'Not-blocked' },  // Set the status to 'Not-blocked'
        };
    
        const result = await userCollection.updateOne(filter, updateDoc);
    
        if (result.modifiedCount > 0) {
          res.status(200).json({ message: 'User unblocked successfully' });
        } else {
          res.status(404).json({ message: 'User not found' });
        }
      } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

   

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
