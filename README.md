<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1rKyNksOveDdW7qYaK1J84L6FUY_bXdvI

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deepseek remark (optional)
- Set `VITE_DEEPSEEK_API_KEY` in `.env.local`
- Optional: override endpoint with `VITE_DEEPSEEK_API_URL` (default `https://api.deepseek.com/v1/chat/completions`)
- The home top “黑主任”话术会基于当天打卡数据自动生成
