const trackShipmentWorldFirstInternationalCourierService = async (trackingNumber) => {
    try {
        const payload = {
            "UserID": process.env.WORLD_FIRST_USER_ID,
            "Password": process.env.WORLD_FIRST_PASSWORD,
            "AWBNo": trackingNumber,
            "Type": "A"
        }

        const response = await fetch(`https://xpresion.worldfirst.in/api/v1/Tracking/Tracking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        const data = await response.json();

        return data;
    } catch (error) {
        throw new Error('Error tracking shipment with UPS: ' + error.message);
    }
}

module.exports = trackShipmentWorldFirstInternationalCourierService;