const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { processScreeningResponses } = require('./claude');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.post('/submit-screening', async (req, res) => {
    try {
        // Extract responses from request body
        const { responses } = req.body;

        // Process responses through Claude AI
        const analysis = await processScreeningResponses(responses);

        // Send successful response
        res.json({
            success: true,
            analysis: analysis
        });
    } catch (error) {
        console.error('Screening processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing screening'
        });
    }
});

// Catch-all route to serve index.html for single-page application
app.get('*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});