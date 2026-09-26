import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
// Pass the path to a separately installed PGlite module; no production connection.
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
process.on('uncaughtException', error => { console.error(error.message, error.where || ''); process.exit(1); });
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
await db.exec(fs.readFileSync('tests/moment-notifications-schema.sql', 'utf8'));
await db.exec(`alter table notifications alter column id set default gen_random_uuid();
alter table notifications alter column created_at set default now();
create function social_notifications_enabled(target_user uuid) returns boolean language sql as $$ select coalesce((select notify_social from user_preferences where user_id=target_user),true) $$;`);
await db.exec(fs.readFileSync('supabase/migrations/20260925182228_moment_notification_destinations.sql', 'utf8'));
await db.exec(`create trigger test_moment after insert on stories for each row execute function notify_followers_new_story();
create trigger test_comment after insert on comments for each row execute function notify_new_comment();
create trigger test_reaction after insert on reactions for each row execute function notify_new_reaction();
create trigger test_comment_reaction after insert on comment_reactions for each row execute function notify_comment_reaction();`);
const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002';
const m='00000000-0000-4000-8000-000000000010', post='00000000-0000-4000-8000-000000000020', comment='00000000-0000-4000-8000-000000000030';
await db.exec(`insert into profiles(id,full_name,username) values('${a}','Author','author'),('${b}','Viewer','viewer');
insert into follows(id,follower_id,following_id) values(gen_random_uuid(),'${b}','${a}');
insert into stories(id,author_id,story_type,text_body,created_at,expires_at) values('${m}','${a}','text','Moment',now(),now()+interval '1 day');
insert into story_interactions(id,story_id,user_id,kind,body) values(gen_random_uuid(),'${m}','${b}','reply','A reply');
insert into posts(id,author_id) values('${post}','${a}');
insert into comments(id,post_id,author_id,content) values('${comment}','${post}','${b}','Comment');
insert into reactions(id,post_id,user_id,type) values(gen_random_uuid(),'${post}','${b}','like');
insert into comment_reactions(id,comment_id,user_id,type) values(gen_random_uuid(),'${comment}','${a}','like');`);
let rows=(await db.query('select * from notifications')).rows;
assert.equal(rows.find(n=>n.type==='new_moment').link, '/moments/'+m);
assert.equal(rows.find(n=>n.type==='new_moment').actor_id,a);
assert.match(rows.find(n=>n.type==='moment_reply').link,/\?interaction=/);
assert.equal(rows.find(n=>n.type==='new_comment').link,`/post/${post}?comment=${comment}`);
assert.equal(rows.find(n=>n.type==='comment_reaction').link,`/post/${post}?comment=${comment}`);
assert.equal(rows.find(n=>n.type==='post_reaction').actor_id,b);
await db.exec(`select set_config('request.jwt.claim.sub','${b}',false);set role authenticated;select public.refresh_opportunity_notifications();select public.refresh_opportunity_notifications();reset role;`);
assert.equal((await db.query("select * from notifications where type='profile_opportunity_setup'")).rows.length,1);
await db.exec(`update profiles set skills=array['Design'],profession='Designer',goal_categories=array['jobs'],country='Nigeria' where id='${b}';
insert into job_postings(id,title,description,requirements,status,location,posted_by,created_at) values
(gen_random_uuid(),'Design role','Design team',array['Design'],'open','Nigeria','${a}',now()),
(gen_random_uuid(),'Design expired','Design',array['Design'],'closed','Nigeria','${a}',now()),
(gen_random_uuid(),'Unrelated role','Nursing',array['Nursing'],'open','Nigeria','${a}',now()),
(gen_random_uuid(),'Design overseas','Design',array['Design'],'open','Canada','${a}',now());
insert into job_postings(id,title,description,status,location,posted_by,created_at,closes_at)
values(gen_random_uuid(),'Design deadline passed','Design','open','Nigeria','${a}',now(),now()-interval '1 day');
set role authenticated;select public.refresh_opportunity_notifications();select public.refresh_opportunity_notifications();reset role;`);
rows=(await db.query("select * from notifications where type='opportunity_match'")).rows;
assert.equal(rows.length,1);assert.match(rows[0].title,/Design role/);
await db.exec(`delete from notifications where type='opportunity_match';insert into user_preferences(user_id,notify_opportunity_matches) values('${b}',false);
set role authenticated;select public.refresh_opportunity_notifications();reset role;`);
assert.equal((await db.query("select * from notifications where type='opportunity_match'")).rows.length,0);
await db.exec(`update user_preferences set notify_opportunity_matches=true where user_id='${b}';
insert into job_postings(id,title,description,status,location,posted_by,created_at)
select gen_random_uuid(),'Design choice '||i,'Design','open','Nigeria','${a}',now() from generate_series(1,4) i;
set role authenticated;select public.refresh_opportunity_notifications();select public.refresh_opportunity_notifications();reset role;`);
assert.equal((await db.query("select * from notifications where type='opportunity_match'")).rows.length,2);
const org='00000000-0000-4000-8000-000000000099';
await db.exec(`insert into organizations(id,name) values('${org}','Test organization');
insert into organization_follows(organization_id,user_id) values('${org}','${b}');
insert into stories(id,author_id,organization_id,story_type,text_body,created_at,expires_at)
values(gen_random_uuid(),'${a}','${org}','text','Organization Moment',now(),now()+interval '1 day');`);
assert.equal((await db.query(`select * from notifications where actor_organization_id='${org}'`)).rows.length,1);
await db.exec('set role anon');
await assert.rejects(db.query('select public.refresh_opportunity_notifications()'),/permission denied/);
await db.exec('reset role');
console.log('PASS: migration syntax, exact Moment/comment/reaction destinations, actor identity, reminder deduplication, profile matching, location/deadline filtering, rate limit, opt-out, anonymous denial.');
await db.close();
