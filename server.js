const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 80;

// Serve static files (including admin.html)
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'data.json');
const RESPONSES_FILE = path.join(__dirname, 'responses.json');

console.log('📁 Data file path:', DATA_FILE);
console.log('📁 Responses file path:', RESPONSES_FILE);

// Enhanced CORS configuration
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'file://','http://192.168.29.223','http://192.168.29.223:80'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

app.use(express.json());

// Add OPTIONS handler for preflight requests
app.options('*', cors());

// Debug middleware to log ALL requests (not just API)
app.use((req, res, next) => {
    console.log(`🌐 ${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
    next();
});

// Additional debug middleware specifically for API requests
app.use('/api', (req, res, next) => {
    console.log(`🔍 API Request Details:`);
    console.log(`   Method: ${req.method}`);
    console.log(`   Path: ${req.path}`);
    console.log(`   Full URL: ${req.url}`);
    console.log(`   Headers:`, req.headers);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`   Body:`, JSON.stringify(req.body, null, 2));
    }
    next();
});

// Helper function to read data
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('❌ Error reading data:', err.message);
        // Return default structure if file doesn't exist or is corrupted
        return {
            questions: [],
            responses: {}
        };
    }
}

// Helper function to write data
async function writeData(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('✅ Data file saved successfully');
        return true;
    } catch (err) {
        console.error('❌ Error writing data:', err.message);
        return false;
    }
}


// Helper function to read survey responses
async function readSurveyResponses() {
    try {
        const data = await fs.readFile(RESPONSES_FILE, 'utf8');
        const responses = JSON.parse(data);
        console.log(`📊 Loaded ${responses.length} survey responses`);
        return responses;
    } catch (err) {
        console.log('ℹ️  Survey responses file not found, creating empty array');
        // Return empty array if file doesn't exist
        return [];
    }
}

// Helper function to write survey responses
async function writeSurveyResponses(responses) {
    try {
        await fs.writeFile(RESPONSES_FILE, JSON.stringify(responses, null, 2), 'utf8');
        console.log(`✅ Saved ${responses.length} survey responses to file`);
        return true;
    } catch (err) {
        console.error('❌ Error writing survey responses:', err.message);
        return false;
    }
}

// Root route for testing
app.get('/', (req, res) => {
    console.log('🏠 Serving root page');
    res.send(`
        <h1>Survey Server is Running!</h1>
        <p>Server time: ${new Date().toLocaleString()}</p>
        <p><a href="/admin.html">Admin Panel</a></p>
        <p><a href="/api/test">Test API</a></p>
    `);
});

// Test API endpoint
app.get('/api/test', (req, res) => {
    console.log('🧪 API test endpoint hit');
    res.json({ 
        message: 'API is working!', 
        timestamp: new Date().toISOString(),
        endpoints: [
            'GET /api/data',
            'GET /api/survey-responses',
            'POST /api/survey-responses',
            'DELETE /api/survey-responses/:id'
        ]
    });
});

// Get current survey data
app.get('/api/data', async (req, res) => {
    console.log('📋 Getting survey data');
    try {
        const data = await readData();
        console.log(`📋 Returning ${data.questions.length} questions`);
        res.json(data);
    } catch (err) {
        console.error('❌ Failed to get survey data:', err);
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// Get all survey responses - ENHANCED WITH DEBUG
app.get('/api/survey-responses', async (req, res) => {
    console.log('📊 ===== GET /api/survey-responses called =====');
    console.log('📊 Request details:');
    console.log('📊   Method:', req.method);
    console.log('📊   URL:', req.url);
    console.log('📊   Path:', req.path);
    console.log('📊   Headers:', JSON.stringify(req.headers, null, 2));
    
    try {
        console.log('📊 Attempting to read survey responses...');
        const responses = await readSurveyResponses();
        console.log(`📊 Successfully loaded ${responses.length} survey responses`);
        console.log('📊 Sending response...');
        res.json(responses);
        console.log('📊 Response sent successfully');
    } catch (err) {
        console.error('❌ Failed to read survey responses:', err);
        console.error('❌ Error stack:', err.stack);
        res.status(500).json({ error: 'Failed to read survey responses' });
    }
    console.log('📊 ===== GET /api/survey-responses completed =====');
});

// Save individual survey response - ENHANCED WITH DEBUG
app.post('/api/survey-responses', async (req, res) => {
    console.log('💾 ===== POST /api/survey-responses called =====');
    console.log('💾 Request details:');
    console.log('💾   Method:', req.method);
    console.log('💾   URL:', req.url);
    console.log('💾   Content-Type:', req.headers['content-type']);
    console.log('💾   Body:', JSON.stringify(req.body, null, 2));
    
    try {
        const { userData, answers, totalScore, percentage, timestamp } = req.body;
        
        console.log(`💾 Processing response from: ${userData?.name} (${userData?.email})`);
        
        // Validate required fields
        if (!userData || !answers || totalScore === undefined || percentage === undefined) {
            console.log('❌ Missing required fields in request');
            console.log('❌ Validation details:');
            console.log('❌   userData:', !!userData);
            console.log('❌   answers:', !!answers);
            console.log('❌   totalScore:', totalScore);
            console.log('❌   percentage:', percentage);
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Read current responses
        console.log('💾 Reading current responses...');
        const responses = await readSurveyResponses();
        console.log(`💾 Current response count: ${responses.length}`);
        
        // Create new response entry
        const newResponse = {
            id: Date.now(),
            userData,
            answers,
            totalScore,
            percentage,
            timestamp: timestamp || new Date().toISOString(),
            submittedAt: new Date().toLocaleString()
        };

        // Add to responses array
        responses.push(newResponse);
        console.log(`📈 Added response (Score: ${totalScore}, Percentage: ${percentage}%)`);
        console.log(`📈 New response count: ${responses.length}`);

        // Save updated responses
        console.log('💾 Saving responses to file...');
        const success = await writeSurveyResponses(responses);
        
        if (success) {
            console.log('✅ Survey response saved successfully');
            res.json({ message: 'Survey response saved successfully', id: newResponse.id });
        } else {
            console.log('❌ Failed to save survey response to file');
            res.status(500).json({ error: 'Failed to save survey response' });
        }
    } catch (err) {
        console.error('❌ Error saving survey response:', err);
        console.error('❌ Error stack:', err.stack);
        res.status(500).json({ error: 'Failed to save survey response' });
    }
    console.log('💾 ===== POST /api/survey-responses completed =====');
});

app.get('/api/survey-responses/:id', async (req, res) => {
    try {
        const employeeId = req.params.id;
        const responses = JSON.parse(await fs.readFile(RESPONSES_FILE, 'utf-8') || '[]');
        const taken = responses.some(r => r.userData.employeeId === employeeId);
        res.json({ taken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error checking employee ID' });
    }
});
// Delete survey response
app.delete('/api/survey-responses/:id', async (req, res) => {
    console.log(`🗑️  Deleting survey response ID: ${req.params.id}`);
    try {
        const responseId = parseInt(req.params.id);
        const responses = await readSurveyResponses();
        
        const responseIndex = responses.findIndex(r => r.id === responseId);
        
        if (responseIndex === -1) {
            console.log('❌ Survey response not found');
            return res.status(404).json({ error: 'Survey response not found' });
        }
        
        const deletedResponse = responses[responseIndex];
        responses.splice(responseIndex, 1);
        const success = await writeSurveyResponses(responses);
        
        if (success) {
            console.log(`✅ Deleted response from ${deletedResponse.userData.name}`);
            res.json({ message: 'Survey response deleted successfully' });
        } else {
            console.log('❌ Failed to save after deletion');
            res.status(500).json({ error: 'Failed to delete survey response' });
        }
    } catch (err) {
        console.error('❌ Error deleting survey response:', err);
        res.status(500).json({ error: 'Failed to delete survey response' });
    }
});

// Delete multiple survey responses
app.delete('/api/survey-responses', async (req, res) => {
    console.log('🗑️  Deleting multiple survey responses');
    try {
        const responseIds = req.body.ids;
        
        if (!Array.isArray(responseIds)) {
            console.log('❌ Invalid request format - ids should be array');
            return res.status(400).json({ error: 'Invalid request format' });
        }
        
        const responses = await readSurveyResponses();
        const originalCount = responses.length;
        const filteredResponses = responses.filter(r => !responseIds.includes(r.id));
        
        const success = await writeSurveyResponses(filteredResponses);
        
        if (success) {
            const deletedCount = originalCount - filteredResponses.length;
            console.log(`✅ Deleted ${deletedCount} survey responses`);
            res.json({ message: 'Survey responses deleted successfully' });
        } else {
            console.log('❌ Failed to save after bulk deletion');
            res.status(500).json({ error: 'Failed to delete survey responses' });
        }
    } catch (err) {
        console.error('❌ Error deleting survey responses:', err);
        res.status(500).json({ error: 'Failed to delete survey responses' });
    }
});

// Save complete survey data
app.post('/api/data', async (req, res) => {
    console.log('💾 Saving complete survey data');
    try {
        const success = await writeData(req.body);
        if (success) {
            res.json({ message: 'Data saved successfully' });
        } else {
            res.status(500).json({ error: 'Failed to save data' });
        }
    } catch (err) {
        console.error('❌ Error saving complete data:', err);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Add a new question
app.post('/api/questions', async (req, res) => {
    console.log('➕ Adding new question');
    try {
        const data = await readData();
        const newQuestion = {
            id: Date.now(),
            text: req.body.text,
            options: req.body.options || [
                { text: 'Strongly aligns with me', score: 1 },
                { text: 'Somewhat aligns with me', score: 2 },
                { text: 'Neutral or unsure', score: 3 },
                { text: 'Somewhat misaligned with me', score: 4 },
                { text: 'Strongly misaligned with me', score: 5 }
            ]
        };
        
        data.questions.push(newQuestion);
        const success = await writeData(data);
        
        if (success) {
            console.log(`✅ Added question: "${newQuestion.text.substring(0, 50)}..."`);
            res.json(newQuestion);
        } else {
            res.status(500).json({ error: 'Failed to save question' });
        }
    } catch (err) {
        console.error('❌ Error adding question:', err);
        res.status(500).json({ error: 'Failed to add question' });
    }
});

// Update a question
app.put('/api/questions/:id', async (req, res) => {
    console.log(`✏️  Updating question ID: ${req.params.id}`);
    try {
        const data = await readData();
        const questionId = parseInt(req.params.id);
        const questionIndex = data.questions.findIndex(q => q.id === questionId);
        
        if (questionIndex === -1) {
            console.log('❌ Question not found');
            return res.status(404).json({ error: 'Question not found' });
        }
        
        data.questions[questionIndex] = {
            ...data.questions[questionIndex],
            text: req.body.text,
            options: req.body.options || data.questions[questionIndex].options
        };
        
        const success = await writeData(data);
        
        if (success) {
            console.log('✅ Question updated successfully');
            res.json(data.questions[questionIndex]);
        } else {
            res.status(500).json({ error: 'Failed to update question' });
        }
    } catch (err) {
        console.error('❌ Error updating question:', err);
        res.status(500).json({ error: 'Failed to update question' });
    }
});

// Delete a question
app.delete('/api/questions/:id', async (req, res) => {
    console.log(`🗑️  Deleting question ID: ${req.params.id}`);
    try {
        const data = await readData();
        const questionId = parseInt(req.params.id);
        const questionIndex = data.questions.findIndex(q => q.id === questionId);
        
        if (questionIndex === -1) {
            console.log('❌ Question not found');
            return res.status(404).json({ error: 'Question not found' });
        }
        
        const deletedQuestion = data.questions[questionIndex];
        data.questions.splice(questionIndex, 1);
        const success = await writeData(data);
        
        if (success) {
            console.log(`✅ Deleted question: "${deletedQuestion.text.substring(0, 50)}..."`);
            res.json({ message: 'Question deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete question' });
        }
    } catch (err) {
        console.error('❌ Error deleting question:', err);
        res.status(500).json({ error: 'Failed to delete question' });
    }
});

// Delete multiple questions
app.delete('/api/questions', async (req, res) => {
    console.log('🗑️  Deleting multiple questions');
    try {
        const data = await readData();
        const questionIds = req.body.ids;
        
        if (!Array.isArray(questionIds)) {
            console.log('❌ Invalid request format - ids should be array');
            return res.status(400).json({ error: 'Invalid request format' });
        }
        
        const originalCount = data.questions.length;
        data.questions = data.questions.filter(q => !questionIds.includes(q.id));
        const success = await writeData(data);
        
        if (success) {
            const deletedCount = originalCount - data.questions.length;
            console.log(`✅ Deleted ${deletedCount} questions`);
            res.json({ message: 'Questions deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete questions' });
        }
    } catch (err) {
        console.error('❌ Error deleting questions:', err);
        res.status(500).json({ error: 'Failed to delete questions' });
    }
});

// Update responses
app.post('/api/responses', async (req, res) => {
    console.log('💾 Updating response settings');
    try {
        const data = await readData();
        data.responses = { ...data.responses, ...req.body };
        
        const success = await writeData(data);
        
        if (success) {
            console.log('✅ Response settings updated');
            res.json({ message: 'Responses updated successfully' });
        } else {
            res.status(500).json({ error: 'Failed to update responses' });
        }
    } catch (err) {
        console.error('❌ Error updating responses:', err);
        res.status(500).json({ error: 'Failed to update responses' });
    }
});

// Catch-all route for debugging missing routes
app.use('*', (req, res) => {
    console.log(`❓ 404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        error: 'Route not found',
        method: req.method,
        url: req.originalUrl,
        availableRoutes: [
            'GET /',
            'GET /api/test',
            'GET /api/data',
            'GET /api/survey-responses',
            'POST /api/survey-responses',
            'DELETE /api/survey-responses/:id'
        ]
    });
});

app.listen(PORT, () => {
    console.log('🚀 ================================');
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🚀 Admin panel: http://localhost:${PORT}/admin.html`);
    console.log(`🚀 Survey form: http://localhost:${PORT}`);
    console.log('🚀 ================================');
    console.log('📁 Files in use:');
    console.log('📁 - data.json (survey questions & response settings)');
    console.log('📁 - responses.json (individual survey submissions)');
    console.log('🚀 ================================');
    console.log('🔗 API Endpoints:');
    console.log('🔗 - GET    /api/test (test endpoint)');
    console.log('🔗 - GET    /api/data');
    console.log('🔗 - GET    /api/survey-responses');
    console.log('🔗 - POST   /api/survey-responses');
    console.log('🔗 - DELETE /api/survey-responses/:id');
    console.log('🔗 - POST   /api/questions');
    console.log('🔗 - PUT    /api/questions/:id');
    console.log('🔗 - DELETE /api/questions/:id');
    console.log('🚀 ================================');
    
    // Test if files exist
    const testFiles = async () => {
        try {
            await fs.access(DATA_FILE);
            console.log('✅ data.json found');
        } catch {
            console.log('⚠️  data.json not found - will be created when needed');
        }
        
        try {
            await fs.access(RESPONSES_FILE);
            console.log('✅ responses.json found');
        } catch {
            console.log('⚠️  responses.json not found - will be created when first response is saved');
        }
    };
    
    testFiles();
    
    console.log('🔍 Debug mode enabled - all requests will be logged');
});