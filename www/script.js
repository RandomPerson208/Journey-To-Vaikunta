const STORAGE_KEY="mala-counter-state-v1";
const BEADS_PER_ROUND=108;
const CIRCLE_CIRCUMFERENCE=2*Math.PI*100;
const NOON_REMINDER_ID=1200;
const NOON_REMINDER_TITLE="It's Time to Chant!";
const NOON_REMINDER_BODY="You have not reached your personal pledge goal yet today.";
const BOOKS=window.BOOK_LIBRARY||[];

const beadCountEl=document.getElementById("beadCount");
const roundCountEl=document.getElementById("roundCount");
const remainingCountEl=document.getElementById("remainingCount");
const beadButtonCountEl=document.getElementById("beadButtonCount");
const counterButton=document.getElementById("counterButton");
const undoButton=document.getElementById("undoButton");
const resetButton=document.getElementById("resetButton");
const progressCircle=document.getElementById("progressCircle");
const loadingScreen=document.getElementById("loadingScreen");
const stepsButton=document.getElementById("stepsButton");
const stepsPanel=document.getElementById("stepsPanel");
const stepsCloseButton=document.getElementById("stepsCloseButton");
const pranamButton=document.getElementById("pranamButton");
const chantPopup=document.getElementById("chantPopup");
const offlineMinusButton=document.getElementById("offlineMinusButton");
const offlinePlusButton=document.getElementById("offlinePlusButton");
const offlineAddButton=document.getElementById("offlineAddButton");
const offlineMalaCountEl=document.getElementById("offlineMalaCount");
const pledgeMinusButton=document.getElementById("pledgeMinusButton");
const pledgePlusButton=document.getElementById("pledgePlusButton");
const pledgeGoalCountEl=document.getElementById("pledgeGoalCount");
const pledgeStatusEl=document.getElementById("pledgeStatus");
const monthlyMalaCountEl=document.getElementById("monthlyMalaCount");
const monthlyPledgeCountEl=document.getElementById("monthlyPledgeCount");
const monthlyProgressBarEl=document.getElementById("monthlyProgressBar");
const monthlyProgressTextEl=document.getElementById("monthlyProgressText");
const slokaMinusButton=document.getElementById("slokaMinusButton");
const slokaPlusButton=document.getElementById("slokaPlusButton");
const slokaGoalCountEl=document.getElementById("slokaGoalCount");
const slokaDurationMinusButton=document.getElementById("slokaDurationMinusButton");
const slokaDurationPlusButton=document.getElementById("slokaDurationPlusButton");
const slokaDurationCountEl=document.getElementById("slokaDurationCount");
const slokaPledgeStatusEl=document.getElementById("slokaPledgeStatus");
const booksBreadcrumb=document.getElementById("booksBreadcrumb");
const booksContent=document.getElementById("booksContent");
const bookSearchInput=document.getElementById("bookSearchInput");
const moreButton=document.getElementById("moreButton");
const morePanel=document.getElementById("morePanel");
const morePanelText=document.getElementById("morePanelText");
const helpButton=document.getElementById("helpButton");
const aboutButton=document.getElementById("aboutButton");
const creditsButton=document.getElementById("creditsButton");
const notificationToggleButton=document.getElementById("notificationToggleButton");

let browserReminderTimer=null;
let popupTimer=null;
let offlineMalaCount=1;
let bookRoute={bookId:null,path:[]};
let activePage="home";
let infoReturnPage="home";

function wholeNumber(value,fallback=0){
  const number=Number(value);
  return Number.isInteger(number)&&number>=0?number:fallback;
}

function plural(value,word){
  return `${value} ${word}${value===1?"":"s"}`;
}

function getTodayKey(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function getMonthKey(dateKey=getTodayKey()){
  return dateKey.slice(0,7);
}

function daysBetween(startKey,endKey){
  const start=new Date(`${startKey}T00:00:00`);
  const end=new Date(`${endKey}T00:00:00`);
  return Math.max(0,Math.floor((end-start)/86400000)+1);
}

function addMonths(dateKey,months){
  const date=new Date(`${dateKey}T00:00:00`);
  date.setMonth(date.getMonth()+months);
  date.setDate(date.getDate()-1);
  return getTodayKey(date);
}

function normalizeDailyMap(raw){
  const progress={};
  if(raw&&typeof raw==="object"){
    for(const [month,days] of Object.entries(raw)){
      if(!/^\d{4}-\d{2}$/.test(month)||!days||typeof days!=="object")continue;
      progress[month]={};
      for(const [day,value] of Object.entries(days)){
        if(/^\d{4}-\d{2}-\d{2}$/.test(day))progress[month][day]=wholeNumber(value);
      }
    }
  }
  return progress;
}

function normalizeState(raw){
  raw=raw||{};
  const totalCount=wholeNumber(raw.totalCount);
  const dailyBeads=wholeNumber(raw.dailyBeads,totalCount);
  const pledgeGoal=Math.min(64,Math.max(1,wholeNumber(raw.pledgeGoal,1)));
  const slokaGoal=Math.min(64,Math.max(1,wholeNumber(raw.slokaGoal,1)));
  const slokaDurationMonths=Math.min(120,Math.max(1,wholeNumber(raw.slokaDurationMonths,1)));
  return {
    totalCount,
    dailyDate:typeof raw.dailyDate==="string"?raw.dailyDate:getTodayKey(),
    dailyBeads,
    dailySlokas:wholeNumber(raw.dailySlokas),
    pranamDone:typeof raw.pranamDone==="boolean"?raw.pranamDone:totalCount%BEADS_PER_ROUND!==0,
    pledgeGoal,
    slokaGoal,
    slokaDurationMonths,
    slokaPledgeStartDate:typeof raw.slokaPledgeStartDate==="string"?raw.slokaPledgeStartDate:getTodayKey(),
    notificationsEnabled:typeof raw.notificationsEnabled==="boolean"?raw.notificationsEnabled:true,
    monthlyProgress:normalizeDailyMap(raw.monthlyProgress),
    slokaProgress:normalizeDailyMap(raw.slokaProgress)
  };
}

function loadState(){
  try{
    const saved=localStorage.getItem(STORAGE_KEY);
    return normalizeState(saved?JSON.parse(saved):{});
  }catch{
    return normalizeState({});
  }
}

let state=loadState();

function recordDailyProgress(date=state.dailyDate,beads=state.dailyBeads){
  if(!date)return;
  const month=getMonthKey(date);
  state.monthlyProgress[month]||(state.monthlyProgress[month]={});
  state.monthlyProgress[month][date]=Math.max(0,Math.floor(beads||0));
}

function recordDailySlokaProgress(date=state.dailyDate,count=state.dailySlokas){
  if(!date)return;
  const month=getMonthKey(date);
  state.slokaProgress[month]||(state.slokaProgress[month]={});
  state.slokaProgress[month][date]=Math.max(0,Math.floor(count||0));
}

function saveState(){
  recordDailyProgress();
  recordDailySlokaProgress();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}

function ensureTodayState(){
  const today=getTodayKey();
  if(state.dailyDate!==today){
    recordDailyProgress(state.dailyDate,state.dailyBeads);
    recordDailySlokaProgress(state.dailyDate,state.dailySlokas);
    state.dailyDate=today;
    state.dailyBeads=0;
    state.dailySlokas=0;
    state.totalCount=0;
    state.pranamDone=false;
    recordDailyProgress();
    recordDailySlokaProgress();
    saveState();
  }
}

function getPledgeGoal(){
  return Math.max(1,wholeNumber(state.pledgeGoal,1));
}

function getSlokaGoal(){
  return Math.max(1,wholeNumber(state.slokaGoal,1));
}

function getSlokaDurationMonths(){
  return Math.max(1,wholeNumber(state.slokaDurationMonths,1));
}

function getDailyPledgeBeads(){
  return getPledgeGoal()*BEADS_PER_ROUND;
}

function getCompletedMalas(beads){
  return Math.floor(beads/BEADS_PER_ROUND);
}

function getTodayMalas(){
  return getCompletedMalas(state.dailyBeads);
}

function hasReachedPledgeToday(){
  ensureTodayState();
  return state.dailyBeads>=getDailyPledgeBeads();
}

function needsPranam(){
  ensureTodayState();
  return !state.pranamDone&&state.totalCount%BEADS_PER_ROUND===0;
}

function updateDashboard(){
  const pledgeGoal=getPledgeGoal();
  const todayMalas=getTodayMalas();
  const leftToday=Math.max(0,pledgeGoal-todayMalas);
  const monthData=state.monthlyProgress[getMonthKey()]||{};
  const monthBeads=Object.values(monthData).reduce((sum,beads)=>sum+wholeNumber(beads),0);
  const monthMalas=getCompletedMalas(monthBeads);
  const pledgedSoFar=pledgeGoal*(new Date).getDate();
  const daysReached=Object.values(monthData).filter(beads=>wholeNumber(beads)>=getDailyPledgeBeads()).length;
  const progress=pledgedSoFar?Math.min(100,monthMalas/pledgedSoFar*100):0;
  const slokaGoal=getSlokaGoal();
  const slokaLeft=Math.max(0,slokaGoal-state.dailySlokas);
  const slokaStart=state.slokaPledgeStartDate||getTodayKey();
  const slokaEnd=addMonths(slokaStart,getSlokaDurationMonths());
  const pledgeProgressEnd=getTodayKey()<slokaEnd?getTodayKey():slokaEnd;
  const elapsedDays=daysBetween(slokaStart,pledgeProgressEnd);
  const slokaNeededSoFar=elapsedDays*slokaGoal;
  const slokaDoneSoFar=countSlokasInPledgeWindow(slokaStart,slokaEnd,slokaGoal);

  pledgeGoalCountEl.textContent=String(pledgeGoal);
  pledgeStatusEl.textContent=leftToday?`${plural(leftToday,"mala")} left today to reach your pledge.`:"Pledge complete for today.";
  monthlyMalaCountEl.textContent=String(monthMalas);
  monthlyPledgeCountEl.textContent=`/ ${pledgedSoFar} pledged so far`;
  monthlyProgressBarEl.style.width=`${progress}%`;
  monthlyProgressTextEl.textContent=`${plural(daysReached,"day")} reached your pledge this month.`;
  slokaGoalCountEl.textContent=String(slokaGoal);
  slokaDurationCountEl.textContent=plural(getSlokaDurationMonths(),"month");
  slokaPledgeStatusEl.textContent=slokaLeft?`${plural(slokaLeft,"sloka")} left today. ${slokaDoneSoFar}/${slokaNeededSoFar} counted so far.`:`Sloka pledge complete today. ${slokaDoneSoFar}/${slokaNeededSoFar} counted so far.`;
}

function countSlokasInPledgeWindow(startKey,endKey,dailyCap){
  let total=0;
  for(const month of Object.values(state.slokaProgress)){
    for(const [date,count] of Object.entries(month)){
      if(date>=startKey&&date<=endKey&&date<=getTodayKey())total+=Math.min(wholeNumber(count),dailyCap);
    }
  }
  return total;
}

function updateSteps(){
  const needsStep=needsPranam();
  stepsButton.classList.toggle("needs-step",needsStep);
  pranamButton.classList.toggle("is-complete",!needsStep);
  stepsPanel.setAttribute("aria-hidden",stepsPanel.classList.contains("is-open")?"false":"true");
}

function updateOfflineView(){
  offlineMalaCountEl.textContent=String(offlineMalaCount);
}

function changeOfflineMalas(delta){
  offlineMalaCount=Math.min(64,Math.max(1,offlineMalaCount+delta));
  updateOfflineView();
}

function updateView(){
  ensureTodayState();
  recordDailyProgress();
  recordDailySlokaProgress();
  const beadInRound=state.totalCount%BEADS_PER_ROUND;
  const shownBead=beadInRound===0&&state.totalCount>0?BEADS_PER_ROUND:beadInRound;
  const rounds=Math.floor(state.totalCount/BEADS_PER_ROUND);
  const remaining=shownBead===0?BEADS_PER_ROUND:BEADS_PER_ROUND-shownBead;
  const offset=CIRCLE_CIRCUMFERENCE*(1-shownBead/BEADS_PER_ROUND);
  beadCountEl.textContent=String(shownBead);
  roundCountEl.textContent=String(rounds);
  remainingCountEl.textContent=String(remaining);
  beadButtonCountEl.textContent=String(remaining);
  progressCircle.style.strokeDasharray=String(CIRCLE_CIRCUMFERENCE);
  progressCircle.style.strokeDashoffset=String(offset);
  counterButton.setAttribute("aria-label",`Tap japa beads. ${remaining} beads remaining in this round.`);
  updateDashboard();
  updateBeadMotion();
  updateSteps();
  renderBooks();
}

function openSteps(){
  stepsPanel.classList.add("is-open");
  stepsPanel.setAttribute("aria-hidden","false");
}

function closeSteps(){
  stepsPanel.classList.remove("is-open");
  stepsPanel.setAttribute("aria-hidden","true");
}

function showBlockedPopup(){
  window.clearTimeout(popupTimer);
  chantPopup.classList.add("is-open");
  popupTimer=window.setTimeout(()=>chantPopup.classList.remove("is-open"),1800);
}

function completePranam(){
  state.pranamDone=true;
  saveState();
  updateView();
}

function incrementCounter(){
  if(needsPranam()){
    showBlockedPopup();
    openSteps();
    return;
  }
  const wasReached=hasReachedPledgeToday();
  state.totalCount+=1;
  state.dailyBeads+=1;
  if(state.totalCount%BEADS_PER_ROUND===0)state.pranamDone=false;
  saveState();
  updateView();
  if(wasReached!==hasReachedPledgeToday())scheduleNoonReminder();
  if(navigator.vibrate)navigator.vibrate(18);
}

function undoCounter(){
  if(state.totalCount===0)return;
  state.totalCount-=1;
  if(state.dailyBeads>0)state.dailyBeads-=1;
  state.pranamDone=state.totalCount%BEADS_PER_ROUND!==0;
  saveState();
  updateView();
  scheduleNoonReminder();
}

function resetCounter(){
  state.totalCount=0;
  state.dailyBeads=0;
  state.dailyDate=getTodayKey();
  state.pranamDone=false;
  saveState();
  updateView();
  scheduleNoonReminder();
}

function addOfflineMalas(){
  ensureTodayState();
  state.totalCount+=offlineMalaCount*BEADS_PER_ROUND;
  state.dailyBeads+=offlineMalaCount*BEADS_PER_ROUND;
  state.pranamDone=false;
  offlineMalaCount=1;
  saveState();
  updateOfflineView();
  updateView();
  scheduleNoonReminder();
}

function changePledge(delta){
  ensureTodayState();
  state.pledgeGoal=Math.min(64,Math.max(1,getPledgeGoal()+delta));
  saveState();
  updateView();
  scheduleNoonReminder();
}

function changeSlokaGoal(delta){
  ensureTodayState();
  state.slokaGoal=Math.min(64,Math.max(1,getSlokaGoal()+delta));
  saveState();
  updateView();
}

function changeSlokaDuration(delta){
  state.slokaDurationMonths=Math.min(120,Math.max(1,getSlokaDurationMonths()+delta));
  saveState();
  updateView();
}

function markSlokaDone(){
  ensureTodayState();
  if(state.dailySlokas>=getSlokaGoal()){
    setBookNotice("Today's sloka pledge is already complete. You cannot finish future days in advance.");
    renderBooks();
    return;
  }
  state.dailySlokas+=1;
  saveState();
  setBookNotice("Sloka counted for today's pledge.");
  updateView();
}

function getNextNoonReminderDate(){
  const now=new Date();
  const noon=new Date(now);
  noon.setHours(12,0,0,0);
  if(!hasReachedPledgeToday()&&now<noon)return noon;
  const tomorrow=new Date(noon);
  tomorrow.setDate(tomorrow.getDate()+1);
  return tomorrow;
}

function getLocalNotificationsPlugin(){
  return window.Capacitor?.Plugins?.LocalNotifications??null;
}

async function cancelNoonReminder(){
  window.clearTimeout(browserReminderTimer);
  const plugin=getLocalNotificationsPlugin();
  try{
    if(plugin)await plugin.cancel({notifications:[{id:NOON_REMINDER_ID}]});
  }catch{}
}

async function ensureNativeNotificationPermission(plugin){
  try{
    if(typeof plugin.checkPermissions==="function"){
      const result=await plugin.checkPermissions();
      if(result.display==="granted"||result.granted)return true;
    }
    if(typeof plugin.requestPermissions==="function"){
      const result=await plugin.requestPermissions();
      return result.display==="granted"||result.granted;
    }
    if(typeof plugin.requestPermission==="function")return (await plugin.requestPermission()).granted;
    return true;
  }catch{
    return false;
  }
}

async function scheduleNativeNoonReminder(plugin){
  if(!await ensureNativeNotificationPermission(plugin))return false;
  try{
    await plugin.cancel({notifications:[{id:NOON_REMINDER_ID}]});
    await plugin.schedule({notifications:[{
      id:NOON_REMINDER_ID,
      title:NOON_REMINDER_TITLE,
      body:NOON_REMINDER_BODY,
      schedule:{at:getNextNoonReminderDate(),repeats:true,every:"day"},
      sound:null,
      attachments:null,
      actionTypeId:"",
      extra:null
    }]});
    return true;
  }catch{
    return false;
  }
}

async function scheduleBrowserNoonReminder(){
  window.clearTimeout(browserReminderTimer);
  if(!state.notificationsEnabled)return;
  if("Notification"in window){
    try{
      if(Notification.permission==="default")await Notification.requestPermission();
      if(Notification.permission!=="granted")return;
      const delay=Math.max(0,getNextNoonReminderDate().getTime()-Date.now());
      browserReminderTimer=window.setTimeout(()=>{
        if(state.notificationsEnabled){
          if(!hasReachedPledgeToday())new Notification(NOON_REMINDER_TITLE,{body:NOON_REMINDER_BODY});
          scheduleBrowserNoonReminder();
        }
      },delay);
    }catch{}
  }
}

async function scheduleNoonReminder(){
  if(!state.notificationsEnabled)return cancelNoonReminder();
  const plugin=getLocalNotificationsPlugin();
  if(!(plugin&&await scheduleNativeNoonReminder(plugin)))scheduleBrowserNoonReminder();
}

function updateNotificationButton(){
  notificationToggleButton.textContent=state.notificationsEnabled?"Disable Notifications":"Enable Notifications";
}

function setMoreText(text){
  morePanelText.textContent=text;
}

function setMoreHtml(html){
  morePanelText.innerHTML=html;
}

function toggleMore(force){
  const open=typeof force==="boolean"?force:!morePanel.classList.contains("is-open");
  morePanel.classList.toggle("is-open",open);
  morePanel.setAttribute("aria-hidden",open?"false":"true");
  moreButton.classList.toggle("is-open",open);
  moreButton.setAttribute("aria-expanded",String(open));
}

function toggleNotifications(){
  state.notificationsEnabled=!state.notificationsEnabled;
  saveState();
  updateNotificationButton();
  if(state.notificationsEnabled){
    setMoreText("Notifications are enabled. You will be reminded at noon if your pledge is not complete.");
    scheduleNoonReminder();
  }else{
    setMoreText("Notifications are disabled.");
    cancelNoonReminder();
  }
}

function updateBeadMotion(){
  const beads=[...document.querySelectorAll(".japa-beads .bead")];
  const holder=document.querySelector(".japa-beads");
  const guru=document.querySelector(".guru-bead");
  const beadOrder=[9,8,7,6,5,4,3,2,1,0,19,18,17,16,15,14,13,12,11,10];
  const coords=[[50,3],[64,6],[75,12],[85,22],[92,35],[95,49],[92,65],[86,77],[75,88],[62,94],[38,94],[25,88],[14,77],[8,65],[5,49],[8,35],[15,22],[25,12],[36,6],[50,4]];
  if(!beads.length||!holder)return;
  const count=state.totalCount||0;
  const nextIndex=count>0?beadOrder[(count-1)%beadOrder.length]:beadOrder[0];
  if(guru)guru.classList.toggle("is-pranam-waiting",count>0&&count%BEADS_PER_ROUND===0&&!state.pranamDone);
  beads.forEach(bead=>bead.classList.remove("is-next"));
  beads[nextIndex].classList.add("is-next");
  if(Number.isInteger(window.__malaLastMotionCount)&&count===window.__malaLastMotionCount+1){
    const oldBead=holder.querySelector(".moving-count-bead");
    if(oldBead)oldBead.remove();
    const moving=document.createElement("span");
    const from=coords[nextIndex];
    moving.className="moving-count-bead";
    moving.style.setProperty("--from-x",from[0]+"%");
    moving.style.setProperty("--from-y",from[1]+"%");
    moving.style.setProperty("--to-x","50%");
    moving.style.setProperty("--to-y","91%");
    holder.appendChild(moving);
    if(guru)guru.classList.add("is-replaced");
    clearTimeout(window.__malaStepTimer);
    window.__malaStepTimer=setTimeout(()=>{
      moving.remove();
      if(guru)guru.classList.remove("is-replaced");
    },560);
  }
  window.__malaLastMotionCount=count;
}

function showPage(page){
  const infoPages=["help","about","credits"];
  const pages={home:document.getElementById("homePage"),counter:document.getElementById("counterPage"),books:document.getElementById("booksPage"),help:document.getElementById("helpPage"),about:document.getElementById("aboutPage"),credits:document.getElementById("creditsPage")};
  const buttons=[...document.querySelectorAll(".bottom-nav-button[data-page]")];
  if(infoPages.includes(page)&&!infoPages.includes(activePage))infoReturnPage=activePage;
  Object.entries(pages).forEach(([name,el])=>el&&el.classList.toggle("is-active",name===page));
  buttons.forEach(button=>button.classList.toggle("is-active",button.dataset.page===page));
  moreButton.classList.toggle("is-active",infoPages.includes(page));
  document.body.classList.toggle("home-active",page==="home");
  document.body.classList.toggle("counter-active",page==="counter");
  document.body.classList.toggle("books-active",page==="books");
  document.body.classList.toggle("info-active",infoPages.includes(page));
  toggleMore(false);
  if(page==="home")closeSteps();
  if(page==="books")renderBooks();
  activePage=page;
}

function openInfoPage(page){
  showPage(page);
}

function closeInfoPage(){
  showPage(infoReturnPage||"home");
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}

function renderTextBlock(value,fallback){
  const text=String(value||fallback||"");
  return text.split(/\n{2,}/).map(part=>`<p>${escapeHtml(part.trim())}</p>`).join("");
}

function normalizeText(value){
  return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}

function getBook(){
  return BOOKS.find(book=>book.id===bookRoute.bookId)||null;
}

function getNodeAtPath(book,path=bookRoute.path){
  let node=book;
  for(const index of path)node=node?.children?.[index];
  return node||null;
}

function getCurrentNode(){
  const book=getBook();
  return book?getNodeAtPath(book):null;
}

function isSloka(node){
  return !!node&&!node.children&&(node.ref||node.translation||node.purport);
}

function getCurrentSlokaKey(){
  const book=getBook();
  const node=getCurrentNode();
  return book&&node?`${book.id}:${bookRoute.path.join(".")}:${node.ref||node.title}`:"";
}

let bookNotice="";
function setBookNotice(message){
  bookNotice=message;
}

function pathTitle(book,path){
  const titles=[book.title];
  let node=book;
  for(const index of path){
    node=node.children[index];
    titles.push(node.title);
  }
  return titles.join(" / ");
}

function collectDescendants(root,book,path=[]){
  const results=[];
  if(!root.children)return results;
  root.children.forEach((child,index)=>{
    const nextPath=[...path,index];
    results.push({book,node:child,path:nextPath,label:pathTitle(book,nextPath)});
    results.push(...collectDescendants(child,book,nextPath));
  });
  return results;
}

function getSearchScope(){
  if(!bookRoute.bookId){
    return BOOKS.flatMap(book=>[{book,node:book,path:[],label:book.title},...collectDescendants(book,book,[])]);
  }
  const book=getBook();
  const node=getCurrentNode();
  if(!book||!node)return [];
  if(isSloka(node)){
    const parentPath=bookRoute.path.slice(0,-1);
    const parent=getNodeAtPath(book,parentPath);
    return (parent?.children||[]).map((child,index)=>({book,node:child,path:[...parentPath,index],label:pathTitle(book,[...parentPath,index])}));
  }
  return [{book,node,path:bookRoute.path,label:pathTitle(book,bookRoute.path)},...collectDescendants(node,book,bookRoute.path)];
}

function searchBooks(query){
  const needle=normalizeText(query);
  if(!needle)return [];
  return getSearchScope().filter(item=>{
    const haystack=normalizeText(`${item.label} ${item.node.ref||""} ${item.node.title||""}`);
    return haystack.includes(needle);
  });
}

function renderBreadcrumb(){
  const book=getBook();
  const pieces=[`<button class="crumb-button" type="button" data-book-root="1">Books &amp; Slokas</button>`];
  if(book){
    pieces.push(`<button class="crumb-button" type="button" data-book-id="${escapeHtml(book.id)}" data-path="">${escapeHtml(book.title)}</button>`);
    let node=book;
    bookRoute.path.forEach((index,depth)=>{
      node=node.children[index];
      pieces.push(`<button class="crumb-button" type="button" data-book-id="${escapeHtml(book.id)}" data-path="${bookRoute.path.slice(0,depth+1).join(",")}">${escapeHtml(node.title)}</button>`);
    });
  }
  booksBreadcrumb.innerHTML=pieces.join("");
}

function renderBooks(){
  if(!booksContent)return;
  renderBreadcrumb();
  const query=bookSearchInput.value.trim();
  if(query){
    renderSearchResults(query);
    return;
  }
  if(!bookRoute.bookId){
    booksContent.innerHTML=`<div class="books-list">${BOOKS.map(book=>`<button class="book-card-button" type="button" data-book-id="${escapeHtml(book.id)}" data-path=""><span>${escapeHtml(book.title)}</span><small>${escapeHtml(book.seriesName?`Series: ${book.seriesName}`:"Book")}</small></button>`).join("")}</div>`;
    return;
  }
  const book=getBook();
  const node=getCurrentNode();
  if(!book||!node)return;
  if(isSloka(node)){
    renderSloka(book,node);
    return;
  }
  const source=book.sourceUrl?`<a class="sloka-source" href="${escapeHtml(book.sourceUrl)}" target="_blank" rel="noreferrer">Source</a>`:"";
  const children=node.children||[];
  booksContent.innerHTML=`
    ${bookRoute.path.length?'<button class="book-back-button" type="button" data-book-back="1">Back</button>':""}
    ${book.seriesName&&bookRoute.path.length===0?`<div class="sloka-block"><h3>Series</h3><p>${escapeHtml(book.seriesName)}</p></div>`:""}
    ${source?`<p>${source}</p>`:""}
    <div class="books-list">${children.map((child,index)=>`<button class="book-card-button" type="button" data-book-id="${escapeHtml(book.id)}" data-path="${[...bookRoute.path,index].join(",")}"><span>${escapeHtml(child.title)}</span><small>${escapeHtml(child.ref||"Open")}</small></button>`).join("")}</div>
  `;
}

function renderSearchResults(query){
  const results=searchBooks(query);
  booksContent.innerHTML=`
    <div class="books-list">
      ${results.length?results.map(item=>`<button class="book-card-button" type="button" data-book-id="${escapeHtml(item.book.id)}" data-path="${item.path.join(",")}"><span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.node.ref||"Open")}</small></button>`).join(""):`<div class="sloka-block"><p>No results on this page.</p></div>`}
    </div>
  `;
}

function renderSloka(book,node){
  const doneDisabled=state.dailySlokas>=getSlokaGoal();
  const notice=bookNotice?`<div class="sloka-block"><p>${escapeHtml(bookNotice)}</p></div>`:"";
  const verseLabel=node.verseLabel||"Sloka";
  const translationLabel=node.translationLabel||"Translation";
  const verseFallback=node.versePlaceholder||"Open the source page for the original sloka text. The app does not bundle copyrighted book text here.";
  const translationFallback=node.translationPlaceholder||"Translation is not bundled. Add licensed text here if you have permission.";
  const transliteration=node.transliteration&&node.transliteration!==node.verse?`<div class="sloka-block"><h3>Transliteration</h3>${renderTextBlock(node.transliteration)}</div>`:"";
  const translationSource=node.translationSource?` ${escapeHtml(node.translationSource)}`:"";
  bookNotice="";
  booksContent.innerHTML=`
    <button class="book-back-button" type="button" data-book-back="1">Back</button>
    <article class="sloka-page">
      <p class="sloka-ref">${escapeHtml(node.ref||node.title)}</p>
      <h2>${escapeHtml(node.title)}</h2>
      <div class="sloka-block"><h3>${escapeHtml(verseLabel)}</h3>${renderTextBlock(node.verse,verseFallback)}</div>
      ${transliteration}
      <div class="sloka-block"><h3>${escapeHtml(translationLabel)}</h3>${renderTextBlock(node.translation,translationFallback)}</div>
      <div class="sloka-block"><h3>Source</h3><p>${escapeHtml(book.sourceCredit||"Source credit placeholder.")}${translationSource} For copyright details, navigate to ... > Credits. ${node.sourceUrl?`<a class="sloka-source" href="${escapeHtml(node.sourceUrl)}" target="_blank" rel="noreferrer">Open source page</a>`:""}</p></div>
      ${notice}
      <button class="sloka-done-button" id="slokaDoneButton" type="button" ${doneDisabled?"disabled":""}>${doneDisabled?"Today's sloka pledge complete":"Done for today's sloka pledge"}</button>
    </article>
  `;
}

function navigateBook(bookId,pathString=""){
  bookRoute={bookId:bookId||null,path:pathString?pathString.split(",").filter(Boolean).map(Number):[]};
  bookSearchInput.value="";
  renderBooks();
}

function goBookBack(){
  if(bookRoute.path.length)bookRoute.path=bookRoute.path.slice(0,-1);
  else bookRoute={bookId:null,path:[]};
  bookSearchInput.value="";
  renderBooks();
}

stepsButton.addEventListener("click",openSteps);
stepsCloseButton.addEventListener("click",closeSteps);
pranamButton.addEventListener("click",completePranam);
offlineMinusButton.addEventListener("click",()=>changeOfflineMalas(-1));
offlinePlusButton.addEventListener("click",()=>changeOfflineMalas(1));
offlineAddButton.addEventListener("click",addOfflineMalas);
pledgeMinusButton.addEventListener("click",()=>changePledge(-1));
pledgePlusButton.addEventListener("click",()=>changePledge(1));
slokaMinusButton.addEventListener("click",()=>changeSlokaGoal(-1));
slokaPlusButton.addEventListener("click",()=>changeSlokaGoal(1));
slokaDurationMinusButton.addEventListener("click",()=>changeSlokaDuration(-1));
slokaDurationPlusButton.addEventListener("click",()=>changeSlokaDuration(1));
counterButton.addEventListener("click",incrementCounter);
undoButton.addEventListener("click",undoCounter);
resetButton.addEventListener("click",resetCounter);
document.querySelectorAll(".bottom-nav-button[data-page]").forEach(button=>button.addEventListener("click",()=>showPage(button.dataset.page)));
moreButton.addEventListener("click",()=>toggleMore());
helpButton.addEventListener("click",()=>openInfoPage("help"));
aboutButton.addEventListener("click",()=>openInfoPage("about"));
creditsButton.addEventListener("click",()=>openInfoPage("credits"));
notificationToggleButton.addEventListener("click",toggleNotifications);
document.querySelectorAll("[data-info-back]").forEach(button=>button.addEventListener("click",closeInfoPage));
booksContent.addEventListener("click",event=>{
  const button=event.target.closest("button");
  if(!button)return;
  if(button.dataset.bookRoot){navigateBook(null);return;}
  if(button.dataset.bookBack){goBookBack();return;}
  if(button.id==="slokaDoneButton"){markSlokaDone();return;}
  if(button.dataset.bookId)navigateBook(button.dataset.bookId,button.dataset.path||"");
});
booksBreadcrumb.addEventListener("click",event=>{
  const button=event.target.closest("button");
  if(!button)return;
  if(button.dataset.bookRoot){navigateBook(null);return;}
  if(button.dataset.bookId)navigateBook(button.dataset.bookId,button.dataset.path||"");
});
bookSearchInput.addEventListener("input",renderBooks);
bookSearchInput.addEventListener("keydown",event=>{
  if(event.key!=="Enter")return;
  const first=searchBooks(bookSearchInput.value.trim())[0];
  if(first)navigateBook(first.book.id,first.path.join(","));
});
window.addEventListener("keydown",event=>{
  if(!document.body.classList.contains("counter-active"))return;
  if(event.code==="Space"||event.code==="Enter"){
    event.preventDefault();
    incrementCounter();
  }
  if(event.key.toLowerCase()==="z")undoCounter();
  if(event.key.toLowerCase()==="r")resetCounter();
});
stepsCloseButton.textContent="Back";
stepsCloseButton.setAttribute("aria-label","Back");
new MutationObserver(()=>document.body.classList.toggle("steps-page-open",stepsPanel.classList.contains("is-open"))).observe(stepsPanel,{attributes:true,attributeFilter:["class"]});
(()=>{
  let row,button;
  function sync(){
    row=row||document.querySelector(".chant-row");
    button=button||document.getElementById("pranamButton");
    if(row&&button)row.classList.toggle("is-pranam-complete",button.classList.contains("is-complete"));
  }
  setTimeout(()=>{
    sync();
    if(button)new MutationObserver(sync).observe(button,{attributes:true,attributeFilter:["class"]});
  },0);
})();

recordDailyProgress();
recordDailySlokaProgress();
saveState();
updateNotificationButton();
updateOfflineView();
updateView();
showPage("home");
scheduleNoonReminder();
window.setTimeout(()=>{
  loadingScreen.classList.add("is-hidden");
  window.setTimeout(()=>document.body.classList.remove("is-loading"),430);
},3000);
