interface Env { TUNER_KV: KVNamespace; }

const CSP: Record<string, string> = { 'default-src': "'self'", 'script-src': "'self' 'unsafe-inline' 'unsafe-eval'", 'style-src': "'self' 'unsafe-inline'", 'img-src': "'self' data: https:", 'connect-src': "'self' https://*.casey-digennaro.workers.dev https://*" };

function json(data: unknown, s = 200) { return new Response(JSON.stringify(data), { status: s, headers: { 'Content-Type': 'application/json', ...CSP } }); }

interface VesselScore { name: string; url: string; health: number; latency: number; size: number; hasVesselJson: boolean; hasCsp: boolean; hasSecurity: boolean; score: number; issues: string[]; ts: string; }
interface ScanResult { id: string; vessels: VesselScore[]; total: number; pass: number; fail: number; topIssues: string[]; ts: string; }

const VESSELS = [
  'cocapn-ai','dmlog-ai','studylog-ai','makerlog-ai','personallog-ai','businesslog-ai',
  'fishinglog-ai','deckboss-ai','capitaine','the-fleet','ideation-engine','dogmind-arena',
  'fleet-rpg','fleet-orchestrator','dead-reckoning-engine','git-agent','git-claw',
  'log-origin','skill-evolver','flow-forge','context-compactor','fleet-immune',
  'epiphany-engine','loop-closure','swarm-intuition','meta-loop-evolver','clawcommit-lucid',
  'fleet-identity','collective-mind','emergence-bus','context-broker',
  'cocapn-lite','the-seed','become-ai','nexus-git-agent','self-evolve-ai',
  'cocapn-com','luciddreamer-ai','edgenative-ai','increments-fleet-trust',
  'cooklog-ai','booklog-ai','travlog-ai','healthlog-ai','petlog-ai',
  'parentlog-ai','doclog-ai','musiclog-ai','artistlog-ai','activelog-ai',
  'activeledger-ai','reallog-ai','playerlog-ai','cocapn-press',
  'constraint-theory-web','deckboss-sheets','fleet-simulator',
  'gravity-well-protocol','resonant-consensus','edge-equipment-catalog',
  'edge-boarding-protocol','nexus-fracture-sim','kungfu-ai','mycelium-ai',
  'baton-ai','crdt-sync','personality-engine','papermill','ui-design-system',
  'the-mesh-fleet','model-quality-rubric','zero-shot-audit',
  'forgetting-problem','forgiveness-function','git-coordination-protocol',
  'actualizer-ai','craftmind-core','dream-engine','seed-ui',
  'local-bridge','membership-api'
];

async function checkVessel(name: string): Promise<VesselScore> {
  const url = `https://${name}.casey-digennaro.workers.dev`;
  const rawUrl = `https://raw.githubusercontent.com/Lucineer/${name}/master`;
  const issues: string[] = [];
  let health = 0, latency = 9999, size = 0, hasVesselJson = false, hasCsp = false, hasSecurity = false;

  // Stage 1: Health (GitHub primary due to CF error 1042 on same-subdomain)
  const t0 = Date.now();
  let repoExists = false;
  for (const branch of ['master', 'main']) {
    try {
      const resp = await fetch(`https://raw.githubusercontent.com/Lucineer/${name}/${branch}/src/worker.ts`, { signal: AbortSignal.timeout(8000) });
      if (resp.ok) { repoExists = true; latency = Date.now() - t0; break; }
    } catch {}
  }
  if (repoExists) { health = 200; }
  else { health = 404; issues.push('repo not found on GitHub'); }

  // Stage 2: Bundle size (from GitHub)
  if (repoExists) {
    try {
      const resp = await fetch(`https://raw.githubusercontent.com/Lucineer/${name}/master/src/worker.ts`, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) await fetch(`https://raw.githubusercontent.com/Lucineer/${name}/main/src/worker.ts`, { signal: AbortSignal.timeout(8000) });
      const body = await resp.text();
      size = body.length;
      if (size > 80000) issues.push(`worker.ts ${Math.round(size / 1024)}KB — consider splitting`);
    } catch {}
  }

  // Stage 3: vessel.json (from GitHub)
  for (const branch of ['master', 'main']) {
    try {
      const resp = await fetch(`https://raw.githubusercontent.com/Lucineer/${name}/${branch}/vessel.json`, { signal: AbortSignal.timeout(8000) });
      if (resp.ok) {
        const data = await resp.json() as Record<string, unknown>;
        hasVesselJson = true;
        if (!data.name) issues.push('vessel.json missing name');
        if (!data.capabilities) issues.push('vessel.json missing capabilities');
        break;
      }
    } catch {}
  }
  if (!hasVesselJson) issues.push('vessel.json missing');

  // Stage 4: Security (check worker.ts for CSP pattern)
  if (repoExists) {
    try {
      const resp = await fetch(`https://raw.githubusercontent.com/Lucineer/${name}/master/src/worker.ts`, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) await fetch(`https://raw.githubusercontent.com/Lucineer/${name}/main/src/worker.ts`, { signal: AbortSignal.timeout(8000) });
      const body = await resp.text();
      hasCsp = body.includes('content-security-policy') || body.includes('CSP');
      if (!hasCsp) issues.push('no CSP in worker.ts');
      hasSecurity = body.includes('X-Frame-Options') || body.includes('x-frame-options');
      if (!hasSecurity) issues.push('no X-Frame-Options');
    } catch {}
  }

  // Score calculation (weighted)
  let score = 0;
  if (health === 200) score += 30; else if (health > 0) score += 10;
  if (latency < 200) score += 25; else if (latency < 500) score += 18; else if (latency < 1000) score += 10; else if (latency < 5000) score += 5;
  if (size > 100 && size < 100000) score += 15; else if (size >= 100000 && size < 200000) score += 8;
  if (hasVesselJson) score += 15;
  if (hasCsp) score += 10;
  if (hasSecurity) score += 5;
  // Penalty for issues
  score -= issues.length * 2;
  score = Math.max(0, Math.min(100, score));

  return { name, url, health, latency, size, hasVesselJson, hasCsp, hasSecurity, score, issues, ts: new Date().toISOString() };
}

function getLanding(): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vessel Tuner — Cocapn Fleet Optimizer</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0a0a0f;color:#e0e0e0;min-height:100vh}
.container{max-width:900px;margin:0 auto;padding:40px 20px}
h1{color:#22c55e;font-size:2em}a{color:#22c55e;text-decoration:none}.sub{color:#8A93B4;margin-bottom:2em}
.card{background:#16161e;border:1px solid #2a2a3a;border-radius:12px;padding:24px;margin:20px 0}
.card h3{color:#22c55e;margin:0 0 12px 0}
.btn{background:#22c55e;color:#0a0a0f;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:bold}
.btn:hover{filter:brightness(1.15)}
.btn2{background:#2a2a3a;color:#e0e0e0;border:1px solid #3a3a4a;padding:8px 16px;border-radius:8px;cursor:pointer}
table{width:100%;border-collapse:collapse;font-size:.82em;margin-top:12px}
th{background:#1a1a2a;color:#8A93B4;text-align:left;padding:8px 10px;position:sticky;top:0}
td{padding:6px 10px;border-bottom:1px solid #1a1a2a}
tr:hover td{background:rgba(34,197,94,.03)}
.score{font-weight:bold}.s-pass{color:#22c55e}.s-warn{color:#f59e0b}.s-fail{color:#ef4444}
.issue{font-size:.72em;color:#f59e0b;max-width:200px;overflow:hidden;text-overflow:ellipsis}
.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
.sum{text-align:center;padding:16px;background:#16161e;border-radius:8px;border:1px solid #2a2a3a}
.sum .num{font-size:2em;font-weight:bold}.sum .label{color:#8A93B4;font-size:.8em}
.loading{color:#22c55e;font-style:italic;padding:40px;text-align:center}
.pulse{animation:pulse 1.5s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.progress{height:4px;background:#1a1a2a;border-radius:2px;margin:16px 0;overflow:hidden}
.progress-bar{height:100%;background:#22c55e;border-radius:2px;transition:width .3s}
select{background:#0a0a0f;color:#e0e0e0;border:1px solid #2a2a3a;padding:6px;border-radius:6px;font-size:.85em}
.sort-bar{display:flex;gap:8px;align-items:center;margin-bottom:12px;font-size:.85em}
</style></head><body><div class="container">
<h1>\u{1f9ea} Vessel Tuner</h1><p class="sub">AutoKernel for the fleet \u2014 profile, benchmark, optimize. Edit one file, run harness, keep or revert.</p>
<div class="card"><h3>Fleet Scanner</h3><p style="color:#8A93B4;font-size:.85em;margin-bottom:12px">5-stage correctness: health \u2192 latency \u2192 size \u2192 vessel.json \u2192 security headers. Score 0-100.</p>
<div style="display:flex;gap:8px;align-items:center"><button class="btn" onclick="scanFleet()">Scan Fleet</button>
<button class="btn2" onclick="scanPriority()">Priority 10 Only</button>
<button class="btn2" onclick="scanRecent()">Most Recent Scan</button>
<span id="scanStatus" style="margin-left:12px;color:#8A93B4;font-size:.82em"></span></div>
<div class="progress" id="progressBar"><div class="progress-bar" id="progressFill" style="width:0%"></div></div></div>
<div id="summary"></div>
<div id="results"><div class="loading">No scan results yet. Hit Scan Fleet.</div></div>
<div id="topIssues" class="card" style="display:none"><h3>Top Fleet Issues</h3><div id="issueList"></div></div>
<script>
let allResults=null;
async function scanFleet(){document.getElementById('scanStatus').textContent='Scanning 90 vessels...';
document.getElementById('progressBar').style.display='block';document.getElementById('progressFill').style.width='0%';
const r=await fetch('/api/scan');const data=await r.json();
if(data.error){document.getElementById('scanStatus').textContent=data.error;return;}
allResults=data.vessels;renderResults(data);document.getElementById('scanStatus').textContent='Done.';}
async function scanPriority(){document.getElementById('scanStatus').textContent='Scanning priority vessels...';document.getElementById('progressBar').style.display='block';document.getElementById('progressFill').style.width='0%';
const r=await fetch('/api/scan?priority=true');const data=await r.json();
allResults=data.vessels;renderResults(data);document.getElementById('scanStatus').textContent='Done.';}
async function scanRecent(){const r=await fetch('/api/scan/latest');const data=await r.json();
if(data.error){document.getElementById('scanStatus').textContent=data.error;return;}
allResults=data.vessels;renderResults(data);}
function renderResults(data){
const total=data.vessels.length;const pass=data.vessels.filter(v=>v.score>=85).length;
const warn=data.vessels.filter(v=>v.score>=70&&v.score<85).length;const fail=data.vessels.filter(v=>v.score<70).length;
document.getElementById('summary').innerHTML='<div class="summary"><div class="sum"><div class="num">'+total+'</div><div class="label">Vessels</div></div><div class="sum"><div class="num s-pass">'+pass+'</div><div class="label">Passing</div></div><div class="sum"><div class="num s-warn">'+warn+'</div><div class="label">Warning</div></div><div class="sum"><div class="num s-fail">'+fail+'</div><div class="label">Failing</div></div></div>';
const sorted=[...data.vessels].sort((a,b)=>a.score-b.score);
let html='<div class="sort-bar"><span>Sort:</span><select onchange="sortTable(this.value)"><option value="score">Score</option><option value="latency">Latency</option><option value="size">Size</option><option value="issues">Issues</option><option value="name">Name</option></select></div>';
html+='<table><thead><tr><th>#</th><th>Vessel</th><th>Score</th><th>Health</th><th>Latency</th><th>Size</th><th>vessel.json</th><th>CSP</th><th>Issues</th></tr></thead><tbody>';
sorted.forEach((v,i)=>{const sc=v.score>=85?'s-pass':v.score>=70?'s-warn':'s-fail';
html+='<tr><td>'+(i+1)+'</td><td><a href="'+v.url+'" target="_blank">'+v.name+'</a></td><td class="score '+sc+'">'+v.score+'</td><td>'+(v.health===200?'<span class="s-pass">200</span>':'<span class="s-fail">'+v.health+'</span>')+'</td><td>'+(v.latency<200?'<span class="s-pass">'+v.latency+'ms</span>':v.latency<1000?'<span class="s-warn">'+v.latency+'ms</span>':'<span class="s-fail">'+v.latency+'ms</span>')+'</td><td>'+Math.round(v.size/1024)+'KB</td><td>'+(v.hasVesselJson?'\u2705':'\u274c')+'</td><td>'+(v.hasCsp?'\u2705':'\u274c')+'</td><td class="issue">'+(v.issues.length?v.issues.join(', '):'\u2014')+'</td></tr>';});
html+='</tbody></table>';document.getElementById('results').innerHTML=html;
// Top issues
const allIssues=[];data.vessels.forEach(v=>v.issues.forEach(i=>allIssues.push(i)));
const counts={};allIssues.forEach(i=>{counts[i]=(counts[i]||0)+1;});
const topIssues=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
if(topIssues.length){document.getElementById('topIssues').style.display='block';
document.getElementById('issueList').innerHTML=topIssues.map(([issue,count])=>'<div style="padding:6px 0;border-bottom:1px solid #1a1a2a"><strong>'+count+'x</strong> '+issue+'</div>').join('');}
}
function sortTable(by){if(!allResults)return;const sorted=[...allResults];
if(by==='score')sorted.sort((a,b)=>a.score-b.score);else if(by==='latency')sorted.sort((a,b)=>b.latency-a.latency);
else if(by==='size')sorted.sort((a,b)=>b.size-a.size);else if(by==='issues')sorted.sort((a,b)=>b.issues.length-a.issues.length);
else sorted.sort((a,b)=>a.name.localeCompare(b.name));
renderResults({vessels:sorted});}
</script>
<div style="text-align:center;padding:24px;color:#475569;font-size:.75rem"><a href="https://the-fleet.casey-digennaro.workers.dev" style="color:#64748b">The Fleet</a> \u00b7 <a href="https://cocapn.ai" style="color:#64748b">Cocapn</a> \u00b7 Inspired by <a href="https://github.com/RightNow-AI/autokernel" style="color:#64748b">AutoKernel</a></div>
</div></body></html>`;
}

const PRIORITY_VESSELS = ['dmlog-ai','the-fleet','cocapn-ai','capitaine','ideation-engine','deckboss-ai','studylog-ai','makerlog-ai','personallog-ai','businesslog-ai'];

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/health') return json({ status: 'ok', vessel: 'vessel-tuner' });
    if (url.pathname === '/vessel.json') return json({ name: 'vessel-tuner', type: 'cocapn-vessel', version: '1.0.0', description: 'AutoKernel for the fleet — profile, benchmark, optimize', fleet: 'https://the-fleet.casey-digennaro.workers.dev', capabilities: ['fleet-profiling', 'correctness-harness', 'optimization-scoring'] });

    if (url.pathname === '/api/scan/latest') {
      const last = await env.TUNER_KV.get('latest_scan', 'json') as ScanResult;
      return last ? json(last) : json({ error: 'no scans yet' }, 404);
    }

    if (url.pathname === '/api/scan') {
      const priority = url.searchParams.get('priority') === 'true';
      const targets = priority ? PRIORITY_VESSELS : VESSELS;
      const results: VesselScore[] = [];

      // Scan in batches of 5 (CF Workers free tier limits)
      for (let i = 0; i < targets.length; i += 5) {
        const batch = targets.slice(i, i + 5);
        const batchResults = await Promise.all(batch.map(name => checkVessel(name).catch(() => ({
          name, url: `https://${name}.casey-digennaro.workers.dev`,
          health: 0, latency: 10000, size: 0, hasVesselJson: false, hasCsp: false, hasSecurity: false,
          score: 0, issues: ['scan failed'], ts: new Date().toISOString()
        }) as Promise<VesselScore>)));
        results.push(...batchResults);
      }

      const total = results.length;
      const pass = results.filter(v => v.score >= 85).length;
      const fail = results.filter(v => v.score < 70).length;

      // Aggregate top issues
      const issueCounts: Record<string, number> = {};
      for (const v of results) for (const i of v.issues) issueCounts[i] = (issueCounts[i] || 0) + 1;
      const topIssues = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([issue, count]) => `${count}x ${issue}`);

      const scan: ScanResult = { id: uid(), vessels: results, total, pass, fail, topIssues, ts: new Date().toISOString() };
      await env.TUNER_KV.put('latest_scan', JSON.stringify(scan));
      return json(scan);
    }

    if (url.pathname === '/api/vessel' && url.searchParams.get('name')) {
      const name = url.searchParams.get('name')!;
      const result = await checkVessel(name);
      return json(result);
    }

    return new Response(getLanding(), { headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CSP } });
  }
};

function uid(): string { return Date.now().toString(36) + Math.random().toString(36).substring(2, 7); }
