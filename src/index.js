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


function sortKeywords (a, b) {
	// sort by rank
    if (a[1] > b[1]) return -1;
    else if (a[1] < b[1]) return 1;
	// or original index
    else if (a[3] > b[3]) return 1;
    else if (a[3] < b[3]) return -1;
    return 0;
};

class Eliza {
    constructor (elizadata) {
        this.capitalize = true;
        this.dataProcessed = false;
        this.maxMemory = 20;
        this.memory = [];
        this.lastChoice = [];
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
        for (let i = 0; i < this.keywords.length; i++) {
            const rules = this.keywords[i][2];
            this.keywords[i][3] = i; // save original index for sorting
            for (let j = 0; j < rules.length; j++) {
                const r = rules[j];
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
        this.reset();
        return this;
    }
    reset () {
        this.memory = [];
        this.lastChoice = [];
        for (let k = 0; k < this.keywords.length; k++) {
            this.lastChoice[k] = [];
            const rules = this.keywords[k][2];
            for (let i = 0; i < rules.length; i++) this.lastChoice[k][i] = -1;
        }
        return this;
    }
    transform (text) {
        let reply = '';
        // unify text string
        text = text.toLowerCase();
        text = text.replace(/@#\$%\^&\*\(\)_\+=~`\{\[\}\]\|:;<>\/\\\t/g, ' ');
        text = text.replace(/\s+-+\s+/g, '.');
        text = text.replace(/\s*[,.?!;]+\s*/g, '.');
        text = text.replace(/\s*\bbut\b\s*/g, '.');
        text = text.replace(/\s{2,}/g, ' ');
        // split text in part sentences and loop through them
        const parts = text.split('.');
        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            if (part !== '') {
                // check for quit expression
                for (let q = 0; q < this.quits.length; q++) {
                    if (this.quits[q] === part) {
                        return this.getFinal();
                    }
                }
                // preprocess (v.1.1: work around lambda function)
                let m = this.preExp.exec(part);
                if (m) {
                    let lp = '';
                    let rp = part;
                    while (m) {
                        lp += rp.substring(0, m.index) + this.pres[m[1]];
                        rp = rp.substring(m.index + m[0].length);
                        m = this.preExp.exec(rp);
                    }
                    part = lp + rp;
                }
                this.sentence = part;
                // loop trough keywords
                for (let k = 0; k < this.keywords.length; k++) {
                    if (part.search(new RegExp(`\\b${this.keywords[k][0]}\\b`, 'i')) >= 0) {
                        reply = this.runRule(k);
                    }
                    if (reply !== '') return reply;
                }
            }
        }
        // nothing matched try memory
        reply = this.getMemory();
        // if nothing in mem, so try xnone
        if (!reply) {
            this.sentence = ' ';
            const ruleKey = this.getRule('xnone');
            if (ruleKey >= 0) reply = this.runRule(ruleKey);
        }
        // return reply or default string
        return reply || 'I am at a loss for words.';
    }
    runRule (key) {
        const rule = this.keywords[key];
        const decomps = rule[2];
        const paramre = /\(([0-9]+)\)/;
        for (let i = 0; i < decomps.length; i++) {
            const m = this.sentence.match(decomps[i][0]);
            if (m != null) {
                const reasmbs = decomps[i][1];
                const memflag = decomps[i][2];
                let ri = Math.floor(Math.random() * reasmbs.length);
                if (this.lastChoice[key][i] === ri) {
                    ri = ++this.lastChoice[key][i];
                    if (ri >= reasmbs.length) {
                        ri = 0;
                        this.lastChoice[key][i] = -1;
                    }
                } else {
                    this.lastChoice[key][i] = ri;
                }
                let reply = reasmbs[ri];
                if (reply.search('^goto ', 'i') === 0) {
                    return this.runRule(this.getRule(reply.substring(5)));
                }
                // substitute positional params (v.1.1: work around lambda function)
                let m1 = paramre.exec(reply);
                if (m1) {
                    let lp = '';
                    let rp = reply;
                    while (m1) {
                        let param = m[parseInt(m1[1], 10)];
                        // postprocess param
                        let m2 = this.postExp.exec(param);
                        if (m2) {
                            let lp2 = '';
                            let rp2 = param;
                            while (m2) {
                                lp2 += rp2.substring(0, m2.index) + this.posts[m2[1]];
                                rp2 = rp2.substring(m2.index + m2[0].length);
                                m2 = this.postExp.exec(rp2);
                            }
                            param = lp2 + rp2;
                        }
                        lp += rp.substring(0, m1.index) + param;
                        rp = rp.substring(m1.index + m1[0].length);
                        m1 = paramre.exec(rp);
                    }
                    reply = lp + rp;
                }
                reply = this.postTransform(reply);
                if (memflag) {
                    this.saveMemory(reply);
                } else {
                    return reply;
                }
            }
        }
        return '';
    }
    postTransform (reply) {
        // final cleanings
        reply = reply.replace(/\s{2,}/g, ' ');
        reply = reply.replace(/\s+\./g, '.');
        for (let i = 0; i < this.transforms.length; i += 2) {
            reply = reply.replace(new RegExp(this.transforms[i].regex),
                this.transforms[i].replacement);
        }
        if (this.capitalize) {
            const re = /^([a-z])/;
            const m = re.exec(reply);
            if (m) reply = m[0].toUpperCase() + reply.substring(1);
        }
        return reply;
    }
    getRule (key) {
        for (let k = 0; k < this.keywords.length; k++) {
            if (this.keywords[k][0] === key) return k;
        }
        return undefined;
    }
    saveMemory (reply) {
        this.memory.push(reply);
        if (this.memory.length > this.maxMemory) {
            this.memory.shift();
        }
    }
    getMemory () {
        if (this.memory.length) {
            const n = Math.floor(Math.random() * this.memory.length);
            const reply = this.memory[n];
            for (let i = n + 1; i < this.memory.length; i++) {
                this.memory[i - 1] = this.memory[i];
            }
            this.memory.length--;
            return reply;
        }
        return '';
    }
    getFinal () {
        return this.finals[Math.floor(Math.random() * this.finals.length)];
    }
    getInitial () {
        return this.initials[Math.floor(Math.random() * this.initials.length)];
    }
}

module.exports = Eliza;
