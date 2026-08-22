require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

/**
 * Reusable function to send a WhatsApp receipt/message using Meta Cloud API.
 * @param {string} phone - Recipient phone number with country code (e.g., "919876543210")
 * @param {string} message - Formatted text message content
 * @returns {Promise<object>} - Response payload from Meta API
 */
async function sendWhatsAppReceipt(phone, message) {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const version = process.env.WHATSAPP_VERSION || 'v20.0';

    if (!accessToken || !phoneNumberId || accessToken.includes('your_meta') || phoneNumberId.includes('your_whatsapp')) {
        throw new Error('WhatsApp API credentials are not configured in .env file.');
    }

    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    
    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: {
            preview_url: false,
            body: message
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'Meta Cloud API request failed.');
    }

    return data;
}

// POST endpoint to handle receipt requests from the POS system
app.post('/api/send-receipt', async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({
            success: false,
            message: 'Phone and message fields are required.'
        });
    }

    try {
        const result = await sendWhatsAppReceipt(phone, message);
        res.json({
            success: true,
            message: 'WhatsApp receipt sent successfully via Cloud API.',
            data: result
        });
    } catch (err) {
        console.error('Error sending WhatsApp message:', err.message);
        res.status(502).json({
            success: false,
            message: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`WhatsApp Receipt Microservice running on http://localhost:${PORT}`);
});
