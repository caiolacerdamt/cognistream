import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { extractAudio } from './services/youtube';
import { processWithGemini } from './services/gemini';
import { processWithOpenAI } from './services/openai';
import { saveProcessingResult, getApiKey, saveApiKey } from './services/supabase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ensure downloads directory exists
const DOWNLOAD_DIR = path.join(__dirname, '../downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR);
}

// Setup Multer for uploads
const upload = multer({ dest: 'uploads/' });

// Helper to validate and select service
const processAudio = async (filePath: string, options: any) => {
    const { provider, apiKey, originalUrl, userId } = options;

    console.log(`Processing with ${provider || 'gemini'}...`);

    // Fetch key from DB if not provided
    let effectiveApiKey = apiKey;
    if (!effectiveApiKey && userId) {
        effectiveApiKey = await getApiKey(provider || 'gemini', userId);
    }

    if (provider === 'openai') {
        const keyToUse = effectiveApiKey;
        if (!keyToUse) {
            throw new Error("API Key da OpenAI não encontrada. Por favor, configure nos ajustes.");
        }
        return await processWithOpenAI(filePath, keyToUse);
    } else {
        // Gemini (Default)
        const keyToUse = effectiveApiKey;
        if (!keyToUse) {
            throw new Error("API Key do Gemini não encontrada. Por favor, configure nos ajustes.");
        }
        return await processWithGemini(filePath, keyToUse);
    }
}

// Settings Endpoints
app.get('/api/settings/keys/:provider', async (req, res) => {
    try {
        const userId = req.query.userId as string;
        if (!userId) { // For backward compatibility/testing, we might allow no user, but better to enforce
            // return res.status(400).json({ error: "UserId required" });
        }
        // If no userId, we can't fetch a specific user key, maybe return false or check env
        if (!userId) return res.json({ configured: false });

        const key = await getApiKey(req.params.provider, userId);
        res.json({ configured: !!key });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/settings/keys', async (req, res) => {
    try {
        const { provider, key, userId } = req.body;
        if (!provider || !key || !userId) throw new Error("Provider, key and userId are required");
        await saveApiKey(provider, key, userId);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/process-video', async (req, res): Promise<any> => {
    try {
        const { url, provider, apiKey } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        console.log(`Processing URL: ${url}`);

        // 1. Extract Audio
        const audioPath = await extractAudio(url, DOWNLOAD_DIR);
        console.log(`Audio extracted to: ${audioPath}`);

        // 2. Transcribe & Summarize (with Provider selection)
        // We pass the raw apiKey from request here, the helper resolves it from DB if needed
        const result = await processAudio(audioPath, { provider, apiKey, originalUrl: url, userId: req.body.userId });
        console.log('Transcription complete');

        // 3. Save to Supabase
        if (result && result.summary) {
            const usageData = {
                provider: provider || 'gemini',
                model: provider === 'openai' ? 'gpt-5-mini' : 'gemini-2.5-flash',
                serviceType: 'transcription_and_summary',
                inputTokens: result.usage?.promptTokenCount || 0,
                outputTokens: result.usage?.candidatesTokenCount || 0,
                audioDuration: result.duration || 0
            };

            // If userId is present, save to DB
            if (req.body.userId) {
                await saveProcessingResult(
                    req.body.userId,
                    url,
                    result.transcription,
                    result.summary,
                    result.key_topics || [],
                    usageData
                );
                console.log('Saved to Supabase');
            } else {
                console.warn('No userId provided, skipping DB save');
            }
        }

        // Cleanup audio file
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

        return res.json(result);
    } catch (error: any) {
        console.error('Error processing video:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

app.post('/api/process-file', upload.single('audio'), async (req, res): Promise<any> => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`Processing File: ${req.file.path}`);
        const { provider, apiKey } = req.body;

        // Process with selected provider
        const result = await processAudio(req.file.path, { provider, apiKey, userId: req.body.userId });

        // Cleanup
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        return res.json(result);
    } catch (error: any) {
        console.error('Error processing file:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ error: error.message || 'Server error' });
    }
});

// Serve static files from the public directory (client build)
app.use(express.static(path.join(__dirname, '../public')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
