#!/usr/bin/env node

const player = require('play-sound')(opts = {});
const config = require('../src/config');
player.play(config.soundFilePath, (err) => {
    if (err) throw err
  });