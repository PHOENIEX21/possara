// Run after browser-fixture.js; every API request is intercepted.
(async () => {
  const base = window.fetch;
  const { useAuth } = await import('/src/store/auth.ts');
  const savedId = '00000000-0000-4000-8000-000000000777';
  const matchId = '00000000-0000-4000-8000-000000000888';
  window.__nextStepCase = 'deadline';
  window.fetch = async (input, options = {}) => {
    const url = String(input);
    let data;
    if (url.includes('/rpc/get_my_profile')) data = { id: useAuth.getState().userId, full_name: 'Test Member', skills: ['Design'], goal_categories: ['jobs'], country: 'Nigeria' };
    else if (url.includes('/saves?')) data = window.__nextStepCase === 'deadline' ? [{ opportunity_id: savedId }] : [];
    else if (url.includes('/notifications?') && url.includes('opportunity_match')) data = [{ link: '/opportunities/' + matchId }];
    else if (url.includes('/opportunities?')) {
      const isSaved = url.includes(savedId);
      data = [{ id: isSaved ? savedId : matchId, title: isSaved ? 'Your saved design scholarship' : 'A design opportunity for you', status: window.__nextStepCase === 'closed' ? 'closed' : 'active', deadline: new Date(Date.now() + 2 * 86400000).toISOString() }];
    } else return base(input, options);
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  };
  let sequence = 900;
  window.__nextStepScenario = scenario => {
    window.__nextStepCase = scenario;
    const id = '00000000-0000-4000-8000-' + String(++sequence).padStart(12, '0');
    localStorage.removeItem(`possara:next-step:v1:${id}`);
    useAuth.setState({ userId: id, loading: false, emailVerified: true });
    window.__go('/');
  };
  window.__nextStepScenario('deadline');
  return 'Next-step fixture ready';
})()
