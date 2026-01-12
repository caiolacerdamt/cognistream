import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { extractAudio } from './services/youtube';
import { processWithGemini } from './services/gemini';
import { processWithOpenAI } from './services/openai';
import { saveProcessingResult, getApiKey, saveApiKey, supabase } from './services/supabase';

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
// @ts-ignore
const processAudio = async (filePath: string, options: any, onProgress?: (status: string) => void) => {
    const { provider, apiKey, originalUrl, userId } = options;

    console.log(`Processing with ${provider || 'gemini'}...`);
    if (onProgress) onProgress(`Iniciando processamento com ${provider || 'gemini'}...`);

    // Fetch key from DB if not provided
    let effectiveApiKey = apiKey;

    // MAGIC TRIGGER FOR TESTING (Secured)
    if (process.env.NODE_ENV === 'test' &&
        (originalUrl === 'https://www.youtube.com/watch?v=TEST' || originalUrl?.includes('TEST_VIDEO_ID') || filePath.includes('test_audio'))) {
        console.log('Test Trigger Detected: Forcing Mock Mode');
        effectiveApiKey = 'TEST_API_KEY';
    }

    if (!effectiveApiKey && userId) {
        effectiveApiKey = await getApiKey(provider || 'gemini', userId);
    }

    // MOCK FOR TESTING (ONLY in test environment)
    if (process.env.NODE_ENV === 'test' && effectiveApiKey === 'TEST_API_KEY') {
        console.log('Using Mock Processing for TEST_API_KEY');
        if (onProgress) onProgress('Mock Transcribing...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
        if (onProgress) onProgress('Mock Summarizing...');
        return {
            transcription: "This is a mock transcription for testing purposes.",
            summary: "This is a mock summary.",
            key_topics: ["Topic 1", "Topic 2"],
            language: "pt",
            duration: 120, // 2 mins
            usage: {
                promptTokenCount: 100,
                candidatesTokenCount: 50,
                totalTokenCount: 150 // Added missing field
            }
        };
    }

    if (provider === 'openai') {
        const keyToUse = effectiveApiKey;
        if (!keyToUse) {
            throw new Error("API Key da OpenAI não encontrada. Por favor, configure nos ajustes.");
        }
        if (onProgress) onProgress('Transcrevendo áudio com Whisper (OpenAI)...');
        return await processWithOpenAI(filePath, keyToUse);
    } else {
        // Gemini (Default)
        const keyToUse = effectiveApiKey;
        if (!keyToUse) {
            throw new Error("API Key do Gemini não encontrada. Por favor, configure nos ajustes.");
        }
        if (onProgress) onProgress('Enviando para Gemini 1.5 Flash...');
        return await processWithGemini(filePath, keyToUse);
    }
}

// Helper to validate user from token
const validateUser = async (req: express.Request): Promise<string> => {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.split(' ')[1];
    if (!token) throw new Error("No token provided");

    // Bypass for testing (ONLY in test environment)
    if (process.env.NODE_ENV === 'test' && token === 'test-token') {
        console.log('Using test token bypass');
        return 'test-user-id';
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error("Invalid token");

    return user.id;
};

// Settings Endpoints
app.get('/api/settings/keys/:provider', async (req, res) => {
    try {
        const userId = await validateUser(req);
        const key = await getApiKey(req.params.provider, userId);
        res.json({ configured: !!key });
    } catch (error: any) {
        console.error('Auth error:', error.message);
        res.status(401).json({ error: "Unauthorized" });
    }
});

app.post('/api/settings/keys', async (req, res) => {
    try {
        const userId = await validateUser(req);
        const { provider, key } = req.body;

        if (!provider || !key) throw new Error("Provider and key are required");

        await saveApiKey(provider, key, userId);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Save key error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/process-video/stream', async (req, res): Promise<any> => {
    // SSE Setup
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        const { url, provider, apiKey, userId } = req.body;
        if (!url) {
            sendEvent({ error: 'URL is required' });
            return res.end();
        }

        console.log(`Processing URL (Stream): ${url}`);
        sendEvent({ status: 'Inicializando...' });

        // 1. Extract Audio
        let audioPath = '';
        if (process.env.NODE_ENV === 'test' && (url === 'https://www.youtube.com/watch?v=TEST' || url.includes('TEST_VIDEO_ID'))) {
            console.log('Test URL detected: Skipping extractAudio');
            audioPath = path.join(DOWNLOAD_DIR, 'test_mock_audio.mp3');
            // Create dummy file if needed, or processAudio mock will handle it
        } else {
            // @ts-ignore
            audioPath = await extractAudio(url, DOWNLOAD_DIR, (status) => {
                sendEvent({ status });
            });
        }

        console.log(`Audio extracted to: ${audioPath}`);
        sendEvent({ status: 'Áudio extraído. Iniciando transcrição...' });

        // 2. Transcribe & Summarize (with Provider selection)
        // @ts-ignore
        const result = await processAudio(audioPath, { provider, apiKey, originalUrl: url, userId }, (status) => {
            sendEvent({ status });
        });
        console.log('Transcription complete');
        sendEvent({ status: 'Transcrição concluída. Salvando...' });

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
            if (userId) {
                await saveProcessingResult(
                    userId,
                    url,
                    result.transcription,
                    result.summary,
                    result.key_topics || [],
                    usageData
                );
                console.log('Saved to Supabase');
            }
        }

        // Cleanup audio file
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

        // Send Final Result
        sendEvent({ status: 'Concluído!', result });
        res.end();

    } catch (error: any) {
        console.error('Error processing video:', error);
        sendEvent({ error: error.message || 'Internal server error' });
        res.end();
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
        let audioPath = '';
        if (process.env.NODE_ENV === 'test' && (url === 'https://www.youtube.com/watch?v=TEST' || url.includes('TEST_VIDEO_ID'))) {
            console.log('Test URL detected: Skipping extractAudio');
            audioPath = path.join(DOWNLOAD_DIR, 'test_mock_audio.mp3');
        } else {
            audioPath = await extractAudio(url, DOWNLOAD_DIR);
        }
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
