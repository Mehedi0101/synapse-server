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
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const userCollection = client.db("synapse").collection("users");
        const connectionCollection = client.db("synapse").collection("connections");

        // ---------------------------
        // ---------- users ----------
        // ---------------------------

        // get all users
        app.get('/users', async (req, res) => {
            const result = await userCollection.find({}, { projection: { name: 1, department: 1, role: 1, userImage: 1 } }).toArray();
            res.send(result);
        })

        // get a user by id
        app.get('/users/:id', async (req, res) => {
            const { id } = req.params;
            const result = await userCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        })

        // get a user by email
        app.post('/users/email', async (req, res) => {
            const { email } = req.body;
            const query = { email: email }
            const result = await userCollection.findOne(query);
            res.send(result);
        })

        // get only available users for connection request
        app.get('/users/available/:id', async (req, res) => {
            const { id } = req.params;

            const requests = await connectionCollection.find({
                $or: [{ from: new ObjectId(id) }, { to: new ObjectId(id) }]
            }).toArray();

            const excludeId = [id];

            requests.forEach(request => {
                excludeId.push(request.from);
                excludeId.push(request.to);
            })

            const result = await userCollection.find(
                { _id: { $nin: excludeId.map(id => new ObjectId(id)) } },
                { projection: { name: 1, department: 1, role: 1, userImage: 1 } }
            ).toArray();

            res.send(result);
        })


        // insert a single user
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })



        // update a user by email
        app.patch('/users/:id', async (req, res) => {
            const { id } = req.params;
            const updatedData = req.body;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.updateOne(
                query,
                { $set: updatedData }
            );
            res.send(result);
        })



        // ---------------------------------
        // ---------- connections ----------
        // ---------------------------------

        // get all received connection request
        app.get('/connections/received/:id', async (req, res) => {
            const { id } = req.params;

            const result = await connectionCollection.aggregate([
                { $match: { to: new ObjectId(id), status: "pending" } },

                {
                    $lookup: {
                        from: "users",
                        localField: "from",
                        foreignField: "_id",
                        as: "fromUser"
                    }
                },
                { $unwind: "$fromUser" },
                {
                    $project: {
                        _id: 1,
                        status: 1,
                        createdAt: 1,
                        "fromUser._id": 1,
                        "fromUser.name": 1,
                        "fromUser.department": 1,
                        "fromUser.role": 1,
                        "fromUser.userImage": 1
                    }
                }
            ]).toArray();

            res.send(result);
        })

        // get all sent connection request
        app.get('/connections/sent/:id', async (req, res) => {
            const { id } = req.params;

            const result = await connectionCollection.aggregate([
                { $match: { from: new ObjectId(id), status: "pending" } },

                {
                    $lookup: {
                        from: "users",
                        localField: "to",
                        foreignField: "_id",
                        as: "toUser"
                    }
                },
                { $unwind: "$toUser" },
                {
                    $project: {
                        _id: 1,
                        status: 1,
                        createdAt: 1,
                        "toUser._id": 1,
                        "toUser.name": 1,
                        "toUser.department": 1,
                        "toUser.role": 1,
                        "toUser.userImage": 1
                    }
                }
            ]).toArray();

            res.send(result);
        })

        // insert a connection request
        app.post('/connections', async (req, res) => {
            const { from, to, status } = req.body;
            const existing = await connectionCollection.findOne({
                $or: [
                    { from: new ObjectId(from), to: new ObjectId(to) },
                    { from: new ObjectId(to), to: new ObjectId(from) }
                ]
            });
            if (existing) {
                return res.send({ acknowledged: "true" });
            }
            const data = {
                from: new ObjectId(from),
                to: new ObjectId(to),
                status,
                createdAt: new Date()
            }
            const result = await connectionCollection.insertOne(data);
            res.send(result);
        })

        // for accepting a connection request
        app.patch('/connections/accept', async (req, res) => {
            const { id } = req.body;

            const result = await connectionCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: "accepted" } }
            );

            res.send(result);
        });

        // for cancelling a connection request
        app.delete('/connections/:id', async (req, res) => {
            const { id } = req.params;
            const result = await connectionCollection.deleteOne({ _id: new ObjectId(id) });
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
