<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/673a5d04-727f-41b3-b8e3-25ded5e5838a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local`
3. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key
4. If you want to use in-app live voice, also set these LiveKit variables in `.env.local` and in your deployment provider:
   `LIVEKIT_URL`
   `LIVEKIT_API_KEY`
   `LIVEKIT_API_SECRET`
   Optional: `LIVEKIT_ROOM_PREFIX`, `VITE_LIVEKIT_TOKEN_ENDPOINT`
5. Run the app:
   `npm run dev`

## Live Audio Deployment

The LiveKit token API lives at `/api/livekit-token`. If `LIVEKIT_URL`, `LIVEKIT_API_KEY`, or `LIVEKIT_API_SECRET` are missing in the deployed environment, the app will block in-app voice and show a setup warning.

Add the same LiveKit variables from `.env.local` to your deployment provider before using the live mic or camera in production.
