import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import fs from 'fs';

const fsPromises = fs.promises;

export const uploadToGemini = async (path: string, mimeType: string) => {
    // For MVP: Inline processing is faster for typical < 1 hr YouTube videos (audio < 20MB)
    // If we wanted to use File API: import { GoogleAIFileManager } ... 
    // usage: fileManager.uploadFile(...)
    // We'll stick to inline for simplicity as 'youtube-dl-exec' output is usually manageable.
    // But we will ensure the Schema is robust.

    const fileData = await fsPromises.readFile(path);
    return {
        inlineData: {
            data: fileData.toString('base64'),
            mimeType,
        },
    };
};

// Alias for consistency with other services
export const processWithGemini = async (audioPath: string, apiKey?: string) => {
    return transcribeAndSummarize(audioPath, apiKey);
};

export const transcribeAndSummarize = async (audioPath: string, apiKey?: string) => {
    const key = apiKey;
    if (!key) {
        throw new Error("API Key do Gemini não fornecida. Configure nos ajustes.");
    }

    const genAI = new GoogleGenerativeAI(key);

    // Using the experimental model for best performance with structured outputs
    // or standard flash
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                    transcription: { type: SchemaType.STRING },
                    summary: { type: SchemaType.STRING },
                    key_topics: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING }
                    }
                },
                required: ["transcription", "summary"]
            }
        }
    });

    const audioData = await uploadToGemini(audioPath, "audio/mp3");

    const prompt = `
    You are an expert transcriber and summarizer.
    1. Transcribe the following audio intelligently in Portuguese (PT-BR). Ignore filler words.
    2. Provide a concise, structured executive summary of the key points IN PORTUGUESE.
    3. Extract a list of key topics discussed.
    `;

    try {
        const result = await model.generateContent([prompt, audioData]);
        const response = await result.response;
        const text = response.text();
        const usage = result.response.usageMetadata;

        const jsonResponse = JSON.parse(text);

        return {
            ...jsonResponse,
            usage: usage
        };
    } catch (e) {
        console.error("Gemini Error:", e);
        throw e;
    }
};
