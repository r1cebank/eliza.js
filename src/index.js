/**
 * eliza.js - Eliza JS library
 * Eliza is a mock psychotherapist
 * Original program by Joseph Weizenbaum in MAD-SLIP for "Project MAC" at MIT.
 * cf: Weizenbaum, Joseph "ELIZA - A Computer Program For the Study of Natural Language
        Communication Between Man and Machine"
        in: Communications of the ACM; Volume 9 , Issue 1 (January 1966): p 36-45.
 * Japascript implementation by Siyuan Gao 2018 <siyuangao@gmail.com>
 */

const defaultData = require('./elizadata.json');

class Eliza {
    constructor (elizadata) {
        this.elizadata = elizadata || defaultData;
    }
}

module.exports = Eliza;
