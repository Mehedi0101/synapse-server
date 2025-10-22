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
        // await client.connect();

        // ---------- collections ----------
        const userCollection = client.db("synapse").collection("users");
        const connectionCollection = client.db("synapse").collection("connections");
        const postCollection = client.db("synapse").collection("posts");
        const mentorshipCollection = client.db("synapse").collection("mentorship");
        const jobCollection = client.db("synapse").collection("jobs");
        const eventCollection = client.db("synapse").collection("events");
        const resourceCollection = client.db("synapse").collection("resources");
        const chatInfoCollection = client.db("synapse").collection("chatInfo");
        const messageCollection = client.db("synapse").collection("message");

        // ---------------------------
        // ---------- users ----------
        // ---------------------------

        // get all users
        app.get('/users', async (req, res) => {
            const result = await userCollection.find({}, { projection: { name: 1, department: 1, role: 1, userImage: 1, email: 1 } }).sort({ role: 1 }).toArray();
            res.send(result);
        })


        // get a user by id
        app.get('/users/:userId', async (req, res) => {
            const { userId } = req.params;
            const user = await userCollection.findOne({ _id: new ObjectId(userId) });
            res.send(user || null);
        })


        // get a user by email
        app.post('/users/email', async (req, res) => {
            const { email } = req.body;
            const query = { email: email }
            const result = await userCollection.findOne(query);
            res.send(result);
        })


        // get only available users for connection request
        app.get('/users/available/:userId', async (req, res) => {
            const { userId } = req.params;

            const requests = await connectionCollection.find({
                $or: [{ from: new ObjectId(userId) }, { to: new ObjectId(userId) }]
            }).toArray();

            const excludeId = [userId];

            requests.forEach(request => {
                excludeId.push(request.from);
                excludeId.push(request.to);
            })

            const result = await userCollection.find(
                {
                    _id: { $nin: excludeId.map(id => new ObjectId(id)) },
                    role: { $ne: "Admin" }
                },
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


        // update a user by id
        app.patch('/users/:userId', async (req, res) => {
            const { userId } = req.params;
            const updatedData = req.body;
            const query = { _id: new ObjectId(userId) };
            const result = await userCollection.updateOne(
                query,
                { $set: updatedData }
            );
            res.send(result);
        })



        // ---------------------------
        // ---------- posts ----------
        // ---------------------------

        // get all post
        app.get("/posts", async (req, res) => {

            const result = await postCollection.aggregate([
                // sort by createdAt descending (latest first)
                { $sort: { createdAt: -1 } },

                // lookup author info (only needed fields)
                {
                    $lookup: {
                        from: "users",
                        let: { authorId: "$authorId" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$authorId"] } } },
                            { $project: { name: 1, role: 1, department: 1, userImage: 1 } }
                        ],
                        as: "author"
                    }
                },
                { $unwind: "$author" },

                // lookup commenter info for each comment (only needed fields)
                {
                    $lookup: {
                        from: "users",
                        let: { commenterIds: "$comments.commenterId" },
                        pipeline: [
                            { $match: { $expr: { $in: ["$_id", "$$commenterIds"] } } },
                            { $project: { name: 1, role: 1, department: 1, userImage: 1 } }
                        ],
                        as: "commenters"
                    }
                },

                // merge commenter details back into each comment
                {
                    $addFields: {
                        comments: {
                            $map: {
                                input: "$comments",
                                as: "c",
                                in: {
                                    _id: "$$c._id",
                                    comment: "$$c.comment",
                                    createdAt: "$$c.createdAt",
                                    commenter: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$commenters",
                                                    as: "u",
                                                    cond: { $eq: ["$$u._id", "$$c.commenterId"] }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },

                // project only required fields
                {
                    $project: {
                        postContent: 1,
                        createdAt: 1,
                        author: 1,
                        comments: 1
                    }
                }
            ]).toArray();

            res.send(result);
        });



        // get all posts from a specific author
        app.get('/posts/author/:authorId', async (req, res) => {

            const { authorId } = req.params;

            const result = await postCollection.aggregate([
                { $match: { authorId: new ObjectId(authorId) } },

                // sort by createdAt descending (latest first)
                { $sort: { createdAt: -1 } },

                // lookup author info (only needed fields)
                {
                    $lookup: {
                        from: "users",
                        let: { authorId: "$authorId" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$authorId"] } } },
                            { $project: { name: 1, role: 1, department: 1, userImage: 1 } }
                        ],
                        as: "author"
                    }
                },
                { $unwind: "$author" },

                // lookup commenter info for each comment (only needed fields)
                {
                    $lookup: {
                        from: "users",
                        let: { commenterIds: "$comments.commenterId" },
                        pipeline: [
                            { $match: { $expr: { $in: ["$_id", "$$commenterIds"] } } },
                            { $project: { name: 1, role: 1, department: 1, userImage: 1 } }
                        ],
                        as: "commenters"
                    }
                },

                // merge commenter details back into each comment
                {
                    $addFields: {
                        comments: {
                            $map: {
                                input: "$comments",
                                as: "c",
                                in: {
                                    _id: "$$c._id",
                                    comment: "$$c.comment",
                                    createdAt: "$$c.createdAt",
                                    commenter: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$commenters",
                                                    as: "u",
                                                    cond: { $eq: ["$$u._id", "$$c.commenterId"] }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },

                // project only required fields
                {
                    $project: {
                        postContent: 1,
                        createdAt: 1,
                        author: 1,
                        comments: 1
                    }
                }
            ]).toArray();

            res.send(result);
        })


        // insert a post
        app.post('/posts', async (req, res) => {
            const { authorId, postContent } = req.body;

            const postData = {
                authorId: new ObjectId(authorId),
                postContent,
                createdAt: new Date(),
                comments: []
            }

            const result = await postCollection.insertOne(postData);
            res.send(result);
        })


        // update a post
        app.patch('/posts/:postId', async (req, res) => {
            const { postId } = req.params;
            const { postContent } = req.body;

            await postCollection.updateOne(
                { _id: new ObjectId(postId) },
                { $set: { postContent } }
            );

            const updatedPost = await postCollection.aggregate([
                { $match: { _id: new ObjectId(postId) } },
                {
                    $lookup: {
                        from: "users",
                        let: { authorId: "$authorId" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$authorId"] } } },
                            { $project: { name: 1, role: 1, department: 1, userImage: 1 } }
                        ],
                        as: "author"
                    }
                },
                { $unwind: "$author" },

                // lookup commenter info for each comment (only needed fields)
                {
                    $lookup: {
                        from: "users",
                        let: { commenterIds: "$comments.commenterId" },
                        pipeline: [
                            { $match: { $expr: { $in: ["$_id", "$$commenterIds"] } } },
                            { $project: { name: 1, role: 1, department: 1, userImage: 1 } }
                        ],
                        as: "commenters"
                    }
                },

                // merge commenter details back into each comment
                {
                    $addFields: {
                        comments: {
                            $map: {
                                input: "$comments",
                                as: "c",
                                in: {
                                    _id: "$$c._id",
                                    comment: "$$c.comment",
                                    createdAt: "$$c.createdAt",
                                    commenter: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$commenters",
                                                    as: "u",
                                                    cond: { $eq: ["$$u._id", "$$c.commenterId"] }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },

                // project only required fields
                {
                    $project: {
                        postContent: 1,
                        createdAt: 1,
                        author: 1,
                        comments: 1
                    }
                }
            ]).toArray();

            res.send(updatedPost[0]);
        })

        // patching a post for adding a comment
        app.patch('/posts/comments/add/:postId', async (req, res) => {
            const { postId } = req.params;
            const { commenterId, comment } = req.body;

            const commentData = {
                _id: new ObjectId(),
                commenterId: new ObjectId(commenterId),
                comment,
                createdAt: new Date()
            };

            await postCollection.updateOne(
                { _id: new ObjectId(postId) },
                { $push: { comments: commentData } }
            );

            const updatedPost = await postCollection.aggregate([
                { $match: { _id: new ObjectId(postId) } },
                {
                    $lookup: {
                        from: "users",
                        let: { authorId: "$authorId" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$authorId"] } } },
                            { $project: { name: 1, role: 1, department: 1, userImage: 1 } }
                        ],
                        as: "author"
                    }
                },
                { $unwind: "$author" },

                // lookup commenter info for each comment (only needed fields)
                {
                    $lookup: {
                        from: "users",
                        let: { commenterIds: "$comments.commenterId" },
                        pipeline: [
                            { $match: { $expr: { $in: ["$_id", "$$commenterIds"] } } },
                            { $project: { name: 1, role: 1, department: 1, userImage: 1 } }
                        ],
                        as: "commenters"
                    }
                },

                // merge commenter details back into each comment
                {
                    $addFields: {
                        comments: {
                            $map: {
                                input: "$comments",
                                as: "c",
                                in: {
                                    _id: "$$c._id",
                                    comment: "$$c.comment",
                                    createdAt: "$$c.createdAt",
                                    commenter: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$commenters",
                                                    as: "u",
                                                    cond: { $eq: ["$$u._id", "$$c.commenterId"] }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },

                // project only required fields
                {
                    $project: {
                        postContent: 1,
                        createdAt: 1,
                        author: 1,
                        comments: 1
                    }
                }
            ]).toArray();

            res.send(updatedPost[0]);
        })


        // patching a post for deleting a comment
        app.patch('/posts/comments/delete/:postId', async (req, res) => {
            const { postId } = req.params;
            const { commentId } = req.body;

            await postCollection.updateOne(
                { _id: new ObjectId(postId) },
                { $pull: { comments: { _id: new ObjectId(commentId) } } }
            );

            const updatedPost = await postCollection.aggregate([
                { $match: { _id: new ObjectId(postId) } },
                {
                    $lookup: {
                        from: "users",
                        let: { authorId: "$authorId" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$authorId"] } } },
                            { $project: { name: 1, role: 1, department: 1, userImage: 1 } }
                        ],
                        as: "author"
                    }
                },
                { $unwind: "$author" },

                // lookup commenter info for each comment (only needed fields)
                {
                    $lookup: {
                        from: "users",
                        let: { commenterIds: "$comments.commenterId" },
                        pipeline: [
                            { $match: { $expr: { $in: ["$_id", "$$commenterIds"] } } },
                            { $project: { name: 1, role: 1, department: 1, userImage: 1 } }
                        ],
                        as: "commenters"
                    }
                },

                // merge commenter details back into each comment
                {
                    $addFields: {
                        comments: {
                            $map: {
                                input: "$comments",
                                as: "c",
                                in: {
                                    _id: "$$c._id",
                                    comment: "$$c.comment",
                                    createdAt: "$$c.createdAt",
                                    commenter: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$commenters",
                                                    as: "u",
                                                    cond: { $eq: ["$$u._id", "$$c.commenterId"] }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },

                // project only required fields
                {
                    $project: {
                        postContent: 1,
                        createdAt: 1,
                        author: 1,
                        comments: 1
                    }
                }
            ]).toArray();

            res.send(updatedPost[0]);
        })


        // for deleting a post
        app.delete('/posts/:postId', async (req, res) => {
            const { postId } = req.params;
            const result = await postCollection.deleteOne({ _id: new ObjectId(postId) });
            res.send(result);
        })


        // -------------------------------
        // ---------- chat info ----------
        // -------------------------------

        // fetch all chat info of a user
        app.get("/chat-info/:userId", async (req, res) => {
            try {
                const { userId } = req.params;
                const userObjId = new ObjectId(userId);

                const chats = await chatInfoCollection.aggregate([
                    // match chats that include this user
                    { $match: { participants: { $in: [userObjId] } } },

                    // compute otherUserId (the other participant)
                    {
                        $addFields: {
                            otherUserId: {
                                $cond: {
                                    if: { $eq: [{ $arrayElemAt: ["$participants", 0] }, userObjId] },
                                    then: { $arrayElemAt: ["$participants", 1] },
                                    else: { $arrayElemAt: ["$participants", 0] },
                                },
                            },
                        },
                    },

                    // lookup other user's basic info
                    {
                        $lookup: {
                            from: "users",
                            localField: "otherUserId",
                            foreignField: "_id",
                            as: "otherUser",
                        },
                    },
                    { $unwind: "$otherUser" },

                    // Project fields: note unreadCount for this user is taken from unreadCount.<userId>
                    {
                        $project: {
                            _id: 1, // chatId
                            lastMessage: 1,
                            lastAt: 1,
                            lastMessageSenderId: 1,
                            // dynamic path to unreadCount for this user; default to 0
                            unreadCount: { $ifNull: [`$unreadCount.${userId}`, 0] },
                            "otherUser._id": 1,
                            "otherUser.name": 1,
                            "otherUser.userImage": 1,
                            "otherUser.role": 1,
                        },
                    },

                    // sort most recent first
                    { $sort: { lastAt: -1 } },
                ]).toArray();

                res.send(chats);
            } catch (error) {
                console.error("Error fetching chat info:", error);
                res.status(500).send({ success: false, error: "Internal server error" });
            }
        });

        // update chat info (unread count) after reading unread messages
        app.patch("/chat-info/read/:chatId/:userId", async (req, res) => {
            try {
                const { chatId, userId } = req.params;

                if (!chatId || !userId) {
                    return res.status(400).send({ success: false, message: "Missing chatId or userId" });
                }

                // ---------- Reset unread count for this user ----------
                const result = await chatInfoCollection.updateOne(
                    { _id: new ObjectId(chatId) },
                    { $set: { [`unreadCount.${userId}`]: 0 } }
                );

                if (result.modifiedCount > 0) {
                    res.send({ success: true, message: "Unread messages cleared" });
                } else {
                    res.status(404).send({ success: false, message: "Chat not found" });
                }
            } catch (error) {
                console.error("Error marking messages as read:", error);
                res.status(500).send({ success: false, error: "Internal server error" });
            }
        });



        // ------------------------------
        // ---------- messages ----------
        // ------------------------------

        // get all messages between two users
        app.get("/messages/:userId/:friendId", async (req, res) => {
            try {
                const { userId, friendId } = req.params;

                // ---------- find chat ----------
                const chat = await chatInfoCollection.findOne({
                    participants: { $all: [new ObjectId(userId), new ObjectId(friendId)] },
                });

                if (!chat) {
                    return res.send([]); // no previous messages
                }

                // ---------- get messages ----------
                const messages = await messageCollection
                    .find({ chatId: chat._id })
                    .sort({ createdAt: 1 })
                    .toArray();

                res.send(messages);
            } catch (error) {
                console.error("Error fetching messages:", error);
                res.status(500).send({ success: false, error: "Internal server error" });
            }
        });


        // inserting a messages and update chat info
        app.post("/messages", async (req, res) => {
            try {
                const { senderId, receiverId, text } = req.body;

                if (!senderId || !receiverId || !text) {
                    return res.status(400).send({ message: "Missing required fields." });
                }

                const senderObjId = new ObjectId(senderId);
                const receiverObjId = new ObjectId(receiverId);

                // ---------- Find existing chat ----------
                const existingChat = await chatInfoCollection.findOne({
                    participants: { $all: [senderObjId, receiverObjId] },
                });

                let chatId;

                if (!existingChat) {
                    // ---------- Create new chat ----------
                    const newChat = {
                        participants: [senderObjId, receiverObjId],
                        lastMessage: text,
                        lastAt: new Date(),
                        lastMessageSenderId: senderObjId,
                        unreadCount: {
                            [receiverId]: 1, // receiver has 1 unread
                            [senderId]: 0, // sender has seen everything
                        },
                        createdAt: new Date(),
                    };

                    const inserted = await chatInfoCollection.insertOne(newChat);
                    chatId = inserted.insertedId;
                } else {
                    chatId = existingChat._id;
                    const unreadCount = existingChat.unreadCount || {};

                    // ---------- Update counts ----------
                    unreadCount[receiverId] = (unreadCount[receiverId] || 0) + 1;
                    unreadCount[senderId] = 0; // reset sender’s unread messages

                    await chatInfoCollection.updateOne(
                        { _id: chatId },
                        {
                            $set: {
                                lastMessage: text,
                                lastAt: new Date(),
                                lastMessageSenderId: senderObjId,
                                unreadCount,
                            },
                        }
                    );
                }

                // ---------- Insert message ----------
                const message = {
                    chatId,
                    senderId: senderObjId,
                    receiverId: receiverObjId,
                    text,
                    createdAt: new Date(),
                };

                const result = await messageCollection.insertOne(message);

                res.send({
                    success: true,
                    chatId,
                    insertedId: result.insertedId,
                });
            } catch (error) {
                console.error("Error sending message:", error);
                res.status(500).send({ success: false, error: "Internal server error" });
            }
        });


        // ---------------------------------
        // ---------- connections ----------
        // ---------------------------------

        // get all received connection request
        app.get('/connections/received/:connectionId', async (req, res) => {
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
        app.get('/connections/sent/:userId', async (req, res) => {
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
        app.get('/connections/accepted/:userId', async (req, res) => {
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
        app.delete('/connections/:connectionId', async (req, res) => {
            const { connectionId } = req.params;
            const result = await connectionCollection.deleteOne({ _id: new ObjectId(connectionId) });
            res.send(result);
        })



        // --------------------------------
        // ---------- mentorship ----------
        // --------------------------------

        // get all mentorship request
        app.get('/mentorship', async (req, res) => {
            const data = await mentorshipCollection.aggregate([
                {
                    $lookup: {
                        from: "users",
                        localField: "mentorId",
                        foreignField: "_id",
                        as: "mentor"
                    }
                },
                { $unwind: "$mentor" },
                {
                    $lookup: {
                        from: "users",
                        localField: "studentId",
                        foreignField: "_id",
                        as: "student"
                    }
                },
                { $unwind: "$student" },
                {
                    $project: {
                        _id: 1,
                        goal: 1,
                        description: 1,
                        status: 1,
                        createdAt: 1,
                        "mentor._id": 1,
                        "mentor.name": 1,
                        "mentor.userImage": 1,
                        "student._id": 1,
                        "student.name": 1,
                        "student.userImage": 1,
                    }
                }
            ]).toArray();

            res.send(data);
        });


        // get mentorship request details
        app.get('/mentorship/:id', async (req, res) => {
            const { id } = req.params;

            const data = await mentorshipCollection.aggregate([
                {
                    $match: { _id: new ObjectId(id) }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "mentorId",
                        foreignField: "_id",
                        as: "mentor"
                    }
                },
                { $unwind: "$mentor" },
                {
                    $lookup: {
                        from: "users",
                        localField: "studentId",
                        foreignField: "_id",
                        as: "student"
                    }
                },
                { $unwind: "$student" },

                // -------- lookup accepted mentorships of this mentor --------
                {
                    $lookup: {
                        from: "mentorships", // collection name
                        let: { mentorId: "$mentorId" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$mentorId", "$$mentorId"] },
                                            { $eq: ["$status", "accepted"] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "acceptedMentorships"
                    }
                },
                {
                    $addFields: {
                        mentorAcceptedCount: { $size: "$acceptedMentorships" }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        goal: 1,
                        description: 1,
                        status: 1,
                        createdAt: 1,
                        steps: 1,
                        currentStep: 1,
                        "mentor._id": 1,
                        "mentor.name": 1,
                        "mentor.userImage": 1,
                        "student._id": 1,
                        "student.name": 1,
                        "student.userImage": 1,
                        mentorAcceptedCount: 1
                    }
                }
            ]).toArray();

            res.send(data[0] || null);
        });


        // get mentorship request based on the studentId
        app.get('/mentorship/student/:studentId', async (req, res) => {
            const { studentId } = req.params;
            const data = await mentorshipCollection.aggregate([
                {
                    $match: {
                        studentId: new ObjectId(studentId),
                        status: { $in: ["assigned", "accepted", "pending"] }
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "mentorId",
                        foreignField: "_id",
                        as: "mentor"
                    }
                },
                { $unwind: "$mentor" },
                {
                    $project: {
                        _id: 1,          // connection ID (for delete action)
                        studentId: 1,
                        goal: 1,
                        description: 1,
                        status: 1,
                        createdAt: 1,
                        steps: 1,
                        currentStep: 1,
                        "mentor._id": 1,
                        "mentor.name": 1,
                        "mentor.userImage": 1,
                    }
                }
            ]).toArray();
            res.send(data[0] || null);
        })


        // get mentorship request based on the mentorId
        app.get('/mentorship/mentor/:mentorId', async (req, res) => {
            const { mentorId } = req.params;
            const data = await mentorshipCollection.aggregate([
                {
                    $match: {
                        mentorId: new ObjectId(mentorId),
                        status: { $in: ["assigned", "accepted"] }
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "studentId",
                        foreignField: "_id",
                        as: "student"
                    }
                },
                { $unwind: "$student" },
                {
                    $project: {
                        _id: 1,          // connection ID (for delete action)
                        mentorId: 1,
                        goal: 1,
                        description: 1,
                        status: 1,
                        createdAt: 1,
                        steps: 1,
                        currentStep: 1,
                        "student._id": 1,
                        "student.name": 1,
                        "student.userImage": 1,
                    }
                }
            ]).toArray();
            res.send(data);
        })


        // insert a mentorship request in the database
        app.post('/mentorship', async (req, res) => {
            const request = req.body;
            request.studentId = new ObjectId(request?.studentId);
            request.mentorId = new ObjectId(request?.mentorId);
            request.status = "pending";
            request.createdAt = new Date();

            const result = await mentorshipCollection.insertOne(request);
            res.send(result);
        })


        // Update mentorship status
        app.patch('/mentorship/:id', async (req, res) => {
            const { id } = req.params;

            const updateFields = {};

            if (req?.body?.status) updateFields.status = req.body.status;
            if (req?.body?.steps) updateFields.steps = req.body.steps;
            if (req?.body?.currentStep) updateFields.currentStep = req.body.currentStep;

            const result = await mentorshipCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateFields }
            );

            res.send(result);
        });


        // Delete mentorship request
        app.delete('/mentorship/:id', async (req, res) => {
            const { id } = req.params;

            const result = await mentorshipCollection.deleteOne({ _id: new ObjectId(id) });

            res.send(result);
        });




        // --------------------------
        // ---------- jobs ----------
        // --------------------------

        // get all jobs
        app.get('/jobs', async (req, res) => {
            const jobs = await jobCollection.aggregate([
                {
                    $lookup: {
                        from: "users",
                        localField: "authorId",
                        foreignField: "_id",
                        as: "author"
                    }
                },
                { $unwind: "$author" },
                {
                    $project: {
                        jobTitle: 1,
                        jobType: 1,
                        category: 1,
                        createdAt: 1,
                        "company.name": 1,
                        "author._id": 1,
                        "author.name": 1,
                        "author.userImage": 1,
                    }
                }
            ]).toArray();

            res.send(jobs);
        })


        // get all jobs except current user's posted jobs
        app.get('/jobs/:userId', async (req, res) => {
            const { userId } = req.params;

            const jobs = await jobCollection.find(
                { authorId: { $ne: new ObjectId(userId) } }, // exclude current user's jobs
                {
                    projection: {
                        jobTitle: 1,
                        jobType: 1,
                        "company.name": 1,
                        "company.logo": 1,
                        "company.location": 1,
                        createdAt: 1
                    }
                }
            )
                .sort({ createdAt: -1 })
                .toArray();

            res.send(jobs);
        });

        // for getting all jobs posted by a user
        app.get('/jobs/user/:userId', async (req, res) => {
            const { userId } = req.params;
            const jobs = await jobCollection
                .find(
                    { authorId: new ObjectId(userId) }, // match by current user's ID
                    {
                        projection: {
                            jobTitle: 1,
                            jobType: 1,
                            "company.name": 1,
                            "company.logo": 1,
                            "company.location": 1
                        }
                    }
                )
                .sort({ createdAt: -1 }) // latest first
                .toArray();

            res.send(jobs);
        })

        // for getting job details
        app.get('/jobs/details/:jobId', async (req, res) => {
            const { jobId } = req.params;
            const jobDetails = await jobCollection.aggregate([
                { $match: { _id: new ObjectId(jobId) } },
                {
                    $lookup: {
                        from: "users",
                        localField: "authorId",
                        foreignField: "_id",
                        as: "author"
                    }
                },
                { $unwind: "$author" },
                {
                    $project: {
                        jobTitle: 1,
                        jobType: 1,
                        salary: 1,
                        category: 1,
                        description: 1,
                        responsibility: 1,
                        requirements: 1,
                        applyLink: 1,
                        createdAt: 1,
                        company: 1,
                        "author._id": 1,
                        "author.name": 1,
                        "author.userImage": 1,
                        "author.department": 1,
                    }
                }
            ]).toArray();

            res.send(jobDetails[0] || null);
        })

        // for inserting a job post
        app.post('/jobs', async (req, res) => {
            const job = req.body;
            job.authorId = new ObjectId(job.authorId);
            job.createdAt = new Date();
            const result = await jobCollection.insertOne(job);
            res.send(result);
        })


        // for updating a job post
        app.patch('/jobs/:jobId', async (req, res) => {
            const { jobId } = req.params;
            const jobData = req.body;
            jobData.authorId = new ObjectId(jobData.authorId);

            const result = await jobCollection.updateOne(
                { _id: new ObjectId(jobId) },
                {
                    $set: jobData
                }
            )
            res.send(result);
        })


        // for deleting a job post
        app.delete('/jobs/:jobId', async (req, res) => {
            const { jobId } = req.params;
            const result = await jobCollection.deleteOne({ _id: new ObjectId(jobId) });
            res.send(result);
        })



        // ----------------------------
        // ---------- events ----------
        // ----------------------------

        // Get all events
        app.get('/events', async (req, res) => {

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
        app.get('/events/user/:userId', async (req, res) => {
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
        app.get('/events/all/:userId', async (req, res) => {
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
        app.get('/events/details/:eventId', async (req, res) => {
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
        app.post('/events', async (req, res) => {
            const event = req.body;
            event.creatorId = new ObjectId(event.creatorId);
            event.date = new Date(event.date);
            event.interestedUsers = [];
            const result = await eventCollection.insertOne(event);
            res.send(result);
        })


        // for updating an event
        app.patch('/events/:eventId', async (req, res) => {
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
        app.patch('/events/interested/:eventId', async (req, res) => {
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
        app.delete('/events/:eventId', async (req, res) => {
            const { eventId } = req.params;
            const result = await eventCollection.deleteOne({ _id: new ObjectId(eventId) });
            res.send(result);
        })



        // -------------------------------
        // ---------- resources ----------
        // -------------------------------

        // get all resources
        app.get('/resources', async (req, res) => {

            const resources = await resourceCollection.aggregate([
                {
                    $lookup: {
                        from: "users",
                        localField: "authorId",
                        foreignField: "_id",
                        as: "authorDetails"
                    }
                },
                { $unwind: { path: "$authorDetails", preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        author: {
                            _id: "$authorDetails._id",
                            name: "$authorDetails.name",
                            userImage: "$authorDetails.userImage",
                        }
                    }
                },
                { $project: { authorDetails: 0 } },
                { $sort: { createdAt: 1 } }
            ]).toArray();

            res.send(resources);
        })

        // all resources contributed by a user
        app.get('/resources/my/:userId', async (req, res) => {
            const { userId } = req.params;

            const resources = await resourceCollection.aggregate([
                { $match: { authorId: new ObjectId(userId) } },
                {
                    $lookup: {
                        from: "users",
                        localField: "authorId",
                        foreignField: "_id",
                        as: "authorDetails"
                    }
                },
                { $unwind: { path: "$authorDetails", preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        author: {
                            _id: "$authorDetails._id",
                            name: "$authorDetails.name",
                            userImage: "$authorDetails.userImage",
                            role: "$authorDetails.role",
                            department: "$authorDetails.department"
                        }
                    }
                },
                { $project: { authorDetails: 0 } },
                { $sort: { createdAt: -1 } }
            ]).toArray();

            res.send(resources);
        });


        // all resources except author's resources
        app.get('/resources/all/:userId', async (req, res) => {
            const { userId } = req.params;

            const resources = await resourceCollection.aggregate([
                { $match: { authorId: { $ne: new ObjectId(userId) } } },
                {
                    $lookup: {
                        from: "users",
                        localField: "authorId",
                        foreignField: "_id",
                        as: "authorDetails"
                    }
                },
                { $unwind: { path: "$authorDetails", preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        author: {
                            _id: "$authorDetails._id",
                            name: "$authorDetails.name",
                            userImage: "$authorDetails.userImage",
                            role: "$authorDetails.role",
                            department: "$authorDetails.department"
                        }
                    }
                },
                { $project: { authorDetails: 0 } },
                { $sort: { createdAt: -1 } }
            ]).toArray();

            res.send(resources);
        });


        // for getting details of a resource
        app.get('/resources/details/:resourceId', async (req, res) => {
            const { resourceId } = req.params;

            const resource = await resourceCollection.aggregate([
                { $match: { _id: new ObjectId(resourceId) } },
                {
                    $lookup: {
                        from: "users",
                        localField: "authorId",
                        foreignField: "_id",
                        as: "authorDetails"
                    }
                },
                { $unwind: { path: "$authorDetails", preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        author: {
                            _id: "$authorDetails._id",
                            name: "$authorDetails.name",
                            userImage: "$authorDetails.userImage",
                            role: "$authorDetails.role",
                            department: "$authorDetails.department"
                        }
                    }
                },
                { $project: { authorDetails: 0 } },
                { $sort: { createdAt: -1 } }
            ]).toArray();

            res.send(resource[0] || null);
        });


        // for inserting a resource
        app.post('/resources', async (req, res) => {
            const resource = req.body;
            resource.createdAt = new Date();
            resource.authorId = new ObjectId(resource.authorId);
            const result = await resourceCollection.insertOne(resource);
            res.send(result);
        })


        // for updating a resource
        app.patch('/resources/:resourceId', async (req, res) => {
            const { resourceId } = req.params;
            const updatedResource = req.body;

            updatedResource._id = new ObjectId(updatedResource._id);
            updatedResource.date = new Date(updatedResource.date);
            updatedResource.authorId = new ObjectId(updatedResource.authorId);

            const result = await resourceCollection.updateOne(
                { _id: new ObjectId(resourceId) },
                {
                    $set: updatedResource
                }
            );
            res.send(result);
        })


        // for removing a resource
        app.delete('/resources/:resourceId', async (req, res) => {
            const { resourceId } = req.params;
            const result = await resourceCollection.deleteOne({ _id: new ObjectId(resourceId) });
            res.send(result);
        })



        // ------------------------------------
        // ---------- admin overview ----------
        // ------------------------------------

        // get admin overview data
        app.get("/admin/overview", async (req, res) => {
            // ---------- Basic totals ----------
            const [totalUsers, totalEvents, totalJobs, totalMentorships] = await Promise.all([
                userCollection.countDocuments(),
                eventCollection.countDocuments(),
                jobCollection.countDocuments(),
                mentorshipCollection.countDocuments(),
            ]);

            // ---------- Users by role ----------
            const usersByRole = await userCollection
                .aggregate([
                    { $group: { _id: "$role", count: { $sum: 1 } } },
                    { $project: { name: "$_id", value: "$count", _id: 0 } },
                ])
                .toArray();

            // ---------- Job type distribution ----------
            const jobTypeData = await jobCollection
                .aggregate([
                    { $group: { _id: "$jobType", count: { $sum: 1 } } },
                    { $project: { type: "$_id", count: 1, _id: 0 } },
                ])
                .toArray();

            // ---------- Event type distribution ----------
            const eventTypeData = await eventCollection
                .aggregate([
                    { $group: { _id: "$type", count: { $sum: 1 } } },
                    { $project: { type: "$_id", count: 1, _id: 0 } },
                ])
                .toArray();

            // ---------- Mentorship status breakdown ----------
            const mentorshipStatusData = await mentorshipCollection
                .aggregate([
                    { $group: { _id: "$status", count: { $sum: 1 } } },
                    { $project: { status: "$_id", count: 1, _id: 0 } },
                ])
                .toArray();

            // ---------- Top mentors by accepted mentorships ----------
            const topMentors = await mentorshipCollection
                .aggregate([
                    { $match: { status: "accepted" } },
                    { $group: { _id: "$mentorId", mentorships: { $sum: 1 } } },
                    { $sort: { mentorships: -1 } },
                    { $limit: 5 },
                    {
                        $lookup: {
                            from: "users",
                            localField: "_id",
                            foreignField: "_id",
                            as: "mentor",
                        },
                    },
                    { $unwind: "$mentor" },
                    {
                        $project: {
                            name: "$mentor.name",
                            mentorships: 1,
                            _id: 0,
                        },
                    },
                ])
                .toArray();

            // ----------  Connections growth (per month) ----------
            const connectionsGrowthData = await connectionCollection
                .aggregate([
                    {
                        $group: {
                            _id: { $month: "$createdAt" },
                            connections: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            monthNum: "$_id",
                            connections: 1,
                            _id: 0,
                        },
                    },
                    { $sort: { monthNum: 1 } },
                ])
                .toArray();

            // Month number → Month name mapping
            const monthNames = [
                "",
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ];
            const formattedGrowth = connectionsGrowthData.map((item) => ({
                month: monthNames[item.monthNum],
                connections: item.connections,
            }));

            // ---------- RESPONSE ----------
            res.send({
                totals: {
                    totalUsers,
                    totalEvents,
                    totalJobs,
                    totalMentorships,
                },
                usersByRole,
                jobTypeData,
                eventTypeData,
                mentorshipStatusData,
                topMentors,
                connectionsGrowthData: formattedGrowth,
            });
        });

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