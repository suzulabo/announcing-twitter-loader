import fs from 'fs';
import YAML from 'yaml';
import { getUserTweets, Tweet } from './twitter';
import { getDataFilename, loadUsersConfig, logger } from './utils';

const loadTweets = (userID: string) => {
  const filename = getDataFilename(userID, 'tweets');
  if (!fs.existsSync(filename)) {
    return [];
  }

  return YAML.parse(fs.readFileSync(filename, 'utf-8')) as Tweet[];
};

const saveTweets = (userID: string, tweets: Tweet[]) => {
  const filename = getDataFilename(userID, 'tweets');
  return fs.writeFileSync(filename, YAML.stringify(tweets), { encoding: 'utf-8' });
};

const savePosts = (user: { id: string; name: string }, tweets: Tweet[]) => {
  const json = (() => {
    const ids = new Set(tweets.map(v => v.id));

    const posts = [] as {
      body: string;
      pT: string;
      imgs?: string[];
      link: string;
      cID: string; // Custom ID
      parentID?: string;
    }[];
    for (const tweet of tweets) {
      if (tweet.replyTo) {
        if (tweet.replyTo != user.id) {
          // skip reply to not self
          continue;
        }
        if (!ids.has(tweet.conversationID || '')) {
          // skip parent tweet does not exist
          continue;
        }
      }

      const post: typeof posts[number] = {
        body: tweet.text,
        pT: tweet.createdAt,
        link: `https://twitter.com/${user.name}/status/${tweet.id}`,
        cID: tweet.id,
      };

      if (tweet.attachments) {
        const imgs = [] as string[];
        for (const attachment of tweet.attachments) {
          if (attachment.url) {
            imgs.push(attachment.url);
          } else if (attachment.previewImageURL) {
            imgs.push(attachment.previewImageURL);
          }
        }
        if (imgs.length > 0) {
          post.imgs = imgs;
        }
      }

      if (tweet.conversationID != tweet.id) {
        post.parentID = tweet.conversationID;
      }

      posts.push(post);
    }
    return JSON.stringify({ posts });
  })();

  const filename = getDataFilename(user.id, 'posts');
  return fs.writeFileSync(filename, json, { encoding: 'utf-8' });
};

const main = async () => {
  const users = loadUsersConfig();
  for (const user of users) {
    logger.info('START: %s', user.id);
    const curTweets = loadTweets(user.id);
    const latest =
      curTweets.length == 0
        ? undefined
        : curTweets.reduce((p, c) => {
            if (!p || c.createdAt > p.createdAt) {
              return c;
            }
            return p;
          });

    const max_tweets = user.max_tweets || 100;
    const tweets = await getUserTweets(user.id, latest?.id);
    if (tweets.length == 0) {
      logger.info('no new tweets: %s', user.id);
      continue;
    }
    const newTweets = [...tweets, ...curTweets].slice(0, max_tweets);
    saveTweets(user.id, newTweets);
    savePosts(user, newTweets);
  }
};

main().catch(err => {
  console.error(err);
});
