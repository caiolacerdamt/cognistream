
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// Prefer Service Role Key for backend operations to bypass RLS, fallback to provided key (which might be anon)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase URL or Key");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Cost mapping (approximate BRL per 1K tokens - assumes USD to BRL ~ 6.0)
// GPT-4o: Input $2.50/1M, Output $10.00/1M
// GPT-4o Mini: Input $0.15/1M, Output $0.60/1M
// Whisper: ~$0.006/min
const COST_RATES: Record<string, { input: number, output: number, per_minute?: number }> = {
    'gpt-4o-2024-08-06': { input: 2.50 / 1_000_000 * 6, output: 10.00 / 1_000_000 * 6 },
    'gpt-5-mini': { input: 0.15 / 1_000_000 * 6, output: 0.60 / 1_000_000 * 6 },
    'gemini-2.5-flash': { input: 0.075 / 1_000_000 * 6, output: 0.30 / 1_000_000 * 6 },
    'whisper-1': { input: 0, output: 0, per_minute: 0.006 * 6 }
};

export const calculateCost = (model: string, input: number, output: number, durationSeconds: number = 0) => {
    // Calculate Text Cost
    const rate = COST_RATES[model] || { input: 0, output: 0 };
    const textCost = (input * rate.input) + (output * rate.output);

    // Calculate Audio Cost (if using OpenAI/Whisper)
    // We assume if model is gpt*, we also used whisper. Or we can look at provider separately.
    // For simplicity, we add whisper cost if duration > 0 and model implies OpenAI.
    // Actually, getting 'whisper-1' rate directly:
    const whisperRate = COST_RATES['whisper-1'].per_minute || 0;
    const durationMinutes = durationSeconds / 60;
    const audioCost = durationMinutes * whisperRate;

    return textCost + audioCost;
};

export const saveProcessingResult = async (
    userId: string,
    videoUrl: string,
    transcription: string,
    summary: string,
    keyTopics: string[],
    usageData: { provider: string, model: string, inputTokens: number, outputTokens: number, serviceType: string, audioDuration?: number }
) => {
    try {
        // 1. Insert Video
        const { data: videoData, error: videoError } = await supabase
            .from('videos')
            .insert({ user_id: userId, original_url: videoUrl })
            .select()
            .single();

        if (videoError) throw videoError;

        const videoId = videoData.id;

        // 2. Insert Transcription
        const { error: transError } = await supabase
            .from('transcriptions')
            .insert({ user_id: userId, video_id: videoId, content: transcription });

        if (transError) throw transError;

        // 3. Insert Summary
        const { error: summaryError } = await supabase
            .from('summaries')
            .insert({
                user_id: userId,
                video_id: videoId,
                content: summary,
                key_topics: keyTopics
            });

        if (summaryError) throw summaryError;

        // 4. Insert Usage Log
        const totalTokens = usageData.inputTokens + usageData.outputTokens;
        const cost = calculateCost(usageData.model, usageData.inputTokens, usageData.outputTokens, usageData.audioDuration || 0);

        const { error: usageError } = await supabase
            .from('usage_logs')
            .insert({
                user_id: userId,
                video_id: videoId,
                provider: usageData.provider,
                model: usageData.model,
                service_type: usageData.serviceType,
                input_tokens: usageData.inputTokens,
                output_tokens: usageData.outputTokens,
                total_tokens: totalTokens,
                cost_brl: cost
            });

        if (usageError) throw usageError;

        return { success: true, videoId };

    } catch (error) {
        console.error("Error saving to Supabase:", error);
        return { success: false, error };
    }
};

export async function getApiKey(provider: string, userId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('api_keys')
        .select('key_value')
        .eq('user_id', userId)
        .eq('provider', provider)
        .single();

    if (error || !data) {
        return null;
    }
    return data.key_value;
}

export async function saveApiKey(provider: string, keyValue: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('api_keys')
        .upsert({ user_id: userId, provider, key_value: keyValue, updated_at: new Date() }, { onConflict: 'user_id,provider' });

    if (error) {
        throw new Error(`Failed to save API key: ${error.message}`);
    }
}
