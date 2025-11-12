// ---------- routes/usersRoutes.js ----------
const express = require('express');
const { ObjectId } = require('mongodb');

function createJobsRoutes(jobCollection) {
    const router = express.Router();

    // get all jobs
    router.get('/', async (req, res) => {
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
    router.get('/:userId', async (req, res) => {
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
    router.get('/user/:userId', async (req, res) => {
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
    router.get('/details/:jobId', async (req, res) => {
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
                    routerlyLink: 1,
                    createdAt: 1,
                    company: 1,
                    applyLink: 1,
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
    router.post('/', async (req, res) => {
        const job = req.body;
        job.authorId = new ObjectId(job.authorId);
        job.createdAt = new Date();
        const result = await jobCollection.insertOne(job);
        res.send(result);
    })


    // for updating a job post
    router.patch('/:jobId', async (req, res) => {
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
    router.delete('/:jobId', async (req, res) => {
        const { jobId } = req.params;
        const result = await jobCollection.deleteOne({ _id: new ObjectId(jobId) });
        res.send(result);
    })

    return router;
}

module.exports = createJobsRoutes;