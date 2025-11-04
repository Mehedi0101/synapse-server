// ---------- routes/usersRoutes.js ----------
const express = require('express');
const { ObjectId } = require('mongodb');

function createPostsRoutes(postCollection, userCollection, notificationCollection) {
    const router = express.Router();

    // ---------------------------
    // ---------- posts ----------
    // ---------------------------

    // get all post
    router.get("/", async (req, res) => {

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
    router.get('/author/:authorId', async (req, res) => {

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
    router.post('/', async (req, res) => {
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
    router.patch('/:postId', async (req, res) => {
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
    router.patch('/comments/add/:postId', async (req, res) => {
        try {
            const { postId } = req.params;
            const { commenterId, comment } = req.body;

            const commentData = {
                _id: new ObjectId(),
                commenterId: new ObjectId(commenterId),
                comment,
                createdAt: new Date()
            };

            // Add the comment to post
            await postCollection.updateOne(
                { _id: new ObjectId(postId) },
                { $push: { comments: commentData } }
            );

            // Fetch post info for author
            const post = await postCollection.findOne(
                { _id: new ObjectId(postId) },
                { projection: { authorId: 1 } }
            );

            // Fetch commenter name for notification
            if (post && String(post.authorId) !== commenterId) {
                const commenter = await userCollection.findOne(
                    { _id: new ObjectId(commenterId) },
                    { projection: { name: 1 } }
                );

                if (commenter) {
                    await notificationCollection.insertOne({
                        userId: new ObjectId(post.authorId),
                        message: `${commenter.name} has commented on your post.`,
                        createdAt: new Date()
                    });
                }
            }

            // Rebuild the post with commenter details for frontend
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
        } catch (error) {
            console.error("Error adding comment:", error);
            res.status(500).send({ success: false, error: "Internal server error" });
        }
    });


    // patching a post for deleting a comment
    router.patch('/comments/delete/:postId', async (req, res) => {
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
    router.delete('/:postId', async (req, res) => {
        const { postId } = req.params;
        const result = await postCollection.deleteOne({ _id: new ObjectId(postId) });
        res.send(result);
    })

    return router;
}

module.exports = createPostsRoutes;