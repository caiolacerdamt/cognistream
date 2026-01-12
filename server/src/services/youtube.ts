import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Helper to find yt-dlp binary
const getYtDlpPath = () => {
    // In production/docker, it might be in node_modules or global
    // But since we use youtube-dl-exec, let's try to locate its binary or use system default
    const localPath = path.join(__dirname, '../../node_modules/youtube-dl-exec/bin/yt-dlp.exe'); // Windows
    const linuxPath = path.join(__dirname, '../../node_modules/youtube-dl-exec/bin/yt-dlp');     // Linux/Mac

    if (fs.existsSync(localPath)) return localPath;
    if (fs.existsSync(linuxPath)) return linuxPath;

    return 'yt-dlp'; // Fallback to global path
};

export const extractAudio = async (videoUrl: string, outputDir: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const outputTemplate = path.join(outputDir, `${timestamp}.%(ext)s`);
        const binaryPath = getYtDlpPath();

        console.log(`Using yt-dlp binary at: "${binaryPath}"`);
        console.log(`Downloading audio from ${videoUrl}...`);

        const args = [
            videoUrl,
            '--extract-audio',
            '--audio-format', 'mp3',
            '--output', outputTemplate,
            '--no-playlist',
            // Fixes for bot detection
            '--js-runtimes', 'node',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ];

        const ytDlpProcess = spawn(binaryPath, args, {
            shell: false
        });

        let stderrOutput = '';
        let stdoutOutput = '';

        ytDlpProcess.stdout.on('data', (data) => {
            console.log(`yt-dlp out: ${data}`);
            stdoutOutput += data.toString();
        });

        ytDlpProcess.stderr.on('data', (data) => {
            console.error(`yt-dlp err: ${data}`);
            stderrOutput += data.toString();
        });

        ytDlpProcess.on('close', (code) => {
            if (code === 0) {
                const expectedPath = path.join(outputDir, `${timestamp}.mp3`);
                if (fs.existsSync(expectedPath)) {
                    resolve(expectedPath);
                } else {
                    reject(new Error('Download success but file not found'));
                }
            } else {
                reject(new Error(`yt-dlp process exited with code ${code}. Error details: ${stderrOutput}`));
            }
        });

        ytDlpProcess.on('error', (err) => {
            reject(err);
        });
    });
};
