// Run after browser-fixture.js. All traffic stays intercepted.
(async () => {
  const { uid, other } = window.__fixture;
  const base = window.fetch;
  const moment = id => ({ id, author_id: other, story_type: 'text', text_body: id === 'moment-two' ? 'The exact second Moment' : 'First Moment', background_style: 'midnight', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString() });
  const profile = { id: other, full_name: 'Moment Author', username: 'moment_author', skills: [], goal_categories: [], interests: [] };
  const notifications = [{ id: 'notice', user_id: uid, title: 'Moment Author added a Moment', actor_name: 'Moment Author', actor_id: other, type: 'new_moment', link: '/moments/moment-two', created_at: new Date().toISOString(), read: true }];
  window.fetch = async (input, options = {}) => {
    const url = String(input), method = options.method || 'GET';
    let data;
    if (url.includes('/notifications')) data = notifications;
    else if (url.includes('/rpc/get_public_profile')) data = profile;
    else if (url.includes('/rpc/get_my_profile')) data = { ...profile, id: uid };
    else if (url.includes('/stories')) data = [moment('moment-one'), moment('moment-two')];
    else if (url.includes('/profiles')) data = [profile];
    else if (url.includes('/story_views')) {
      const views = JSON.parse(sessionStorage.getItem('moment-test-views') || '[]');
      if (method === 'POST') { views.push(JSON.parse(options.body)); sessionStorage.setItem('moment-test-views', JSON.stringify(views)); }
      data = views;
    } else if (url.includes('/story_interactions')) data = [{ id: 'reply-one', story_id: 'moment-two', user_id: uid, kind: 'reply', body: 'Exact reply', profile: { full_name: 'Reply Author' } }];
    else if (url.includes('/comments')) data = [{ id: 'comment-target', post_id: 'post-one', author_id: other, content: 'The exact comment', profiles: profile, created_at: new Date().toISOString() }];
    else if (url.includes('/posts')) data = [{ id: 'post-one', author_id: other, content: 'Notification post', status: 'published', type: 'general', created_at: new Date().toISOString(), profiles: profile }];
    else return base(input, options);
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  };
  window.__go('/notifications');
  return 'Moment notification fixture ready';
})()
