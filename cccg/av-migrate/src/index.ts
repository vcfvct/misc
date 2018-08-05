import * as mysql from 'mysql';
import { Connection } from 'mysql';
import * as util from 'util';
import * as fs from 'fs';

let conn: Connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'cccg'
});

// conn.connect(async (err) => {
//   if (err) {
//     console.log('Error connecting to Db', err);
//     return;
//   }
//   const query = util.promisify(conn.query).bind(conn);
//   try {
//     const rows = await query('select count(*) from file_managed');
//     console.log(rows);
//   } finally {
//     conn.end();
//   }
// })

// const connect = util.promisify(conn.connect);
const query = util.promisify(conn.query).bind(conn);
const FILE_TABLE = 'file_managed';
const PUBLIC_PREFIX = 'public://';
const CCCG_PREFIX = 'https://www.cccgermantown.org/s3/';

(async () => {
  try {
    // const rows = await query(`select count(*) from ${FILE_TABLE}`);
    const audioSqls: Array<string> = await handleAudio();
    const videoSqls: Array<string> = await handleVideo();
    const fileContent: string = `--- audio\n ${audioSqls.join('\n')} \n\n--- videos\n\n videoSqls.join('\n')`;
    fs.writeFileSync('./result.sql', fileContent, {encoding: 'utf-8'});
  } finally {
    conn.end();
  }
})()

async function handleAudio(): Promise<Array<string>> {
  const audios: FileTuple[] = await query(`SELECT fid, uri FROM ${FILE_TABLE} WHERE filemime='audio/mpeg'`);
  return audios.map((audio: FileTuple) => {
    let replacement = CCCG_PREFIX;
    if(!audio.uri.startsWith(`${PUBLIC_PREFIX}audio/`)){
      replacement = replacement + 'audio/2015/';
    }
    const newURI = audio.uri.replace(PUBLIC_PREFIX, replacement);
    return `UPDATE ${FILE_TABLE} SET uri='${newURI}' WHERE fid=${audio.fid};`;
  });
};

async function handleVideo(): Promise<Array<string>> {
  const videos: FileTuple[] = await query(`SELECT fid, uri FROM ${FILE_TABLE} WHERE filemime='video/mp4'`);
  return videos.map((video: FileTuple) => {
    const newURI = video.uri.replace(`${PUBLIC_PREFIX}video/`, `${CCCG_PREFIX}videos/`);
    return `UPDATE ${FILE_TABLE} SET uri='${newURI}' WHERE fid=${video.fid};`;
  })
 
};
interface FileTuple {
  fid: number;
  uri: string;
}