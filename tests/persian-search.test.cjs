const {test}=require('node:test');const assert=require('node:assert/strict');
const search=require('../persian-search');
test('English casing, punctuation, and Persian/Arabic letters/digits normalize',()=>{
 assert.equal(search.normalize('عشقِ در نهايت'),'عشق در نهایت');assert.equal(search.normalize('كود ۱۲۳ ٤٥٦'),'کود 123 456');
 assert.ok(search.score({name:'Eshgh Dar Nahayat'},'ESHGH DAR NAHAYAT'));
});
test('Farsi matches Latin source names without requiring invented translations',()=>{
 for(const [name,q] of [['Eshgh Dar Nahayat','عشق در نهایت'],['On Zendegie Mane','اون زندگي منه'],['Ghahveh Shoor','قهوه شور'],['Marde 3 Hezar Chehreh','مرد ۳ هزار چهره'],['Cheshm Abi','چشم آبی']])assert.ok(search.score({name},q),name);
 assert.equal(search.score({name:'Cheshm Siah'},'چشم آبی'),0);
 assert.equal(search.score({name:'Eshgh Dar Nahayat'},'زندگی'),0);
});
test('Source filename aliases connect English titles to their Persian names',()=>{
 const item={name:'Reborn Rookie',searchAliases:['tavalode dobare tazeh kar']};
 assert.ok(search.score(item,'تولد دوباره تازه کار'));assert.ok(search.score(item,'Reborn Rookie'));
});
test('Direct Persian aliases rank before approximate transliteration matches',()=>{
 assert.ok(search.score({name:'Movie',aliases:['عشق در نهایت']},'عشق در نهایت')>search.score({name:'Eshgh Dar Nahayat'},'عشق در نهایت'));
});
test('Empty/punctuation query includes all titles; absent title does not match',()=>{
 assert.ok(search.score({name:'Any title'},''));assert.equal(search.score({name:'Any title'},'gibberish xyz'),0);
});
