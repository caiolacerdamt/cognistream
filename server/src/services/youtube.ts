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

export const extractAudio = async (videoUrl: string, outputDir: string, onProgress?: (status: string) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const outputTemplate = path.join(outputDir, `${timestamp}.%(ext)s`);
        const binaryPath = getYtDlpPath();

        console.log(`Using yt-dlp binary at: "${binaryPath}"`);
        if (onProgress) onProgress('Iniciando download do áudio...');

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
            const output = data.toString();
            console.log(`yt-dlp out: ${output}`);
            stdoutOutput += output;

            // Parse progress from yt-dlp output
            if (onProgress) {
                // Example: [download]  23.5% of 10.00MiB at  2.00MiB/s ETA 00:03
                const match = output.match(/\[download\]\s+(\d+\.?\d*%).*/);
                if (match) {
                    onProgress(`Baixando: ${match[1]}...`);
                } else if (output.includes('[ExtractAudio]')) {
                    onProgress('Extraindo áudio...');
                }
            }
        });

        ytDlpProcess.stderr.on('data', (data) => {
            console.error(`yt-dlp err: ${data}`);
            stderrOutput += data.toString();
        });

        ytDlpProcess.on('close', (code) => {
            if (code === 0) {
                const expectedPath = path.join(outputDir, `${timestamp}.mp3`);
                if (fs.existsSync(expectedPath)) {
                    if (onProgress) onProgress('Download concluído.');
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
