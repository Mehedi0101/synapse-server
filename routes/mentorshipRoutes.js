// ---------- routes/usersRoutes.js ----------
const express = require('express');
const { ObjectId } = require('mongodb');

function createMentorshipsRoutes(mentorshipCollection) {
    const router = express.Router();

    // get all mentorship request
    router.get('/', async (req, res) => {
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
    router.get('/:id', async (req, res) => {
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
    router.get('/student/:studentId', async (req, res) => {
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
    router.get('/mentor/:mentorId', async (req, res) => {
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
    router.post('/', async (req, res) => {
        const request = req.body;
        request.studentId = new ObjectId(request?.studentId);
        request.mentorId = new ObjectId(request?.mentorId);
        request.status = "pending";
        request.createdAt = new Date();

        const result = await mentorshipCollection.insertOne(request);
        res.send(result);
    })


    // Update mentorship status
    router.patch('/:id', async (req, res) => {
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
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;

        const result = await mentorshipCollection.deleteOne({ _id: new ObjectId(id) });

        res.send(result);
    });

    return router;
}

module.exports = createMentorshipsRoutes;