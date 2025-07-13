const { SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('addrepo')
    .setDescription('Ajoute un repo GitHub public à surveiller')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('URL du repo GitHub (ex: https://github.com/user/repo)')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('removerepo')
    .setDescription('Supprime un repo de la liste surveillée')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('URL du repo GitHub à retirer')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('listrepos')
    .setDescription('Liste les dépôts surveillés sur ce serveur')
];

module.exports = commands;
