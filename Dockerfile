FROM oven/bun:alpine

WORKDIR /app
RUN mkdir /app/downloads

RUN apk add --no-cache ffmpeg yt-dlp

COPY package.json ./
COPY bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

CMD ["bun", "run", "index.ts"]