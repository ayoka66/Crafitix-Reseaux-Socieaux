# Bot Discord MyCrafitix

Accueil des membres, niveaux/XP et auto-modération (mots interdits, anti-invite,
anti-spam, limite de mentions). La configuration se modifie dans l'admin web
du site (panneau « Bot Discord », mot de passe séparé) puis s'exporte en
`bot-config.json` à poser ici — ou se modifie directement dans ce fichier.

## Pourquoi un dossier à part, pas sur Vercel ?

Ce bot doit rester connecté à Discord en permanence (ce qu'on appelle le
« Gateway »). Vercel (en tout cas sur le plan gratuit) exécute du code à la
demande puis l'arrête : parfait pour le site et pour `api/discord-send.js`
(un simple envoi ponctuel), mais impossible pour un bot qui doit *écouter*
le serveur 24h/24. Ce bot se lance donc comme un petit programme à part, sur
ton PC pour tester, puis sur un hébergeur qui le laisse tourner en continu
(un Raspberry Pi, un VPS, ou un service comme Railway / Render — leurs
offres gratuites suffisent largement à ce bot).

## Mise en route

1. Crée une application sur <https://discord.com/developers/applications>,
   onglet **Bot** → **Reset Token** pour obtenir un jeton, et active les
   deux interrupteurs **Server Members Intent** et **Message Content Intent**
   (indispensables pour l'accueil, les niveaux et l'auto-modération).
2. Invite le bot sur ton serveur : onglet **OAuth2 → URL Generator**, coche
   `bot`, puis les permissions `Send Messages`, `Manage Messages`,
   `Manage Roles` (si tu utilises le rôle automatique) et `Read Message
   History`. Ouvre l'URL générée et choisis ton serveur.
3. Installe [Node.js](https://nodejs.org/) (version 18 ou plus) si ce n'est
   pas déjà fait.
4. Dans ce dossier :

   ```bash
   npm install
   cp .env.example .env
   # ouvre .env et colle ton jeton après DISCORD_TOKEN=
   npm start
   ```

5. Le terminal affiche « Connecté en tant que … » : le bot est en ligne.

## Configurer le bot

- Depuis le site : ouvre l'admin bot (clique sur le droit d'auteur en bas du
  site, mot de passe du panneau bot), règle les options, puis clique sur
  **Exporter bot-config.json** et remplace le fichier `bot-config.json` de ce
  dossier par celui téléchargé.
- Ou directement : modifie `bot-config.json` à la main, en gardant la même
  structure. Le bot recharge ce fichier automatiquement, sans redémarrage.

## Message automatique immédiat

Le bouton « Envoyer maintenant » de l'admin web n'utilise pas ce script : il
passe par `api/discord-send.js` (sur le site Vercel) pour un envoi ponctuel,
même quand ce bot tourne ailleurs ou est éteint. Les deux utilisent le même
jeton de bot, mais jamais stocké au même endroit : vérifie que c'est bien le
jeton de *ce* bot dans les deux cas.

## Sécurité du jeton

Le fichier `.env` ne doit jamais être partagé, commité sur GitHub, ni collé
dans un message. Quiconque le possède peut faire parler ton bot et modifier
ton serveur avec ses permissions. Le `.gitignore` fourni l'exclut déjà.
