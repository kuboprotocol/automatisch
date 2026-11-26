import { googleAuth } from '../../helpers/google-oauth.js';
import { PLAY_SCOPES } from './common.js';

// Login com Google (cliente "Vertal Fluxos"); retorno https://vertal.dev/fluxos/oauth/google-play-console.
// A API do Play não lista apps: o acesso real a cada app vem das permissões no Play Console.
export default googleAuth('google-play-console', PLAY_SCOPES);
