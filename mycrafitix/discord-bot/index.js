// Bot Discord MyCrafitix : accueil, niveaux et auto-modération.
// Se lance avec un processus permanent (pas sur Vercel) : ton PC, un VPS,
// ou un hébergeur comme Railway / Render. Voir README.md.
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { checkMessage, handleViolation } from './automod.js';
import { handleMemberJoin } from './welcome.js';
import { handleMessageXp } from './leveling.js';

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('DISCORD_TOKEN manquant. Copie .env.example en .env et renseigne le jeton.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel]
});

client.once('clientReady', function () {
  console.log('Connecté en tant que ' + client.user.tag);
  // Rappel : les intents "Server Members" et "Message Content" doivent être
  // activés dans le portail développeurs Discord (onglet Bot) pour que
  // l'accueil, l'auto-modération et les niveaux fonctionnent.
});

client.on('guildMemberAdd', function (member) {
  handleMemberJoin(member).catch(function (e) { console.error('[welcome]', e); });
});

client.on('messageCreate', async function (message) {
  if (!message.guild || message.author.bot) return;

  const reason = checkMessage(message);
  if (reason) {
    await handleViolation(message, reason);
    return; // message supprimé : pas d'XP pour un message sanctionné
  }

  handleMessageXp(message).catch(function (e) { console.error('[leveling]', e); });
});

client.login(TOKEN).catch(function (e) {
  console.error('Connexion à Discord impossible :', e.message);
  process.exit(1);
});
