import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export const extractAudio = async (videoUrl: string, outputDir: string): Promise<string> => {
    const timestamp = Date.now();
    const outputPath = path.join(outputDir, `${timestamp}.mp3`);

    console.log(`Processing video via Cobalt API: ${videoUrl}`);

    try {
        // 1. Request the download URL from Cobalt
        const response = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: videoUrl,
                vCodec: 'h264',
                vQuality: '720',
                aFormat: 'mp3',
                isAudioOnly: true
            })
        });

        const data = await response.json();

        if (!data || !data.url) {
            console.error('Cobalt API error:', data);
            throw new Error(data?.text || 'Failed to get download URL from Cobalt API');
        }

        console.log('Got download URL from Cobalt, fetching audio...');

        // 2. Download the actual file
        const fileResponse = await fetch(data.url);

        if (!fileResponse.ok) {
            throw new Error(`Failed to download file: ${fileResponse.statusText}`);
        }

        if (!fileResponse.body) {
            throw new Error('Response body is empty');
        }

        // 3. Save to disk
        const fileStream = fs.createWriteStream(outputPath);

        // Use stream pipeline for better error handling and performance
        // @ts-ignore - ReadableStream/NodeJS.ReadableStream Type compatibility
        await pipeline(fileResponse.body, fileStream);

        console.log(`Audio saved to: ${outputPath}`);
        return outputPath;

    } catch (error) {
        console.error('Error in extractAudio:', error);
        throw error;
    }
};
