// Auto-modération : mots interdits, liens d'invitation Discord, mentions en
// masse et messages répétés envoyés trop vite (spam). Chaque règle peut être
// désactivée depuis l'admin web (bot-config.json → automod).
import { getConfig } from './config.js';

const INVITE_RE = /(discord\.gg|discord(?:app)?\.com\/invite)\/\S+/i;
const recentByUser = new Map(); // userId -> [{ content, t }]
const SPAM_WINDOW_MS = 7000;
const SPAM_REPEAT = 3;

function isSpam(userId, content) {
  const now = Date.now();
  const list = (recentByUser.get(userId) || []).filter(function (m) { return now - m.t < SPAM_WINDOW_MS; });
  list.push({ content, t: now });
  recentByUser.set(userId, list);
  const repeats = list.filter(function (m) { return m.content === content; }).length;
  return repeats >= SPAM_REPEAT;
}

function containsBannedWord(content, words) {
  if (!words || !words.length) return null;
  const lower = content.toLowerCase();
  return words.find(function (w) { return w && lower.includes(w.toLowerCase()); }) || null;
}

/** Retourne une raison de violation (string) ou null si le message est propre. */
export function checkMessage(message) {
  const cfg = getConfig().automod || {};
  if (!cfg.enabled) return null;
  if (message.author.bot) return null;

  const content = message.content || '';

  const banned = containsBannedWord(content, cfg.bannedWords);
  if (banned) return 'mot interdit (« ' + banned + ' »)';

  if (cfg.antiInvite && INVITE_RE.test(content)) return 'lien d’invitation Discord';

  const maxMentions = typeof cfg.maxMentions === 'number' ? cfg.maxMentions : 5;
  if (message.mentions.users.size + message.mentions.roles.size > maxMentions) return 'trop de mentions';

  if (cfg.antiSpam && isSpam(message.author.id, content)) return 'messages répétés trop rapidement';

  return null;
}

export async function handleViolation(message, reason) {
  const cfg = getConfig().automod || {};
  try { await message.delete(); } catch (e) { /* déjà supprimé ou droits insuffisants */ }

  const warn = cfg.warnMessage || 'Merci de respecter le règlement du serveur.';
  try {
    const notice = await message.channel.send('⚠️ ' + message.author + ' ' + warn + ' (' + reason + ')');
    setTimeout(function () { notice.delete().catch(function () {}); }, 8000);
  } catch (e) { /* ignore */ }

  if (cfg.logChannelId) {
    const logCh = message.guild.channels.cache.get(cfg.logChannelId);
    if (logCh && logCh.isTextBased()) {
      logCh.send('🛑 Message supprimé de ' + message.author.tag + ' — ' + reason +
        '\n> ' + (message.content || '').slice(0, 300)).catch(function () {});
    }
  }
}
