import { ActivityType, ApplicationIntegrationType, AttachmentBuilder, Client, EmbedBuilder, Events, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { spawn as spawnChildProcess } from "child_process"
import fs from "node:fs/promises"

// Create a new client instance
const client = new Client({ intents: [] });
const downloadPath = "./downloads"

class MyError extends Error {}

//yoink
async function downloadVideo(url: string): Promise<string> {
  const vidRoute = crypto.randomUUID()
  const ytdlp = spawnChildProcess("yt-dlp", [
    "--no-playlist",
    "--output", `${downloadPath}/${vidRoute}.mp4`,
    "--merge-output-format", "mp4",
    "--max-filesize", "514M",
    "--format", "best[filesize<=10M]/worst",
    url,
  ], { stdio: 'pipe' })
  ytdlp.stderr.on("data", (err) => {
    console.error("yt-dlp error:", err.toString());
  });
  return await new Promise((res, rej) => {
    ytdlp.on('exit', (code) => {
      if (code) {
        console.error("yt-dlp exited with code:", code);
        return rej(new MyError("Failed to download video :c"));
      }
      res(vidRoute);
    })
  })
}

//getVid duration
function getDurationAndSize(filePath: string): Promise<number[]> {
  return new Promise((res, rej) => {
    const ffmprobe = spawnChildProcess("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration,size",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath
    ], { stdio: 'pipe' })
    let data = "";
    ffmprobe.stdout.on("data", (d) => { data += d })
    ffmprobe.stderr.on("data", (e) => { console.error("ffprobe error:", e.toString()) })
    ffmprobe.on('exit', (code) => {
      if (code) {
        console.error("ffprobe exited with code:", code);
        return rej(new MyError("Failed to compress video :c"));
      }
      res(data.split("\n").map((v) => parseFloat(v)))
    })
  })
}

async function compressVideo(videoName: string): Promise<boolean> {
  const maxSize = 10_000_000; // bytes
  const [duration, size] = await getDurationAndSize(`${downloadPath}/${videoName}.mp4`);
  const totalBitrateKbps = Math.floor(maxSize * 8 / duration / 1000);
  const audioKbps = 64;
  const videoKbps = totalBitrateKbps - audioKbps;
  return new Promise((res, rej) => {
    if (size <= maxSize) {
      return res(false)
    }
    const ffmpeg = spawnChildProcess("ffmpeg", [
      "-i", `${downloadPath}/${videoName}.mp4`,
      "-b:v", `${videoKbps}k`,
      "-b:a", `${audioKbps}k`,
      "-bufsize", `${videoKbps}k`,
      "-preset", "fast",
      "-y", `${downloadPath}/${videoName}_compressed.mp4`
    ], { stdio: "pipe" });

    ffmpeg.stdout.on("data", () => { });
    ffmpeg.stderr.on("data", d => console.error(d.toString()));
    ffmpeg.on("exit", (code) => {
      if (code) {
        console.error("ffmpeg exited with code:", code);
        return rej(new MyError("Failed to compress video :c"));
      }
      res(true);
    });
  });
}

const attachmentTomfoolery = new SlashCommandBuilder()
  .setName("dl")
  .setDescription("Downloads a video and sends it as an attachment")
  .addStringOption(opt => opt
    .setName('url')
    .setDescription('The URL of the video to download')
    .setRequired(true)
  ).setIntegrationTypes([
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  ]).setContexts([
    InteractionContextType.BotDM,
    InteractionContextType.Guild,
    InteractionContextType.PrivateChannel,
  ]);

client.once(Events.ClientReady, readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  readyClient.user.setPresence({ activities: [{ type: ActivityType.Playing, name: 'nibiga' }] });
  if (process.env.REGISTER_COMMANDS === "1") {
    console.log("Registering commands...");
    readyClient.application.commands.set([attachmentTomfoolery]);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "dl") {
    interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const url = encodeURI(interaction.options.getString('url') || "");
    console.log("Downloading URL:", url);
    try {
      const videoName = await downloadVideo(url)
      const compress = await compressVideo(videoName)
      await interaction.editReply({embeds: [
        new EmbedBuilder()
          .setDescription(`Video downloaded 😎`)
          .setColor('Green')
      ]})
      await interaction.followUp({files: [
        new AttachmentBuilder(`${downloadPath}/${videoName}${compress ? "_compressed" : ""}.mp4`)
          .setName("file.mp4")
      ]});
    } catch (error) {
      if (error instanceof MyError) {
        interaction.editReply({embeds: [
          new EmbedBuilder()
            .setDescription(error.message)
            .setColor('Red')
        ]})
      } else {
        console.error(error);
        interaction.editReply({embeds: [
          new EmbedBuilder()
            .setDescription(`An unknown error occurred while processing the video.`)
            .setColor('Red')
        ]})
      }
    }
  }
});

//nem vicces
setInterval(() => {
  fs.readdir(downloadPath).then((files) => {
    files.forEach((file) => {
      fs.stat(`${downloadPath}/${file}`).then((fileData) => {
        if (fileData.birthtimeMs <= Date.now() - 300000) {
          fs.unlink(`${downloadPath}/${file}`).catch((err) => console.error(err))
        }
      }).catch((err) => console.error(err))
    })
  }).catch((err) => console.error(err))
}, 10000);

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    console.log(`Received ${signal}, shutting down...`);
    client.destroy();
    process.exit(0);
  });
});

client.login(process.env.DC_TOKEN);