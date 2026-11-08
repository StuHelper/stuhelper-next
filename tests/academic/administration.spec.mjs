import { test,expect } from '../session-fixture.mjs';
import fs from 'node:fs';
import path from 'node:path';
const admin=process.env.ADMIN_PATH||path.resolve('workspace/admin');
const base='http://127.0.0.1:18793';
const messages=info=>JSON.parse(fs.readFileSync(path.join(admin,`apps/web-antd/src/locales/langs/${info.project.metadata.locale}/page.json`)));
const number=(info,value)=>new Intl.NumberFormat(info.project.metadata.locale).format(value);
const fill=(text,values)=>Object.entries(values).reduce((out,[key,value])=>out.replace(`{${key}}`,value),text);
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
    if(p==='/api/v1/reviews/admin/entries/review/history')return fulfill(route,[]);
    if(p==='/api/v1/moderation/tasks')return fulfill(route,[originalTask]);
    if(p==='/api/v1/moderation/tasks/task')return fulfill(route,originalTask);
    return fulfill(route,{code:'not_found'},404);
  });
}
// Ant Design selects open a separate listbox; options carry their label as the title.
// The visible selector receives the click; the combobox input itself is transparent.
async function choose(page,scope,label,option){
  await scope.locator('.ant-form-item').filter({has:page.getByText(label,{exact:true})}).locator('.ant-select-selector').click();
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').getByTitle(option,{exact:true}).click();
}
const drawer=page=>page.locator('.ant-drawer-content');
async function openTask(page,a){
  await page.getByRole('row').filter({hasText:a.moderation.taskKind.review}).getByRole('button',{name:a.common.open,exact:true}).click();
  await expect(drawer(page).getByText(input.body,{exact:true})).toBeVisible();
}
test.beforeEach(async({page})=>fixture(page));

test('moderator reads original and distinguishes queued decision from applied result',async({page},info)=>{
  const a=messages(info),m=a.moderation;let task=structuredClone(originalTask),decision,reads=0;
  await page.route('**/api/v1/moderation/tasks/task',route=>{
    if(task.state==='decided'&&++reads>1)task={...task,state:'applied',revision:3};
    return fulfill(route,task);
  });
  await page.route('**/api/v1/moderation/tasks/task/decisions',route=>{
    decision=route.request().postDataJSON();task={...task,state:'decided',revision:2,decision:decision.decision};return fulfill(route,task);
  });
  await page.goto(`${base}/moderation/queue?lang=${info.project.metadata.locale}`);
  await openTask(page,a);
  const panel=drawer(page);
  await choose(page,panel,m.action,m.actions.identity);
  await panel.getByRole('checkbox',{name:m.signedIdentity,exact:true}).check();
  await panel.getByLabel(m.reason,{exact:true}).fill('Verified author request.');
  await panel.getByRole('button',{name:m.applyDecision,exact:true}).click();
  await expect(panel.getByText(m.decisionQueued,{exact:true})).toBeVisible();
  expect(decision).toMatchObject({revision:1,decision:{action:'identity',author_handle:entry.author_handle,signed:true,revision:1,object_id:'review'}});
  expect(decision.decision).not.toHaveProperty('subject');
  await expect(panel.getByText(m.decisionApplied,{exact:true})).toBeVisible({timeout:10000});
});

test('revoked moderator permission removes previously read originals',async({page},info)=>{
  const a=messages(info);let allowed=true;
  await page.route('**/api/v1/reviews/admin/entries/review',route=>allowed?fulfill(route,entry):fulfill(route,{code:'forbidden'},403));
  await page.goto(`${base}/moderation/queue?lang=${info.project.metadata.locale}`);
  await openTask(page,a);
  allowed=false;
  await page.locator('.ant-drawer-close').click();
  await expect(page.getByText(input.body,{exact:true})).toHaveCount(0);
  await page.getByRole('row').filter({hasText:a.moderation.taskKind.review}).getByRole('button',{name:a.common.open,exact:true}).click();
  await expect(drawer(page).getByText(a.errors.forbidden,{exact:true})).toBeVisible();
  await expect(page.getByText(input.body,{exact:true})).toHaveCount(0);
});

test('catalog correction retains edits after a stale revision and compares current data',async({page},info)=>{
  const a=messages(info),c=a.catalog;let current={...course},submitted;
  await page.route('**/api/v1/catalog/objects/course/summary',route=>fulfill(route,{object:current,school,department:null,categories:[],natures:[],course_count:1,teacher_count:0,offering_count:0}));
  await page.route('**/api/v1/catalog/objects/course',route=>{
    const body=route.request().postDataJSON();
    if(body.revision===1){current={...course,revision:2,name:'Concurrent correction'};return fulfill(route,{code:'conflict'},409)}
    submitted=body;current={...current,name:body.name,revision:3};return fulfill(route,current);
  });
  await page.goto(`${base}/catalog?lang=${info.project.metadata.locale}`);
  await page.getByRole('row').filter({hasText:'Test Course'}).getByRole('button',{name:a.common.edit,exact:true}).click();
  const panel=drawer(page);
  await panel.getByLabel(c.name,{exact:true}).fill('Reviewed course name');
  await panel.getByRole('button',{name:a.common.save,exact:true}).click();
  await expect(panel.getByText(a.errors.conflict,{exact:true})).toBeVisible();
  await panel.getByRole('button',{name:a.common.reloadCompare,exact:true}).click();
  await expect(panel.getByLabel(c.name,{exact:true})).toHaveValue('Reviewed course name');
  await expect(panel.getByText(fill(c.savedValues,{name:'Concurrent correction'}),{exact:true})).toBeVisible();
  await panel.getByRole('button',{name:a.common.save,exact:true}).click();
  await expect(panel.getByText(a.common.saved,{exact:true})).toBeVisible();
  expect(submitted).toMatchObject({revision:2,name:'Reviewed course name',clear_credits:true});
  expect(submitted).not.toHaveProperty('credits');
});

test('policy editor shows inherited rules and retries unknown saves with the same request',async({page},info)=>{
  const a=messages(info),m=a.moderation,writes=[];
  const policy={school_id:'*',kind:'course',mode:'published',blocked_terms:[],revision:1};let configured;
  await page.route('**/api/v1/moderation/policies*',route=>{
    if(route.request().method()==='GET')return fulfill(route,{configured:configured??null,effective:configured??policy,source:configured?'school':'global'});
    writes.push({body:route.request().postDataJSON(),key:route.request().headers()['idempotency-key']});
    if(writes.length===1)return route.abort('failed');
    configured={...writes[1].body,revision:1};return fulfill(route,{ok:true});
  });
  await page.goto(`${base}/moderation/policies?lang=${info.project.metadata.locale}`);
  await expect(page.getByText(m.policySource.global,{exact:true})).toBeVisible();
  await page.getByRole('radio',{name:m.policyModes.pending,exact:true}).check();
  await page.getByLabel(m.blockedTerms,{exact:true}).fill('Synthetic blocked phrase');
  await page.getByRole('button',{name:a.common.save,exact:true}).click();
  await expect(page.getByText(a.common.uncertain,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:a.common.retryOriginal,exact:true}).click();
  await expect(page.getByText(a.common.saved,{exact:true})).toBeVisible();
  await expect(page.getByText(m.policySource.school,{exact:true})).toBeVisible();
  expect(writes).toHaveLength(2);expect(writes[1]).toEqual(writes[0]);
  expect(writes[0].body).toMatchObject({mode:'pending',blocked_terms:['Synthetic blocked phrase']});
});

test('catalog merge previews exact records before confirming',async({page},info)=>{
  const a=messages(info),c=a.catalog,target=object('target','course','Canonical Course');let merge,merged=false;
  await page.route('**/api/v1/catalog/objects?*',route=>{const kind=new URL(route.request().url()).searchParams.get('kind');return fulfill(route,{items:kind==='school'?[school]:kind==='course'?(merged?[target]:[course,target]):[],next:''})});
  await page.route('**/api/v1/catalog/objects/course/merge-preview',route=>fulfill(route,{source:course,target,aliases:1,preview_token:'checked-plan'}));
  await page.route('**/api/v1/catalog/objects/course/merge',route=>{merge=route.request().postDataJSON();merged=true;return fulfill(route,{...target,revision:2})});
  await page.route('**/api/v1/catalog/objects/target/summary',route=>fulfill(route,{object:{...target,revision:2},school,department:null,categories:[],natures:[],course_count:1,teacher_count:0,offering_count:0}));
  await page.goto(`${base}/catalog?lang=${info.project.metadata.locale}`);
  await page.getByRole('row').filter({hasText:'Test Course'}).getByRole('button',{name:a.common.edit,exact:true}).click();
  const panel=drawer(page);
  await panel.getByRole('tab',{name:c.lifecycle,exact:true}).click();
  await choose(page,panel,c.mergeTarget,'Canonical Course');
  await panel.getByLabel(c.reason,{exact:true}).fill('Checked duplicate record.');
  await expect(panel.getByRole('button',{name:c.confirmMerge,exact:true})).toHaveCount(0);
  await panel.getByRole('button',{name:c.previewMerge,exact:true}).click();
  // The plan shows the source and target records side by side.
  const plan=panel.locator('.grid').filter({hasText:'Canonical Course'});
  await expect(plan.getByText('Test Course',{exact:true})).toBeVisible();
  await expect(plan.getByText('Canonical Course',{exact:true})).toBeVisible();
  await panel.getByRole('button',{name:c.confirmMerge,exact:true}).click();
  await expect(panel.getByText(c.merged,{exact:true})).toBeVisible();
  await expect(page.locator('.ant-drawer-title')).toHaveText('Canonical Course');
  expect(merge).toMatchObject({target_id:'target',source_revision:1,target_revision:1,preview_token:'checked-plan',reason:'Checked duplicate record.'});
});

test('directory import requires a valid preview and sends its confirmation token',async({page},info)=>{
  const a=messages(info),c=a.catalog;let confirmed;
  const payload={school_id:'school',source_id:'synthetic-source',revision:1,fetched_at:'2026-10-28T00:00:00Z',objects:[course],enrollments:[]};
  await page.route('**/api/v1/catalog/imports/preview',route=>fulfill(route,{valid:true,code:'',preview_token:'snapshot-token',changes:[{id:'course',kind:'course',state:'new',fields:[]}]}));
  await page.route('**/api/v1/catalog/imports/confirm',route=>{confirmed=route.request().postDataJSON();return fulfill(route,{id:'import',objects:1,enrollments:0,preserved_corrections:0})});
  await page.goto(`${base}/catalog/imports?lang=${info.project.metadata.locale}`);
  await page.getByLabel(c.importFile,{exact:true}).setInputFiles({name:'directory.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
  await expect(page.getByRole('button',{name:c.confirmImport,exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:c.previewImport,exact:true}).click();
  await expect(page.getByRole('cell',{name:c.changeState.new,exact:true})).toBeVisible();
  await page.getByRole('button',{name:c.confirmImport,exact:true}).click();
  await expect(page.getByText(fill(c.imported,{objects:number(info,1),enrollments:number(info,0),preserved:number(info,0)}),{exact:true})).toBeVisible();
  expect(confirmed).toMatchObject({...payload,preview_token:'snapshot-token'});
});

test('presentation settings persist the full language set and current revision',async({page},info)=>{
  const a=messages(info),m=a.moderation;let settings={school_id:'school',revision:2,rating_texts:{}},submitted;
  await page.route('**/api/v1/reviews/admin/presentation*',route=>{if(route.request().method()==='PUT'){submitted=route.request().postDataJSON();settings={...submitted,revision:3}}return fulfill(route,{effective:settings,configured:settings,source:'school'})});
  await page.goto(`${base}/moderation/presentation?lang=${info.project.metadata.locale}`);
  const recommendation=page.getByRole('group',{name:m.ratings.recommendation.label,exact:true});
  await recommendation.getByLabel(fill(m.levelLabel,{level:'5'}),{exact:true}).fill('Strongly recommended');
  await page.getByRole('button',{name:a.common.save,exact:true}).click();
  await expect(page.getByText(a.common.saved,{exact:true})).toBeVisible();
  expect(submitted.revision).toBe(2);
  expect(Object.keys(submitted.rating_texts)).toHaveLength(8);
  expect(Object.values(submitted.rating_texts).every(rows=>rows.length===5&&rows.every(row=>row.length===6))).toBe(true);
  expect(submitted.rating_texts[info.project.metadata.locale][0][5]).toBe('Strongly recommended');
});

test('moderator attribution correction carries the authoritative evidence revision',async({page},info)=>{
  const a=messages(info),m=a.moderation;let decision;
  await page.route('**/api/v1/reviews/admin/entries/review/attribution*',route=>fulfill(route,{revision:1,evidence_revision:'source-v2',teacher_ids:['teacher-a'],previous_teacher_ids:['teacher-b']}));
  await page.route('**/api/v1/catalog/objects?*',route=>{const kind=new URL(route.request().url()).searchParams.get('kind');return fulfill(route,{items:kind==='school'?[school]:kind==='teacher'?[object('teacher-a','teacher','Teacher A')]:[],next:''})});
  await page.route('**/api/v1/moderation/tasks/task/decisions',route=>{decision=route.request().postDataJSON();return fulfill(route,{...originalTask,state:'decided',revision:2,decision:decision.decision})});
  await page.goto(`${base}/moderation/queue?lang=${info.project.metadata.locale}`);
  await openTask(page,a);
  const panel=drawer(page);
  await choose(page,panel,m.action,m.actions.reassign);
  await panel.getByLabel(m.reason,{exact:true}).fill('Confirmed corrected source.');
  await expect(panel.getByRole('button',{name:m.applyDecision,exact:true})).toBeDisabled();
  await panel.getByRole('button',{name:m.previewAttribution,exact:true}).click();
  await expect(panel.getByText(fill(m.attributionResult,{teachers:'Teacher A'}),{exact:true})).toBeVisible();
  await panel.getByRole('button',{name:m.applyDecision,exact:true}).click();
  await expect(panel.getByText(m.decisionQueued,{exact:true})).toBeVisible();
  expect(decision.decision).toMatchObject({action:'reassign',evidence_revision:'source-v2',teacher_id:''});
});

test('batch workflow shows preview and per-item delivery state',async({page},info)=>{
  const a=messages(info),m=a.moderation;let submitted;
  await page.route('**/api/v1/moderation/tasks/batch-preview',route=>fulfill(route,{preview_token:'batch-token',items:[{id:'task',state:'ready',code:''}]}));
  await page.route('**/api/v1/moderation/tasks/batch',route=>{submitted=route.request().postDataJSON();return fulfill(route,{preview_token:'batch-token',items:[{id:'task',state:'decided',code:''}]})});
  await page.goto(`${base}/moderation/queue?lang=${info.project.metadata.locale}`);
  await page.getByRole('row').filter({hasText:m.taskKind.review}).getByRole('checkbox').check();
  const panel=page.locator('.ant-card').filter({hasText:m.batchTitle});
  await choose(page,panel,m.action,m.actions.delete);
  await panel.getByLabel(m.reason,{exact:true}).fill('Batch moderation reason.');
  await panel.getByRole('button',{name:m.previewBatch,exact:true}).click();
  await expect(panel.getByText(m.batchState.ready,{exact:true})).toBeVisible();
  await panel.getByRole('button',{name:m.applyBatch,exact:true}).click();
  await expect(panel.getByText(m.batchState.decided,{exact:true})).toBeVisible();
  expect(submitted.preview_token).toBe('batch-token');
  expect(submitted.items).toEqual([{id:'task',revision:1,decision:{id:'',object_id:'review',revision:1,action:'delete',reason:'Batch moderation reason.'}}]);
});
