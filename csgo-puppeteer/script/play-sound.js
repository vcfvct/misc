#!/usr/bin/env node
const play = require('../src/sound');
const config = require('../src/config');
const player = require('play-sound')(opts = {});

play(config.soundFilePath);

// player.play(path.resolve(config.soundFilePath), (err) => {
//     if (err) {
//         console.error(`音频 播放失败！`, err);
//     }
// });