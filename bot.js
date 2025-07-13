const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const fetch = require('node-fetch');

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '60', 10) * 1000;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const reposFile = './repos.json';
let repos = [];

if (fs.existsSync(reposFile)) {
  repos = JSON.parse(fs.readFileSync(reposFile)).repos;
}

const saveRepos = () => {
  fs.writeFileSync(reposFile, JSON.stringify({ repos }, null, 2));
};


const commands = require('./commands');

client.once('ready', async () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const appId = (await rest.get(Routes.user())).id;
  await rest.put(Routes.applicationCommands(appId), {
    body: commands.map(c => c.toJSON())
  });
  console.log('✅ Commandes slash enregistrées');
  startPolling();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, guildId, channelId } = interaction;

  if (commandName === 'addrepo') {
    const url = interaction.options.getString('url');
    const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);

    if (!match) {
      await interaction.reply({ content: '❌ URL invalide. Format attendu : https://github.com/user/repo', ephemeral: true });
      return;
    }

    const [ , owner, repo ] = match;
    const exists = repos.find(r => r.owner === owner && r.repo === repo && r.guildId === guildId);

    if (exists) {
      await interaction.reply('⚠️ Ce dépôt est déjà surveillé.');
      return;
    }

    repos.push({
      owner,
      repo,
      lastSha: null,
      guildId,
      channelId
    });

    saveRepos();
    await interaction.reply(`✅ Dépôt ajouté : \`${owner}/${repo}\``);
  }

  else if (commandName === 'removerepo') {
    const url = interaction.options.getString('url');
    const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);

    if (!match) {
      await interaction.reply({ content: '❌ URL invalide.', ephemeral: true });
      return;
    }

    const [ , owner, repo ] = match;
    const index = repos.findIndex(r => r.owner === owner && r.repo === repo && r.guildId === guildId);

    if (index === -1) {
      await interaction.reply('⚠️ Ce dépôt n’est pas dans la liste.');
      return;
    }

    repos.splice(index, 1);
    saveRepos();
    await interaction.reply(`🗑️ Dépôt supprimé : \`${owner}/${repo}\``);
  }

  else if (commandName === 'listrepos') {
    const list = repos.filter(r => r.guildId === guildId);
    if (list.length === 0) {
      await interaction.reply('📭 Aucun dépôt surveillé sur ce serveur.');
    } else {
      const msg = list.map(r => `• \`${r.owner}/${r.repo}\``).join('\n');
      await interaction.reply(`📋 Dépôts surveillés :\n${msg}`);
    }
  }
});

// === Vérifie les nouveaux commits ===
async function checkCommits() {
  for (const repo of repos) {
    const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) continue;

      const latest = data[0];
      const newSha = latest.sha;

      if (repo.lastSha && repo.lastSha !== newSha) {
        const guild = client.guilds.cache.get(repo.guildId);
        const channel = guild?.channels.cache.get(repo.channelId);

        if (channel?.isTextBased()) {
          const commitMsg = `📢 Nouveau commit sur **${repo.owner}/${repo.repo}** :
**${latest.commit.author.name}** → *${latest.commit.message}*
🔗 ${latest.html_url}`;
          channel.send(commitMsg);
        }
      }

      repo.lastSha = newSha;
    } catch (err) {
      console.error(`Erreur avec ${repo.owner}/${repo.repo} :`, err.message);
    }
  }

  saveRepos();
}

function startPolling() {
  console.log(`⏱️ Polling actif toutes les ${POLL_INTERVAL / 1000} secondes`);
  setInterval(checkCommits, POLL_INTERVAL);
}

client.login(TOKEN);
