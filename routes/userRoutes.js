// ---------- routes/usersRoutes.js ----------
const express = require('express');
const { ObjectId } = require('mongodb');

function createUsersRoutes(userCollection, connectionCollection, verifyAdmin, verifyToken, verifyOwnership) {
    const router = express.Router();

    // get all users
    router.get('/', verifyAdmin, async (req, res) => {
        const result = await userCollection
            .find({}, { projection: { name: 1, department: 1, role: 1, userImage: 1, email: 1 } })
            .sort({ role: 1 })
            .toArray();
        res.send(result);
    });


    // get all users by a keyword
    router.get('/search/:userId', verifyToken, verifyOwnership, async (req, res) => {
        try {
            const { keyword } = req.query;
            const { userId } = req.params;

            if (!keyword || !keyword.trim()) {
                return res.status(400).json({ message: "Keyword is required" });
            }

            const searchRegex = new RegExp(keyword, "i");

            // ---------- fetch matching users (exclude logged-in user) ----------
            const users = await userCollection.find({
                _id: { $ne: new ObjectId(userId) },
                name: { $regex: searchRegex }
            }).toArray();

            // If no users matched
            if (users.length === 0) {
                return res.send([]);
            }

            // ---------- fetch connection statuses for all matched users ----------
            const targetUserIds = users.map(u => new ObjectId(u._id));

            const connections = await connectionCollection.find({
                $or: [
                    { from: new ObjectId(userId), to: { $in: targetUserIds } },
                    { to: new ObjectId(userId), from: { $in: targetUserIds } }
                ]
            }).toArray();

            const connectionMap = {};
            for (const c of connections) {
                const otherUserId =
                    c.from.toString() === userId
                        ? c.to.toString()
                        : c.from.toString();

                connectionMap[otherUserId] = {
                    connectionId: c._id,
                    from: c.from,
                    to: c.to,
                    status: c.status,
                    createdAt: c.createdAt
                };
            }

            // ---------- final response ----------
            const formatted = users.map(u => ({
                id: u._id,
                name: u.name,
                department: u.department,
                role: u.role,
                image: u.userImage,
                connectionStatus: connectionMap[u._id.toString()] || {} // empty if none
            }));

            res.send(formatted);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Server error",
                error: error.message
            });
        }
    });


    // get a user by id
    router.get('/:userId', verifyToken, async (req, res) => {
        const { userId } = req.params;
        const user = await userCollection.findOne({ _id: new ObjectId(userId) });
        res.send(user || null);
    });

    // get a user by email
    router.post('/email', verifyToken, async (req, res) => {
        const { email } = req.body;
        const query = { email: email };
        const result = await userCollection.findOne(query);
        res.send(result);
    });

    // get only available users for connection request
    router.get('/available/:userId', verifyToken, verifyOwnership, async (req, res) => {
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
    router.patch('/:userId', verifyToken, async (req, res) => {
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
    router.delete('/:userId', verifyToken, verifyOwnership, async (req, res) => {
        const { userId } = req.params;
        const result = await userCollection.deleteOne({ _id: new ObjectId(userId) });
        res.send(result);
    })

    return router;
}

module.exports = createUsersRoutes;