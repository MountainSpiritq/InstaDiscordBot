# memdl

A simple discord app to share short videos from other platforms like TikTok, YouTube Shorts, and Instagram Reels onto Discord.


## Environment
This app requires a discord app token to run:
1. Create a new discord app at https://discord.com/developers/applications
2. Go to the "Bot" tab
3. Click "Reset Token" to generate a new token
4. Copy the token and paste it into the `DC_TOKEN` environment variable


## Usage
To use the app you need to add it to your account or invite it to a guild/server:
1. Go to the "OAuth2" tab in your discord app on the Discord Developer Portal
2. Scroll down to the "URL Generator" section
3. Select the "applications.commands" scope in the middle
### For a personal install:
4. Set the "Integration Type" to "User Install"
5. Copy the generated URL and paste it into your browser
6. Authorize the app
### For a guild/server install:
4. Select the "bot" scope in the right column
5. Set the "Integration Type" to "Guild Install"
6. Copy the generated URL and paste it into your browser
7. Authorize the app


## Deployment
The app has a built docker image on ghcr.io, to run it you can use the following command:
```bash
docker run \
  -d \
  --name memdl \
  -e DC_TOKEN=your_discord_token \
  ghcr.io/mountainspiritq/InstaDiscordBot:latest
```