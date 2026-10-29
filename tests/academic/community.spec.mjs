import { test, expect } from '../session-fixture.mjs';
import fs from 'node:fs';
import path from 'node:path';
const web=process.env.WEB_PATH || path.resolve('workspace/web');
const obj=(id,kind,name,extra={})=>({id,kind,name,school_id:'school',credits:null,aliases:[],revision:1,updated_at:'2026-10-27T00:00:00Z',...extra});
const school=obj('school','school','Test University');
const course=obj('course','course','Test Course',{department_id:'dept'});
const teacher=obj('teacher-a','teacher','Teacher A');
const otherTeacher=obj('teacher-b','teacher','Teacher B');
const terms=[obj('fall','term','Fall semester'),obj('spring','term','Spring semester')];
const offerings=[obj('offering-fall','term_course','Fall offering',{course_id:'course',term_id:'fall'}),obj('offering-spring','term_course','Spring offering',{course_id:'course',term_id:'spring'})];
const classes=[obj('class-one','class','Class One',{term_course_id:'offering-fall',category_id:'seminar',nature_id:'optional'})];
const schedules=[obj('schedule','schedule','Teaching time',{class_id:'class-one',time_text:'Monday 09:00',location:'Room A'})];
const directory={term_course:offerings,class:classes,schedule:schedules,school:[school],department:[obj('dept','department','Test College')],category:[obj('seminar','category','Test Seminar')],nature:[obj('optional','nature','Optional')],term:terms,course:[course],teacher:[teacher,otherTeacher]};
const dimensions=Array.from({length:5},()=>({level:3,samples:2,courses:1}));
const review={id:'review',root_id:'review',kind:'course',school_id:'school',target_id:'course',term_id:'fall',title:'A student review',body:'Useful course content.',ratings:[3,3,3,3,3],preview:false,author:{anonymous:true,handle:'anonymous'},revision:1,published_at:'2026-10-27T00:00:00Z',upvotes:0,downvotes:0,my_vote:0,mine:false,state:'published',can_edit:false};
const fulfill=(route,value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
export async function fixture(page){
  await page.route('**/api/v1/**',async route=>{
    const u=new URL(route.request().url()),p=u.pathname;
    if(p==='/api/v1/auth/session')return route.fallback();
    if(p==='/api/v1/catalog/objects'){
      const kind=u.searchParams.get('kind');let items=directory[kind]??[];
      if(kind==='term_course')items=items.filter(item=>(!u.searchParams.get('term_id')||item.term_id===u.searchParams.get('term_id'))&&(!u.searchParams.get('teacher_id')||item.term_id===(u.searchParams.get('teacher_id')==='teacher-a'?'fall':'spring')));
      if(kind==='teacher'&&u.searchParams.get('class_id'))items=[teacher];
      return fulfill(route,{items,next:''});
    }
    if(p==='/api/v1/catalog/objects/lookup'){const ids=(u.searchParams.get('ids')??'').split(',');const items=Object.values(directory).flat().filter(item=>ids.includes(item.id));return fulfill(route,{items,missing_ids:ids.filter(id=>!items.some(item=>item.id===id))});}
    if(p.endsWith('/summary')){const id=p.split('/').at(-2);const entry=Object.values(directory).flat().find(item=>item.id===id);return fulfill(route,{object:entry,school,department:entry.kind==='course'?directory.department[0]:null,categories:entry.kind==='course'?directory.category:[],natures:entry.kind==='course'?directory.nature:[],course_count:1,teacher_count:entry.kind==='course'?2:1,offering_count:entry.kind==='course'?2:1});}
    if(p.startsWith('/api/v1/catalog/objects/')){const id=p.split('/').at(-1);return fulfill(route,Object.values(directory).flat().find(v=>v.id===id)??course);}
    if(p==='/api/v1/catalog/me/enrollments')return fulfill(route,terms.map((term,i)=>({id:`enrollment-${i}`,subject:'synthetic',school_id:'school',course_id:'course',term_id:term.id,teacher_ids:[i===0?'teacher-a':'teacher-b'],active:true})));
    if(p==='/api/v1/reviews/compose'){
      const needsTerm=u.searchParams.get('kind')==='course'&&!u.searchParams.get('term_id');
      return fulfill(route,{allowed:!needsTerm,state:needsTerm?'choose_term':'ready',requirements:[{key:'login',state:'satisfied'},{key:'campus_eligibility',state:'satisfied'},{key:'phone_bound',state:'satisfied'}],teacher_ids:u.searchParams.get('kind')==='course'&&u.searchParams.get('term_id')?[u.searchParams.get('term_id')==='fall'?'teacher-a':'teacher-b']:[],identity:'choice',rule_version:'fixture'});
    }
    if(p==='/api/v1/reviews/presentation')return fulfill(route,{effective:{school_id:'school',revision:0,guest_preview:80,member_preview:160,preview_ratio:0.3,rating_texts:{}},configured:null,source:'default'});
    if(p==='/api/v1/reviews/statistics')return fulfill(route,{dimensions,courses:[{course_id:'course',dimensions}],next:'',from:u.searchParams.get('from'),until:u.searchParams.get('until')});
    if(p==='/api/v1/reviews'&&route.request().method()==='GET')return fulfill(route,{items:u.searchParams.get('kind')==='course'?[review]:[],next:''});
    if(p==='/api/v1/reviews/review')return fulfill(route,review);
    if(p==='/api/v1/reviews/me/entries')return fulfill(route,{items:[],next:''});
    if(p.startsWith('/api/v1/reviews/me/')||p==='/api/v1/moderation/tasks')return fulfill(route,[]);
    return fulfill(route,{code:'not_found'},404);
  });
}
test.beforeEach(async({page})=>fixture(page));
test('directory has college/category filters and no semester control',async({page},info)=>{
  const locale=info.project.metadata.locale,a=JSON.parse(fs.readFileSync(path.join(web,`src/locales/${locale}.json`))).academic;
  const requests=[];page.on('request',req=>{if(req.url().includes('/catalog/objects?'))requests.push(new URL(req.url()));});
  await page.goto(`/courses?lang=${locale}`);
  await expect(page.getByRole('heading',{name:'Test Course',exact:true})).toBeVisible();
  await expect(page.getByRole('combobox',{name:a.reviewTerm,exact:true})).toHaveCount(0);
  await page.getByRole('combobox',{name:a.college,exact:true}).selectOption('dept');
  await page.getByRole('combobox',{name:a.category,exact:true}).selectOption('seminar');
  await page.getByRole('button',{name:a.filter,exact:true}).click();
  await expect.poll(()=>requests.some(u=>u.searchParams.get('department_id')==='dept'&&u.searchParams.get('category_id')==='seminar')).toBe(true);
  expect(requests.every(u=>!u.searchParams.has('term_id'))).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar-EG'?'rtl':'ltr');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('review semester limits teacher choices and unknown submission retries once',async({page},info)=>{
  const locale=info.project.metadata.locale,a=JSON.parse(fs.readFileSync(path.join(web,`src/locales/${locale}.json`))).academic;
  const posts=[];
  await page.route('**/api/v1/reviews',async route=>{
    if(route.request().method()!=='POST')return route.fallback();
    posts.push({body:route.request().postData(),key:route.request().headers()['idempotency-key']});
    if(posts.length===1)return route.abort('failed');
    return fulfill(route,{id:'new-review',state:'pending',revision:1});
  });
  await page.goto(`/courses/course?lang=${locale}`);
  const card=page.locator('.review-card').first();
  for(const key of ['recommendation','quality','difficulty','workload','grading'])await expect(card.getByText(a.ratings[key].label,{exact:true})).toBeVisible();
  expect(await card.locator('.rating-bands dd').allTextContents()).toHaveLength(5);
  await page.getByRole('button',{name:a.writeReview,exact:true}).click();
  const editor=page.locator('form.academic-editor');
  await editor.getByRole('combobox',{name:a.reviewTerm,exact:true}).selectOption('fall');
  const teachers=editor.getByRole('combobox',{name:a.taughtBy,exact:true});
  await expect(teachers.locator('option')).toHaveText([a.noTeacher,'Teacher A']);
  await teachers.selectOption('teacher-a');
  await editor.getByRole('combobox',{name:a.reviewTerm,exact:true}).selectOption('spring');
  await expect(teachers).toHaveValue('');
  await expect(teachers.locator('option')).toHaveText([a.noTeacher,'Teacher B']);
  await teachers.selectOption('teacher-b');
  for(const key of ['recommendation','quality','difficulty','workload','grading'])await editor.getByRole('combobox',{name:a.ratings[key].label,exact:true}).selectOption('3');
  await page.getByLabel(a.title,{exact:true}).fill('My course review');
  await page.getByLabel(a.body,{exact:true}).fill('First-hand teaching experience.');
  await page.getByRole('button',{name:a.publish,exact:true}).click();
  await expect(page.getByText(a.uncertain,{exact:true})).toBeVisible();
  await expect(page.getByLabel(a.body,{exact:true})).toHaveValue('First-hand teaching experience.');
  await page.getByRole('button',{name:a.retry,exact:true}).click();
  await expect(page.getByText(a.pending,{exact:true})).toBeVisible();
  expect(posts).toHaveLength(2);expect(posts[1]).toEqual(posts[0]);
  expect(JSON.parse(posts[0].body)).toMatchObject({term_id:'spring',teacher_id:'teacher-b',signed:false});
});
test('mentor template can be replaced without rating fields',async({page},info)=>{
  const locale=info.project.metadata.locale,a=JSON.parse(fs.readFileSync(path.join(web,`src/locales/${locale}.json`))).academic;
  let posted;
  await page.route('**/api/v1/reviews',async route=>{if(route.request().method()!=='POST')return route.fallback();posted=route.request().postDataJSON();return fulfill(route,{id:'mentor',state:'published',revision:1});});
  await page.goto(`/teachers/teacher-a?lang=${locale}`);
  await page.getByRole('button',{name:a.writeMentor,exact:true}).click();
  await expect(page.getByLabel(a.body,{exact:true})).toHaveValue(a.mentorTemplate);
  await expect(page.getByLabel(a.ratings.recommendation.label,{exact:true})).toHaveCount(0);
  await page.getByLabel(a.title,{exact:true}).fill('Supervision experience');
  await page.getByLabel(a.body,{exact:true}).fill('My own description.');
  await page.getByRole('button',{name:a.publish,exact:true}).click();
  await expect(page.getByText(a.published,{exact:true})).toBeVisible();
  expect(posted).toMatchObject({kind:'mentor',body:'My own description.',ratings:[0,0,0,0,0]});
  expect(posted).not.toHaveProperty('term_id');
});
test('personal page distinguishes failure and denied access without stale contents',async({page},info)=>{
  const locale=info.project.metadata.locale,a=JSON.parse(fs.readFileSync(path.join(web,`src/locales/${locale}.json`))).academic;
  let requests=0;
  await page.route('**/api/v1/reviews/me/entries?*',route=>{requests++;return fulfill(route,{code:requests===1?'unavailable':'forbidden'},requests===1?503:403);});
  await page.goto(`/community/me?lang=${locale}`);
  await expect(page.getByText(a.errors.unavailable,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:a.retry,exact:true}).click();
  await expect(page.getByText(a.errors.forbidden,{exact:true})).toBeVisible();
  await expect(page.locator('.review-card')).toHaveCount(0);
});

const messages=info=>JSON.parse(fs.readFileSync(path.join(web,`src/locales/${info.project.metadata.locale}.json`))).academic;
const draftInput={kind:'course',target_id:'course',term_id:'fall',teacher_id:'teacher-a',title:'Saved review',body:'Saved first-hand experience.',ratings:[3,3,3,3,3],signed:false};

test('course history opens the matching class, teachers and timetable',async({page},info)=>{
  const a=messages(info);
  await page.goto(`/courses/course?lang=${info.project.metadata.locale}`);
  await expect(page.getByText('Test College',{exact:true}).first()).toBeVisible();
  await expect(page.getByText(a.unknownCredits,{exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:a.offeringTerm,exact:true}).selectOption('fall');
  await expect(page.locator('a[href="/offerings/offering-spring"]')).toHaveCount(0);
  await page.locator('a[href="/offerings/offering-fall"]').click();
  await expect(page).toHaveURL(/\/offerings\/offering-fall/);
  await expect(page.locator('header').getByText('Fall semester',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Class One',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Class One',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Teacher A',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Teacher B',exact:true})).toHaveCount(0);
  await expect(page.getByText('Monday 09:00',{exact:true})).toBeVisible();
  await expect(page.getByText('Room A',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('incomplete draft saves and later publishes through its original draft',async({page},info)=>{
  const a=messages(info),posts=[];
  await page.route('**/api/v1/reviews/me/drafts',route=>{
    posts.push({path:new URL(route.request().url()).pathname,body:route.request().postDataJSON()});
    return fulfill(route,{id:'draft',state:'draft',revision:1});
  });
  await page.route('**/api/v1/reviews/me/drafts/draft/publish',route=>{
    posts.push({path:new URL(route.request().url()).pathname,body:route.request().postDataJSON()});
    return fulfill(route,{id:'published',state:'published',revision:1});
  });
  await page.goto(`/courses/course?lang=${info.project.metadata.locale}`);
  await page.getByRole('button',{name:a.writeReview,exact:true}).click();
  await page.getByLabel(a.body,{exact:true}).fill('Working notes.');
  await page.getByRole('button',{name:a.saveDraft,exact:true}).click();
  await expect(page.getByText(a.draftSaved,{exact:true})).toBeVisible();
  expect(posts[0].body.input).toMatchObject({term_id:'',ratings:[0,0,0,0,0]});
  const editor=page.locator('form.academic-editor');
  await editor.getByRole('combobox',{name:a.reviewTerm,exact:true}).selectOption('fall');
  await editor.getByLabel(a.title,{exact:true}).fill('Finished review');
  for(const key of ['recommendation','quality','difficulty','workload','grading'])await editor.getByRole('combobox',{name:a.ratings[key].label,exact:true}).selectOption('3');
  await editor.getByRole('button',{name:a.publish,exact:true}).click();
  await expect(page.getByText(a.published,{exact:true})).toBeVisible();
  expect(posts).toHaveLength(2);
  expect(posts[1]).toMatchObject({path:'/api/v1/reviews/me/drafts/draft/publish',body:{revision:1,input:{body:'Working notes.',term_id:'fall'}}});
});

test('draft conflict keeps local writing until the author chooses a version',async({page},info)=>{
  const a=messages(info),draft={id:'draft',revision:1,input:draftInput,withdrawn:false};let reads=0,posted;
  await page.route('**/api/v1/reviews/me/drafts?*',route=>fulfill(route,[draft]));
  await page.route('**/api/v1/reviews/me/drafts/draft',route=>{reads++;return fulfill(route,reads===1?draft:{...draft,revision:2,input:{...draftInput,body:'Edited on another device.'}})});
  await page.route('**/api/v1/reviews/me/drafts/draft/publish',route=>{
    const body=route.request().postDataJSON();
    if(body.revision===1)return fulfill(route,{code:'conflict'},409);
    posted=body;return fulfill(route,{id:'published',state:'published',revision:1});
  });
  await page.goto(`/community/me?tab=drafts&lang=${info.project.metadata.locale}`);
  await page.getByRole('button',{name:a.editDraft,exact:true}).click();
  await page.getByLabel(a.body,{exact:true}).fill('Local writing to preserve.');
  await page.getByRole('button',{name:a.publish,exact:true}).click();
  await expect(page.getByText(a.draftConflict,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:a.loadLatestDraft,exact:true}).click();
  await expect(page.getByText('Edited on another device.',{exact:true})).toBeVisible();
  await expect(page.getByLabel(a.body,{exact:true})).toHaveValue('Local writing to preserve.');
  await page.getByRole('button',{name:a.keepMyDraft,exact:true}).click();
  await page.getByRole('button',{name:a.publish,exact:true}).click();
  await expect(page.locator('form.academic-editor')).toHaveCount(0);
  expect(posted).toMatchObject({revision:2,input:{body:'Local writing to preserve.'}});
});

test('discussion refresh preserves writing and fixed identity when replying',async({page},info)=>{
  const a=messages(info);let posted;
  await page.route('**/api/v1/reviews/compose?*',route=>fulfill(route,{allowed:true,state:'ready',requirements:[],teacher_ids:[],identity:'anonymous',rule_version:'fixture'}));
  await page.route('**/api/v1/reviews/review/actions',route=>fulfill(route,{id:'review',state:'published',revision:1}));
  await page.route('**/api/v1/reviews/review/replies',route=>{posted=route.request().postDataJSON();return fulfill(route,{id:'reply',state:'published',revision:1})});
  await page.goto(`/reviews/review?lang=${info.project.metadata.locale}`);
  const editor=page.locator('form.academic-editor');
  await editor.getByLabel(a.body,{exact:true}).fill('Reply kept while voting.');
  await expect(editor.getByRole('checkbox')).toHaveCount(0);
  await expect(editor.getByText(a.identityFixedAnonymous,{exact:true})).toBeVisible();
  await page.locator('.review-card').first().getByRole('button',{name:new RegExp('^'+a.upvote+' ')}).click();
  await expect(editor.getByLabel(a.body,{exact:true})).toHaveValue('Reply kept while voting.');
  await editor.getByRole('button',{name:a.publish,exact:true}).click();
  await expect(page.getByText(a.published,{exact:true})).toBeVisible();
  expect(posted).toMatchObject({kind:'reply',body:'Reply kept while voting.',signed:false});
});

test('missing enrollment explains the blocked publication and keeps draft access',async({page},info)=>{
  const a=messages(info);
  await page.route('**/api/v1/reviews/compose?*',route=>fulfill(route,{allowed:false,state:'enrollment_required',requirements:[{key:'course_enrollment',state:'missing'}],teacher_ids:[],identity:'choice',rule_version:'fixture'}));
  await page.goto(`/courses/course?lang=${info.project.metadata.locale}`);
  await page.getByRole('button',{name:a.writeReview,exact:true}).click();
  await expect(page.getByText(a.noEnrollmentHint,{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:a.publish,exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:a.saveDraft,exact:true})).toBeEnabled();
});

test('student selects authoritative real name independently and sends no attribute values',async({page},info)=>{
 const a=messages(info);let posted;
 await page.route('**/api/v1/reviews/compose?*',route=>fulfill(route,{allowed:true,state:'ready',requirements:[],teacher_ids:[],identity:'choice',rule_version:'fixture',disclosures:[{key:'real_name',value:'Synthetic Student',required:false},{key:'gender',value:'Synthetic gender',required:false},{key:'department',value:'Synthetic College',required:false}]}));
 await page.route('**/api/v1/reviews',route=>{if(route.request().method()!=='POST')return route.fallback();posted=route.request().postDataJSON();return fulfill(route,{id:'named-student',state:'published',revision:1})});
 await page.goto(`/teachers/teacher-a?lang=${info.project.metadata.locale}`);await page.getByRole('button',{name:a.writeMentor,exact:true}).click();const editor=page.locator('form.academic-editor');
 const name=editor.getByRole('checkbox',{name:new RegExp(a.labels.real_name)});await expect(name).not.toBeChecked();await name.check();await expect(editor.getByRole('checkbox',{name:new RegExp(a.labels.teacher)})).toHaveCount(0);await expect(editor.getByRole('checkbox',{name:new RegExp(a.labels.enrollment)})).toHaveCount(0);
 await editor.getByLabel(a.title,{exact:true}).fill('Student experience');await editor.getByLabel(a.body,{exact:true}).fill('Voluntary real-name comment.');await editor.getByRole('button',{name:a.publish,exact:true}).click();await expect(page.getByText(a.published,{exact:true})).toBeVisible();
 expect(posted.disclosures).toEqual(['real_name']);expect(JSON.stringify(posted)).not.toContain('Synthetic Student');expect(posted.signed).toBe(false);
});

test('own-course teacher reply visibly requires authorized name and teacher badge',async({page},info)=>{
 const a=messages(info);let posted;
 await page.route('**/api/v1/reviews/compose?*',route=>fulfill(route,{allowed:true,state:'ready',requirements:[],teacher_ids:[],identity:'anonymous',rule_version:'fixture',teacher_reply:true,disclosures:[{key:'real_name',value:'Synthetic Teacher',required:true},{key:'teacher',value:'verified',required:true},{key:'organization',value:'Synthetic Faculty',required:false}]}));
 await page.route('**/api/v1/reviews/review/replies',route=>{posted=route.request().postDataJSON();return fulfill(route,{id:'teacher-reply',state:'published',revision:1})});
 await page.goto(`/reviews/review?lang=${info.project.metadata.locale}`);const editor=page.locator('form.academic-editor');await expect(editor.getByText(a.teacherRequired,{exact:true})).toBeVisible();
 for(const key of ['real_name','teacher']){const box=editor.getByRole('checkbox',{name:new RegExp(a.labels[key])});await expect(box).toBeChecked();await expect(box).toBeDisabled()}
 await editor.getByLabel(a.body,{exact:true}).fill('Response from the verified teacher.');await editor.getByRole('button',{name:a.publish,exact:true}).click();await expect(page.getByText(a.published,{exact:true})).toBeVisible();expect(posted.disclosures.sort()).toEqual(['real_name','teacher']);expect(JSON.stringify(posted)).not.toContain('Synthetic Teacher');
});

test('teacher replying elsewhere can disclose only the verification badge',async({page},info)=>{
 const a=messages(info);let posted;
 await page.route('**/api/v1/reviews/compose?*',route=>fulfill(route,{allowed:true,state:'ready',requirements:[],teacher_ids:[],identity:'choice',rule_version:'fixture',teacher_reply:false,disclosures:[{key:'real_name',value:'Synthetic Teacher',required:false},{key:'teacher',value:'verified',required:false},{key:'organization',value:'Synthetic Faculty',required:false}]}));
 await page.route('**/api/v1/reviews/review/replies',route=>{posted=route.request().postDataJSON();return fulfill(route,{id:'teacher-reply',state:'published',revision:1})});
 await page.goto(`/reviews/review?lang=${info.project.metadata.locale}`);const editor=page.locator('form.academic-editor');await editor.getByRole('checkbox',{name:new RegExp(a.labels.teacher)}).check();await expect(editor.getByRole('checkbox',{name:new RegExp(a.labels.real_name)})).not.toBeChecked();await editor.getByLabel(a.body,{exact:true}).fill('Reply with badge only.');await editor.getByRole('button',{name:a.publish,exact:true}).click();await expect(page.getByText(a.published,{exact:true})).toBeVisible();expect(posted.disclosures).toEqual(['teacher']);
});

test('author can request reconsideration of an eligible decision',async({page},info)=>{
 const a=messages(info);let posted;
 const task={id:'handled',school_id:'school',can_appeal:true,submission:{object_id:'review',kind:'delete_request',reason:'Author request',evidence:[]},object_revision:1,revision:2,state:'applied',created_at:'2026-10-28T00:00:00Z',updated_at:'2026-10-28T00:00:00Z',decision:{id:'decision',object_id:'review',revision:1,action:'dismiss',reason:'Previous decision'}};
 await page.route('**/api/v1/moderation/tasks*',route=>{if(route.request().method()==='GET')return fulfill(route,[task]);posted=route.request().postDataJSON();return fulfill(route,{...task,id:'appeal',state:'waiting',can_appeal:false,submission:posted})});
 await page.goto(`/community/me?tab=reports&lang=${info.project.metadata.locale}`);await page.getByRole('button',{name:a.appeal,exact:true}).click();await page.getByLabel(a.reason,{exact:true}).fill('Additional evidence for reconsideration.');await page.getByRole('button',{name:a.confirm,exact:true}).click();await expect(page.locator('form.academic-editor')).toHaveCount(0);expect(posted).toMatchObject({kind:'appeal',previous_task_id:'handled',object_id:'review'});
});
