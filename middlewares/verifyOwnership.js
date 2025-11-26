const verifyOwnership = (req, res, next) => {
    const userId = req.decoded;

    const possibleKeys = ["authorId", "commenterId", "userId"];

    const params = req.params || {};
    const body = req.body || {};

    const incomingIds = [
        ...possibleKeys.map(key => params[key]),
        ...possibleKeys.map(key => body[key])
    ].filter(Boolean);

    const allowed = incomingIds.some(id => id === userId);

    if (!allowed) {
        return res.status(403).send({ message: "Forbidden" });
    }

    next();
};

module.exports = verifyOwnership;