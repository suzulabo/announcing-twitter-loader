import { userByUsername } from './twitter';

const main = async () => {
  const res = await userByUsername(process.argv[2] || '');
  console.dir(res, { depth: null });
};

main().catch(err => {
  console.error(err);
});
