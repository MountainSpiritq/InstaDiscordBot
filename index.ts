import { ActivityType, Attachment, AttachmentBuilder, Client, Events, GatewayIntentBits, Guild, SlashCommandBuilder } from 'discord.js'
import { spawn as spawnChildProcess } from "child_process"
import fs from "node:fs/promises"

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const downloadPath = "./downloads"

//yoink
async function downloadVideo(url: string) {
  const vidRoute = crypto.randomUUID()
  const ytdlp = spawnChildProcess("yt-dlp", [
    "--no-playlist",
    "--output", `${downloadPath}/${vidRoute}`,
    url,
  ], { stdio: 'pipe' })
  return await new Promise((res) => { ytdlp.on('exit', (code) => { res(code == 0 ? vidRoute : code) }) })
}


const attachmentTomfoolery = new SlashCommandBuilder()
  .setName("dl")
  .setDescription("attacment")
  .addStringOption(opt => opt.setName('url').setDescription('YtDLP URL').setRequired(true));

client.once(Events.ClientReady, readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  readyClient.user.setPresence({ activities: [{ type: ActivityType.Playing, name: 'nibiga' }] });
  readyClient.guilds.fetch("1381541650119131137").then((guild) => {
    guild.commands.create(attachmentTomfoolery)
  })
});


client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "dl") {
    interaction.deferReply()
    const url = encodeURI(interaction.options.getString('url') || "");
    
    try {
      const videoName = await downloadVideo(url)
      await interaction.editReply({ files: [new AttachmentBuilder(`${downloadPath}/${videoName}`).setName("file.mp4")] })

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
