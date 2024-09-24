const db = require('../utils/db');
const test = async (req, res) => {
    const users = await  db.query("SELECT * FROM USERS");
    return res.status(200).json({
        message: "Hello, this is a test endpoint.",
        users
    })
}

const testPost = async (req, res) => {
    const { name, email } = req.body;
    // await db.query("INSERT INTO USERS (name, email) VALUES (?,?)", [name, email]);
    return res.status(201).json({
        message: "User created successfully", name, email
    })
}

module.exports = {
    test,
    testPost
}