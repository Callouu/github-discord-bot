require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

client.once('ready', () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);
});

// Route webhook GitHub
app.post('/github-webhook', async (req, res) => {
  const payload = req.body;

  if (!payload.commits || !payload.repository) return res.sendStatus(400);

  const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

  for (const commit of payload.commits) {
    const message = `📦 Nouveau commit dans **${payload.repository.name}** :
**${commit.author.name}**: ${commit.message}
🔗 ${commit.url}`;
    channel.send(message);
  }

  res.sendStatus(200);
});

client.login(process.env.DISCORD_BOT_TOKEN);
app.listen(PORT, () => console.log(`Serveur webhook en écoute sur le port ${PORT}`));
