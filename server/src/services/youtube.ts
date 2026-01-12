import { Innertube, UniversalCache } from 'youtubei.js';
import fs from 'fs';
import path from 'path';

let yt: Innertube | null = null;

// Initialize the client (Singleton pattern)
const getClient = async () => {
    if (!yt) {
        console.log('Initializing YouTube InnerTube client (ANDROID)...');

        // Prepare options
        const options: any = {
            cache: new UniversalCache(false),
            generate_session_locally: true,
            // @ts-ignore
            device_client: 'ANDROID'
        };

        // Handle Cookies if provided (bypasses "Login Required" / IP blocks)
        const envCookies = process.env.YOUTUBE_COOKIES;
        if (envCookies) {
            try {
                // Determine if base64 or raw string
                // A simple heuristic: if it contains "APSID=" it's likely raw, otherwise try decode
                let cookieString = envCookies;

                // If it looks like base64 (no common cookie parts), try decoding
                if (!envCookies.includes('APSID=') && !envCookies.includes('VISITOR_INFO1_LIVE=')) {
                    const decoded = Buffer.from(envCookies, 'base64').toString('utf-8');
                    // Validation: check if checked decoded string looks like cookies
                    if (decoded.includes('APSID=') || decoded.includes('VISITOR_INFO1_LIVE=')) {
                        cookieString = decoded;
                        console.log('Decoded YOUTUBE_COOKIES from Base64');
                    }
                }

                // Innertube expects the cookie header string
                options.cookie = cookieString;
                console.log('Using provided YouTube Cookies for authentication');
            } catch (e) {
                console.warn('Failed to process YOUTUBE_COOKIES, proceeding as guest', e);
            }
        }

        yt = await Innertube.create(options);
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
            quality: 'best'
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
        await new Promise<void>((resolve, reject) => {
            fileStream.on('finish', () => resolve());
            fileStream.on('error', reject);
        });

        console.log(`Audio saved to: ${outputPath}`);
        return outputPath;

    } catch (error) {
        console.error('Error in extractAudio:', error);
        throw error;
    }
};
