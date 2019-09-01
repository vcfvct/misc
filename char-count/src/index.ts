import * as fs from 'fs';

(() => {
  const begin: number = Date.now();
  const words: string[] = fs.readFileSync('english_words.txt').toString().split('\r\n');
  console.info(words.length);
  const aToZArray = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const aToZMap: { [key: string]: { word: string, count: number } } = {};
  aToZArray.forEach(c => {
    aToZMap[c] = { word: c, count: 1 };
  })
  words.forEach(w => {
    aToZArray.forEach(c => {
      const currentCount = countBy(w, c);
      if (currentCount > aToZMap[c].count) {
        aToZMap[c] = { word: w, count: currentCount }
      }
    });
  });
  console.info(JSON.stringify(aToZMap, null, 2));
  console.info(`------- Time used: ${(Date.now() - begin) / 1000}s.`);
})();

function countBy(str: string, charToCount: string): number {
  return str.split(charToCount).length - 1;
}