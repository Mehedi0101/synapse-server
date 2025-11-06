// ---------- routes/usersRoutes.js ----------
const express = require('express');
const { ObjectId } = require('mongodb');

function createUsersRoutes(userCollection, connectionCollection) {
    const router = express.Router();

    // get all users
    router.get('/', async (req, res) => {
        const result = await userCollection
            .find({}, { projection: { name: 1, department: 1, role: 1, userImage: 1, email: 1 } })
            .sort({ role: 1 })
            .toArray();
        res.send(result);
    });

    // get a user by id
    router.get('/:userId', async (req, res) => {
        const { userId } = req.params;
        const user = await userCollection.findOne({ _id: new ObjectId(userId) });
        res.send(user || null);
    });

    // get a user by email
    router.post('/email', async (req, res) => {
        const { email } = req.body;
        const query = { email: email };
        const result = await userCollection.findOne(query);
        res.send(result);
    });

    // get only available users for connection request
    router.get('/available/:userId', async (req, res) => {
        const { userId } = req.params;

        const requests = await connectionCollection.find({
            $or: [{ from: new ObjectId(userId) }, { to: new ObjectId(userId) }]
        }).toArray();

        const excludeId = [userId];

        requests.forEach(request => {
            excludeId.push(request.from);
            excludeId.push(request.to);
        });

        const result = await userCollection.find(
            {
                _id: { $nin: excludeId.map(id => new ObjectId(id)) },
                role: { $ne: "Admin" }
            },
            { projection: { name: 1, department: 1, role: 1, userImage: 1 } }
        ).toArray();

        res.send(result);
    });

    // insert a single user
    router.post('/', async (req, res) => {
        const user = req.body;
        const result = await userCollection.insertOne(user);
        res.send(result);
    });

    // update a user by id
    router.patch('/:userId', async (req, res) => {
        const { userId } = req.params;
        const updatedData = req.body;
        const query = { _id: new ObjectId(userId) };
        const result = await userCollection.updateOne(
            query,
            { $set: updatedData }
        );
        res.send(result);
    });

    // delete a user
    router.delete('/:userId', async (req, res) => {
        const { userId } = req.params;
        const result = await userCollection.deleteOne({ _id: new ObjectId(userId) });
        res.send(result);
    })

    return router;
}

module.exports = createUsersRoutes;