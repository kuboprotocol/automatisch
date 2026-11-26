import verifyCredentials from './verify-credentials.js';
import isStillVerified from './is-still-verified.js';

export default {
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'string',
      required: true,
      readOnly: false,
      value: null,
      placeholder: null,
      description: 'VirtualQ dashboard (dashboard.virtualq.tech) → Contact Center → API Tokens → New token. Copy it right away: it is shown only once.',
      clickToCopy: false,
    },
  ],

  verifyCredentials,
  isStillVerified,
};
