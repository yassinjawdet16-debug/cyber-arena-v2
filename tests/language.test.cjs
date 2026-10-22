const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('i18n/languages.js','utf8');
const prefix=source.slice(source.indexOf('const dictionary='),source.indexOf('const original=new WeakMap();'));
assert.ok(prefix.includes('const dictionary='));
const dictionaries=vm.runInNewContext(prefix+'\n;dictionary',{}, {timeout:2000});
const required=['PlayStation Stations','Sales history','Recent cash movements','Sync safely','Upload snapshot','Recover cloud snapshot','Sign in to cloud','Sign out','Finish','Discount','No printed bills yet.','Print daily report','Download JSON backup'];
for(const language of ['ar','badini','sorani']){
 const map=dictionaries[language];
 assert.ok(map,language+' missing');
 for(const key of required)assert.ok(typeof map[key]==='string'&&map[key].trim(),language+' missing '+key);
 assert.ok(Object.keys(map).length>=60,language+' needs broader coverage');
}
assert.match(source,/current==='ar'\|\|current==='sorani'\|\|current==='badini'\?'rtl'/);
assert.match(source,/else if\(trimmed!==base\)/);
console.log('PASS Arabic Badini Sorani translation coverage and fallback');
