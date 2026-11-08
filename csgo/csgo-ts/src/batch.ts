import * as cp from 'child_process';
import { statSync, readdirSync } from 'fs';
import { resolve } from 'path';

const BasePath = '/Users/xex766';

const allDirs = getLevel1Dirs(BasePath);
allDirs.forEach(dir => {
  cp.exec(`start cmd.exe /K cd /D ${dir}`);
});

/**
 * get level 1 directories back as an Array from a give dir.
 * @param dir The directory to search from.
 */
function getLevel1Dirs(dir: string): string[] {
  const children: Array<string> = readdirSync(dir);
  const level1Dirs: string[] = [];
  children.forEach((child: string) => {
    const resolvedChild = resolve(dir, child);
    statSync(resolvedChild).isDirectory() && level1Dirs.push(resolvedChild);
  });
  return level1Dirs;
}
