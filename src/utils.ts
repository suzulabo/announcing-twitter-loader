import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const DATA_DIR = path.resolve(process.env['DATA_DIR'] || 'data');

export const logger = {
  info: (s: string, ...params: any[]) => {
    console.info(s, ...params);
  },
  error: (s: string, ...params: any[]) => {
    console.error(s, ...params);
  },
};

export const loadUsersConfig = () => {
  const pingURLConfig = YAML.parse(
    fs.readFileSync(path.join(DATA_DIR, 'pingURL.yaml'), 'utf-8'),
  ) as {
    id: string;
    pingURL: string;
  }[];

  const pingURLMap = new Map(
    pingURLConfig.map(v => {
      return [v.id, v.pingURL];
    }),
  );

  const usersConfig = YAML.parse(fs.readFileSync(path.join(DATA_DIR, 'users.yaml'), 'utf-8')) as {
    id: string;
    name: string;
    max_tweets: number;
  }[];

  return usersConfig.map(v => {
    const pingURL = pingURLMap.get(v.id);
    return { ...v, pingURL };
  });
};

export const getDataFilename = (id: string, kind: 'tweets' | 'posts', relative = false) => {
  const dataDir = path.join(DATA_DIR, id);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  const result = path.join(dataDir, kind == 'tweets' ? 'tweets.yaml' : 'posts.json');
  if (relative) {
    return path.relative('.', result);
  } else {
    return result;
  }
};
