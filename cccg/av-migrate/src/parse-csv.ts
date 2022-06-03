
import {unparse, parse, ParseResult } from 'papaparse';
import * as fs from 'fs';
import { PodCastMeta } from './db-extract';


(async () => {

  const csvFile = fs.readFileSync('sermons.csv').toString();
  const lines = csvFile.split('\r\n');
  parse(csvFile, {
    header: true,
		dynamicTyping: true,
    complete: (res: ParseResult<PodCastMeta>) => {
			const sermons = res.data;
			sermons.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());
			sermons.forEach(s => s.eventDate.setHours(s.eventDate.getHours() - 4));

      const sortedCsv = unparse(sermons)
			fs.writeFileSync('sermons-by-date.csv', sortedCsv);

    }
  });
})()
