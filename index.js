const fs = require("fs");
const yaml = require("js-yaml");




const colors = require("colors");
const { status } = require("./utils/status.js");
const { format } = require("./utils/format.js");
const {
  Client,
  GatewayIntentBits,
  ActivityType,
  EmbedBuilder,
} = require("discord.js");
const express = require("express");
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
const app = express(); 
const path = require("path");
const config = yaml.load(fs.readFileSync('config.yml', 'utf8'));
config.token = process.env.DISCORD_TOKEN;
const messages = yaml.load(
  fs.readFileSync(`./translations/${config.lang}.yml`)
);

client.on("ready", () => {
  console.log(messages.login.replace("{bot}", client.user.tag).blue);
  setInterval(() => {
    status(config.server)
      .then((result) => {
        display(result);
      })
      .catch((error) => {
        display(false);
      });
  }, config.interval);
});

let message;
let last;
const display = async (status) => {
  let content;
  if (status) {
    if (last != true) {
      last = true;
      console.log(
        `${messages.online.green} [${new Date().toLocaleString().gray}]`
      );
    }
    content = format(messages.status, status);
  } else {
    if (last != false) {
      last = false;
      console.log(
        `${messages.offline.red} [${new Date().toLocaleString().gray}]`
      );
    }
    content = messages.offline;
  }

  // Status
  if (config.status.enabled) {
    client.user.setPresence({
      activities: [{ name: content, type: ActivityType.Watching }],
      status: status ? "online" : "dnd",
    });
  }

  // Message
  if (config.message.enabled) {
    let embed;
    if (status) {
      embed = {
        files: [
          {
            attachment: status.favicon
              ? Buffer.from(status.favicon.split(",")[1], "base64")
              : "https://i.imgur.com/hANvMnV.png",
            name: "favicon.png",
          },
        ],
        embeds: [
          new EmbedBuilder()
            .setColor("#6fad45")
            .setAuthor({
              name: `${config.name}`,
              iconURL: "https://i.imgur.com/9ByU5Uh.png",
            })
            .setThumbnail("attachment://favicon.png")
            .addFields(
              {
                name: messages.players,
                value: `${status.players.online}/${status.players.max}\n`,
                inline: false,
              },
              {
                name: messages.version,
                value: `${status.version.name}      \n`,
                inline: false,
              },
              {
                name: messages.ping,
                value: `${status.roundTripLatency} ms     \n`,
                inline: false,
              }
            )
            .setTimestamp()
            .setFooter({ text: messages.update }),
        ],
      };
    } else {
      embed = {
        embeds: [
          new EmbedBuilder()
            .setColor("#c21408")
            .setThumbnail("attachment://favicon.png")
            .setAuthor({
              name: `${config.name}`,
              iconURL: "https://i.imgur.com/9ByU5Uh.png",
            })
            .setDescription(content)
            .setTimestamp()
            .setFooter({ text: messages.update }),
        ],
      };
    }
    if (!message) {
      message = await client.channels.cache
        .get(config.message.channel)
        .send(embed);
    } else {
      message.edit(embed);
    }
  }
};

client.login(config.token);



const publicDirectory = path.join(__dirname, "public");

// Serve static files from the "public" directory.
app.use(express.static(publicDirectory));

// Define a route to serve the HTML file.
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDirectory, "index.html"));
});

// Start the server on a specified port (e.g., 3000).
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

