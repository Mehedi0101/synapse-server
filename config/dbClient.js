const { connectDB } = require("./db");

let collections = null;

async function initDB() {
    if (!collections) {
        collections = await connectDB();
    }
    return collections;
}

module.exports = initDB;