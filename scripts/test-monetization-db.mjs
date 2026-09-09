import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.role() returns text language sql stable as $$ select current_user::text $$; grant usage on schema auth,public to anon,authenticated,service_role; create schema storage; create table storage.buckets(id text primary key,name text,public boolean); create table storage.objects(id uuid,bucket_id text,name text);`);
for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()) {
  try { await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8')); } catch(error) { console.error('Migration failed:',file,error.message); throw error; }
}
const owner='11111111-1111-4111-8111-111111111111', developer='22222222-2222-4222-8222-222222222222', submission='33333333-3333-4333-8333-333333333333';
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
await db.exec(`reset role; set request.jwt.claim.sub=''; insert into public.developer_game_builds(id,submission_id,owner_id,verification_status,preview_url) values('44444444-4444-4444-8444-444444444444','${submission}','${developer}','verified','https://games.example.invalid/index.html'); update public.game_submissions set build_verified=true where id='${submission}';`);
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
await db.close();
console.log(`${count} database authorization checks passed`);
