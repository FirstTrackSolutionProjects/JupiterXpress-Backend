const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { transporter } = require('../utils/email');
const bcrypt = require('bcryptjs');

const SECRET_KEY = process.env.JWT_SECRET;

const requestOTPForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const generateOTP = () => {
            return Math.floor(100000 + Math.random() * 900000);
        }
        const otp = generateOTP();

        try {
            const [users] = await db.query('SELECT * FROM USERS WHERE email = ?', [email]);
            if (users.length == 0) {
                throw new Error({ message: 'User is not Registered' })
            }
            await db.query('UPDATE USERS set secret = ? WHERE email = ?', [otp, email]);
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'OTP for password reset',
                text: otp.toString(),
            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, success: true, message: `Otp sent to ${email}`
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, message: error.message, error: error.message
            });
        }

    } catch (err) {
        return {
            status: 400, message: 'Something went wrong'
        };
    }
}

const verifyOTPandResetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        try {

            const [users] = await db.query('SELECT * FROM USERS WHERE email = ?', [email]);
            if (users.length == 0) {
                throw new Error({ message: 'User not Found' })
            }
            const inOtp = users[0].secret;
            if (inOtp == otp) {
                const transaction = await db.beginTransaction();
                await transaction.query('UPDATE USERS SET password = ? WHERE email = ?', [await bcrypt.hash(newPassword, 10), email])
                await transaction.query('UPDATE USERS SET secret = ? WHERE email = ?', [null, email])
                await db.commit(transaction);
            } else {
                return res.status(400).json({ message: 'Incorrect OTP' });
            }
            const { fullName } = users[0];
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Password changed successfully',
                text: `Dear ${fullName}, \nYour account password has been changed successfully. If this action is not done by you. Contact support center immediately.\nRegards,\nJupiter Xpress`
            };
            await transporter.sendMail(mailOptions);
            return res.status(200).json({
                status: 200, success: true, message: 'Password Changed'
            });
        } catch (error) {
            return res.status(500).json({
                status: 500, message: "Something Went Wrong", error: error.message
            })
        }

    } catch (err) {
        return res.status(400).json({
            status: 400, message: 'Something went wrong'
        });
    }
}

const changePassword = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({
            status: 401,
            message: "Access Denied",
        });
    }
    try {
        const verified = jwt.verify(token, SECRET_KEY);
        const id = verified.id;
        try {
            const { oldPassword, newPassword } = req.body;
            if (!oldPassword ||!newPassword) {
                return res.status(400).json({
                    status: 400,
                    message: "All fields are required",
                });
            }
            try {
                const [users] = await db.query(
                    "SELECT * FROM USERS WHERE uid = ?",
                    [id]
                );

                if (!(await bcrypt.compare(oldPassword, users[0].password))) {
                    return res.status(400).json({
                        status: 400,
                        success: false,
                        message: "Wrong Password",
                    });
                }
                const transaction = await db.beginTransaction();
                await transaction.query(
                    "UPDATE USERS SET password = ? WHERE uid = ?",
                    [await bcrypt.hash(newPassword, 10), id]
                );
                await db.commit(transaction);

                return res.status(200).json({
                    status: 200,
                    success: true,
                    message: "Password Changed",
                });
            } catch (error) {
                return res.status(500).json({
                    status: 500,
                    message: error.message,
                    error: error.message,
                });
            }
        } catch (err) {
            return res.status(400).json({
                status: 400,
                message: "Something went wrong",
            });
        }
    } catch (e) {
        return res.status(400).json({
            status: 400,
            message: "Invalid Token",
        });
    }
}

module.exports = { requestOTPForgotPassword, verifyOTPandResetPassword, changePassword };