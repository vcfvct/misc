const player = require('play-sound')(opts = {});
const path = require('path')

const play = (soundPath) => {
    player.play(path.resolve(soundPath), (err) => {
        if (err) {
            console.error(`音频：${soundPath} 播放失败！`, err);
        }
    });
}

module.exports = play;