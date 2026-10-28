// Built-in Cream Code widgets (keyless fallback). Single-file HTML, no external requests.
const shell = (title: string, body: string, script: string, accent = '#8b3dff') => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:linear-gradient(135deg,#f6f3ff,#e9fbfc);color:#1d1b29;display:grid;place-items:center;padding:16px}
.card{background:#fff;border-radius:18px;box-shadow:0 10px 30px rgba(40,20,90,.12);padding:22px;width:min(440px,100%)}
h1{font-size:20px;margin:0 0 12px}button{font:inherit;cursor:pointer;border:0;border-radius:10px;padding:10px 14px;background:${accent};color:#fff;font-weight:600}
button.opt{display:block;width:100%;text-align:left;background:#f3f0fb;color:#1d1b29;margin:6px 0;font-weight:500}button.opt:hover{background:#e8e1fa}
.muted{color:#6b6880;font-size:13px}.ok{background:#d9f7e6!important}.bad{background:#fde2e1!important}
</style></head><body><div class="card">${body}</div><script>${script}</script></body></html>`;

export const WIDGETS: { id: string; name: string; icon: string; keywords: RegExp; html: string }[] = [
  {
    id: 'quiz',
    name: 'Quiz',
    icon: 'CircleHelp',
    keywords: /quiz|trivia|question|test|exam/i,
    html: shell(
      'Quiz',
      `<h1 id="q"></h1><div id="opts"></div><p class="muted" id="status"></p><button id="next" style="display:none">Next</button>`,
      `const Q=[{q:'Which planet is known as the Red Planet?',a:['Venus','Mars','Jupiter','Mercury'],c:1},{q:'What is the largest ocean on Earth?',a:['Atlantic','Indian','Pacific','Arctic'],c:2},{q:'How many continents are there?',a:['5','6','7','8'],c:2}];
let i=0,score=0;const q=document.getElementById('q'),o=document.getElementById('opts'),s=document.getElementById('status'),n=document.getElementById('next');
function show(){if(i>=Q.length){q.textContent='You scored '+score+' / '+Q.length+' 🎉';o.innerHTML='';s.textContent='';n.textContent='Play again';n.style.display='inline-block';n.onclick=()=>{i=0;score=0;n.textContent='Next';n.onclick=nx;show()};return}
const it=Q[i];q.textContent=(i+1)+'. '+it.q;o.innerHTML='';s.textContent='Question '+(i+1)+' of '+Q.length;n.style.display='none';
it.a.forEach((t,k)=>{const b=document.createElement('button');b.className='opt';b.textContent=t;b.onclick=()=>{[...o.children].forEach(x=>x.disabled=true);if(k===it.c){b.classList.add('ok');score++}else{b.classList.add('bad');o.children[it.c].classList.add('ok')}n.style.display='inline-block'};o.appendChild(b)})}
function nx(){i++;show()}n.onclick=nx;show();`,
    ),
  },
  {
    id: 'countdown',
    name: 'Countdown',
    icon: 'Timer',
    keywords: /countdown|timer|launch|event|days until|clock/i,
    html: shell(
      'Countdown',
      `<h1 style="text-align:center">Launching in</h1><div id="t" style="display:flex;gap:10px;justify-content:center"></div><p class="muted" style="text-align:center;margin-top:14px" id="d"></p>`,
      `const target=new Date(Date.now()+12*864e5);document.getElementById('d').textContent=target.toDateString();
function tick(){let ms=Math.max(0,target-Date.now());const u=[['Days',864e5],['Hours',36e5],['Min',6e4],['Sec',1e3]];document.getElementById('t').innerHTML=u.map(([l,v])=>{const n=Math.floor(ms/v);ms-=n*v;return '<div style="background:#1d1b29;color:#fff;border-radius:12px;padding:12px 10px;min-width:66px;text-align:center"><div style="font-size:28px;font-weight:800">'+String(n).padStart(2,'0')+'</div><div style="font-size:11px;opacity:.7">'+l+'</div></div>'}).join('')}
tick();setInterval(tick,1000);`,
    ),
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: 'Calculator',
    keywords: /calculat|math|tip|loan|budget|convert/i,
    html: shell(
      'Tip calculator',
      `<h1>Tip calculator</h1><label class="muted">Bill amount</label><input id="b" type="number" value="48" style="width:100%;font-size:18px;padding:10px;border:1px solid #ddd;border-radius:10px;margin:6px 0 12px">
<label class="muted">Tip: <b id="pv">18</b>%</label><input id="p" type="range" min="0" max="30" value="18" style="width:100%">
<label class="muted">Split between <b id="nv">2</b> people</label><input id="n" type="range" min="1" max="10" value="2" style="width:100%">
<div style="display:flex;gap:10px;margin-top:14px"><div style="flex:1;background:#f3f0fb;border-radius:12px;padding:12px"><div class="muted">Tip</div><div id="tip" style="font-size:22px;font-weight:800"></div></div><div style="flex:1;background:#1d1b29;color:#fff;border-radius:12px;padding:12px"><div style="opacity:.7;font-size:13px">Each pays</div><div id="each" style="font-size:22px;font-weight:800"></div></div></div>`,
      `const $=id=>document.getElementById(id);function calc(){const b=+$('b').value||0,p=+$('p').value,n=+$('n').value;$('pv').textContent=p;$('nv').textContent=n;const tip=b*p/100;$('tip').textContent='$'+tip.toFixed(2);$('each').textContent='$'+((b+tip)/n).toFixed(2)}
['b','p','n'].forEach(i=>$(i).addEventListener('input',calc));calc();`,
    ),
  },
  {
    id: 'poll',
    name: 'Poll',
    icon: 'ChartBar',
    keywords: /poll|vote|survey|feedback|opinion/i,
    html: shell(
      'Poll',
      `<h1>What should we build next?</h1><div id="o"></div><p class="muted" id="tot"></p>`,
      `const opts=['Dark mode','Mobile app','More templates','AI features'];const votes=opts.map(()=>Math.floor(Math.random()*8));let voted=false;
function render(){const total=votes.reduce((a,b)=>a+b,0);document.getElementById('o').innerHTML=opts.map((t,i)=>{const pct=total?Math.round(votes[i]/total*100):0;return '<button class="opt" data-i="'+i+'" style="position:relative;overflow:hidden">'+(voted?'<span style="position:absolute;left:0;top:0;bottom:0;width:'+pct+'%;background:#d8ccfb"></span>':'')+'<span style="position:relative;display:flex;justify-content:space-between"><span>'+t+'</span>'+(voted?'<b>'+pct+'%</b>':'')+'</span></button>'}).join('');
document.getElementById('tot').textContent=total+' votes';document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{if(voted)return;votes[+b.dataset.i]++;voted=true;render()})}render();`,
    ),
  },
];

export function pickWidget(prompt: string) {
  return WIDGETS.find((w) => w.keywords.test(prompt)) ?? null;
}

/** Extract a single HTML document from an LLM reply. */
export function extractHtml(text: string): string | null {
  const fenced = /```(?:html)?\s*([\s\S]*?)```/i.exec(text)?.[1];
  const src = fenced ?? text;
  const m = /<!doctype html[\s\S]*<\/html>/i.exec(src) ?? /<html[\s\S]*<\/html>/i.exec(src);
  if (m) return m[0];
  if (/<(div|body|style|script|canvas|svg)/i.test(src)) return `<!doctype html><html><head><meta charset="utf-8"></head><body>${src.trim()}</body></html>`;
  return null;
}
