import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const part=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return source.slice(a,b);};
const detail=part(html,'<script id="ownlybiz-admin-expert-detail-correct-flow-20260526"','</script>');
const shared=part(html,'  function adminExpertAccountState(user, profile){','  function renderAdminExpertsEnhanced(options){');
const row=part(html,'        var rows = experts.map(function(e){','        if(!controller.current(ticket)) return false;\n        content.innerHTML');
const header=part(detail,'\t\t  function detailHtml(id, profileData, dashboardData, refundData, marketplaceData, liveCapacityData, groupSessionsData){',`      + '<div class="admin-card" style="padding:22px;">'`)+';\n}';
const context={String,Number,Array,Object,esc:s=>String(s??''),attr:s=>String(s??''),badge:(text,tone)=>`${tone}:${text}`};context.window=context;vm.createContext(context);
vm.runInContext(shared+part(detail,'  function expertStatus(user, profile){','  function refundStatus(s){')+header,context);
const cases=[
 {name:'pending review',profile:{approval_status:'pending_review',approval_required:1,subscription_status:'signup_draft'},active:1,label:'Waiting approval',approve:true,suspend:false,restore:false},
 {name:'reviewed before Checkout',profile:{approval_status:'signup_incomplete',approval_required:0,approved_at:1790175600,subscription_status:'signup_draft'},active:1,label:'Approved · awaiting checkout',approve:false,suspend:true,restore:false},
 {name:'automatic unstarted signup',profile:{approval_status:'draft',approval_required:0,subscription_status:'signup_draft'},active:1,label:'Awaiting checkout',approve:false,suspend:true,restore:false},
 {name:'legacy pending Starter',profile:{approval_status:'draft',approval_required:1},active:0,label:'Waiting approval',approve:true,suspend:false,restore:false},
 {name:'suspended reviewed account',profile:{approval_status:'signup_incomplete',approval_required:0,approved_at:1790175600,subscription_status:'signup_draft'},active:0,label:'Suspended',approve:false,suspend:false,restore:true},
 {name:'active paid account',profile:{approval_status:'approved',subscription_status:'active',website_published:1},active:1,label:'Live',approve:false,suspend:true,restore:false},
 {name:'unpublished approved account',profile:{approval_status:'approved',subscription_status:'trialing',website_published:0},active:1,label:'Approved',approve:false,suspend:true,restore:false}
];
for(const test of cases){
 const user={id:'owned',name:'Owned',is_active:test.active,is_verified:1};
 const state=context.obAdminExpertAccountState(user,test.profile);assert.equal(state.label,test.label,test.name);
 const headerHtml=context.detailHtml('owned',{user,profile:test.profile},{},{},{},{},{});
 const detailStatus=context.expertStatus(user,test.profile);assert.match(detailStatus,new RegExp(test.label),test.name);
 context.experts=[{...user,...test.profile}];vm.runInContext(row,context);assert.match(context.rows,new RegExp(test.label),test.name);
 for(const action of ['approve','suspend','restore']){const label=action[0].toUpperCase()+action.slice(1);assert.equal(state[action],test[action],test.name+': '+action);assert.equal(headerHtml.includes('>'+label+'</button>'),test[action],test.name+': detail '+action);assert.equal(context.rows.includes('>'+label+'</button>'),test[action],test.name+': list '+action);}
}
assert.doesNotMatch(html,/Expert approved — now live/,'approval alone cannot claim payment activation or public publishing');
console.log(JSON.stringify({status:'PASS',checks:cases.map(t=>t.name),surfaces:['native Admin list rows','canonical expert detail header and status'],externalRequests:0,browser:false}));
