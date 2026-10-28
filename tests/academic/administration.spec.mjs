import { test,expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const admin=process.env.ADMIN_PATH||path.resolve('workspace/admin');
const messages=info=>JSON.parse(fs.readFileSync(path.join(admin,`apps/web-antd/src/locales/langs/${info.project.metadata.locale}/page.json`))).academic;
const object=(id,kind,name,extra={})=>({id,kind,name,school_id:'school',credits:null,aliases:[],revision:1,updated_at:'2026-10-27T00:00:00Z',...extra});
const school=object('school','school','Test University'),course=object('course','course','Test Course');
const input={kind:'course',target_id:'course',term_id:'fall',title:'Pending review',body:'Original text for moderation.',ratings:[3,3,3,3,3],signed:false};
const entry={id:'review',root_id:'review',school_id:'school',input,author_handle:'discussion-local-handle',anonymous:true,state:'pending',revision:1,created_at:'2026-10-27T00:00:00Z',published_at:null};
const originalTask={id:'task',school_id:'school',submission:{object_id:'review',kind:'review',reason:'content_review',evidence:[]},object_revision:1,revision:1,state:'waiting',created_at:'2026-10-27T00:00:00Z',updated_at:'2026-10-27T00:00:00Z'};
const fulfill=(route,value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
async function fixture(page){
  await page.route('**/api/v1/**',route=>{
    const u=new URL(route.request().url()),p=u.pathname;
    if(p==='/api/v1/catalog/objects')return fulfill(route,{items:u.searchParams.get('kind')==='school'?[school]:u.searchParams.get('kind')==='course'?[course]:[],next:''});
    if(p==='/api/v1/catalog/objects/course/summary')return fulfill(route,{object:course,school,department:null,categories:[],natures:[],course_count:1,teacher_count:0,offering_count:0});
    if(p==='/api/v1/reviews/admin/entries')return fulfill(route,{items:[entry],next:''});
    if(p==='/api/v1/reviews/admin/entries/review')return fulfill(route,entry);
    if(p==='/api/v1/moderation/tasks')return fulfill(route,[originalTask]);
    if(p==='/api/v1/moderation/tasks/task')return fulfill(route,originalTask);
    return fulfill(route,{code:'not_found'},404);
  });
}
test.beforeEach(async({page})=>fixture(page));

test('moderator reads original and distinguishes queued decision from applied result',async({page},info)=>{
  const a=messages(info);let task=structuredClone(originalTask),decision,reads=0;
  await page.route('**/api/v1/moderation/tasks/task',route=>{
    if(task.state==='decided'&&++reads>1)task={...task,state:'applied',revision:3};
    return fulfill(route,task);
  });
  await page.route('**/api/v1/moderation/tasks/task/decisions',route=>{
    decision=route.request().postDataJSON();task={...task,state:'decided',revision:2,decision:decision.decision};return fulfill(route,task);
  });
  await page.goto(`http://127.0.0.1:18793/academic/reviews?lang=${info.project.metadata.locale}`);
  await page.getByRole('button',{name:a.openItem,exact:true}).click();
  await expect(page.getByText(input.body,{exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:a.moderationAction,exact:true}).selectOption('identity');
  await page.getByRole('checkbox',{name:a.signed,exact:true}).check();
  await page.getByLabel(a.decisionReason,{exact:true}).fill('Verified author request.');
  await page.getByRole('button',{name:a.applyDecision,exact:true}).click();
  await expect(page.getByText(a.decisionQueued,{exact:true})).toBeVisible();
  expect(decision.decision).toMatchObject({action:'identity',author_handle:entry.author_handle,signed:true,revision:1});
  expect(decision.decision).not.toHaveProperty('subject');
  await expect(page.getByText(a.decisionApplied,{exact:true})).toBeVisible({timeout:10000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('revoked moderator permission removes previously read originals',async({page},info)=>{
  const a=messages(info);let allowed=true;
  await page.route('**/api/v1/reviews/admin/entries/review',route=>allowed?fulfill(route,entry):fulfill(route,{code:'forbidden'},403));
  await page.goto(`http://127.0.0.1:18793/academic/reviews?lang=${info.project.metadata.locale}`);
  await page.getByRole('button',{name:a.openItem,exact:true}).click();
  await expect(page.getByText(input.body,{exact:true})).toBeVisible();
  allowed=false;
  await page.getByRole('button',{name:a.reloadCompare,exact:true}).click();
  await expect(page.getByText(a.errors.forbidden,{exact:true})).toBeVisible();
  await expect(page.getByText(input.body,{exact:true})).toHaveCount(0);
});

test('catalog correction retains edits after a stale revision and compares current data',async({page},info)=>{
  const a=messages(info);let current={...course},submitted;
  await page.route('**/api/v1/catalog/objects/course/summary',route=>fulfill(route,{object:current,school,department:null,categories:[],natures:[],course_count:1,teacher_count:0,offering_count:0}));
  await page.route('**/api/v1/catalog/objects/course',route=>{
    const body=route.request().postDataJSON();
    if(body.revision===1){current={...course,revision:2,name:'Concurrent correction'};return fulfill(route,{code:'conflict'},409)}
    submitted=body;current={...current,name:body.name,revision:3};return fulfill(route,current);
  });
  await page.goto(`http://127.0.0.1:18793/academic/catalog?lang=${info.project.metadata.locale}`);
  await page.getByRole('button',{name:a.openItem,exact:true}).click();
  await page.getByLabel(a.recordName,{exact:true}).fill('Reviewed course name');
  await page.getByRole('button',{name:a.saveChanges,exact:true}).click();
  await expect(page.getByText(a.errors.conflict,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:a.reloadCompare,exact:true}).click();
  await expect(page.getByLabel(a.recordName,{exact:true})).toHaveValue('Reviewed course name');
  await expect(page.getByRole('heading',{name:'Concurrent correction',exact:true})).toBeVisible();
  await page.getByRole('button',{name:a.saveChanges,exact:true}).click();
  await expect(page.getByText(a.saved,{exact:true})).toBeVisible();
  expect(submitted).toMatchObject({revision:2,name:'Reviewed course name',clear_credits:true});
  expect(submitted).not.toHaveProperty('credits');
});

test('policy editor shows inherited rules and retries unknown saves with the same request',async({page},info)=>{
  const a=messages(info),writes=[];
  const policy={school_id:'*',kind:'course',mode:'published',blocked_terms:[],revision:1};let configured;
  await page.route('**/api/v1/moderation/policies*',route=>{
    if(route.request().method()==='GET')return fulfill(route,{configured:configured??null,effective:configured??policy,source:configured?'school':'global'});
    writes.push({body:route.request().postDataJSON(),key:route.request().headers()['idempotency-key']});
    if(writes.length===1)return route.abort('failed');
    configured={...writes[1].body,revision:1};return fulfill(route,{ok:true});
  });
  await page.goto(`http://127.0.0.1:18793/academic/reviews?lang=${info.project.metadata.locale}`);
  await page.getByRole('button',{name:a.policyManagement,exact:true}).click();
  await expect(page.getByText(a.policySources.global,{exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:a.policyMode,exact:true}).selectOption('pending');
  await page.getByLabel(a.blockedTerms,{exact:true}).fill('Synthetic blocked phrase');
  await page.getByRole('button',{name:a.savePolicy,exact:true}).click();
  await expect(page.getByText(a.uncertain,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:a.retry,exact:true}).click();
  await expect(page.getByText(a.saved,{exact:true})).toBeVisible();
  expect(writes).toHaveLength(2);expect(writes[1]).toEqual(writes[0]);
});
