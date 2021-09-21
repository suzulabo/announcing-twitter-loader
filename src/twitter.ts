import TwitterApi from 'twitter-api-v2';

const token = process.env['BEARER_TOKEN'];

const twitterClient = new TwitterApi(token || '').readOnly;

export interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  replyTo?: string;
  referenced?: { type: 'retweeted' | 'quoted' | 'replied_to'; id: string }[];
  conversationID?: string;
  attachments?: { type: string; url?: string; previewImageURL?: string }[];
}

export const getUserTweets = async (userID: string, sinceID?: string) => {
  const params = {
    'max_results': 100,
    'expansions': 'attachments.media_keys',
    'tweet.fields': 'created_at,in_reply_to_user_id,conversation_id,referenced_tweets,attachments',
    'media.fields': 'url,preview_image_url',
    ...(sinceID && { since_id: sinceID }),
  };

  const res = await twitterClient.v2.userTimeline(userID, params);

  const mediaMap = new Map(res.includes.media?.map(v => [v.media_key, v]) || []);

  const result = [] as Tweet[];
  for (const tweet of res.tweets) {
    const t: Tweet = {
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at || '',
      replyTo: tweet.in_reply_to_user_id,
      conversationID: tweet.conversation_id,
      referenced: tweet.referenced_tweets,
    };
    if (tweet.attachments?.media_keys) {
      t.attachments = tweet.attachments.media_keys.map(k => {
        const media = mediaMap.get(k);
        if (!media) {
          throw new Error('media is null');
        }
        return {
          type: media.type,
          url: media.url,
          previewImageURL: media.preview_image_url,
        };
      });
    }

    result.push(t);
  }

  return result;
};

export const userByUsername = async (name: string) => {
  return await twitterClient.v2.userByUsername(name);
};
