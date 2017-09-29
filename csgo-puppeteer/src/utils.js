class Utils {
    static randomIntFromInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    static getLocaleDateTime(){
        return new Date().toLocaleString();
    }
}

module.exports = Utils;