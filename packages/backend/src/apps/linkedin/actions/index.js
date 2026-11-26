import defineAction from '../../../helpers/define-action.js';
import { optionsArg, stringArg } from '../../../helpers/vertal-app-kit.js';
import { createPost, getUserInfo } from '../common.js';

const VISIBILITY = [
  { label: 'Public', value: 'PUBLIC' },
  { label: 'Connections only', value: 'CONNECTIONS' },
];

const getProfile = defineAction({
  name: 'Get my profile',
  key: 'getProfile',
  description: 'Returns the connected member: id, name, e-mail and picture.',
  arguments: [],
  async run($) {
    const me = await getUserInfo($);
    $.setActionItem({ raw: me });
  },
});

const createTextPost = defineAction({
  name: 'Create post',
  key: 'createTextPost',
  description: 'Publishes a text post on the connected member profile.',
  arguments: [
    stringArg('text', 'Text', { required: true }),
    optionsArg('visibility', 'Visibility', VISIBILITY, { value: 'PUBLIC' }),
  ],
  async run($) {
    const { text, visibility } = $.step.parameters;
    $.setActionItem({ raw: await createPost($, { text, visibility }) });
  },
});

const createLinkPost = defineAction({
  name: 'Create post with link',
  key: 'createLinkPost',
  description: 'Publishes a post that shares a link (article card) on the connected member profile.',
  arguments: [
    stringArg('text', 'Text', { required: true }),
    stringArg('url', 'Link URL', { required: true }),
    stringArg('title', 'Link title'),
    stringArg('description', 'Link description'),
    optionsArg('visibility', 'Visibility', VISIBILITY, { value: 'PUBLIC' }),
  ],
  async run($) {
    const { text, url, title, description, visibility } = $.step.parameters;
    if (!/^https?:\/\//i.test(String(url || ''))) throw new Error('LinkedIn: link must start with http(s)://');
    $.setActionItem({ raw: await createPost($, { text, visibility, article: { source: url, title, description } }) });
  },
});

export default [getProfile, createTextPost, createLinkPost];
