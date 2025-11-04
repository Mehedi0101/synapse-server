// ---------- database ----------
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@synapse.iyi9wnk.mongodb.net/?retryWrites=true&w=majority&appName=Synapse`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function connectDB() {
    try {
        // await client.connect();  // optional
        const db = client.db("synapse");
        return {
            userCollection: db.collection("users"),
            connectionCollection: db.collection("connections"),
            postCollection: db.collection("posts"),
            mentorshipCollection: db.collection("mentorship"),
            jobCollection: db.collection("jobs"),
            eventCollection: db.collection("events"),
            resourceCollection: db.collection("resources"),
            chatInfoCollection: db.collection("chatInfo"),
            messageCollection: db.collection("messages"),
            notificationCollection: db.collection("notifications"),
        };
    } catch (error) {
        console.error("Database connection failed:", error);
    }
}

module.exports = { connectDB, client };