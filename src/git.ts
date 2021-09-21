import { execSync } from 'child_process';
import simpleGit from 'simple-git';
import path from 'path';

const git = simpleGit();

export const gitChangedFiles = async () => {
  const status = await git.status();
  return new Set([...status.not_added, ...status.modified]);
};

export const gitPush = async (message: string, files: string[]) => {
  await git.add(files);
  await git.commit(message, files);
  await git.push();
};

export const ghCotent = (p: string) => {
  // Set parent directory because Contents API gives whole content when target is a file
  const output = execSync(`gh api /repos/{owner}/{repo}/contents/${path.dirname(p)}?ref={branch}`);
  const outputJSON = JSON.parse(output.toString('utf-8'));
  const files = outputJSON as {
    path: string;
    download_url: string;
  }[];
  for (const f of files) {
    if (f.path == p) {
      return f;
    }
  }

  throw new Error(`File not found: ${p}`);
};
