// ---------- routes/usersRoutes.js ----------
const express = require('express');
const { ObjectId } = require('mongodb');

function createChatsRoutes(chatInfoCollection, verifyToken, verifyOwnership) {
    const router = express.Router();

    // fetch all chat info of a user
    router.get("/:userId", verifyToken, verifyOwnership, async (req, res) => {
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

    // fetch if user has unread messages or not
    router.get("/unread/:userId", verifyToken, verifyOwnership, async (req, res) => {
        const { userId } = req.params;

        try {
            const exists = await chatInfoCollection.findOne(
                { [`unreadCount.${userId}`]: { $gt: 0 } },
                { projection: { _id: 1 } }  // return only _id for performance
            );

            return res.json({
                hasNewMessages: !!exists
            });

        } catch (err) {
            return res.status(500).json({
                error: "Internal server error",
                details: err.message
            });
        }
    });


    // update chat info (unread count) after reading unread messages
    router.patch("/read/:chatId/:userId", verifyToken, verifyOwnership, async (req, res) => {
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

    return router;
}

module.exports = createChatsRoutes;