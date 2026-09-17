import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.role() returns text language sql stable as $$ select current_user::text $$; grant usage on schema auth,public to anon,authenticated,service_role; create schema storage; create table storage.buckets(id text primary key,name text,public boolean); create table storage.objects(id uuid,bucket_id text,name text);`);
for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()) {
  try { await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8')); } catch(error) { console.error('Migration failed:',file,error.message); throw error; }
}
const owner='11111111-1111-4111-8111-111111111111', developer='22222222-2222-4222-8222-222222222222', submission='33333333-3333-4333-8333-333333333333';
const game='77777777-7777-4777-8777-777777777777', provider='88888888-8888-4888-8888-888888888888', policy='99999999-9999-4999-8999-999999999999', nextBuild='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
await db.exec(`insert into auth.users values('${owner}'),('${developer}'); insert into public.admins(id,email,role) values('${owner}','test@example.invalid','owner'); insert into public.developer_profiles(id,studio_name) values('${developer}','Test studio'); insert into public.game_submissions(id,owner_id,title,slug,full_description) values('${submission}','${developer}','Game','test-game','Test game');`);
let count=0;
async function rejected(sql, pattern) { await assert.rejects(db.exec(sql),pattern); count++; }
await db.exec(`set role authenticated; set request.jwt.claim.sub='${developer}';`);
await rejected(`update public.game_submissions set status='approved' where id='${submission}'`,/permission denied/);
await rejected(`insert into public.developer_game_builds(submission_id,owner_id,verification_status) values('${submission}','${developer}','verified')`,/permission denied/);
await rejected(`insert into public.game_media(submission_id,owner_id,role,object_key,public_url,file_name,content_type,size_bytes,sha256,verified_at) values('${submission}','${developer}','cover','fake','https://fake.invalid','fake.png','image/png',1,repeat('a',64),now())`,/permission denied/);
await rejected(`select public.review_developer_submission('${submission}','approved',null,null,'{"load":true,"controls":true,"responsive":true,"content":true,"monetization":true}')`,/Reviewer access is required/);
await rejected(`select public.record_sdk_events('test-game','55555555-5555-4555-8555-555555555555','[{"event":"sdk_init"}]')`,/permission denied/);
assert.equal((await db.query(`select count(*)::int as count from public.build_security_scans`)).rows[0].count,0); count++;
await db.exec(`reset role; set request.jwt.claim.sub=''; insert into public.developer_game_builds(id,submission_id,owner_id,verification_status,preview_url,created_at) values('44444444-4444-4444-8444-444444444444','${submission}','${developer}','verified','https://games.example.invalid/index.html',now()),('${nextBuild}','${submission}','${developer}','verified','https://games.example.invalid/v2.html',now()-interval '1 day'); update public.game_submissions set build_verified=true where id='${submission}';`);
await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
await rejected(`select public.review_developer_submission('${submission}','approved',null,null,'{"load":true,"controls":true,"responsive":true,"content":true,"monetization":true}')`,/security scan is required/i);
await db.exec(`reset role; insert into public.build_security_scans(build_id,status,findings,scanner_version) values('44444444-4444-4444-8444-444444444444','flagged','[{"path":"index.html","code":"popup"}]','test'); set role authenticated; set request.jwt.claim.sub='${owner}';`);
await rejected(`select public.review_developer_submission('${submission}','approved',null,null,'{"load":true,"controls":true,"responsive":true,"content":true,"monetization":true}')`,/manual resolution/i);
await db.exec(`select public.review_developer_submission('${submission}','approved',null,'Reviewed popup call and confirmed it is unreachable in the submitted build.','{"load":true,"controls":true,"responsive":true,"content":true,"monetization":true}')`); count++;
await db.exec(`reset role; insert into public.games(title,slug,description,status) values('Legacy game','legacy-game','Existing game','published'); set role authenticated; set request.jwt.claim.sub='${developer}';`);
assert.equal((await db.query(`select count(*)::int as count from public.build_security_scans`)).rows[0].count,0); count++;
await rejected(`update public.developer_game_builds set verification_status='failed' where id='44444444-4444-4444-8444-444444444444'`,/permission denied/);
await rejected(`insert into public.build_security_scans(build_id,status,scanner_version) values('44444444-4444-4444-8444-444444444444','approved','fake')`,/permission denied/);
await db.exec(`reset role; set role service_role;`);
await rejected(`select public.record_sdk_events('legacy-game','55555555-5555-4555-8555-555555555555','[{"event":"forged_revenue"}]')`,/Invalid event payload/);
await db.exec(`reset role`);
assert.equal((await db.query(`select monetization_mode from public.games where slug='legacy-game'`)).rows[0].monetization_mode,'none'); count++;

// Phase 2A starts empty and disabled, and does not alter legacy monetization.
const defaults=(await db.query(`select ads_enabled,interstitial_enabled,rewarded_enabled,rollout_percent from public.ad_platform_settings where id=true`)).rows[0];
assert.deepEqual(defaults,{ads_enabled:false,interstitial_enabled:false,rewarded_enabled:false,rollout_percent:0}); count++;
assert.equal((await db.query(`select count(*)::int as count from public.ad_providers`)).rows[0].count,0); count++;
const adTables=['ad_platform_settings','ad_providers','ad_frequency_policies','ad_placements','ad_rollout_rules','ad_requests','ad_provider_events','ad_outcomes','ad_reward_redemptions','ad_impressions','ad_report_imports','ad_report_rows','ad_reconciliation','revenue_ledger','revenue_allocations','ad_consent_audit'];
assert.equal((await db.query(`select count(*)::int as count from pg_class where relnamespace='public'::regnamespace and relname=any(array[${adTables.map(name=>`'${name}'`).join(',')}]) and relrowsecurity`)).rows[0].count,adTables.length); count++;

// A reviewed publication can register exact-build placements, but never enables them.
await db.exec(`
  insert into public.games(id,title,slug,description,status,iframe_url,build_id,monetization_mode)
    values('${game}','Ad test game','ad-test-game','Test','published','https://games.example.invalid/index.html','44444444-4444-4444-8444-444444444444','uniblex_ads');
  insert into public.submission_reviews(submission_id,reviewer_id,decision,checklist)
    values('${submission}','${owner}','published','{"monetization":true}');
  update public.game_submissions set game_id='${game}',status='published',monetization='{"mode":"uniblex_ads","placements":[{"token":"level_complete","format":"rewarded","trigger":"After a level"}]}' where id='${submission}';
`);
const placement=(await db.query(`select id,approval_state,enabled,provider_id,frequency_policy_id,rollout_percent,allowed_frame_origin from public.ad_placements where game_id='${game}'`)).rows[0];
assert.equal(placement.approval_state,'approved');assert.equal(placement.enabled,false);assert.equal(placement.provider_id,null);assert.equal(placement.frequency_policy_id,null);assert.equal(placement.rollout_percent,0);assert.equal(placement.allowed_frame_origin,'https://games.example.invalid');count++;

await db.exec(`set role authenticated; set request.jwt.claim.sub='${developer}';`);
assert.equal((await db.query(`select count(*)::int as count from public.ad_placements`)).rows[0].count,0); count++;
await rejected(`select public.issue_ad_request_ticket('ad-test-game','test-provider','rewarded','level_complete','https://games.example.invalid','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','request1',repeat('a',64),repeat('b',64),'allowed','unknown','none','host',null)`,/permission denied/);
await rejected(`insert into public.revenue_ledger(provider_id,report_row_id,game_id,build_id,developer_id,entry_kind,currency,amount_minor,source_version,occurred_on) values('${provider}',1,'${game}','44444444-4444-4444-8444-444444444444','${developer}','gross','USD',1,'fake',current_date)`,/permission denied/);
await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${owner}';`);
await rejected(`select * from public.ad_requests`,/permission denied/);

await db.exec(`reset role; set role service_role; set request.jwt.claim.sub='';`);
async function issue(sessionId,clientId,ticketChar,audienceChar='a') {
  return (await db.query(`select public.issue_ad_request_ticket('ad-test-game','test-provider','rewarded','level_complete','https://games.example.invalid','${sessionId}','${clientId}',repeat('${audienceChar}',64),repeat('${ticketChar}',64),'allowed','unknown','none','host',null) as result`)).rows[0].result;
}
let decision=await issue('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','request1','b');
assert.equal(decision.eligible,false);assert.equal(decision.reason,'platform_disabled');count++;
await db.exec(`
  insert into public.ad_providers(id,provider_key,display_name,enabled,interstitial_enabled,rewarded_enabled,supports_limited_ads,health_status,rollout_percent)
    values('${provider}','test-provider','TEST ONLY',true,true,true,true,'healthy',100);
  insert into public.ad_frequency_policies(id,policy_key,enabled,window_seconds,max_per_game_window,max_per_audience_window,max_per_session_window,max_per_format_window,max_per_placement_window,concurrent_limit,failure_backoff_seconds,no_fill_backoff_seconds,max_ad_duration_seconds)
    values('${policy}','test-policy',true,3600,100,100,100,100,100,1,30,30,120);
  update public.ad_placements set provider_id='${provider}',frequency_policy_id='${policy}',enabled=true,rollout_percent=100 where id='${placement.id}';
  update public.ad_platform_settings set ads_enabled=true,interstitial_enabled=true,rewarded_enabled=true,rollout_percent=100 where id=true;
`);

decision=await issue('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','request1','b');
assert.equal(decision.eligible,false);assert.equal(decision.reason,'rollout_disabled');count++;
await db.exec(`insert into public.ad_rollout_rules(provider_id,game_id,build_id,format,enabled,rollout_percent)
  values('${provider}','${game}','44444444-4444-4444-8444-444444444444','rewarded',true,100)`);
const maliciousPlacement=(await db.query(`select public.issue_ad_request_ticket('ad-test-game','test-provider','rewarded','../escape','https://games.example.invalid','abababab-abab-4bab-8bab-abababababab','bad-placement',repeat('7',64),repeat('7',64),'allowed','unknown','none','host',null) as result`)).rows[0].result;
assert.equal(maliciousPlacement.reason,'invalid_request');count++;
const wrongOrigin=(await db.query(`select public.issue_ad_request_ticket('ad-test-game','test-provider','rewarded','level_complete','https://evil.example.invalid','acacacac-acac-4cac-8cac-acacacacacac','wrong-origin',repeat('8',64),repeat('8',64),'allowed','unknown','none','host',null) as result`)).rows[0].result;
assert.equal(wrongOrigin.reason,'placement_unapproved');count++;
const inactive=await issue('adadadad-adad-4dad-8dad-adadadadadad','inactive-callback','9','9');
const earlyCallback=(await db.query(`select public.record_verified_ad_provider_event('test-provider','${inactive.request_id}','event-early','completed','completed','completion-early',now(),null,repeat('9',64),'{}') as result`)).rows[0].result;
assert.equal(earlyCallback.reason,'request_inactive');await db.exec(`update public.ad_requests set status='cancelled' where id='${inactive.request_id}'`);count++;
decision=await issue('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','request1','b');
assert.equal(decision.eligible,true);const requestId=decision.request_id;count++;
let consume=(await db.query(`select public.consume_ad_request_ticket('ad-test-game','${requestId}',repeat('c',64),'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','request1','level_complete','rewarded','https://games.example.invalid',repeat('a',64)) as result`)).rows[0].result;
assert.equal(consume.reason,'ticket_invalid'); count++;
consume=(await db.query(`select public.consume_ad_request_ticket('legacy-game','${requestId}',repeat('b',64),'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','request1','level_complete','rewarded','https://games.example.invalid',repeat('a',64)) as result`)).rows[0].result;
assert.equal(consume.reason,'ticket_binding_mismatch'); count++;
consume=(await db.query(`select public.consume_ad_request_ticket('ad-test-game','${requestId}',repeat('b',64),'aaaaaaaa-bbbb-4bbb-8bbb-bbbbbbbbbbbb','request1','level_complete','rewarded','https://games.example.invalid',repeat('a',64)) as result`)).rows[0].result;
assert.equal(consume.reason,'ticket_binding_mismatch'); count++;
consume=(await db.query(`select public.consume_ad_request_ticket('ad-test-game','${requestId}',repeat('b',64),'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','request1','level_complete','rewarded','https://games.example.invalid',repeat('a',64)) as result`)).rows[0].result;
assert.equal(consume.consumed,true); count++;
assert.equal(((await db.query(`select public.consume_ad_request_ticket('ad-test-game','${requestId}',repeat('b',64),'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','request1','level_complete','rewarded','https://games.example.invalid',repeat('a',64)) as result`)).rows[0].result).reason,'ticket_replayed'); count++;
let redemption=(await db.query(`select public.redeem_ad_reward('ad-test-game','${requestId}','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','request1','completion-1',repeat('a',64)) as result`)).rows[0].result;
assert.equal(redemption.reason,'completion_unverified'); count++;
const callback=(await db.query(`select public.record_verified_ad_provider_event('test-provider','${requestId}','event-1','completed','completed','completion-1',now(),null,repeat('d',64),'{}') as result`)).rows[0].result;
assert.equal(callback.accepted,true);assert.equal(callback.duplicate,false); count++;
const duplicate=(await db.query(`select public.record_verified_ad_provider_event('test-provider','${requestId}','event-1','completed','completed','completion-1',now(),null,repeat('d',64),'{}') as result`)).rows[0].result;
assert.equal(duplicate.accepted,true);assert.equal(duplicate.duplicate,true); count++;
const conflict=(await db.query(`select public.record_verified_ad_provider_event('test-provider','${requestId}','event-1','completed','completed','completion-1',now(),null,repeat('e',64),'{"changed":true}') as result`)).rows[0].result;
assert.equal(conflict.accepted,false);assert.equal(conflict.reason,'provider_event_conflict'); count++;
const completionConflict=(await db.query(`select public.record_verified_ad_provider_event('test-provider','${requestId}','event-2','completed','completed','completion-1',now(),null,repeat('f',64),'{}') as result`)).rows[0].result;
assert.equal(completionConflict.accepted,false);assert.equal(completionConflict.reason,'provider_event_conflict'); count++;
const invalidCorrelation=(await db.query(`select public.record_verified_ad_provider_event('test-provider','${requestId}','event-invalid','failed','completed','completion-invalid',now(),null,repeat('1',64),'{}') as result`)).rows[0].result;
assert.equal(invalidCorrelation.accepted,false);assert.equal(invalidCorrelation.reason,'verified_event_invalid'); count++;
redemption=(await db.query(`select public.redeem_ad_reward('ad-test-game','${requestId}','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','request1','completion-1',repeat('a',64)) as result`)).rows[0].result;
assert.equal(redemption.redeemed,true); count++;
assert.equal(((await db.query(`select public.redeem_ad_reward('ad-test-game','${requestId}','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','request1','completion-1',repeat('a',64)) as result`)).rows[0].result).reason,'request_not_consumed'); count++;
await rejected(`update public.ad_provider_events set payload='{"changed":true}' where provider_event_id='event-1'`,/append-only/);
await rejected(`update public.ad_consent_audit set source='user' where request_id='${requestId}'`,/append-only/);

// Cross-build, expiration, simultaneous-tab, cap, backoff, and kill-switch checks.
const crossBuild=await issue('cccccccc-cccc-4ccc-8ccc-cccccccccccc','crossbuild','e','e');
await db.exec(`reset role; update public.games set build_id='${nextBuild}' where id='${game}'; set role service_role`);
assert.equal(((await db.query(`select public.consume_ad_request_ticket('ad-test-game','${crossBuild.request_id}',repeat('e',64),'cccccccc-cccc-4ccc-8ccc-cccccccccccc','crossbuild','level_complete','rewarded','https://games.example.invalid',repeat('e',64)) as result`)).rows[0].result).reason,'ticket_binding_mismatch');count++;
await db.exec(`reset role; update public.games set build_id='44444444-4444-4444-8444-444444444444' where id='${game}'; set role service_role; update public.ad_requests set status='cancelled' where id='${crossBuild.request_id}'`);
const expired=await issue('dddddddd-dddd-4ddd-8ddd-dddddddddddd','expired','f','f');
await db.exec(`update public.ad_requests set created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where id='${expired.request_id}'`);
assert.equal(((await db.query(`select public.consume_ad_request_ticket('ad-test-game','${expired.request_id}',repeat('f',64),'dddddddd-dddd-4ddd-8ddd-dddddddddddd','expired','level_complete','rewarded','https://games.example.invalid',repeat('f',64)) as result`)).rows[0].result).reason,'ticket_expired');count++;
const tabOne=await issue('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','tab-one','1','1');assert.equal(tabOne.eligible,true);
const tabTwo=await issue('ffffffff-ffff-4fff-8fff-ffffffffffff','tab-two','2','1');assert.equal(tabTwo.reason,'concurrent_request');count++;
await db.exec(`update public.ad_requests set status='cancelled' where id='${tabOne.request_id}'`);
await db.exec(`update public.ad_frequency_policies set max_per_audience_window=1 where id='${policy}'`);
assert.equal((await issue('12121212-1212-4212-8212-121212121212','cap-test','3','1')).reason,'frequency_limited');count++;
await db.exec(`update public.ad_frequency_policies set max_per_audience_window=100 where id='${policy}'`);
const backoff=await issue('13131313-1313-4313-8313-131313131313','backoff','4','4');
await db.exec(`update public.ad_requests set status='cancelled' where id='${backoff.request_id}'; insert into public.ad_outcomes(request_id,status,trust_level,occurred_at) values('${backoff.request_id}','unavailable','server_verified',now())`);
assert.equal((await issue('14141414-1414-4414-8414-141414141414','backoff-next','5','4')).reason,'provider_backoff');count++;
const kill=await issue('15151515-1515-4515-8515-151515151515','kill-switch','6','6');
await db.exec(`update public.ad_platform_settings set ads_enabled=false where id=true`);
assert.equal(((await db.query(`select public.consume_ad_request_ticket('ad-test-game','${kill.request_id}',repeat('6',64),'15151515-1515-4515-8515-151515151515','kill-switch','level_complete','rewarded','https://games.example.invalid',repeat('6',64)) as result`)).rows[0].result).reason,'ads_disabled');count++;
assert.equal((await db.query(`select count(*)::int as count from public.revenue_ledger`)).rows[0].count,0);assert.equal((await db.query(`select count(*)::int as count from public.revenue_allocations`)).rows[0].count,0);count++;
await db.close();
console.log(`${count} database authorization checks passed`);
