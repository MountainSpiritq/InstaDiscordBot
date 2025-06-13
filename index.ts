import { ActivityType, Attachment, AttachmentBuilder, Client, Events, GatewayIntentBits, Guild, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { spawn as spawnChildProcess } from "child_process"
import fs from "node:fs/promises"

// Create a new client instance
const client = new Client({ intents: [] });
const downloadPath = "./downloads"

//yoink
async function downloadVideo(url: string):Promise<string> {
  const vidRoute = crypto.randomUUID()
  const ytdlp = spawnChildProcess("yt-dlp", [
    "--no-playlist",
    "--output", `${downloadPath}/${vidRoute}.mp4`,
    "--merge-output-format","mp4",
    "--max-filesize","514M",
    "--format","best[filesize<=10M]/worst",
    url,
  ], { stdio: 'pipe' })
  return await new Promise((res) => { ytdlp.on('exit', () => { res(vidRoute) }) })
}

//getVid duration
function getDurationAndSize(filePath:string):Promise<number[]>{
  return new Promise((res,rej)=>{
    const ffmprobe = spawnChildProcess("ffprobe",["-v","error", "-show_entries", "format=duration,size", "-of", "default=noprint_wrappers=1:nokey=1",filePath],{stdio:'pipe'})
    let data="";
    ffmprobe.stdout.on("data",(d)=>{data+=d})
    ffmprobe.stderr.on("data",(e)=>{console.error("error:",e.toString())})

    ffmprobe.on('exit', (code) => {res(code ? [code] : data.split("\n").map((v)=>parseFloat(v)))})
  })
}

async function compressVideo(videoName:string):Promise<boolean> {
  const maxSize = 10_000_000; // bytes
  const [duration,size] = await getDurationAndSize(`${downloadPath}/${videoName}.mp4`);
  const totalBitrateKbps = Math.floor(maxSize * 8 / duration / 1000);
  const audioKbps = 64;
  const videoKbps = totalBitrateKbps - audioKbps;
  return new Promise((res, rej) => {      
    if(size<=maxSize){
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

    ffmpeg.stdout.on("data", ()=>{});
    ffmpeg.stderr.on("data", d => console.error(d.toString()));
    ffmpeg.on("exit", () => res(true));
  });
}

const attachmentTomfoolery = new SlashCommandBuilder()
  .setName("dl")
  .setDescription("attacment")
  .addStringOption(opt => opt.setName('url').setDescription('YtDLP URL').setRequired(true));

  client.once(Events.ClientReady, readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  readyClient.user.setPresence({ activities: [{ type: ActivityType.Playing, name: 'nibiga' }] });
  readyClient.application.commands.set([attachmentTomfoolery])
  /*readyClient.guilds.fetch("1381541650119131137").then((guild) => {
    guild.commands.create(attachmentTomfoolery)
  })*/
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "dl") {
    interaction.deferReply({flags:MessageFlags.Ephemeral})
    const url = encodeURI(interaction.options.getString('url') || "");
    try {
      const videoName = await downloadVideo(url)
      const compress=await compressVideo(videoName)
      await interaction.editReply("Video downloaded :3")
      await interaction.followUp({files: [new AttachmentBuilder(`${downloadPath}/${videoName}${compress ? "_compressed" : ""}.mp4`).setName("file.mp4")] })
    } catch (error) {
      console.error(error);
      interaction.editReply("Failed video download :(")
    }
  }
});

//nem vicces
setInterval( () => {
  fs.readdir(downloadPath).then((files)=>{
    files.forEach( (file) => {
      fs.stat(`${downloadPath}/${file}`).then((fileData)=>{
        if (fileData.birthtimeMs <= Date.now() - 300000) {
           fs.unlink(`${downloadPath}/${file}`).catch((err)=>console.error(err))
        }
      }).catch((err)=>console.error(err))
    })
  }).catch((err)=>console.error(err))
}, 10000)

client.login(process.env.DC_TOKEN);
