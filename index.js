// ---------- imports ----------
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// ---------- port ----------
const port = process.env.PORT || 5000;

// ---------- initial setup ----------
const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@synapse.iyi9wnk.mongodb.net/?retryWrites=true&w=majority&appName=Synapse`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    const userCollection = client.db("synapse").collection("users");

    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // ---------------------------
        // ---------- users ----------
        // ---------------------------

        // post
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Synapse Server");
})

app.listen(port, () => {
    console.log(`Synapse server is running on ${port}`);
})
