const axios = require('axios');

const isServiceAvailable = async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({
            status: 400, message: 'Pincode required'
        });
    }
    try {
        const response = await axios.get(`https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${code}`, {
            headers: {
                'Authorization': `Token ${process.env.DELHIVERY_10KG_SURFACE_KEY}`,
            },
        });

        return res.status(200).json({
            status: 200, data: response.data
        });
    } catch (error) {
        return res.status(500).json({
            status: 500, message: error.message, success: false
        });
    }
}

module.exports = {
    isServiceAvailable
}