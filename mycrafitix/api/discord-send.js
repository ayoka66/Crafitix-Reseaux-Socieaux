// Fonction serverless Vercel : relaie une requête vers l'API Discord sans
// jamais stocker le jeton. Le navigateur de l'admin l'envoie à CHAQUE appel ;
// cette fonction le transmet à Discord et oublie tout aussitôt la réponse
// renvoyée. Elle existe pour éviter le blocage CORS de l'API Discord et pour
// ne jamais exposer le jeton aux autres visiteurs du site (il ne transite
// que entre le navigateur de l'admin et cette fonction, sur HTTPS).
//
// Déployée automatiquement par Vercel : tout fichier dans /api devient une
// route /api/<nom-du-fichier>.

export const config = { runtime: 'edge' };

const DISCORD_API = 'https://discord.com/api/v10';

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'content-type': 'application/json' }
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée.' }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: 'Requête invalide.' }, 400);
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const action = body.action;

  if (!token) return json({ error: 'Jeton manquant.' }, 400);
  if (token.length > 120) return json({ error: 'Jeton invalide.' }, 400);

  const headers = { Authorization: 'Bot ' + token, 'content-type': 'application/json' };

  try {
    if (action === 'whoami') {
      const r = await fetch(DISCORD_API + '/users/@me', { headers });
      if (!r.ok) return json({ error: 'Jeton refusé par Discord (' + r.status + ').' }, 401);
      const me = await r.json();
      return json({ ok: true, username: me.username + (me.discriminator && me.discriminator !== '0' ? '#' + me.discriminator : '') });
    }

    if (action === 'send') {
      const channelId = typeof body.channelId === 'string' ? body.channelId.trim() : '';
      const message = typeof body.message === 'string' ? body.message.slice(0, 1900) : '';
      if (!/^\d{5,25}$/.test(channelId)) return json({ error: 'Identifiant de salon invalide.' }, 400);
      if (!message) return json({ error: 'Message vide.' }, 400);

      const r = await fetch(DISCORD_API + '/channels/' + channelId + '/messages', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ content: message })
      });
      if (!r.ok) {
        const errBody = await r.json().catch(function () { return {}; });
        return json({ error: errBody.message || ('Discord a refusé l’envoi (' + r.status + ').') }, r.status === 429 ? 429 : 400);
      }
      return json({ ok: true });
    }

    return json({ error: 'Action inconnue.' }, 400);
  } catch (e) {
    return json({ error: 'Impossible de joindre Discord.' }, 502);
  }
}
