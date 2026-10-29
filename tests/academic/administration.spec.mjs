import { test,expect } from '../session-fixture.mjs';
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
    if(p==='/api/v1/auth/session')return route.fallback();
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

test('catalog merge previews exact records before confirming',async({page},info)=>{
 const a=messages(info),target=object('target','course','Canonical Course');let merge;
 await page.route('**/api/v1/catalog/objects?*',route=>{const kind=new URL(route.request().url()).searchParams.get('kind');return fulfill(route,{items:kind==='school'?[school]:kind==='course'?[course,target]:[],next:''})});
 await page.route('**/api/v1/catalog/objects/course/merge-preview',route=>fulfill(route,{source:course,target,aliases:1,preview_token:'checked-plan'}));
 await page.route('**/api/v1/catalog/objects/course/merge',route=>{merge=route.request().postDataJSON();return fulfill(route,{...target,revision:2})});
 await page.route('**/api/v1/catalog/objects/target/summary',route=>fulfill(route,{object:{...target,revision:2},school,department:null,categories:[],natures:[],course_count:1,teacher_count:0,offering_count:0}));
 await page.goto(`http://127.0.0.1:18793/academic/catalog?lang=${info.project.metadata.locale}`);await page.locator('.admin-list-item').filter({has:page.getByRole('heading',{name:'Test Course',exact:true})}).getByRole('button',{name:a.openItem,exact:true}).click();
 await page.getByRole('combobox',{name:a.mergeTarget,exact:true}).selectOption('target');await page.getByLabel(a.reason,{exact:true}).fill('Checked duplicate record.');await expect(page.getByRole('button',{name:a.confirmMerge,exact:true})).toHaveCount(0);await page.getByRole('button',{name:a.previewMerge,exact:true}).click();await expect(page.locator('.admin-notice').getByText(/Canonical Course/)).toBeVisible();await page.getByRole('button',{name:a.confirmMerge,exact:true}).click();await expect(page.getByRole('heading',{name:'Canonical Course',exact:true}).last()).toBeVisible();expect(merge).toMatchObject({target_id:'target',source_revision:1,target_revision:1,preview_token:'checked-plan'});
});

test('directory import requires a valid preview and sends its confirmation token',async({page},info)=>{
 const a=messages(info);let confirmed;
 const payload={school_id:'school',source_id:'synthetic-source',revision:1,fetched_at:'2026-10-28T00:00:00Z',objects:[course],enrollments:[]};
 await page.route('**/api/v1/catalog/imports/preview',route=>fulfill(route,{valid:true,code:'',preview_token:'snapshot-token',changes:[{id:'course',kind:'course',state:'new',fields:[]}]}));
 await page.route('**/api/v1/catalog/imports/confirm',route=>{confirmed=route.request().postDataJSON();return fulfill(route,{id:'import',objects:1,enrollments:0,preserved_corrections:0})});
 await page.goto(`http://127.0.0.1:18793/academic/catalog?lang=${info.project.metadata.locale}`);await page.getByLabel(a.importFile,{exact:true}).setInputFiles({name:'directory.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});await page.getByRole('button',{name:a.previewImport,exact:true}).click();await expect(page.getByText(a.operationStates.new,{exact:true})).toBeVisible();await page.getByRole('button',{name:a.confirmImport,exact:true}).click();await expect(page.getByText(a.saved,{exact:true})).toBeVisible();expect(confirmed).toMatchObject({...payload,preview_token:'snapshot-token'});
});

test('presentation settings persist the full language set and current revision',async({page},info)=>{
 const a=messages(info);let settings={school_id:'school',revision:2,guest_preview:80,member_preview:160,preview_ratio:0.3,rating_texts:{}},submitted;
 await page.route('**/api/v1/reviews/admin/presentation*',route=>{if(route.request().method()==='PUT'){submitted=route.request().postDataJSON();settings={...submitted,revision:3}}return fulfill(route,{effective:settings,configured:settings,source:'school'})});
 await page.goto(`http://127.0.0.1:18793/academic/reviews?lang=${info.project.metadata.locale}`);await page.getByRole('button',{name:a.presentationTitle,exact:true}).click();await page.getByLabel(a.guestPreview,{exact:true}).fill('40');await page.getByRole('button',{name:a.saveChanges,exact:true}).click();await expect(page.getByText(a.saved,{exact:true})).toBeVisible();expect(submitted.guest_preview).toBe(40);expect(submitted.revision).toBe(2);expect(Object.keys(submitted.rating_texts)).toHaveLength(8);expect(Object.values(submitted.rating_texts).every(rows=>rows.length===5&&rows.every(row=>row.length===6))).toBe(true);
});

test('moderator attribution correction carries the authoritative evidence revision',async({page},info)=>{
 const a=messages(info);let decision;
 await page.route('**/api/v1/reviews/admin/entries/review/attribution',route=>fulfill(route,{revision:1,evidence_revision:'source-v2',teacher_ids:['teacher-a'],previous_teacher_ids:['teacher-b']}));
 await page.route('**/api/v1/catalog/objects/lookup?*',route=>fulfill(route,{items:[object('teacher-a','teacher','Teacher A')],missing_ids:[]}));
 await page.route('**/api/v1/moderation/tasks/task/decisions',route=>{decision=route.request().postDataJSON();return fulfill(route,{...originalTask,state:'decided',revision:2,decision:decision.decision})});
 await page.goto(`http://127.0.0.1:18793/academic/reviews?lang=${info.project.metadata.locale}`);await page.getByRole('button',{name:a.openItem,exact:true}).click();await page.getByRole('combobox',{name:a.moderationAction,exact:true}).selectOption('reassign');await page.getByLabel(a.decisionReason,{exact:true}).fill('Confirmed corrected source.');await expect(page.getByRole('button',{name:a.applyDecision,exact:true})).toBeDisabled();await page.getByRole('button',{name:a.previewAttribution,exact:true}).click();await page.getByRole('button',{name:a.applyDecision,exact:true}).click();await expect(page.getByText(a.decisionQueued,{exact:true})).toBeVisible();expect(decision.decision).toMatchObject({action:'reassign',evidence_revision:'source-v2',teacher_id:''});
});

test('batch workflow shows preview and per-item delivery state',async({page},info)=>{
 const a=messages(info);let submitted;
 await page.route('**/api/v1/moderation/tasks/batch-preview',route=>fulfill(route,{preview_token:'batch-token',items:[{id:'task',state:'ready',code:''}]}));
 await page.route('**/api/v1/moderation/tasks/batch',route=>{submitted=route.request().postDataJSON();return fulfill(route,{preview_token:'batch-token',items:[{id:'task',state:'decided',code:''}]})});
 await page.goto(`http://127.0.0.1:18793/academic/reviews?lang=${info.project.metadata.locale}`);const panel=page.locator('details').filter({has:page.locator('summary',{hasText:a.batchTitle})});await panel.locator('summary').click();await panel.getByRole('checkbox').check();await panel.getByRole('combobox',{name:a.moderationAction,exact:true}).selectOption('hide');await panel.getByLabel(a.decisionReason,{exact:true}).fill('Batch moderation reason.');await panel.getByRole('button',{name:a.previewBatch,exact:true}).click();await expect(panel.getByText(new RegExp(a.operationStates.ready))).toBeVisible();await panel.getByRole('button',{name:a.applyBatch,exact:true}).click();await expect(panel.getByText(new RegExp(a.operationStates.decided))).toBeVisible();expect(submitted.preview_token).toBe('batch-token');expect(submitted.items).toHaveLength(1);
});
