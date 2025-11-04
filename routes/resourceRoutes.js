// ---------- routes/usersRoutes.js ----------
const express = require('express');
const { ObjectId } = require('mongodb');

function createResourcesRoutes(resourceCollection) {
    const router = express.Router();

    // get all resources
    router.get('/', async (req, res) => {

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
    router.get('/my/:userId', async (req, res) => {
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
    router.get('/all/:userId', async (req, res) => {
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
    router.get('/details/:resourceId', async (req, res) => {
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
    router.post('/', async (req, res) => {
        const resource = req.body;
        resource.createdAt = new Date();
        resource.authorId = new ObjectId(resource.authorId);
        const result = await resourceCollection.insertOne(resource);
        res.send(result);
    })


    // for updating a resource
    router.patch('/:resourceId', async (req, res) => {
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
    router.delete('/:resourceId', async (req, res) => {
        const { resourceId } = req.params;
        const result = await resourceCollection.deleteOne({ _id: new ObjectId(resourceId) });
        res.send(result);
    })

    return router;
}

module.exports = createResourcesRoutes;