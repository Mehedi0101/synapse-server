// ---------- imports ----------
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initDB = require('./config/dbClient'); 
// const cookieParser = require('cookie-parser');

const verifyToken = require('./middlewares/verifyToken');
const verifyOwnership = require('./middlewares/verifyOwnership');
const verifyAdmin = require('./middlewares/verifyAdmin');

const createUsersRoutes = require('./routes/userRoutes');
const createPostsRoutes = require('./routes/postRoutes');
const createChatsRoutes = require('./routes/chatRoutes');
const createMessagesRoutes = require('./routes/messageRoutes');
const createConnectionsRoutes = require('./routes/connectionRoutes');
const createMentorshipsRoutes = require('./routes/mentorshipRoutes');
const createJobsRoutes = require('./routes/jobRoutes');
const createEventsRoutes = require('./routes/eventRoutes');
const createResourcesRoutes = require('./routes/resourceRoutes');
const createNotificationsRoutes = require('./routes/notificationRoutes');
const createAdminOverviewsRoutes = require('./routes/adminOverviewRoutes');

// ---------- port ----------
const port = process.env.PORT || 5000;

// ---------- initial setup ----------
const app = express();
app.use(cors({
    origin: ['http://localhost:5173', 'https://synapse-0101.web.app'],
    credentials: true
}));
app.use(express.json());
// app.use(cookieParser());


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // ---------- collections ----------
        const {
            userCollection,
            connectionCollection,
            postCollection,
            mentorshipCollection,
            jobCollection,
            eventCollection,
            resourceCollection,
            chatInfoCollection,
            messageCollection,
            notificationCollection,
        } = await initDB();

        // ---------- user routes ----------
        app.use('/users', createUsersRoutes(userCollection, connectionCollection, verifyAdmin, verifyToken));


        // ---------- post routes ----------
        app.use('/posts', createPostsRoutes(postCollection, userCollection, notificationCollection, verifyToken, verifyOwnership));


        // ---------- chat info routes --------------
        app.use('/chat-info', createChatsRoutes(chatInfoCollection));


        // ---------- message routes -------------
        app.use('/messages', createMessagesRoutes(chatInfoCollection, messageCollection));


        // ---------- connection routes ----------------
        app.use('/connections', createConnectionsRoutes(connectionCollection, userCollection, notificationCollection));


        // ---------- mentorship routes ---------------
        app.use('/mentorship', createMentorshipsRoutes(mentorshipCollection, userCollection, notificationCollection));


        // ---------- job routes ----------
        app.use('/jobs', createJobsRoutes(jobCollection));


        // ---------- event routes -----------
        app.use('/events', createEventsRoutes(eventCollection));


        // ---------- resource routes --------------
        app.use('/resources', createResourcesRoutes(resourceCollection));


        // ---------- notification routes ------------------
        app.use('/notifications', createNotificationsRoutes(notificationCollection));


        // ---------- admin overview routes -------------------
        app.use('/admin', createAdminOverviewsRoutes(userCollection, eventCollection, jobCollection, mentorshipCollection, connectionCollection));


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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