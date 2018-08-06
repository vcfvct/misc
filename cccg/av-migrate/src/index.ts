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

const query = util.promisify(conn.query).bind(conn);
const FILE_TABLE = 'file_managed';
const PUBLIC_PREFIX = 'public://';
const CCCG_PREFIX = 'https://www.cccgermantown.org/s3/';

(async () => {
  try {
    // const audioSqls: Array<string> = await handleAudio();
    // const videoSqls: Array<string> = await handleVideo();
    // const fileContent: string = `--- audio\n${audioSqls.join('\n')} \n\n--- videos\n\n${videoSqls.join('\n')}`;

    const htmlSqls = await handleUrlInBody();
    const fileContent = htmlSqls.join('\n');
    fs.writeFileSync('./result.sql', fileContent, {encoding: 'utf-8'});
  } finally {
    conn.end();
  }
})()

async function handleAudio(): Promise<Array<string>> {
  const audios: ContentTuple[] = await query(`SELECT fid as id, uri as content FROM ${FILE_TABLE} WHERE filemime='audio/mpeg'`);
  return audios.map((audio: ContentTuple) => {
    let replacement = CCCG_PREFIX;
    if(!audio.content.startsWith(`${PUBLIC_PREFIX}audio/`)){
      replacement = replacement + 'audio/2015/';
    }
    const newURI = audio.content.replace(PUBLIC_PREFIX, replacement);
    return `UPDATE ${FILE_TABLE} SET uri='${newURI}' WHERE fid=${audio.id};`;
  });
};

async function handleVideo(): Promise<Array<string>> {
  const videos: ContentTuple[] = await query(`SELECT fid as id, uri as content FROM ${FILE_TABLE} WHERE filemime='video/mp4'`);
  return videos.map((video: ContentTuple) => {
    const newURI = video.content.replace(`${PUBLIC_PREFIX}video/`, `${CCCG_PREFIX}videos/sermon/legacy/`);
    return `UPDATE ${FILE_TABLE} SET uri='${newURI}' WHERE fid=${video.id};`;
  })
};

async function handleUrlInBody(): Promise<Array<string>> {
  const s3Url = `https://s3.amazonaws.com/cccg-media/`;
  const bodyCopyTable = 'field_data_body';
  const htmls: ContentTuple[] = await query(`SELECT entity_id as id, body_value as content FROM ${bodyCopyTable} WHERE entity_id >= 1081`);
  return htmls.map((html: ContentTuple) => {
    const body = html.content;
    if(body.includes(s3Url)){
      const newBody = body.replace(new RegExp(s3Url, 'g'), 'https://www.cccgermantown.org/s3/');
      return `UPDATE ${bodyCopyTable} SET body_value='${newBody}' WHERE entity_id=${html.id};`; 
    }
    return '';
  });
};

interface ContentTuple {
  id: number;
  content: string;
}