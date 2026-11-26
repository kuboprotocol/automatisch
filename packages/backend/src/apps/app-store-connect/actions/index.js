import defineAction from '../../../helpers/define-action.js';
import { stringArg } from '../../../helpers/vertal-app-kit.js';
import { ASC_API, ascId, withAscErrors } from '../common.js';

const replyToReview = defineAction({
  name: 'Reply to a customer review',
  key: 'replyToReview',
  description: 'Publishes a developer response to an App Store review (public on the store; Apple reviews it before showing).',
  arguments: [
    stringArg('reviewId', 'Customer review ID', { required: true }),
    stringArg('responseBody', 'Response', { required: true }),
  ],
  async run($) {
    const body = String($.step.parameters.responseBody || '').trim();
    if (!body) throw new Error('Response text is required');
    if (body.length > 5970) throw new Error('Response too long');
    const { data } = await withAscErrors(() =>
      $.http.post(`${ASC_API}/v1/customerReviewResponses`, {
        data: {
          type: 'customerReviewResponses',
          attributes: { responseBody: body },
          relationships: { review: { data: { type: 'customerReviews', id: ascId($.step.parameters.reviewId, 'Review ID') } } },
        },
      })
    );
    $.setActionItem({ raw: { id: data?.data?.id, state: data?.data?.attributes?.state } });
  },
});

export default [replyToReview];
