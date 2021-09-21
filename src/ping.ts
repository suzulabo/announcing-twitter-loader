import axios from 'axios';
import { ghCotent, gitChangedFiles, gitPush } from './git';
import { getDataFilename, loadUsersConfig, logger } from './utils';

const PING_TIMEOUT = 10 * 1000;

const main = async () => {
  const changedFiles = await gitChangedFiles();
  const users = loadUsersConfig();
  for (const user of users) {
    const tweetsFile = getDataFilename(user.id, 'tweets', true);
    const postsFile = getDataFilename(user.id, 'posts', true);
    if (!changedFiles.has(tweetsFile)) {
      continue;
    }
    const pingURL = user.pingURL;
    if (!pingURL) {
      continue;
    }

    logger.info('START: %s [%s]', user.name, user.id);
    if (changedFiles.has(postsFile)) {
      await gitPush(`update posts: ${user.name} [${user.id}]`, [postsFile]);
    }

    const ghFile = ghCotent(postsFile);

    const source = axios.CancelToken.source();

    const timer = setTimeout(() => {
      source.cancel();
    }, PING_TIMEOUT);

    try {
      const reqID = new Date().toISOString();
      const res = await axios.get(pingURL, {
        timeout: PING_TIMEOUT,
        maxRedirects: 0,
        headers: {
          'APP-IMPORT-URL': ghFile.download_url,
          'APP-REQUEST-ID': reqID,
        },
        cancelToken: source.token,
      });

      const result = res.data as { status: string; reqID: string };
      if (result.status != 'ok') {
        logger.error('ping error %s', result);
        throw new Error('ping error');
      }
      if (result.reqID != reqID) {
        throw new Error('ping reqID error');
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        throw new Error('timeout(timer)');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    await gitPush(`update tweets: ${user.name} [${user.id}]`, [tweetsFile]);
  }
};

main().catch(err => {
  logger.error(err);
  process.exit(1);
});
