# Product Requirements Document (PRD) - Audio Transcription Assistant

## 1. Introduction

### 1.1 Purpose
The Audio Transcription Assistant is a web application designed to help users extract, transcribe, and summarize audio content from YouTube videos or uploaded files. It leverages advanced AI models (Gemini and OpenAI) to provide accurate transcriptions and concise summaries, helping users digest content more efficiently.

### 1.2 Scope
The application includes a client-side interface for user interaction (dashboard, settings, processing handling) and a server-side backend for handling audio extraction, AI integration, and data persistence via Supabase.

## 2. Product Overview

### 2.1 Target Audience
- Content creators needing transcriptions.
- Students and professionals summarizing lectures or meetings.
- General users wanting to read video content instead of watching.

### 2.2 Key Features
- **User Authentication**: Secure login and registration using Supabase Auth.
- **Media Support**:
  - YouTube Video URL processing.
  - Direct Audio File upload.
- **Dual AI Engine**:
  - **Google Gemini (Default)**: Cost-effective and fast transcription/summarization.
  - **OpenAI (Whisper + GPT)**: High-accuracy alternative.
- **Real-time Feedback**: Server-Sent Events (SSE) for progress updates during processing (Extraction -> Transcription -> Summarization).
- **Content Intelligence**:
  - **Full Transcription**.
  - **Concise Summary**.
  - **Key Topics Extraction**.
- **Dashboard & History**: View past transcriptions and summaries.
- **Settings Management**: User-configurable API keys for AI providers.

## 3. Functional Requirements

### 3.1 Authentication
- **FR-01**: Users must be able to register and login.
- **FR-02**: All protected routes and API endpoints must require a valid JWT token.

### 3.2 Content Processing
- **FR-03**: Users can input a valid YouTube URL.
- **FR-04**: Users can upload audio files (supported formats defined by `multer`/`ffmpeg`).
- **FR-05**: Users can select their preferred AI provider (Gemini vs. OpenAI) before processing.
- **FR-06**: The system must extract audio from the provided video URL.
- **FR-07**: The system must transcribe the audio using the selected provider.
- **FR-08**: The system must generate a summary and extract key topics from the transcription.
- **FR-09**: Processing status must be streamed to the user in real-time (SSE).

### 3.3 Data Management
- **FR-10**: Transcriptions, summaries, and metadata (URL, tokens used, duration) must be saved to the database.
- **FR-11**: Users can view a list of their saved summaries.
- **FR-12**: Users can securely save and manage their own API keys for Gemini and OpenAI.

## 4. Technical Architecture

### 4.1 Frontend
- **Framework**: React (Vite)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Context / Hooks
- **Routing**: React Router
- **Icons**: Lucide React

### 4.2 Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **File Handling**: Multer (Uploads), youtube-dl-exec (YouTube)
- **AI Integration**:
  - `@google/generative-ai`
  - `openai` SDK

### 4.3 Database Schema (Inferred)
- **Users**: Managed by Supabase Auth.
- **API Keys**: Table linking `user_id` to encrypted/stored keys for providers.
- **Processing Results**:
  - `id` (UUID)
  - `user_id` (ForeignKey)
  - `original_url` (Text)
  - `transcription` (Text)
  - `summary` (Text)
  - `key_topics` (JSON/Array)
  - `usage_data` (JSON: tokens, model, duration)
  - `created_at` (Timestamp)

## 5. User Interface Flow

1.  **Landing/Login**: User authenticates.
2.  **Home**: User chooses "Paste URL" or "Upload File".
3.  **Configuration**: User selects AI Provider.
4.  **Processing**: Progress bar shows stages (Downloading -> Transcribing -> Saving).
5.  **Result View**: User sees final summary and transcription instantly.
6.  **Saved Summaries**: User browses history of previous tasks.
7.  **Settings**: User updates API keys if needed.

## 6. Security & Performance
- **API Keys**: Stored consistently with user ownership; ideally encrypted (implementation detail to verify).
- **Rate Limiting**: Dependent on specific AI provider limits.
- **File Cleanup**: Temporary audio files must be deleted after processing to save disk space.

## 7. Future Enhancements (Roadmap)
-   Export to PDF/Word.
-   Chat with Video (Q&A based on transcript).
-   Folder organization for saved summaries.
