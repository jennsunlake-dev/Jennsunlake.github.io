/* Unicode and phonetic matching for the source's Latin-script Persian titles. */
(function(root) {
    function normalize(value) {
        return String(value || '').normalize('NFKD').toLowerCase()
            .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,'')
            .replace(/\p{M}/gu,'').replace(/[يى]/g,'ی').replace(/ك/g,'ک')
            .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x06f0))
            .replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x0660))
            .replace(/[\u200c\u200d\u200e\u200f]/g,' ')
            .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
    }
    const consonants = {'ب':'b','پ':'p','ت':'t','ط':'t','ث':'s','س':'s','ص':'s','ج':'j','چ':'č','ح':'h','خ':'x','د':'d','ذ':'z','ز':'z','ض':'z','ظ':'z','ر':'r','ژ':'ž','ش':'š','غ':'q','ق':'q','ف':'f','ک':'k','گ':'g','ل':'l','م':'m','ن':'n','ه':'h'};
    function phonetic(value) {
        return normalize(value).split(' ').map(word => word
            .replace(/gh/g,'q').replace(/kh/g,'x').replace(/sh/g,'š').replace(/ch/g,'č').replace(/zh/g,'ž')
            .replace(/[\u0600-\u06ff]/g,c=>consonants[c] || '')
            .replace(/[aeiouywv]/g,'').replace(/h$/,'')).filter(Boolean);
    }
    function score(item, query) {
        const q=normalize(query); if(!q) return 1;
        const fields=[item.name,item.title,...(item.aliases || []),...(item.searchAliases || [])].filter(Boolean).map(normalize);
        if(fields.some(f=>f===q)) return 4;
        if(fields.some(f=>f.includes(q))) return 3;
        const tokens=q.split(' ');
        if(tokens.every(t=>fields.some(f=>f.split(' ').some(w=>w.includes(t))))) return 2;
        // Consonant matching bridges Persian writing and the site's inconsistent
        // Latin transliterations. Prefer literal matches; do not rename titles.
        if(!/[\u0600-\u06ff]/.test(query)) return 0;
        const sought=phonetic(q);
        const haystack=fields.flatMap(phonetic);
        if (!sought.length) return 0;
        if (sought.join('').length >= 3 && fields.some(f=>phonetic(f).join('').includes(sought.join('')))) return 1;
        return sought.every(t=>haystack.some(w=>t.length===1 ? w===t : w.includes(t))) ? 1 : 0;
    }
    const api={normalize,phonetic,score};
    if(typeof module==='object' && module.exports) module.exports=api;
    else root.PersianSearch=api;
})(typeof globalThis==='undefined'?this:globalThis);
