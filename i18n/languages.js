/* Progressive Cyber Arena interface translations. Native-speaker review required. */
(function(){
'use strict';
const dictionary={
ar:{'Sessions / PS timer':'الجلسات / مؤقت البلايستيشن','Printed bills':'الفواتير المطبوعة','Unprinted bills':'الفواتير غير المطبوعة','Extra Sales':'مبيعات إضافية','Reports & Backup':'التقارير والنسخ الاحتياطي','Settings':'الإعدادات','Quick Start':'بدء سريع','Session History':'سجل الجلسات','Daily Cash Register':'الصندوق اليومي','Full backup':'نسخة احتياطية كاملة','Restore backup':'استعادة النسخة الاحتياطية','Export CSV':'تصدير CSV','Daily report':'التقرير اليومي','Owner PIN':'رمز المالك','Save printer settings':'حفظ إعدادات الطابعة','Print':'طباعة','Preview':'معاينة','Cancel':'إلغاء','Confirm':'تأكيد','Ready. Data is saved locally on this device.':'جاهز. البيانات محفوظة محلياً على هذا الجهاز.'},
badini:{'Sessions / PS timer':'دانیشتن / کاتژمێرا پلەیستەیشن','Printed bills':'پسوولەیێن چاپکری','Unprinted bills':'پسوولەیێن نەچاپکری','Extra Sales':'فرۆتنێن زێدە','Reports & Backup':'راپۆرت و پاشەکەفتن','Settings':'ڕێکخستن','Quick Start':'دەستپێکرنا بلەز','Session History':'مێژوویا دانیشتنێ','Daily Cash Register':'سندوقا رۆژانە','Full backup':'پاشەکەفتنا تەمام','Restore backup':'ڤەگەڕاندنا پاشەکەفتنێ','Export CSV':'دەرئێخستنا CSV','Daily report':'راپۆرتا رۆژانە','Owner PIN':'کۆدا خودانێ','Print':'چاپکرن','Preview':'پێشاندن','Cancel':'هەلوەشاندن','Confirm':'پەسەندکرن'},
sorani:{'Sessions / PS timer':'دانیشتنەکان / کاتژمێری پلەیستەیشن','Printed bills':'پسووڵە چاپکراوەکان','Unprinted bills':'پسووڵە چاپنەکراوەکان','Extra Sales':'فرۆشتنی زیاتر','Reports & Backup':'ڕاپۆرت و پاڵپشتی','Settings':'ڕێکخستنەکان','Quick Start':'دەستپێکردنی خێرا','Session History':'مێژووی دانیشتنەکان','Daily Cash Register':'سندووقی ڕۆژانە','Full backup':'پاڵپشتی تەواو','Restore backup':'گەڕاندنەوەی پاڵپشتی','Export CSV':'هەناردەکردنی CSV','Daily report':'ڕاپۆرتی ڕۆژانە','Owner PIN':'کۆدی خاوەن','Print':'چاپکردن','Preview':'پێشبینین','Cancel':'هەڵوەشاندنەوە','Confirm':'پشتڕاستکردنەوە'}
};
const original=new WeakMap();
let current='en';
function translate(){
 const map=dictionary[current]||{};
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 let node;
 while((node=walker.nextNode())){
  if(node.parentElement?.closest('script,style,textarea,option,#printArea'))continue;
  const raw=node.nodeValue, trimmed=raw.trim();
  if(!trimmed)continue;
  if(!original.has(node))original.set(node,trimmed);
  const base=original.get(node);
  if(map[base])node.nodeValue=raw.replace(trimmed,map[base]);
  else if(current==='en'&&trimmed!==base)node.nodeValue=raw.replace(trimmed,base);
 }
 document.documentElement.lang=current==='badini'?'ku':current==='sorani'?'ckb':current;
 document.documentElement.dir=current==='ar'||current==='sorani'?'rtl':'ltr';
}
window.setArenaLanguage=function(language){
 if(!['en','ar','badini','sorani'].includes(language))return;
 current=language;
 try{localStorage.setItem('cyberArenaV2_language',language)}catch(e){}
 translate();
};
try{current=localStorage.getItem('cyberArenaV2_language')||'en'}catch(e){}
if(!dictionary[current])current='en';
document.getElementById('arenaLanguage').value=current;
translate();
new MutationObserver(()=>{if(current!=='en')translate()}).observe(document.body,{childList:true,subtree:true,characterData:false});
})();