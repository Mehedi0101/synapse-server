const admin = require("../config/firebase");
const { connectDB } = require('../db');


const verifyToken = async (req, res, next) => {

    const authHeader = req?.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: "Unauthorized Access" });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decoded = await admin.auth().verifyIdToken(token);

        // ---------- fetch user collection ----------
        const {
            userCollection,
        } = await connectDB();

        const { _id: uid } = await userCollection.findOne(
            { email: decoded.email },
            { projection: { _id: 1 } }
        );
        
        req.decoded = uid.toString();
        // console.log(req.decoded);
        next();
    }
    catch (error) {
        return res.status(401).send({ message: "Unauthorized Access" });
    }
}

module.exports = verifyToken;