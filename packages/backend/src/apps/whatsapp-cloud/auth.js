import { textField } from '../../helpers/vertal-app-kit.js';
import { phoneNumberInfo, wabaInfo, friendlyGraphError } from './common.js';

export default {
  fields: [
    textField('accessToken', 'Access token', {
      description:
        'Permanent token of a system user (Meta Business Settings → System users → Generate token, with whatsapp_business_messaging and whatsapp_business_management). The temporary token from API Setup expires in 24 h.',
    }),
    textField('phoneNumberId', 'Phone number ID', {
      description: 'WhatsApp → API Setup → "Phone number ID" (not the phone number itself).',
    }),
    textField('wabaId', 'WhatsApp Business Account ID', {
      required: false,
      description: 'Optional. Needed to list your message templates and numbers.',
    }),
  ],

  async verifyCredentials($) {
    try {
      const phone = await phoneNumberInfo($);
      if (!phone?.id) throw new Error('This phone number ID was not found for this token.');
      if ($.auth.data.wabaId) await wabaInfo($);
      const label = [phone.verified_name, phone.display_phone_number].filter(Boolean).join(' · ');
      await $.auth.set({ screenName: label ? `WhatsApp · ${label}` : 'WhatsApp' });
    } catch (error) {
      throw friendlyGraphError(error);
    }
  },

  async isStillVerified($) {
    const phone = await phoneNumberInfo($);
    return !!phone?.id;
  },
};
