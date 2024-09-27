const db = require('../utils/db');
const { transporter } = require('../utils/email');

const requestEmailVerificationOTP = async (req, res) => {
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
                subject: 'OTP for email verification',
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
        return res.status(400).json({
            status: 400, message: 'Something went wrong'
        });
    }
}

const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const [users] = await db.query('SELECT * FROM USERS WHERE email = ?', [email]);
        if (!users.length) {
            return res.status(400).json({ message: 'User not found' })
        }
        const inOtp = users[0].secret;
        if (inOtp == otp) {
            const transaction = await db.beginTransaction();
            await transaction.query('UPDATE USERS SET emailVerified = ? WHERE email = ?', [1, email])
            await transaction.query('UPDATE USERS SET secret = ? WHERE email = ?', [null, email])
            await db.commit(transaction);
        }
        const { fullName } = users[0];
        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Email Verified Successfully',
            text: `Dear ${fullName}, \nYour account email has been verified.\nRegards,\nJupiter Xpress`
        };
        await transporter.sendMail(mailOptions);
        return res.status(200).json({
            status: 200, success: true, message: 'Email Verified'
        });

    } catch (err) {
        return res.status(500).json({
            status: 500, message: 'Something went wrong'
        })
    }
}

module.exports = {
    requestEmailVerificationOTP,
    verifyEmail
}