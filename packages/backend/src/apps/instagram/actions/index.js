import defineAction from '../../../helpers/define-action.js';
import { dynamicArg, stringArg } from '../../../helpers/vertal-app-kit.js';
import { publishMedia } from '../common.js';

const account = dynamicArg('igUserId', 'Instagram account', 'listIgAccounts');

const publishImage = defineAction({
  name: 'Publish photo',
  key: 'publishImage',
  description: 'Publishes a photo (public JPEG URL) with caption to the Instagram feed.',
  arguments: [account, stringArg('imageUrl', 'Image URL (JPEG)', { required: true }), stringArg('caption', 'Caption')],
  async run($) {
    const { igUserId, imageUrl, caption } = $.step.parameters;
    const data = await publishMedia($, igUserId, { image_url: imageUrl, caption: caption || undefined });
    $.setActionItem({ raw: data });
  },
});

const publishReel = defineAction({
  name: 'Publish Reel',
  key: 'publishReel',
  description: 'Publishes a Reel from a public video URL (MP4). Waits up to ~40s for processing.',
  arguments: [account, stringArg('videoUrl', 'Video URL (MP4)', { required: true }), stringArg('caption', 'Caption')],
  async run($) {
    const { igUserId, videoUrl, caption } = $.step.parameters;
    const data = await publishMedia($, igUserId, {
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption || undefined,
    });
    $.setActionItem({ raw: data });
  },
});

export default [publishImage, publishReel];
