import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Helper to find yt-dlp binary
const getYtDlpPath = () => {
    const possiblePaths = [
        path.join(__dirname, '../../node_modules/youtube-dl-exec/bin/yt-dlp.exe'), // Windows local
        path.join(__dirname, '../../node_modules/youtube-dl-exec/bin/yt-dlp'),     // Linux/Mac local
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
    }
    return 'yt-dlp'; // Fallback to global path
};

export const extractAudio = async (videoUrl: string, outputDir: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const outputTemplate = path.join(outputDir, `${timestamp}.%(ext)s`);
        const binaryPath = getYtDlpPath();

        console.log(`Using yt-dlp binary at: "${binaryPath}"`);
        console.log(`Downloading audio from ${videoUrl}...`);

        // Spawn process directly to handle spaces in paths correctly
        const process = spawn(binaryPath, [
            videoUrl,
            '--extract-audio',
            '--audio-format', 'mp3',
            '--output', outputTemplate,
            '--no-playlist'
        ], {
            shell: false // Important for security and path handling
        });

        process.stdout.on('data', (data) => {
            console.log(`dt-dlp out: ${data}`);
        });

        process.stderr.on('data', (data) => {
            console.error(`yt-dlp err: ${data}`);
        });

        process.on('close', (code) => {
            if (code === 0) {
                const expectedPath = path.join(outputDir, `${timestamp}.mp3`);
                if (fs.existsSync(expectedPath)) {
                    resolve(expectedPath);
                } else {
                    reject(new Error('Download success but file not found'));
                }
            } else {
                reject(new Error(`yt-dlp process exited with code ${code}`));
            }
        });

        process.on('error', (err) => {
            reject(err);
        });
    });
};
