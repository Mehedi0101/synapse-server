// ---------- routes/usersRoutes.js ----------
const express = require('express');

function createAdminOverviewsRoutes(userCollection, eventCollection, jobCollection, mentorshipCollection, connectionCollection) {
    const router = express.Router();

    // get admin overview data
    router.get("/overview", async (req, res) => {
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

        // Month number → Month name mroutering
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

    return router;
}

module.exports = createAdminOverviewsRoutes;