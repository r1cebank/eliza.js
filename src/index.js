/**
 * eliza.js - Eliza JS library
 * Eliza is a mock psychotherapist
 * Original program by Joseph Weizenbaum in MAD-SLIP for "Project MAC" at MIT.
 * cf: Weizenbaum, Joseph "ELIZA - A Computer Program For the Study of Natural Language
        Communication Between Man and Machine"
        in: Communications of the ACM; Volume 9 , Issue 1 (January 1966): p 36-45.
 * Japascript implementation by Siyuan Gao 2018 <siyuangao@gmail.com>
 */

const sortKeywords = require('./sortKeywords');
const defaultData = require('./elizadata.json');

class Eliza {
    constructor (elizadata) {
        this.capitalize = true;
        this.dataProcessed = false;
        this.maxMemory = 20;
        this.memory = [];
        this.lastChoice = [];
        this.quit = false;
        this.load(elizadata || defaultData);
        this.preprocess();
    }
    load (elizadata) {
        const {
            initials,
            finals,
            quits,
            pres,
            posts,
            synons,
            keywords,
            transforms
        } = elizadata;
        this.initials = initials;
        this.finals = finals;
        this.quits = quits;
        this.presRaw = pres;
        this.postsRaw = posts;
        this.synons = synons;
        this.keywords = keywords;
        this.transforms = transforms;
        this.dataProcessed = false;
        return this;
    }
    preprocess () {
        // Process synonym list
        const synPatterns = {};
        for (const key of Object.keys(this.synons)) {
            synPatterns[key] = `(${key}|${this.synons[key].join('|')})`;
        }
        // 1st convert rules to regexps
        const sre = /@(\S+)/;
        const are = /(\S)\s*\*\s*(\S)/;
        const are1 = /^\s*\*\s*(\S)/;
        const are2 = /(\S)\s*\*\s*$/;
        const are3 = /^\s*\*\s*$/;
        const wsre = /\s+/g;
        for (let k = 0; k < this.keywords.length; k++) {
            const rules = this.keywords[k][2];
            this.keywords[k][3] = k; // save original index for sorting
            for (let i = 0; i < rules.length; i++) {
                const r = rules[i];
                // check mem flag and store it as decomp's element 2
                if (r[0].charAt(0) === '$') {
                    let ofs = 1;
                    while (r[0].charAt[ofs] === ' ') {
                        ofs++;
                    }
                    r[0] = r[0].substring(ofs);
                    r[2] = true;
                } else {
                    r[2] = false;
                }
                // expand synonyms (v.1.1: work around lambda function)
                let m = sre.exec(r[0]);
                while (m) {
                    const sp = (synPatterns[m[1]]) ? synPatterns[m[1]] : m[1];
                    r[0] = r[0].substring(0, m.index) + sp + r[0].substring(m.index + m[0].length);
                    m = sre.exec(r[0]);
                }
                // expand asterisk expressions (v.1.1: work around lambda function)
                if (are3.test(r[0])) {
                    r[0] = '\\s*(.*)\\s*';
                } else {
                    m = are.exec(r[0]);
                    if (m) {
                        let lp = '';
                        let rp = r[0];
                        while (m) {
                            lp += rp.substring(0, m.index + 1);
                            if (m[1] !== ')') {
                                lp += '\\b';
                            }
                            lp += '\\s*(.*)\\s*';
                            if ((m[2] !== '(') && (m[2] !== '\\')) {
                                lp += '\\b';
                            }
                            lp += m[2];
                            rp = rp.substring(m.index + m[0].length);
                            m = are.exec(rp);
                        }
                        r[0] = lp + rp;
                    }
                    m = are1.exec(r[0]);
                    if (m) {
                        let lp = '\\s*(.*)\\s*';
                        if ((m[1] !== ')') && (m[1] !== '\\')) {
                            lp += '\\b';
                        }
                        r[0] = lp + r[0].substring(m.index - 1 + m[0].length);
                    }
                    m = are2.exec(r[0]);
                    if (m) {
                        let lp = r[0].substring(0, m.index + 1);
                        if (m[1] !== '(') {
                            lp += '\\b';
                        }
                        r[0] = `${lp}\\s*(.*)\\s*`;
                    }
                }
                // expand white space
                r[0] = r[0].replace(wsre, '\\s+');
                wsre.lastIndex = 0;
            }
        }
        this.keywords.sort(sortKeywords);
        this.pres = {};
        this.posts = {};
        {
            const a = [];
            for (let i = 0; i < this.presRaw.length; i++) {
                a.push(this.presRaw[i][0]);
                this.pres[this.presRaw[i][0]] = this.presRaw[i][1];
            }
            this.preExp = new RegExp(`\\b(${a.join('|')})\\b`);
        }
        {
            const a = [];
            for (let i = 0; i < this.postsRaw.length; i++) {
                a.push(this.postsRaw[i][0]);
                this.posts[this.postsRaw[i][0]] = this.postsRaw[i][1];
            }
            this.postExp = new RegExp(`\\b(${a.join('|')})\\b`);
        }
        this.dataProcessed = true;
        return this;
    }
    reset () {
        this.quit = false;
        this.memory = [];
        this.lastChoice = [];
        return this;
    }
}

module.exports = Eliza;
