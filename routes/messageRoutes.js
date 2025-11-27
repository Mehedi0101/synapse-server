// ---------- routes/usersRoutes.js ----------
const express = require('express');
const { ObjectId } = require('mongodb');

function createMessagesRoutes(chatInfoCollection, messageCollection, verifyToken, verifyOwnership) {
    const router = express.Router();

    // get all messages between two users
    router.get("/:userId/:friendId", verifyToken, verifyOwnership, async (req, res) => {
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
    router.post("/", verifyToken, verifyOwnership, async (req, res) => {
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

    return router;
}

module.exports = createMessagesRoutes;