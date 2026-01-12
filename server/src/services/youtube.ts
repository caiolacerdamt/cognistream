import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export const extractAudio = async (videoUrl: string, outputDir: string): Promise<string> => {
    const timestamp = Date.now();
    const outputPath = path.join(outputDir, `${timestamp}.mp3`);

    console.log(`Processing video via Cobalt API: ${videoUrl}`);

    try {
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

        const responseText = await response.text();

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse Cobalt API response:', responseText);
            throw new Error(`Invalid response from Cobalt API: ${responseText.substring(0, 200)}...`);
        }

        if (!response.ok || !data || !data.url) {
            console.error('Cobalt API error response:', data);
            throw new Error(data?.text || `Cobalt API Error: ${response.status} ${response.statusText}`);
        }

        console.log('Got download URL from Cobalt:', data.url);

        const fileResponse = await fetch(data.url);

        if (!fileResponse.ok) {
            throw new Error(`Failed to download file from Cobalt URL: ${fileResponse.statusText}`);
        }

        if (!fileResponse.body) {
            throw new Error('File response body is empty');
        }

        const fileStream = fs.createWriteStream(outputPath);
        // @ts-ignore
        await pipeline(fileResponse.body, fileStream);

        console.log(`Audio saved to: ${outputPath}`);
        return outputPath;

    } catch (error) {
        console.error('Error in extractAudio:', error);
        throw error;
    }
};
