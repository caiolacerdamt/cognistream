import OpenAI from "openai";
import fs from "fs";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

export const processWithOpenAI = async (
  audioPath: string,
  apiKey: string,
  userPrompt: string = "Summarize this content"
) => {
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  // Step 1: Transcribe with Whisper (Standard)
  const transcriptionResponse = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: "whisper-1",
    language: "pt",
    response_format: "verbose_json", // Changed to get duration
  });

  const fullTranscription = transcriptionResponse.text;
  const duration = transcriptionResponse.duration || 0; // Capture duration

  // Step 2: Summarize with GPT-4o using Zod Structured Output

  const AnalysisSchema = z.object({
    summary: z.string().describe("A professional executive summary in Portuguese"),
    key_topics: z.array(z.string()).describe("Main topics discussed")
  });

  const completion = await openai.chat.completions.parse({
    model: "gpt-5-mini", // Reverted to user preference
    messages: [
      {
        role: "system",
        content: `You are an expert content analyst. Analyze the provided transcription.`
      },
      {
        role: "user",
        content: `Transcription:\n${fullTranscription.substring(0, 100000)}`
      }
    ],
    response_format: zodResponseFormat(AnalysisSchema, "analysis_response"),
  });

  const analysis = completion.choices[0].message.parsed;
  const usage = completion.usage;

  if (!analysis) throw new Error("Failed to parse OpenAI response");

  return {
    transcription: fullTranscription, // Use the whisper transcription (more accurate than re-generated)
    summary: analysis.summary,
    key_topics: analysis.key_topics,
    duration: duration,
    usage: {
      promptTokenCount: usage?.prompt_tokens || 0,
      candidatesTokenCount: usage?.completion_tokens || 0,
      totalTokenCount: usage?.total_tokens || 0,
    }
  };
};
