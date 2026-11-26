import defineAction from '../../../helpers/define-action.js';
import { stringArg } from '../../../helpers/vertal-app-kit.js';
import { PLAY_API, getTracks, packageName, safeId, withPlayErrors } from '../common.js';

const checkAccess = defineAction({
  name: 'Check app access',
  key: 'checkAccess',
  description: 'Confirms the connected Google account can read this app in Play Console (default language, contact e-mail and tracks). Changes nothing.',
  arguments: [stringArg('packageName', 'Package name (ex.: com.empresa.app)', { required: true })],
  async run($) {
    $.setActionItem({ raw: await withPlayErrors(() => getTracks($, $.step.parameters.packageName)) });
  },
});

const replyToReview = defineAction({
  name: 'Reply to a review',
  key: 'replyToReview',
  description: 'Publishes (or replaces) the developer reply to a Google Play review. The reply is public on the store.',
  arguments: [
    stringArg('packageName', 'Package name (ex.: com.empresa.app)', { required: true }),
    stringArg('reviewId', 'Review ID', { required: true }),
    stringArg('replyText', 'Reply (max. 350 characters)', { required: true }),
  ],
  async run($) {
    const { reviewId, replyText } = $.step.parameters;
    const text = String(replyText || '').trim();
    if (!text) throw new Error('Reply text is required');
    if (text.length > 350) throw new Error('Google Play replies are limited to 350 characters');
    const pkg = packageName($.step.parameters.packageName);
    const { data } = await withPlayErrors(() =>
      $.http.post(`${PLAY_API}/applications/${pkg}/reviews/${encodeURIComponent(safeId(reviewId, 'Review ID'))}:reply`, { replyText: text })
    );
    $.setActionItem({ raw: { reviewId, reply: data?.result || data } });
  },
});

export default [checkAccess, replyToReview];
