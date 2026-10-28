// Charge bot-config.json et le recharge à chaud si le fichier est remplacé
// (par exemple après avoir exporté un nouveau fichier depuis l'admin web).
import { readFileSync, watchFile } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, 'bot-config.json');

let current = read();

function read() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.error('[config] bot-config.json illisible, valeurs par défaut utilisées.', e.message);
    return {
      welcome: { enabled: false },
      leveling: { enabled: false },
      automod: { enabled: false, bannedWords: [], maxMentions: 5 },
      announce: {}
    };
  }
}

watchFile(CONFIG_PATH, { interval: 2000 }, function () {
  current = read();
  console.log('[config] bot-config.json rechargé.');
});

export function getConfig() {
  return current;
}
