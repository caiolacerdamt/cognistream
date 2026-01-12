import { Innertube, UniversalCache } from 'youtubei.js';
import fs from 'fs';
import path from 'path';

let yt: Innertube | null = null;

// Initialize the client (Singleton pattern)
const getClient = async () => {
    if (!yt) {
        console.log('Initializing YouTube InnerTube client...');
        yt = await Innertube.create({
            cache: new UniversalCache(false),
            generate_session_locally: true
        });
        console.log('YouTube client initialized.');
    }
    return yt;
};

// Helper to extract Video ID
const getVideoId = (url: string): string => {
    const patterns = [
        /(?:v=|\/)([0-9A-Za-z_-]{11}).*/,
        /(?:youtu\.be\/)([0-9A-Za-z_-]{11})/,
        /^([0-9A-Za-z_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    throw new Error('Invalid YouTube URL or ID');
};

export const extractAudio = async (videoUrl: string, outputDir: string): Promise<string> => {
    const timestamp = Date.now();
    const outputPath = path.join(outputDir, `${timestamp}.mp3`);

    try {
        const videoId = getVideoId(videoUrl);
        console.log(`Processing video ID: ${videoId}`);

        const youtube = await getClient();

        console.log('Fetching video info...');
        const info = await youtube.getBasicInfo(videoId);
        console.log(`Title: ${info.basic_info.title}`);

        console.log('Starting audio download...');

        // Get the stream
        const stream = await youtube.download(videoId, {
            type: 'audio', // Download audio only
            quality: 'best',
            format: 'mp4'  // Container format (content is usually m4a/opus, but we save as mp3 ext for compatibility downstream)
        });

        console.log('Writing stream to file...');
        const fileStream = fs.createWriteStream(outputPath);

        // Stream reader loop
        const reader = stream.getReader();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fileStream.write(value);
        }

        fileStream.end();

        // Wait for file to be fully written
        await new Promise((resolve, reject) => {
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
        });

        console.log(`Audio saved to: ${outputPath}`);
        return outputPath;

    } catch (error) {
        console.error('Error in extractAudio:', error);
        throw error;
    }
};
