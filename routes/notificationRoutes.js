// ---------- routes/usersRoutes.js ----------
const express = require('express');
const { ObjectId } = require('mongodb');

function createNotificationsRoutes(notificationCollection) {
    const router = express.Router();

    // Get all notifications for a user
    router.get("/:userId", async (req, res) => {
        try {
            const { userId } = req.params;

            const notifications = await notificationCollection
                .find({ userId: new ObjectId(userId) })
                .sort({ createdAt: -1 })
                .toArray();

            res.send(notifications);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            res.status(500).send({ success: false, error: "Internal Server Error" });
        }
    });


    // Insert a new notification
    router.post("/", async (req, res) => {
        try {
            const { userId, message } = req.body;

            if (!userId || !message) {
                return res.status(400).send({ success: false, error: "Missing fields" });
            }

            const newNotification = {
                userId: new ObjectId(userId),
                message,
                createdAt: new Date(),
            };

            const result = await notificationCollection.insertOne(newNotification);
            res.send({ success: true, insertedId: result.insertedId });
        } catch (error) {
            console.error("Error inserting notification:", error);
            res.status(500).send({ success: false, error: "Internal Server Error" });
        }
    });


    // Delete all notifications for a user
    router.delete("/:userId", async (req, res) => {
        try {
            const { userId } = req.params;

            const result = await notificationCollection.deleteMany({
                userId: new ObjectId(userId),
            });

            res.send({ success: true, deletedCount: result.deletedCount });
        } catch (error) {
            console.error("Error deleting notifications:", error);
            res.status(500).send({ success: false, error: "Internal Server Error" });
        }
    });

    return router;
}

module.exports = createNotificationsRoutes;