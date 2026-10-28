// Message de bienvenue + rôle automatique à l'arrivée d'un membre.
import { getConfig } from './config.js';

export async function handleMemberJoin(member) {
  const cfg = getConfig().welcome || {};
  if (!cfg.enabled) return;

  if (cfg.channelId) {
    const ch = member.guild.channels.cache.get(cfg.channelId);
    if (ch && ch.isTextBased()) {
      const text = (cfg.message || 'Bienvenue {user} !').replace('{user}', String(member));
      ch.send(text).catch(function () {});
    }
  }

  if (cfg.autoRoleId) {
    const role = member.guild.roles.cache.get(cfg.autoRoleId);
    if (role) member.roles.add(role).catch(function (e) { console.error('[welcome] rôle auto impossible :', e.message); });
  }
}
