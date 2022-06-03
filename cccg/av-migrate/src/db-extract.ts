
import * as mysql from 'mysql';
import { Connection } from 'mysql';
import * as util from 'util';
import * as fs from 'fs';
import { ContentTuple } from '.';
import { stringify } from 'yaml';
import * as cheerio from 'cheerio';


let conn: Connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '12345678',
  database: 'cccgerm'
});

const query = util.promisify(conn.query).bind(conn);
const s3Prefix = `https://s3.amazonaws.com/cccg-media/`;
const cccgPrefix = 'https://www.cccgermantown.org/s3/';
const cccgReg = new RegExp(cccgPrefix, 'g');
const NodeType = 'openchurch_podcast';

(async () => {
  try {
    // ge all podcast from 'node' table
    const podcasts: Array<PodCastMeta> = await query(`
      SELECT n.nid AS id, n.title, body.body_value AS body, author.field_oc_author_value AS author, dates.field_oc_date_value AS eventDate, evt.field_event_name_value AS eventName
      FROM node n
      LEFT JOIN field_data_body body ON body.entity_id=n.nid
      LEFT JOIN field_data_field_oc_author author ON author.entity_id=n.nid
      LEFT JOIN field_data_field_event_name evt ON evt.entity_id=n.nid
      LEFT JOIN field_data_field_oc_date dates ON  dates.entity_id=n.nid
      WHERE n.type ='${NodeType}'
      ORDER BY n.nid DESC;
    `);
    console.log(podcasts);

    const podcastMap = new Map<number, PodCastMeta>();
    podcasts.forEach((podcast: PodCastMeta) => {
      podcastMap.set(podcast.id, podcast);
      if (podcast.id > 1019) { // for newer sermons, extract av/youtube url from html body
        extractUrl(podcast);
      }
      delete podcast.body; // remove body as urls and description are extracted
    });
    // get audio url for old sermons
    const audioFiles: Array<ContentTuple> = await query(`
      SELECT n.nid as id, fm.uri as content
      FROM file_managed fm, node n, field_data_field_oc_audio a
      WHERE a.entity_id=n.nid AND a.field_oc_audio_fid=fm.fid;
    `);

    audioFiles.forEach((audio: ContentTuple) => {
      const podcast = podcastMap.get(audio.id);
      if (!podcast) return;
      const newUrl = audio.content.replace(cccgReg, s3Prefix);
      podcast.audio = newUrl;
    });
    // get video url for old sermons
    const videoFiles: Array<ContentTuple> = await query(`
      SELECT n.nid as id, fm.uri as content
      FROM file_managed fm, node n, field_data_field_video v
      WHERE v.entity_id=n.nid AND v.field_video_fid=fm.fid ;
    `);

    videoFiles.forEach((video: ContentTuple) => {
      const podcast = podcastMap.get(video.id);
      if (!podcast) return;
      const newUrl = video.content.replace(cccgReg, s3Prefix);
      podcast.video = newUrl;
    });

    // console.log(podcasts);
    fs.writeFileSync('cccg-sermons.yml', stringify(podcasts));
  } catch (e) {
    console.error(e);
    conn.end()
  }
})();

function extractUrl(podcast: PodCastMeta) {
  const $ = cheerio.load(podcast.body);
  const anchors = $('a');
  anchors.each((index, anchor) => {
    const href = $(anchor).attr('href');
    if (href.endsWith('.mp3') || href.endsWith('.m4a')) {
      podcast.audio = href.replace('/s3/', s3Prefix);
    } else if (href.endsWith('.mp4') || href.endsWith('.MP4')) {
      podcast.video = href.replace('/s3/', s3Prefix);
    } else {
      console.log(`unhandled href: ${href}`);
    }
  });
  const iframes = $('iframe');
  if (iframes.length > 0) {
    podcast.youtubeUrl = iframes.first().attr('src');
  }
  if (podcast.body.startsWith('<p>')) {
    podcast.description = $('p').first().html();
  }
  if (podcast.body.startsWith('<div>')) {
    podcast.description = $('div').first().html();
  }
}

export interface PodCastMeta {
  id: number;
  title: string;
  body: string;
  author: string;
  eventDate: Date;
  eventName: string;
  audio?: string;
  video?: string;
  youtubeUrl?: string;
  description?: string;
}
