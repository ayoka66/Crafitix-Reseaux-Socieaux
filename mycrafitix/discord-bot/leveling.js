// Système de niveaux simple : XP par message, stockée dans levels.json
// (créé automatiquement, à ne pas commiter — voir .gitignore).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getConfig } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_PATH = join(__dirname, 'levels.json');

function load() {
  if (!existsSync(STORE_PATH)) return {};
  try { return JSON.parse(readFileSync(STORE_PATH, 'utf8')); } catch (e) { return {}; }
}

let store = load();
let dirty = false;
setInterval(function () {
  if (dirty) { writeFileSync(STORE_PATH, JSON.stringify(store, null, 2)); dirty = false; }
}, 5000);

function levelFromXp(xp) {
  // Courbe simple : niveau n demande 50 * n^2 XP cumulée.
  return Math.floor(Math.sqrt(xp / 50));
}

export async function handleMessageXp(message) {
  const cfg = getConfig().leveling || {};
  if (!cfg.enabled || message.author.bot) return;

  const key = message.guild.id + ':' + message.author.id;
  const before = store[key] || 0;
  const gain = typeof cfg.xpPerMessage === 'number' ? cfg.xpPerMessage : 5;
  const after = before + gain;
  store[key] = after;
  dirty = true;

  const lvlBefore = levelFromXp(before);
  const lvlAfter = levelFromXp(after);
  if (lvlAfter > lvlBefore) {
    const text = (cfg.levelUpMessage || 'GG {user}, niveau {level} !')
      .replace('{user}', String(message.author))
      .replace('{level}', String(lvlAfter));
    message.channel.send(text).catch(function () {});
  }
}
