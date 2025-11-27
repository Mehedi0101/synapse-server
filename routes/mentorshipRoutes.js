// ---------- routes/usersRoutes.js ----------
const express = require('express');
const { ObjectId } = require('mongodb');

function createMentorshipsRoutes(mentorshipCollection, userCollection, notificationCollection, verifyToken, verifyOwnership, verifyAdmin) {
    const router = express.Router();

    // get all mentorship request
    router.get('/', verifyAdmin, async (req, res) => {
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
    router.get('/:id', verifyToken, async (req, res) => {
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
                    from: "mentorship", // collection name
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
    router.get('/student/:userId', verifyToken, verifyOwnership, async (req, res) => {
        const { userId } = req.params;
        const data = await mentorshipCollection.aggregate([
            {
                $match: {
                    studentId: new ObjectId(userId),
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
    router.get('/mentor/:userId', verifyToken, verifyOwnership, async (req, res) => {
        const { userId } = req.params;
        const data = await mentorshipCollection.aggregate([
            {
                $match: {
                    mentorId: new ObjectId(userId),
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
    router.post('/', verifyToken, async (req, res) => {
        const request = req.body;
        request.studentId = new ObjectId(request?.studentId);
        request.mentorId = new ObjectId(request?.mentorId);
        request.status = "pending";
        request.createdAt = new Date();

        const result = await mentorshipCollection.insertOne(request);
        res.send(result);
    })


    // patch a mentorship request
    router.patch("/:id", verifyToken, async (req, res) => {
        try {
            const { id } = req.params;
            const { status, steps, currentStep } = req.body;

            const updateFields = {};
            if (status) updateFields.status = status;
            if (steps) updateFields.steps = steps;
            if (currentStep) updateFields.currentStep = currentStep;

            // ---------- Update Mentorship ----------
            const result = await mentorshipCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateFields }
            );

            // ---------- Fetch Mentorship Info ----------
            const mentorship = await mentorshipCollection.findOne({ _id: new ObjectId(id) });
            if (!mentorship) {
                return res.status(404).send({ success: false, message: "Mentorship not found" });
            }

            // ---------- Fetch related users ----------
            const student = await userCollection.findOne({ _id: new ObjectId(mentorship.studentId) });
            const alumni = await userCollection.findOne({ _id: new ObjectId(mentorship.mentorId) });

            // ---------- Create Notification ----------
            let notification = null;

            if (status) {
                switch (status) {
                    case "assigned":
                        // Notify the alumni that a mentorship has been assigned
                        notification = {
                            userId: mentorship.mentorId,
                            message: `${student?.name || "A student"} has requested mentorship from you.`,
                            createdAt: new Date(),
                        };
                        break;

                    case "accepted":
                        // Notify student that mentorship request was accepted
                        notification = {
                            userId: mentorship.studentId,
                            message: `${alumni?.name || "The alumni"} has accepted your mentorship request.`,
                            createdAt: new Date(),
                        };
                        break;

                    case "rejected":
                        // Notify student that mentorship request was rejected
                        notification = {
                            userId: mentorship.studentId,
                            message: `${alumni?.name || "The alumni"} is unable to accept your mentorship request at this time.`,
                            createdAt: new Date(),
                        };
                        break;

                    case "cancelled":
                        // Notify student that mentorship was cancelled
                        notification = {
                            userId: mentorship.studentId,
                            message: `Your mentorship with ${alumni?.name || "the alumni"} has been cancelled.`,
                            createdAt: new Date(),
                        };
                        break;

                    case "completed":
                        // Notify student that mentorship is marked as completed
                        notification = {
                            userId: mentorship.studentId,
                            message: `Your mentorship with ${alumni?.name || "the alumni"} has been marked as completed.`,
                            createdAt: new Date(),
                        };
                        break;

                    default:
                        break;
                }

                // Insert notification only if created
                if (notification) {
                    await notificationCollection.insertOne(notification);
                }
            }

            res.send(result);
        } catch (error) {
            console.error("Error updating mentorship:", error);
            res.status(500).send({ success: false, message: "Internal server error" });
        }
    });


    // Delete mentorship request
    router.delete('/:id', verifyAdmin, async (req, res) => {
        const { id } = req.params;

        const result = await mentorshipCollection.deleteOne({ _id: new ObjectId(id) });

        res.send(result);
    });

    return router;
}

module.exports = createMentorshipsRoutes;