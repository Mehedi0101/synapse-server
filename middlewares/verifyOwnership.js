const admin = require("../config/firebase");

const verifyOwnership = async (req, res, next) => {

    const { authorId } = req.params;

    if (authorId !== req.decoded) return res.status(403).send({ message: 'Forbidden: Access Denied' })

    next();
}

module.exports = verifyOwnership;