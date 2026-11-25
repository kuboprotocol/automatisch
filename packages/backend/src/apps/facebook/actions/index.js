import defineAction from '../../../helpers/define-action.js';
import { GRAPH_BASE, pageToken } from '../../../helpers/meta-graph.js';
import { dynamicArg, stringArg } from '../../../helpers/vertal-app-kit.js';

const createPagePost = defineAction({
  name: 'Create Page post',
  key: 'createPagePost',
  description: 'Publishes a post (text and optional link) on a Facebook Page you manage.',
  arguments: [
    dynamicArg('pageId', 'Page', 'listPages'),
    stringArg('message', 'Message', { required: true }),
    stringArg('link', 'Link', { description: 'Optional URL to attach.' }),
    stringArg('published', 'Publish now? (true/false)', { value: 'true' }),
  ],
  async run($) {
    const { pageId, message, link, published } = $.step.parameters;
    const token = await pageToken($, pageId);
    const body = { message, access_token: token };
    if (link) body.link = link;
    if (String(published) === 'false') body.published = false;
    const { data } = await $.http.post(`${GRAPH_BASE}/${encodeURIComponent(pageId)}/feed`, body, {
      additionalProperties: { skipAddingAuthHeader: true },
    });
    $.setActionItem({ raw: data });
  },
});

const createPagePhoto = defineAction({
  name: 'Create Page photo post',
  key: 'createPagePhoto',
  description: 'Publishes a photo (public image URL) with a caption on a Facebook Page.',
  arguments: [
    dynamicArg('pageId', 'Page', 'listPages'),
    stringArg('imageUrl', 'Image URL', { required: true }),
    stringArg('caption', 'Caption'),
  ],
  async run($) {
    const { pageId, imageUrl, caption } = $.step.parameters;
    const token = await pageToken($, pageId);
    const { data } = await $.http.post(
      `${GRAPH_BASE}/${encodeURIComponent(pageId)}/photos`,
      { url: imageUrl, caption: caption || undefined, access_token: token },
      { additionalProperties: { skipAddingAuthHeader: true } }
    );
    $.setActionItem({ raw: data });
  },
});

export default [createPagePost, createPagePhoto];
