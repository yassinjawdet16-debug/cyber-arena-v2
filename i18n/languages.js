/* Progressive Cyber Arena interface translations. Native-speaker review required. */
(function(){
'use strict';
const dictionary={
ar:{'Sessions / PS timer':'الجلسات / مؤقت البلايستيشن','Printed bills':'الفواتير المطبوعة','Unprinted bills':'الفواتير غير المطبوعة','Extra Sales':'مبيعات إضافية','Reports & Backup':'التقارير والنسخ الاحتياطي','Settings':'الإعدادات','Quick Start':'بدء سريع','Session History':'سجل الجلسات','Daily Cash Register':'الصندوق اليومي','Full backup':'نسخة احتياطية كاملة','Restore backup':'استعادة النسخة الاحتياطية','Export CSV':'تصدير CSV','Daily report':'التقرير اليومي','Owner PIN':'رمز المالك','Save printer settings':'حفظ إعدادات الطابعة','Print':'طباعة','Preview':'معاينة','Cancel':'إلغاء','Confirm':'تأكيد','Ready. Data is saved locally on this device.':'جاهز. البيانات محفوظة محلياً على هذا الجهاز.'},
badini:{'Sessions / PS timer':'دانیشتن / کاتژمێرا پلەیستەیشن','Printed bills':'پسوولەیێن چاپکری','Unprinted bills':'پسوولەیێن نەچاپکری','Extra Sales':'فرۆتنێن زێدە','Reports & Backup':'راپۆرت و پاشەکەفتن','Settings':'ڕێکخستن','Quick Start':'دەستپێکرنا بلەز','Session History':'مێژوویا دانیشتنێ','Daily Cash Register':'سندوقا رۆژانە','Full backup':'پاشەکەفتنا تەمام','Restore backup':'ڤەگەڕاندنا پاشەکەفتنێ','Export CSV':'دەرئێخستنا CSV','Daily report':'راپۆرتا رۆژانە','Owner PIN':'کۆدا خودانێ','Print':'چاپکرن','Preview':'پێشاندن','Cancel':'هەلوەشاندن','Confirm':'پەسەندکرن'},
sorani:{'Sessions / PS timer':'دانیشتنەکان / کاتژمێری پلەیستەیشن','Printed bills':'پسووڵە چاپکراوەکان','Unprinted bills':'پسووڵە چاپنەکراوەکان','Extra Sales':'فرۆشتنی زیاتر','Reports & Backup':'ڕاپۆرت و پاڵپشتی','Settings':'ڕێکخستنەکان','Quick Start':'دەستپێکردنی خێرا','Session History':'مێژووی دانیشتنەکان','Daily Cash Register':'سندووقی ڕۆژانە','Full backup':'پاڵپشتی تەواو','Restore backup':'گەڕاندنەوەی پاڵپشتی','Export CSV':'هەناردەکردنی CSV','Daily report':'ڕاپۆرتی ڕۆژانە','Owner PIN':'کۆدی خاوەن','Print':'چاپکردن','Preview':'پێشبینین','Cancel':'هەڵوەشاندنەوە','Confirm':'پشتڕاستکردنەوە'}
};
const supplemental={
ar:{'PlayStation Stations':'محطات البلايستيشن','Sales history':'سجل المبيعات','Recent cash movements':'حركات النقد الأخيرة','Sync safely':'مزامنة آمنة','Upload snapshot':'رفع نسخة','Recover cloud snapshot':'استعادة نسخة سحابية','Sign in to cloud':'تسجيل الدخول للسحابة','Sign out':'تسجيل الخروج','Finish':'إنهاء','Discount':'خصم'},
badini:{'PlayStation Stations':'ئامێرێن پلەیستەیشن','Sales history':'مێژوویا فرۆتنێ','Recent cash movements':'جووڵەیێن پارەیێن دووماهی','Sync safely':'هاڤدەنگکرنا پاراستی','Upload snapshot':'بارکرنا پاشەکەفتنێ','Recover cloud snapshot':'ڤەگەڕاندنا پاشەکەفتنا ئەوری','Sign in to cloud':'چوونا ژوور بۆ ئەورێ','Sign out':'دەرکەفتن','Finish':'دووماهی پێ بینە','Discount':'داشکاندن'},
sorani:{'PlayStation Stations':'ئامێرەکانی پلەیستەیشن','Sales history':'مێژووی فرۆشتن','Recent cash movements':'جووڵەکانی دوایی پارە','Sync safely':'هاوکاتکردنی پارێزراو','Upload snapshot':'بارکردنی پاڵپشتی','Recover cloud snapshot':'گەڕاندنەوەی پاڵپشتی هەوری','Sign in to cloud':'چوونەژوورەوەی هەور','Sign out':'دەرچوون','Finish':'کۆتایی پێبهێنە','Discount':'داشکاندن'}
};
for(const code of Object.keys(supplemental))Object.assign(dictionary[code],supplemental[code]);
Object.assign(dictionary.ar,{"🔐 Owner":"🔐 المالك","Today's session income":"دخل الجلسات اليوم","Today's extra sales":"المبيعات الإضافية اليوم","Active stations":"الأجهزة النشطة","🎮 Stations":"🎮 الأجهزة","📚 History":"📚 السجل","💰 Cash Register":"💰 الصندوق","PlayStation Stations":"أجهزة البلايستيشن","＋ Quick Start":"＋ بدء سريع","＋ Manual Bill":"＋ فاتورة يدوية","🟠 Unprinted Bills":"🟠 فواتير غير مطبوعة","Archive now":"أرشف الآن","Current history":"السجل الحالي","Export history CSV":"تصدير السجل CSV","Cash adjustments":"تعديلات النقد","Today's total":"إجمالي اليوم","Recent cash movements":"حركات النقد الأخيرة","Product / item":"المنتج / الصنف","Quantity":"الكمية","Unit price (IQD)":"سعر الوحدة (دينار)","＋ Record sale":"＋ تسجيل بيع","Sales history":"سجل المبيعات","All-time totals":"الإجماليات الكلية","Archived sessions":"الجلسات المؤرشفة","All bills":"جميع الفواتير","Supabase project URL (HTTPS)":"رابط مشروع سوبابيس (HTTPS)","Public anon / publishable key":"المفتاح العام للنشر","Owner email":"البريد الإلكتروني للمالك","Supabase Auth password":"كلمة مرور سوبابيس","Sign in to cloud":"تسجيل الدخول للسحابة","Upload snapshot":"رفع نسخة","Sync safely":"مزامنة آمنة","Recover cloud snapshot":"استعادة النسخة السحابية","Sign out":"تسجيل الخروج","Current PIN":"الرمز الحالي","New PIN":"الرمز الجديد","Change PIN":"تغيير الرمز","Bridge URL":"رابط جسر الطابعة","Save printer settings":"حفظ إعدادات الطابعة","Run archive now":"تشغيل الأرشفة الآن","Clear current history":"مسح السجل الحالي","Full reset…":"إعادة ضبط كاملة…","Minutes to add":"دقائق للإضافة","Discount (IQD)":"الخصم (دينار)","Station":"الجهاز","Duration":"المدة","Open session":"جلسة مفتوحة","Session type":"نوع الجلسة","Custom duration":"مدة مخصصة","Custom minutes":"دقائق مخصصة","Finish":"إنهاء","Discount":"خصم","Start":"بدء","🖨️ Print":"🖨️ طباعة","Reprint":"إعادة الطباعة","Save TXT":"حفظ TXT","Time":"الوقت","Product":"المنتج","Qty":"الكمية","Unit":"الوحدة","Total":"الإجمالي","Started":"بدأت","Ended":"انتهت","Original":"الأصلي","Final":"النهائي","Bill":"الفاتورة","Description":"الوصف","Amount (IQD)":"المبلغ (دينار)","90 minutes":"٩٠ دقيقة","30 minutes":"٣٠ دقيقة","1 hour":"ساعة","2 hours":"ساعتان","3 hours":"٣ ساعات","4 hours":"٤ ساعات","5 hours":"٥ ساعات","6 hours":"٦ ساعات"});
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
  if(map[base]){const updated=raw.replace(trimmed,map[base]);if(updated!==raw)node.nodeValue=updated;}
  else if(current==='en'&&trimmed!==base)node.nodeValue=raw.replace(trimmed,base);
 }
 document.documentElement.lang=current==='badini'?'ku':current==='sorani'?'ckb':current;
 document.documentElement.dir=current==='ar'||current==='sorani'||current==='badini'?'rtl':'ltr';
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