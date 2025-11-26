const admin = require("../config/firebase");
const initDB = require('../config/dbClient');


const verifyAdmin = async (req, res, next) => {

    const authHeader = req?.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: "Unauthorized" });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decoded = await admin.auth().verifyIdToken(token);

        // ---------- fetch user collection ----------
        const {
            userCollection,
        } = await initDB();

        const { role } = await userCollection.findOne(
            { email: decoded.email },
            { projection: { role: 1 } }
        );

        if (role !== "Admin") return res.status(403).send({ message: "Forbidden" });

        next();
    }
    catch (error) {
        return res.status(401).send({ message: "Unauthorized" });
    }
}

module.exports = verifyAdmin;