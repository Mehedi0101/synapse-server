// ---------- routes/usersRoutes.js ----------
const express = require('express');
const { ObjectId } = require('mongodb');

function createEventsRoutes(eventCollection, verifyToken, verifyOwnership, verifyAdmin) {
    const router = express.Router();

    // Get all events
    router.get('/', verifyAdmin, async (req, res) => {

        const events = await eventCollection.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "creatorId",
                    foreignField: "_id",
                    as: "creatorDetails"
                }
            },
            {
                $unwind: {
                    path: "$creatorDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    creator: {
                        _id: "$creatorDetails._id",
                        name: "$creatorDetails.name",
                        userImage: "$creatorDetails.userImage",
                    },
                    interestedCount: { $size: { $ifNull: ["$interestedUsers", []] } },
                }
            },
            {
                $project: {
                    title: 1,
                    creator: 1,
                    type: 1,
                    date: 1,
                    timeRange: 1,
                    interestedCount: 1,
                    createdAt: 1,
                }
            },
            { $sort: { createdAt: -1 } } // newest first
        ]).toArray();

        res.send(events); // return all events, not just one
    })


    // Get all events created by a user
    router.get('/user/:userId', verifyToken, verifyOwnership, async (req, res) => {
        const { userId } = req.params;

        const events = await eventCollection.aggregate([
            { $match: { creatorId: new ObjectId(userId) } },
            {
                $lookup: {
                    from: "users",
                    localField: "interestedUsers",
                    foreignField: "_id",
                    as: "interestedUserDetails"
                }
            },
            {
                $addFields: {
                    interestedCount: { $size: "$interestedUsers" },
                    interestedPreview: {
                        $slice: [
                            {
                                $map: {
                                    input: "$interestedUserDetails",
                                    as: "user",
                                    in: { $ifNull: ["$$user.userImage", ""] }
                                }
                            },
                            3
                        ]
                    },
                    isInterested: {
                        $in: [new ObjectId(userId), "$interestedUsers"]
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    type: 1,
                    date: 1,
                    banner: 1,
                    timeRange: 1,
                    interestedCount: 1,
                    interestedPreview: 1,
                    isInterested: 1
                }
            },
            { $sort: { date: 1 } }
        ]).toArray();

        res.send(events);
    });


    // Get all events except mine
    router.get('/all/:userId', verifyToken, verifyOwnership, async (req, res) => {
        const { userId } = req.params;

        const events = await eventCollection.aggregate([
            { $match: { creatorId: { $ne: new ObjectId(userId) } } },
            {
                $lookup: {
                    from: "users",
                    localField: "interestedUsers",
                    foreignField: "_id",
                    as: "interestedUserDetails"
                }
            },
            {
                $addFields: {
                    interestedCount: { $size: "$interestedUsers" },
                    interestedPreview: {
                        $slice: [
                            {
                                $map: {
                                    input: "$interestedUserDetails",
                                    as: "user",
                                    in: { $ifNull: ["$$user.userImage", ""] }
                                }
                            },
                            3
                        ]
                    },
                    isInterested: {
                        $in: [new ObjectId(userId), "$interestedUsers"]
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    type: 1,
                    date: 1,
                    banner: 1,
                    location: 1,
                    timeRange: 1,
                    interestedCount: 1,
                    interestedPreview: 1,
                    isInterested: 1
                }
            },
            { $sort: { isInterested: -1, date: 1 } }
        ]).toArray();

        res.send(events);
    });


    // get event details
    router.get('/details/:eventId', verifyToken, async (req, res) => {
        const { eventId } = req.params;
        const { userId } = req.query; // current user ID sent as query param

        const events = await eventCollection.aggregate([
            { $match: { _id: new ObjectId(eventId) } },
            {
                $lookup: {
                    from: "users",
                    localField: "creatorId",
                    foreignField: "_id",
                    as: "creatorDetails"
                }
            },
            { $unwind: { path: "$creatorDetails", preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    creator: {
                        _id: "$creatorDetails._id",
                        name: "$creatorDetails.name",
                        userImage: "$creatorDetails.userImage",
                    },
                    interestedCount: { $size: "$interestedUsers" },
                    isInterested: userId ? { $in: [new ObjectId(userId), "$interestedUsers"] } : false
                }
            },
            {
                $project: {
                    creatorId: 0,
                    creatorDetails: 0,
                    interestedUsers: 0,
                }
            }
        ]).toArray();

        res.send(events[0] || null);
    });


    // for inserting an event
    router.post('/', verifyToken, verifyOwnership, async (req, res) => {
        const event = req.body;
        event.creatorId = new ObjectId(event.creatorId);
        event.date = new Date(event.date);
        event.interestedUsers = [];
        const result = await eventCollection.insertOne(event);
        res.send(result);
    })


    // for updating an event
    router.patch('/:eventId', verifyToken, async (req, res) => {
        const { eventId } = req.params;
        const eventData = req.body;

        eventData.date = new Date(eventData.date);

        const result = await eventCollection.updateOne(
            { _id: new ObjectId(eventId) },
            {
                $set: eventData
            }
        )
        res.send(result);
    })


    // for updating interested user list
    router.patch('/interested/:eventId', verifyToken, verifyOwnership, async (req, res) => {
        try {
            const { eventId } = req.params;
            const { userId } = req.body;

            if (!ObjectId.isValid(eventId) || !ObjectId.isValid(userId)) {
                return res.status(400).send({ error: "Invalid ID format" });
            }

            const eventObjectId = new ObjectId(eventId);
            const userObjectId = new ObjectId(userId);

            // Fetch the event first
            const event = await eventCollection.findOne({ _id: eventObjectId });
            if (!event) {
                return res.status(404).send({ error: "Event not found" });
            }

            let updateQuery;

            if (event.interestedUsers?.some(id => id.equals(userObjectId))) {
                // Already interested -> remove user
                updateQuery = { $pull: { interestedUsers: userObjectId } };
            } else {
                // Not interested -> add user
                updateQuery = { $addToSet: { interestedUsers: userObjectId } };
            }

            await eventCollection.updateOne(
                { _id: eventObjectId },
                updateQuery
            );

            // Fetch updated event
            const updatedEvent = await eventCollection.aggregate([
                { $match: { _id: eventObjectId } },
                {
                    $lookup: {
                        from: "users",
                        localField: "interestedUsers",
                        foreignField: "_id",
                        as: "interestedUserDetails"
                    }
                },
                {
                    $project: {
                        title: 1,
                        type: 1,
                        date: 1,
                        timeRange: 1,
                        banner: 1,
                        interestedCount: { $size: "$interestedUsers" },
                        interestedPreview: {
                            $slice: [
                                {
                                    $map: {
                                        input: "$interestedUserDetails",
                                        as: "user",
                                        in: { $ifNull: ["$$user.userImage", ""] }
                                    }
                                },
                                3
                            ]
                        },
                        isInterested: {
                            $in: [userObjectId, "$interestedUsers"]
                        }
                    }
                }
            ]).toArray();

            res.send(updatedEvent[0]);
        } catch (err) {
            console.error(err);
            res.status(500).send({ error: "Something went wrong" });
        }
    })


    // for removing an event
    router.delete('/:eventId', verifyToken, async (req, res) => {
        const { eventId } = req.params;
        const result = await eventCollection.deleteOne({ _id: new ObjectId(eventId) });
        res.send(result);
    })

    return router;
}

module.exports = createEventsRoutes;