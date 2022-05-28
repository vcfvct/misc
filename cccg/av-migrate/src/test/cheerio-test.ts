import * as cheerio from 'cheerio';

const HtmlSource = `<div>罗马书8:10－11</div>
<hr>
<div><a type="audio/mpeg" href="/s3/audio/sermon/2022/20220417.mp3" target="_blank"> <strong>Audio File (音频文件下载) </strong><img class="file-icon" title="video/mp4" src="/modules/file/icons/audio-x-generic.png" alt=""> </a></div>
<div>&nbsp;</div>
<div><a type="video/mp4" href="/s3/videos/sermon/2022/20220417.mp4" target="_blank"> <strong>Video File (视频文件下载) </strong><img class="file-icon" title="video/mp4" src="/modules/file/icons/video-x-generic.png" alt=""> </a></div>
<hr>
<h4>Watch Online</h4>
<p><iframe src="https://www.youtube.com/embed/wTBCtIe5wrw" width="560" height="315" frameborder="0"></iframe></p>
`;

const $ = cheerio.load(HtmlSource);

const anchors = $('a');

console.log($().first().text());

anchors.each((index, anchor) => {
	const href = $(anchor).attr('href');
	if(href.endsWith('.mp3')){
	} else if(href.endsWith('.mp4')){
	} else {
		console.log(`unhandled href: ${href}`);
	}

	if(href.startsWith('/s3/')){
		const newHref = href.replace('/s3/', 'https://www.cccgermantown.org/s3/');
		$(anchor).attr('href', newHref);
	}
});


console.log($.html());