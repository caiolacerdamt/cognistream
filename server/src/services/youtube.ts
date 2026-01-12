import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

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

        // Cookie handling strategy
        let cookiePath: string | null = null;
        const envCookies = process.env.YOUTUBE_COOKIES;
        if (envCookies) {
            const tempDir = os.tmpdir();
            cookiePath = path.join(tempDir, `yt-cookies-${timestamp}.txt`);

            let cookiesContent = envCookies;
            // Try to decode base64 if it doesn't look like a netscape header
            if (!envCookies.includes('# Netscape HTTP Cookie File')) {
                try {
                    cookiesContent = Buffer.from(envCookies, 'base64').toString('utf-8');
                    console.log('Decoded cookies from Base64');
                } catch (e) {
                    console.warn('Failed to decode cookies as base64, using raw value');
                }
            }

            fs.writeFileSync(cookiePath, cookiesContent);
            console.log(`Using cookies from env at ${cookiePath}`);
        }

        const args = [
            videoUrl,
            '--extract-audio',
            '--audio-format', 'mp3',
            '--output', outputTemplate,
            '--no-playlist',
            '--js-runtimes', 'node',
            // Strategy 1: User-Agent Spoofing
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ];

        // Strategy 2: Cookies (Optional)
        if (cookiePath) {
            args.push('--cookies', cookiePath);
        }

        const ytDlpProcess = spawn(binaryPath, args, {
            shell: false
        });

        let stderrOutput = '';
        let stdoutOutput = '';

        ytDlpProcess.stdout.on('data', (data) => {
            console.log(`dt-dlp out: ${data}`);
            stdoutOutput += data.toString();
        });

        ytDlpProcess.stderr.on('data', (data) => {
            console.error(`yt-dlp err: ${data}`);
            stderrOutput += data.toString();
        });

        ytDlpProcess.on('close', (code) => {
            // Cleanup cookie file
            if (cookiePath && fs.existsSync(cookiePath)) {
                fs.unlinkSync(cookiePath);
            }

            if (code === 0) {
                const expectedPath = path.join(outputDir, `${timestamp}.mp3`);
                if (fs.existsSync(expectedPath)) {
                    resolve(expectedPath);
                } else {
                    reject(new Error('Download success but file not found'));
                }
            } else {
                // Include stderr in the error message for better debugging
                reject(new Error(`yt-dlp process exited with code ${code}. Error details: ${stderrOutput}`));
            }
        });

        ytDlpProcess.on('error', (err) => {
            if (cookiePath && fs.existsSync(cookiePath)) {
                fs.unlinkSync(cookiePath);
            }
            reject(err);
        });
    });
};
