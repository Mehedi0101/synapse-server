// ---------- routes/usersRoutes.js ----------
const express = require('express');
const { ObjectId } = require('mongodb');

function createConnectionsRoutes(connectionCollection, userCollection, notificationCollection) {
    const router = express.Router();

    // get all received connection request
    router.get('/received/:connectionId', async (req, res) => {
        const { connectionId } = req.params;

        const result = await connectionCollection.aggregate([
            { $match: { to: new ObjectId(connectionId), status: "pending" } },

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
    router.get('/sent/:userId', async (req, res) => {
        const { userId } = req.params;

        const result = await connectionCollection.aggregate([
            { $match: { from: new ObjectId(userId), status: "pending" } },

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

    // get all accepted connections
    router.get('/accepted/:userId', async (req, res) => {
        const { userId } = req.params;

        const result = await connectionCollection.aggregate([
            {
                $match: {
                    $or: [
                        { from: new ObjectId(userId) },
                        { to: new ObjectId(userId) }
                    ],
                    status: "accepted"
                }
            },
            {
                $addFields: {
                    otherUserId: {
                        $cond: [
                            { $eq: ["$from", new ObjectId(userId)] },
                            "$to",
                            "$from"
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "otherUserId",
                    foreignField: "_id",
                    as: "otherUser"
                }
            },
            { $unwind: "$otherUser" },
            {
                $project: {
                    _id: 1,          // connection ID (for delete action)
                    status: 1,
                    createdAt: 1,
                    "otherUser._id": 1,
                    "otherUser.name": 1,
                    "otherUser.department": 1,
                    "otherUser.role": 1,
                    "otherUser.userImage": 1
                }
            }
        ]).toArray();

        res.send(result);
    });

    // insert a connection request
    router.post('/', async (req, res) => {
        try {
            const { from, to, status } = req.body;

            const existing = await connectionCollection.findOne({
                $or: [
                    { from: new ObjectId(from), to: new ObjectId(to) },
                    { from: new ObjectId(to), to: new ObjectId(from) }
                ]
            });

            if (existing) {
                return res.send({ acknowledged: true });
            }

            // Insert connection request
            const data = {
                from: new ObjectId(from),
                to: new ObjectId(to),
                status,
                createdAt: new Date()
            };
            const result = await connectionCollection.insertOne(data);

            // ---------- Create notification ----------
            const sender = await userCollection.findOne({ _id: new ObjectId(from) });
            if (sender) {
                await notificationCollection.insertOne({
                    userId: new ObjectId(to),
                    message: `${sender.name} has sent you a connection request.`,
                    createdAt: new Date()
                });
            }

            res.send(result);
        } catch (error) {
            console.error("Error creating connection request:", error);
            res.status(500).send({ success: false, error: "Internal server error" });
        }
    });

    // for accepting a connection request
    router.patch("/accept", async (req, res) => {
        try {
            const { id } = req.body;

            // ---------- Find the connection first ----------
            const connection = await connectionCollection.findOne({ _id: new ObjectId(id) });
            if (!connection) {
                return res.status(404).send({ success: false, message: "Connection not found" });
            }

            // ---------- Update connection status ----------
            const result = await connectionCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: "accepted" } }
            );

            const sender = await userCollection.findOne({ _id: new ObjectId(connection.from) });
            const receiver = await userCollection.findOne({ _id: new ObjectId(connection.to) });

            // ---------- Create notification ----------
            if (receiver && sender) {
                const message = `${receiver.name} has accepted your connection request.`;

                const notification = {
                    userId: connection.from, // send to the original requester
                    message,
                    createdAt: new Date(),
                };

                await notificationCollection.insertOne(notification);
            }

            res.send(result);
        } catch (error) {
            console.error("Error accepting connection:", error);
            res.status(500).send({ success: false, message: "Internal server error" });
        }
    });

    // for cancelling a connection request
    router.delete('/:connectionId', async (req, res) => {
        const { connectionId } = req.params;
        const result = await connectionCollection.deleteOne({ _id: new ObjectId(connectionId) });
        res.send(result);
    })

    return router;
}

module.exports = createConnectionsRoutes;