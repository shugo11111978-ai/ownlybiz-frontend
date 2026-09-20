import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
function section(start,end){const left=html.indexOf(start);assert(left>=0,start);const right=html.indexOf(end,left+start.length);assert(right>left,end);return html.slice(left,right);}
const coordinator=section('// Initial dashboard visibility follows the real profile/data projection.','// THE single function for all dashboard loading.');
const profile=section('// Fix 2: loadSettings - fetches /me/dashboard, stores slug into _currentExpert','// Fix 3: loadClients - enhanced with client detail view');
const overview=section('  function _patchedLED(){','  if(_origLED) {');
const panel=section('      window.obDashboardRoutePanelReady = function(){','\t  function dashboardPanelReady(');
const storage=new Map([['ob_t','first-token']]);
const nodes=new Map();
const main={firstChild:null,insertBefore(node){nodes.set(node.id,node);}};
const classes=(...values)=>({contains:(value)=>values.includes(value)});
let route={type:'dash',slug:'alice',panel:'overview'};
let projected=0;
let readyRequests=0;
let requests=[];
const root={window:null,location:{pathname:'/dash/alice/overview'},sessionStorage:{getItem:(key)=>storage.get(key)||null},
  document:{querySelector:(selector)=>selector==='#view-3 .db-main'?main:selector==='#view-3.active'?{}:null,querySelectorAll:()=>[],getElementById:(id)=>nodes.get(id)||null,createElement:()=>({style:{},setAttribute(){}})},
  parseRoute:()=>route,canonicalDashboardPanel:(value)=>value==='packages'?'pricing':value||'overview',
  AbortController,setTimeout:()=>0,Promise,Error,Object,decodeURIComponent,
  _markRouteReady:()=>{readyRequests+=1;},_applyProfile:()=>{projected+=1;},loadExpertPricing(){},_fixDashboardDate(){},_renderRevenueChart(){},_renderRecentSessions(){},_fmtMoney:(n)=>String(n),
  fetch:(url)=>new Promise((resolve,reject)=>requests.push({url,resolve,reject}))};
root.window=root;
vm.createContext(root);
new vm.Script(coordinator+'\n'+panel+'\n'+profile+'\n'+overview).runInContext(root);
const paint=root.OB_DASHBOARD_FIRST_PAINT;
assert.equal(root.obDashboardFirstPaintReady(),false,'no initial load cannot release the dashboard');
const initial=paint.begin('alice');
const profileLoad=root.loadSettings();
const overviewLoad=root._patchedLED();
nodes.set('db-panel-overview',{classList:classes('active')});
assert.equal(root.obDashboardFirstPaintReady(),false,'selected panel remains hidden before data projection');
requests[0].resolve({ok:true,json:async()=>({user:{id:'alice-id',name:'Alice'}})});
requests[1].resolve({ok:true,json:async()=>({profile:{slug:'alice'}})});
await profileLoad;
assert.equal(projected,1,'actual profile owner projected the loaded identity');
assert.equal(root.obDashboardFirstPaintReady(),false,'overview waits for actual stats projection');
requests[2].resolve({ok:true,json:async()=>({stats:{total_sessions:3},recent_sessions:[]})});
await overviewLoad;
assert.equal(root.obDashboardFirstPaintReady(),true,'profile and overview completion release the correct panel');
assert.equal(paint.begin('alice'),initial,'duplicate initial loaders do not reset settled readiness');
nodes.set('db-panel-overview',{classList:classes()});
assert.equal(root.obDashboardFirstPaintReady(),false,'data completion cannot reveal a wrong/default panel');

root.location.pathname='/dash/bob/live-session';route={type:'dash',slug:'bob',panel:'live-session'};
const second=paint.begin('bob');
nodes.set('db-panel-live-session',{classList:classes('active')});
assert.equal(paint.settle(initial,'all'),false,'late prior-expert completion cannot release a newer dashboard');
paint.settle(second,'profile');
assert.equal(root.obDashboardFirstPaintReady(),true,'live session does not wait on unrelated overview statistics');
storage.set('ob_t','rotated-token');
assert.equal(root.obDashboardFirstPaintReady(),false,'old credential readiness cannot cross credential changes');

const third=paint.begin('bob');
requests=[];
const failedProfile=root.loadSettings();
requests[0].reject(new Error('offline'));
requests[1].resolve({ok:false,json:async()=>({})});
await failedProfile;
assert.equal(root.obDashboardFirstPaintReady(),true,'profile failure settles the initial guard after error projection');
assert.match(nodes.get('ob-dashboard-load-error').textContent,/could not load/,'failure provides a visible retry instruction');
assert.equal(paint.settle(second,'all'),false,'older credential error cannot release the current guard');
assert.equal(paint.capture(),third);
route={type:'dash',slug:'bob',panel:'packages'};root.location.pathname='/dash/bob/packages';
nodes.set('db-panel-payments',{classList:classes('active','show-pricing')});
assert.equal(root.obDashboardFirstPaintReady(),true,'canonical legacy packages route accepts the shared pricing panel');
storage.set('ob_u',JSON.stringify({role:'admin'}));
route={type:'dash',slug:'charlie',panel:'overview'};root.location.pathname='/dash/charlie/overview';
nodes.set('db-panel-overview',{classList:classes('active')});
assert.equal(root.obDashboardFirstPaintReady(),true,'admin viewing an expert preserves its existing data loading lifecycle');
nodes.set('db-panel-overview',{classList:classes()});
assert.equal(root.obDashboardFirstPaintReady(),false,'admin still waits for the actual requested dashboard panel');
assert(readyRequests>=3,'actual projection callbacks recheck route visibility');
assert.doesNotMatch(html,/_origLS18|_origLD18|_origLoadDashboardStaging/,'obsolete dashboard reveal timer wrappers are removed');
console.log('dashboard first-paint focused regression: ok');
