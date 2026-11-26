import { URLSearchParams } from 'node:url';
import { newState, redirectUri } from '../../../helpers/vertal-app-kit.js';
import { instanceBase } from '../common/instance.js';

export default async function generateAuthUrl($) {
  const params = new URLSearchParams({
    client_id: $.auth.data.clientId,
    redirect_uri: redirectUri($),
    response_type: 'code',
    scope: '',
    state: newState(),
  });
  await $.auth.set({ url: `${instanceBase($.auth.data.instanceUrl)}/oauth/authorize?${params.toString()}` });
}
