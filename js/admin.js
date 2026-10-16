// Same Supabase project as the plugin. Publishable key only; never put a service-role key here.
  const SUPABASE_URL = 'https://hwoxtnctdaarmzjlhsws.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Tq6q2R6_aaD27e9iK_0zHg_JELvKMXB';
  const db = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = d => d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'None yet';
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const parseEmails = s => [...new Set(s.split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(Boolean))];
  const rand = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const sha = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const base = () => location.protocol === 'file:' ? location.href.split(/[?#]/)[0] : location.origin + location.pathname;
  const store = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} } };
  const LINK_NOTE = 'Each person is emailed their link automatically. If an email does not arrive, use "Send link" to send it from your own email app, or copy the link. A link only works for the email address it was created for, and expires after 7 days.';
  const EMPTY = 'No sessions recorded yet. Sessions appear here when team members track time in the plugin.';
  const P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    folder: '<path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 010 7M18 14.5c2.2.6 3.5 2.4 3.5 5.5"/>'
  };
  const ic = n => '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[n] + '</svg>';
  const NAV = [['General', 'grid', [['home', 'Home']]], ['Work Space', 'folder', [['team', 'Team'], ['projects', 'Projects']]], ['Analytics', 'chart', [['reports', 'Reports']]]];

  let me = null, myName = '', adminTeams = [], team = null, view = 'home';
  let members = [], invs = [], projects = [], sessions = [], names = {}, dashLinks = null, dashErr = '', dashBusy = false, projBusy = false, projErr = '', draft = { name: '', desc: '', start: '', target: '' };
  let ob = { step: 'email', email: '', password: '', name: '', ws: '', purpose: 'Work', err: '', busy: false, links: null, title: '', notice: '' };
  const urlToken = new URLSearchParams(location.search).get('invite');
  if (urlToken) store.set('orello-pending-invite', urlToken);
  const pending = () => store.get('orello-pending-invite');

  // ---------- Sign up, sign in, workspace setup, invites (mirrors the Figma onboarding) ----------
  function showAuth() { $('app').hidden = true; $('auth').hidden = false; renderAuth(); }
  function showApp() { $('auth').hidden = true; $('app').hidden = false; }

  function mailto(r) {
    const body = 'Hi,\n\nYou have been invited to join ' + team.name + ' on Orello. Open this link and create your account (or sign in) with this email address: ' + r.email + '\n\n' + r.link +
      '\n\nThen open the Orello plugin in Figma and sign in to start tracking.\n\nThe link expires in 7 days.';
    return 'mailto:' + encodeURIComponent(r.email) + '?subject=' + encodeURIComponent('Join ' + team.name + ' on Orello') + '&body=' + encodeURIComponent(body);
  }
  function linksHtml(ls) {
    return ls.map(r => r.error ? '<div class="res bad">' + esc(r.email) + ': ' + esc(r.error) + '</div>'
      : '<div class="res">' + esc(r.email) + (r.emailed ? '<p class="msg">Email sent.</p>' : '<p class="msg error">The email was not sent: ' + esc(r.mailError) + ' Use Send link or Copy link instead.</p>') + '<div class="linkrow"><input readonly value="' + esc(r.link) + '" aria-label="Invitation link for ' + esc(r.email) + '"><button type="button" data-copy>Copy link</button></div>' +
        '<a class="btn" href="' + esc(mailto(r)) + '">Send link</a></div>').join('');
  }

  function renderAuth() {
    const o = ob, dis = o.busy ? ' disabled' : '', joining = !!pending();
    const err = o.err ? '<p class="msg error" role="alert">' + esc(o.err) + '</p>' : '';
    const wrap = (t, sub, help, inner) => '<h1>' + t + '</h1><div class="sub">' + sub + '</div>' + (help ? '<p class="help">' + help + '</p>' : '') + inner + err;
    const field = (id, label, type, ph, val, extra) => '<label for="' + id + '">' + label + '</label><input id="' + id + '" name="' + id + '" type="' + type + '" placeholder="' + ph + '" value="' + esc(val) + '" ' + (extra || '') + '>';
    let h;
    if (o.step === 'name') h = wrap('Getting started', 'Track productivity, enhance collaboration', 'Your team members will see your name.',
      '<form data-s="name">' + field('name', 'Name', 'text', 'Enter your name', o.name, 'maxlength="100" autocomplete="name"') + '<button class="primary" type="submit"' + dis + '>' + (o.busy ? 'Creating...' : 'Continue') + '</button></form>');
    else if (o.step === 'signin') h = wrap('Log in to your account', 'Specifically tailored for design teams', joining ? 'Sign in with the email address your invitation was sent to.' : '',
      '<form data-s="signin">' + field('email', 'Email', 'email', 'Enter your email', o.email, 'required autocomplete="email"') + field('password', 'Password', 'password', 'Enter your password', '', 'required autocomplete="current-password"') +
      '<button class="primary" type="submit"' + dis + '>' + (o.busy ? 'Signing in...' : 'Continue') + '</button></form><div class="toggle">New to Orello? <button data-ob="email">Create an account</button></div>');
    else if (o.step === 'workspace') h = wrap('Set up your workspace', 'Add your team or company name so everyone stays organized.', '',
      '<form data-s="workspace">' + field('ws', 'Workspace name', 'text', 'Enter your workspace name', o.ws, 'maxlength="120"') + '<label>Purpose</label><div class="chips">' +
      ['Work', 'Personal', 'Others'].map(p => '<button type="button" data-purpose="' + p + '" aria-pressed="' + (o.purpose === p) + '">' + p + '</button>').join('') + '</div>' +
      '<button class="primary" type="submit"' + dis + '>' + (o.busy ? 'Creating...' : 'Continue') + '</button></form><p class="help" style="margin-top:14px">Joining someone else\'s team? Open the invitation link they sent you again.</p><button class="link" data-ob="signout">Sign out</button>');
    else if (o.step === 'invite') h = wrap('Invite your teammates', 'Add your teammates to start tracking productivity and collaborating seamlessly', '',
      o.links ? '<p class="help">' + LINK_NOTE + '</p>' + linksHtml(o.links) + '<button class="primary" data-ob="dash" style="margin-top:20px">Go to dashboard</button>'
        : '<form data-s="invite"><label for="emails">Email teammates</label><textarea id="emails" name="emails" placeholder="Enter email addresses (separate multiple emails with commas)"></textarea><button class="primary" type="submit"' + dis + '>' + (o.busy ? 'Sending...' : 'Send invites') + '</button></form><button class="link" data-ob="dash">Skip for now</button>');
    else if (o.step === 'notice') h = wrap(esc(o.title), esc(o.notice), '', '<button class="link" data-ob="signin">Sign in</button> <button class="link" data-ob="signout">Sign out</button>');
    else h = wrap(joining ? 'Join a team' : 'Create an account', joining ? 'Create your account to accept the invitation' : 'Specifically tailored for design teams',
      joining ? 'Use the email address your invitation was sent to.' : 'Use an organizational email or your Figma email to track your team members.',
      '<form data-s="email">' + field('email', 'Email', 'email', 'Enter your organizational email', o.email, 'required autocomplete="email"') + field('password', 'Password', 'password', 'At least 6 characters', '', 'required minlength="6" autocomplete="new-password"') +
      '<button class="primary" type="submit">Continue</button></form><div class="toggle">Already have an account? <button data-ob="signin">Sign in</button></div>');
    $('auth').innerHTML = h;
  }

  $('auth').addEventListener('submit', async e => {
    const f = e.target.closest('form[data-s]'); if (!f) return;
    e.preventDefault();
    const v = n => f.elements[n]?.value ?? '';
    ob.err = '';
    switch (f.dataset.s) {
      case 'email': { const em = v('email').trim().toLowerCase();
        if (!EMAIL_RE.test(em)) ob.err = 'Enter a valid email address.';
        else if (v('password').length < 6) ob.err = 'Use a password of at least 6 characters.';
        else { ob.email = em; ob.password = v('password'); ob.step = 'name'; } break; }
      case 'name': ob.name = v('name').trim(); await signUp(); return;
      case 'signin': ob.email = v('email').trim().toLowerCase(); await signIn(ob.email, v('password')); return;
      case 'workspace': ob.ws = v('ws').trim(); if (!ob.ws) ob.err = 'Enter a workspace name.'; else { await makeTeam(); return; } break;
      case 'invite': await sendInvites(v('emails')); return;
    }
    renderAuth();
  });

  $('auth').addEventListener('click', async e => {
    const p = e.target.closest('[data-purpose]');
    if (p) { const w = $('auth').querySelector('[name=ws]'); if (w) ob.ws = w.value; ob.purpose = p.dataset.purpose; renderAuth(); return; }
    const b = e.target.closest('[data-ob]'); if (!b) return;
    ob.err = '';
    if (b.dataset.ob === 'signout') { await doSignOut(); return; }
    if (b.dataset.ob === 'dash') { await enterApp(); return; }
    ob.step = b.dataset.ob; renderAuth();
  });

  async function signUp() {
    ob.busy = true; renderAuth();
    const { data, error } = await db.auth.signUp({ email: ob.email, password: ob.password, options: { data: ob.name ? { display_name: ob.name } : {}, emailRedirectTo: base() } });
    ob.busy = false; ob.password = '';
    if (error || data.user?.identities?.length === 0) { ob.err = error ? error.message : 'This email already has an account. Sign in instead.'; ob.step = 'email'; renderAuth(); return; }
    if (data.session) { await afterAuth(); return; }
    Object.assign(ob, { step: 'notice', title: 'Check your email', notice: 'We sent a confirmation link to ' + ob.email + '. Confirm your email, then sign in' + (pending() ? ' (open your invitation link again if you land back here).' : '.') });
    renderAuth();
  }

  async function signIn(email, password) {
    ob.busy = true; renderAuth();
    const { error } = await db.auth.signInWithPassword({ email, password });
    ob.busy = false;
    if (error) { ob.err = error.message; ob.step = 'signin'; renderAuth(); return; }
    await afterAuth();
  }

  async function afterAuth() {
    const { data: u } = await db.auth.getUser(); me = u.user;
    let joined = false;
    const tok = pending();
    if (tok) {
      const { error } = await db.rpc('accept_team_invitation', { invitation_token: tok });
      store.set('orello-pending-invite', null); history.replaceState(null, '', location.pathname);
      if (error) { Object.assign(ob, { step: 'notice', title: 'Invitation problem', notice: error.message + '. Ask the person who invited you for a new link, and sign in with the email it was sent to.' }); showAuth(); return; }
      joined = true;
    }
    const { data, error } = await db.from('team_members').select('role, teams(id, name)').eq('user_id', me.id);
    if (error) { Object.assign(ob, { step: 'notice', title: 'Something went wrong', notice: error.message }); showAuth(); return; }
    adminTeams = (data || []).filter(r => r.role !== 'member' && r.teams).map(r => ({ id: r.teams.id, name: r.teams.name }));
    if (adminTeams.length) { team = adminTeams[0]; await enterApp(); return; }
    if ((data || []).length) { Object.assign(ob, { step: 'notice', title: joined ? 'You have joined the team' : 'You are a team member', notice: 'Open Orello in Figma and sign in with ' + me.email + ' to start tracking. The dashboard is for team owners and admins.' }); showAuth(); return; }
    ob.step = 'workspace'; showAuth();
  }

  async function makeTeam() {
    ob.busy = true; renderAuth();
    const { data, error } = await db.rpc('create_team', { team_name: ob.ws });
    if (error) { ob.busy = false; ob.err = error.message; renderAuth(); return; }
    await db.auth.updateUser({ data: { workspace_purpose: ob.purpose } });
    ob.busy = false; team = { id: data.id, name: data.name }; adminTeams = [team]; ob.step = 'invite'; ob.links = null; renderAuth();
  }

  async function createInvites(emails) {
    const out = [];
    for (const email of emails) {
      const t = rand();
      const { data, error } = await db.from('project_invitations').insert({ team_id: team.id, email, role: 'member', invited_by: me.id, token_hash: await sha(t) }).select('id').single();
      if (error) { out.push({ email, error: error.message }); continue; }
      const r = { email, link: base() + '?invite=' + t };
      // The send-invite Edge Function emails the link (it checks that this admin owns the invitation).
      const { error: mailErr } = await db.functions.invoke('send-invite', { body: { invitationId: data.id, token: t } });
      if (mailErr) { let m = ''; try { m = (await mailErr.context.json()).error || ''; } catch (_) {} r.mailError = m || mailErr.message; } else r.emailed = true;
      out.push(r);
    }
    return out;
  }
  const checkEmails = list => !list.length ? 'Enter at least one email address.' : list.some(x => !EMAIL_RE.test(x)) ? 'Check the email addresses: ' + list.filter(x => !EMAIL_RE.test(x)).join(', ') : list.length > 20 ? 'Invite up to 20 people at a time.' : '';

  async function sendInvites(raw) {
    const list = parseEmails(raw), bad = checkEmails(list);
    if (bad) { ob.err = bad; renderAuth(); return; }
    ob.busy = true; renderAuth(); ob.links = await createInvites(list); ob.busy = false; renderAuth();
  }

  async function doSignOut() {
    await db.auth.signOut();
    me = null; team = null; adminTeams = []; dashLinks = null; view = 'home';
    ob = { step: 'signin', email: '', password: '', name: '', ws: '', purpose: 'Work', err: '', busy: false, links: null, title: '', notice: '' };
    showAuth();
  }
  $('signout').addEventListener('click', doSignOut);

  // ---------- Dashboard (owners and admins; everything is limited by Supabase row level security) ----------
  const banner = t => { $('banner').hidden = !t; $('banner').textContent = t || ''; };
  const hrs = s => (s / 3600).toFixed(1);
  const secs = l => l.reduce((a, s) => a + s.duration_seconds, 0);
  const nm = id => names[id] || 'Member ' + String(id).slice(0, 6);
  const head = (icon, title) => '<div class="page-head"><h1>' + ic(icon) + esc(title) + '</h1></div>';
  const stat = (l, v) => '<div class="card"><div class="muted">' + l + '</div><div class="stat-value">' + v + '</div></div>';
  const table = (cols, rows, empty) => '<div class="card table-wrap">' + (rows.length ? '<table><thead><tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table>' : '<div class="empty">' + empty + '</div>') + '</div>';
  const pill = (c, t) => '<span class="pill' + (c ? ' ' + c : '') + '">' + t + '</span>';

  function bars(title) {
    const y = new Date().getFullYear(), c = Array(12).fill(0);
    sessions.forEach(s => { const d = new Date(s.completed_at); if (d.getFullYear() === y) c[d.getMonth()] += s.duration_seconds / 3600; });
    const m = Math.max(...c, 0.0001);
    return '<div class="card"><div class="chart-title">' + title + ' ' + y + '</div>' + (sessions.length
      ? '<div class="bars">' + c.map((n, i) => '<div class="col" title="' + MONTHS[i] + ': ' + n.toFixed(1) + ' hours"><div class="barwrap"><div class="bar" style="height:' + (n / m * 100) + '%"></div></div><span>' + MONTHS[i] + '</span></div>').join('') + '</div>'
      : '<div class="empty" style="margin-top:8px">' + EMPTY + '</div>') + '</div>';
  }

  async function enterApp() {
    showApp();
    $('who').textContent = me.email;
    const sel = $('teamsel'); sel.hidden = adminTeams.length < 2;
    sel.innerHTML = adminTeams.map(t => '<option value="' + esc(t.id) + '"' + (t.id === team.id ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('');
    await loadTeam();
  }

  async function loadTeam() {
    banner('');
    const id = team.id;
    const [m, i, p] = await Promise.all([
      db.from('team_members').select('user_id, role, joined_at').eq('team_id', id).order('joined_at'),
      db.from('project_invitations').select('id, email, role, expires_at, accepted_at, created_at').eq('team_id', id).order('created_at', { ascending: false }),
      db.from('projects').select('id, name, status, start_date, target_date').eq('team_id', id).order('created_at', { ascending: false })
    ]);
    members = m.data || []; invs = i.data || []; projects = p.data || [];
    const pids = projects.map(x => x.id);
    const [s, pr] = await Promise.all([
      pids.length ? db.from('time_sessions').select('project_id, user_id, duration_seconds, completed_at').in('project_id', pids) : { data: [] },
      members.length ? db.from('profiles').select('id, display_name').in('id', members.map(x => x.user_id)) : { data: [] }
    ]);
    sessions = s.data || []; names = Object.fromEntries((pr.data || []).map(x => [x.id, x.display_name]));
    myName = names[me.id] || (me.email || '').split('@')[0];
    const errs = [m, i, p, s, pr].filter(r => r.error).map(r => r.error.message);
    if (errs.length) banner('Could not load some data: ' + errs.join('; '));
    render();
  }

  function renderHome() {
    const go = (v, i, l) => '<button data-go="' + v + '">' + ic(i) + l + '</button>';
    const rows = members.map(m => { const ss = sessions.filter(s => s.user_id === m.user_id), last = ss.map(s => s.completed_at).sort().pop();
      return '<tr><td>' + esc(nm(m.user_id)) + '</td><td>' + esc(m.role) + '</td><td>' + ss.length + '</td><td>' + hrs(secs(ss)) + '</td><td>' + fmt(last) + '</td></tr>'; });
    return '<div class="welcome"><h1>Welcome, ' + esc(myName) + '!</h1><p>"Your team has tracked a total of ' + hrs(secs(sessions)) + ' hours."</p></div>' +
      '<h2>Suggestions</h2><div class="sugg">' + go('team', 'users', 'Invite teammates') + go('projects', 'folder', 'View projects') + go('reports', 'chart', 'View reports') + '</div>' +
      '<h2>Team activity</h2>' + table(['Member', 'Role', 'Sessions', 'Hours', 'Last session'], rows, 'No members yet.');
  }

  function renderTeam() {
    const now = Date.now();
    const st = i => i.accepted_at ? pill('blue', 'Accepted') : new Date(i.expires_at) < now ? pill('', 'Expired') : pill('yellow', 'Pending');
    return head('users', 'Team Overview') + '<h2>' + esc(team.name) + ' members</h2>' +
      table(['Name', 'Role', 'Joined'], members.map(m => '<tr><td>' + esc(nm(m.user_id)) + '</td><td>' + esc(m.role) + '</td><td>' + fmt(m.joined_at) + '</td></tr>'), 'No members yet.') +
      '<h2>Invite teammates</h2><div class="card"><form id="inv-form"><label for="inv-emails">Teammate emails</label><textarea id="inv-emails" name="emails" placeholder="Enter email addresses (separate multiple emails with commas)"></textarea>' +
      '<button class="primary" type="submit"' + (dashBusy ? ' disabled' : '') + '>' + (dashBusy ? 'Sending...' : 'Send invites') + '</button></form>' +
      (dashErr ? '<p class="msg error" role="alert">' + esc(dashErr) + '</p>' : '') + '<p class="muted">' + LINK_NOTE + '</p>' + (dashLinks ? linksHtml(dashLinks) : '') + '</div>' +
      '<h2>Invitations</h2>' + table(['Email', 'Role', 'Sent', 'Expires', 'Status'], invs.map(i => '<tr><td>' + esc(i.email) + '</td><td>' + esc(i.role) + '</td><td>' + fmt(i.created_at) + '</td><td>' + fmt(i.expires_at) + '</td><td>' + st(i) + '</td></tr>'), 'No invitations yet.');
  }

  function renderProjects() {
    const dis = projBusy ? ' disabled' : '';
    const status = p => '<select data-status="' + esc(p.id) + '" aria-label="Status of ' + esc(p.name) + '">' + ['Planning', 'In progress', 'Completed'].map(o => '<option' + (p.status === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select>';
    return head('folder', 'Projects') + '<h2>Create a project</h2><div class="card"><form id="proj-form">' +
      '<label for="pname">Project name</label><input id="pname" name="pname" maxlength="100" placeholder="e.g. Website redesign" value="' + esc(draft.name) + '">' +
      '<label for="pdesc">Description</label><textarea id="pdesc" name="pdesc" maxlength="500" placeholder="What is this team working on?">' + esc(draft.desc) + '</textarea>' +
      '<div class="proj-grid"><div><label for="pstart">Start date</label><input id="pstart" name="pstart" type="date" value="' + esc(draft.start) + '"></div><div><label for="ptarget">Target date</label><input id="ptarget" name="ptarget" type="date" value="' + esc(draft.target) + '"></div></div>' +
      '<button class="primary" type="submit"' + dis + '>' + (projBusy ? 'Creating...' : 'Create project') + '</button></form>' +
      (projErr ? '<p class="msg error" role="alert">' + esc(projErr) + '</p>' : '') + '<p class="muted">Everyone on the team sees new projects in the plugin.</p></div>' +
      '<h2>All projects</h2>' + table(['Project', 'Status', 'Start', 'Target', 'Hours'],
        projects.map(p => '<tr><td>' + esc(p.name) + '</td><td>' + status(p) + '</td><td>' + fmt(p.start_date) + '</td><td>' + fmt(p.target_date) + '</td><td>' + hrs(secs(sessions.filter(s => s.project_id === p.id))) + '</td></tr>'),
        'No projects yet. Create one above.');
  }

  function renderReports() {
    return head('chart', 'General Reports') + '<h2>' + esc(team.name) + ' overview</h2><div class="stats">' +
      stat('Members', members.length) + stat('Projects', projects.length) + stat('Sessions', sessions.length) + stat('Tracked hours', hrs(secs(sessions))) + '</div>' +
      '<h2>Total work hours</h2>' + bars('Hours tracked in') + '<p class="muted">These are descriptive usage totals from recorded sessions, not a measure of anyone\'s productivity.</p>';
  }

  function render() {
    document.title = team.name + ' - Orello';
    if (document.activeElement !== $('workspace')) $('workspace').value = team.name;
    $('nav').innerHTML = NAV.map(([g, i, items]) => '<div class="grp">' + ic(i) + g + '</div>' + items.map(([k, l]) => '<a data-view="' + k + '" tabindex="0"' + (k === view ? ' aria-current="page"' : '') + '>' + l + '</a>').join('')).join('');
    $('view').innerHTML = view === 'team' ? renderTeam() : view === 'projects' ? renderProjects() : view === 'reports' ? renderReports() : renderHome();
  }

  const navTo = el => { const t = el.closest('[data-view],[data-go]'); if (t) { view = t.dataset.view || t.dataset.go; render(); window.scrollTo(0, 0); } };
  $('nav').addEventListener('click', e => navTo(e.target));
  $('nav').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navTo(e.target); } });
  $('view').addEventListener('click', e => navTo(e.target));
  $('view').addEventListener('submit', async e => {
    if (e.target.id === 'proj-form') { e.preventDefault(); await createProject(e.target); return; }
    if (e.target.id !== 'inv-form') return;
    e.preventDefault();
    const list = parseEmails(e.target.elements.emails.value), bad = checkEmails(list);
    dashErr = bad; if (bad) { render(); return; }
    dashBusy = true; render();
    dashLinks = await createInvites(list); dashBusy = false;
    await loadTeam();
  });
  async function createProject(f) {
    const v = n => f.elements[n].value.trim();
    draft = { name: v('pname'), desc: v('pdesc'), start: v('pstart'), target: v('ptarget') };
    projErr = !draft.name ? 'Enter a project name.'
      : projects.some(p => p.name.toLowerCase() === draft.name.toLowerCase()) ? 'A project with this name already exists.'
      : draft.start && draft.target && draft.target < draft.start ? 'Target date cannot be before the start date.' : '';
    if (projErr) { render(); return; }
    projBusy = true; render();
    const { error } = await db.from('projects').insert({ team_id: team.id, name: draft.name, description: draft.desc, start_date: draft.start || null, target_date: draft.target || null, status: 'Planning', created_by: me.id });
    projBusy = false; projErr = error ? 'Could not create the project: ' + error.message : '';
    if (!error) draft = { name: '', desc: '', start: '', target: '' };
    await loadTeam();
  }
  $('view').addEventListener('change', async e => {
    const sel = e.target.closest('[data-status]'); if (!sel) return;
    const { error } = await db.from('projects').update({ status: sel.value }).eq('id', sel.dataset.status);
    await loadTeam();
    if (error) banner('Could not update the project: ' + error.message);
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const inp = b.closest('.linkrow').querySelector('input'); inp.select();
    if (navigator.clipboard) navigator.clipboard.writeText(inp.value).catch(() => {});
    b.textContent = 'Copied';
  });
  $('workspace').addEventListener('change', async e => {
    const name = e.target.value.trim();
    if (!name || name === team.name) { e.target.value = team.name; return; }
    const { error } = await db.from('teams').update({ name }).eq('id', team.id);
    if (error) { banner('Could not rename the workspace: ' + error.message); e.target.value = team.name; return; }
    team.name = name; const a = adminTeams.find(t => t.id === team.id); if (a) a.name = name;
    await enterApp();
  });
  $('teamsel').addEventListener('change', async e => { team = adminTeams.find(t => t.id === e.target.value) || team; await enterApp(); });

  (async () => {
    const { data } = await db.auth.getSession();
    if (data.session) await afterAuth(); else showAuth();
  })();
