import { callBroker } from '../../../helpers/vertal-broker.js';

const check = async ($) => {
  const data = await callBroker($.auth.data.vertalKey, { op: 'whoami' });
  return data?.ok === true;
};

export default {
  fields: [
    {
      key: 'screenName',
      label: 'Nome da conexão',
      type: 'string',
      required: true,
      readOnly: false,
      value: 'Conta do Vertal',
      placeholder: null,
      description: 'Nome que aparece na lista de conexões.',
      clickToCopy: false,
    },
    {
      key: 'vertalKey',
      label: 'Chave do Vertal Fluxos',
      type: 'string',
      required: true,
      readOnly: false,
      value: null,
      placeholder: null,
      description:
        'Chave VERTAL_FLUXOS_KEY do seu Cofre no Vertal Dev (criada ao conectar um app).',
      clickToCopy: false,
    },
  ],

  async verifyCredentials($) {
    if (!(await check($))) throw new Error('Chave do Vertal inválida.');
    await $.auth.set({ screenName: $.auth.data.screenName || 'Conta do Vertal' });
  },

  isStillVerified: check,
};
