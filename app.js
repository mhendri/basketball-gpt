'use strict';
const SHEET_ID = '1IBgQlW1lqmNIjhSQ8v4K33X-zyU2-1aoKHrIYrmLqWY';
const YEAR = 2026;
const datePattern = /^\d{1,2}\/\d{1,2}$/;
const canonical = name => ({Tann:'Tannenbaum',Lerm:'Lerman'}[name.trim()] || name.trim());
const dateKey = value => { const [m,d] = value.split('/'); return `${YEAR}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`; };
const matchupKey = (date, teams) => date + ':' + teams.map(canonical).sort().join('|');
function parseLeague(rows) {
  rows = rows.map(row => row.map(value => String(value ?? '').trim()));
  const scoresStart = rows.findIndex(row => row.some(value => /^scores$/i.test(value)));
  const results = [];
  if (scoresStart >= 0) for (const row of rows.slice(scoresStart + 1)) {
    if (!datePattern.test(row[0] || '')) continue;
    const a = (row[1] || '').match(/^(.+?)\s+(\d+)$/);
    const b = (row[2] || '').match(/^(.+?)\s+(\d+)$/);
    if (a && b) results.push({ date:dateKey(row[0]), teams:[canonical(a[1]),canonical(b[1])], scores:[Number(a[2]),Number(b[2])], note:row[3] || '' });
  }
  const scoreMap = new Map(results.map(r => [matchupKey(r.date,r.teams),r]));
  const schedule = [];
  for (let i=0;i<rows.length;i++) {
    const headers = rows[i];
    if (headers.filter(value => datePattern.test(value)).length < 3) continue;
    const playoffs = !/^\d{1,2}:\d{2}/.test(rows[i+1]?.[0] || '');
    headers.forEach((value,col) => {
      if (!datePattern.test(value)) return;
      for (let offset=1;offset<=2;offset++) {
        const row = rows[i+offset] || [];
        const label = row[col];
        if (!label) continue;
        const date = dateKey(value);
        if (/^no game$/i.test(label) && schedule.some(g => g.date===date && g.noGame)) continue;
        const teams = label.split(/\s+vs?\.?\s+/i).map(canonical);
        const result = teams.length===2 ? scoreMap.get(matchupKey(date,teams)) : undefined;
        schedule.push({date,label,teams:teams.length===2?teams:null,time:playoffs?'TBD':row[0],noGame:/^no game$/i.test(label),playoffs,result});
      }
    });
  }
  if (!schedule.length) throw new Error('The sheet does not contain a recognized schedule.');
  return {schedule:schedule.sort((a,b)=>a.date.localeCompare(b.date)),results:results.sort((a,b)=>b.date.localeCompare(a.date)),notes:rows.flat().filter(v=>v.startsWith('**') && v.length>3)};
}
if (typeof module !== 'undefined') module.exports = {parseLeague};
if (typeof document !== 'undefined') {
  let league, view='schedule', busy=false;
  const panel=document.getElementById('games'), status=document.getElementById('status');
  const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function resultContent(result) {
    const wrap=el('div','result-teams');
    result.teams.forEach((team,i)=>{const line=el('div','team-line'+(result.scores[i]>result.scores[1-i]?' winner':''));line.append(el('span','',team),el('span','score',String(result.scores[i])));wrap.append(line);});
    return wrap;
  }
  function render() {
    if(!league)return;
    panel.replaceChildren();
    const data=view==='schedule'?league.schedule:league.results;
    if(!data.length)panel.append(el('p','empty','No scores have been posted yet.'));
    const groups=new Map();
    for(const game of data){if(!groups.has(game.date))groups.set(game.date,[]);groups.get(game.date).push(game);}
    for(const [date,games] of groups){
      const section=el('section','game-day'); const day=el('div','day-label');
      const dt=new Date(date+'T12:00:00Z');
      day.append(el('span','weekday',dt.toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'})),el('span','date',dt.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})));
      if(date===today())day.append(el('span','today','TODAY'));
      const list=el('div','day-games');
      for(const game of games){
        const row=el('article','game'); const result=view==='results'?game:game.result;
        const meta=el('div','game-meta',view==='results'?'FINAL':game.noGame?'OFF':game.time);
        if(result && view==='schedule')meta.append(el('small','','Final'));
        if(result?.note)meta.append(el('span','badge',result.note));
        row.append(meta);
        if(result)row.append(resultContent(result));
        else{const wrap=el('div');const match=el('div','matchup');if(game.teams){match.append(el('span','',game.teams[0]),el('span','versus','vs'),el('span','',game.teams[1]));}else match.textContent=game.label;wrap.append(match);if(date<today()&&!game.noGame)wrap.append(el('small','note','Score not posted'));row.append(wrap);}
        list.append(row);
      }
      section.append(day,list);panel.append(section);
    }
    if(view==='schedule')league.notes.forEach(note=>panel.append(el('p','note','League note: '+note.replace(/^\*+\s*/,''))));
    document.getElementById('count').textContent=view==='results'?`${data.length} final scores`:`${data.filter(g=>!g.noGame).length} scheduled games`;
  }
  const tabs=[document.getElementById('schedule-tab'),document.getElementById('results-tab')];
  function selectTab(index){view=index===0?'schedule':'results';tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});panel.setAttribute('aria-labelledby',tabs[index].id);render();}
  tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectTab(index));tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?1:1-index;selectTab(next);tabs[next].focus();}});});
  function fetchLiveRange(range){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');const name='leagueData_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const cleanup=()=>{clearTimeout(timer);script.remove();delete window[name];};
      const timer=setTimeout(()=>{cleanup();reject(new Error('Live data request timed out.'));},12000);
      window[name]=response=>{cleanup();if(response.status==='error'||!response.table?.rows)return reject(new Error('Google Sheets did not return data.'));resolve(response.table.rows.map(row=>row.c.map(cell=>cell?(cell.f ?? cell.v ?? ''):'')));};
      script.onerror=()=>{cleanup();reject(new Error('Unable to reach Google Sheets.'));};
      script.src=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=0&headers=0&range=${encodeURIComponent(range)}&tqx=${encodeURIComponent('out:json;responseHandler:'+name)}&_=${Date.now()}`;
      document.head.append(script);
    });
  }
  async function fetchLive(){
    // Separate mixed-type columns: otherwise Google discards schedule times when
    // it infers column A as dates from the Scores section.
    const [schedule,rest]=await Promise.all([fetchLiveRange('A4:W7'),fetchLiveRange('A8:W100')]);
    return [...schedule,...rest];
  }
  async function refresh(){
    if(busy)return;busy=true;const button=document.getElementById('refresh');button.disabled=true;status.textContent='Checking the league spreadsheet…';status.classList.remove('warning');
    try{league=parseLeague(await fetchLive());render();status.textContent='Updated from the league spreadsheet · '+new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});}
    catch(error){status.classList.add('warning');status.textContent=league?'Live refresh unavailable. Showing the last loaded data; scores may have changed.':'Unable to load games. Please open the league spreadsheet or try Refresh data.';}
    finally{busy=false;button.disabled=false;}
  }
  document.getElementById('refresh').addEventListener('click',refresh);
  (async()=>{try{const response=await fetch('data.json');if(!response.ok)throw new Error('Snapshot unavailable');const snapshot=await response.json();league=parseLeague(snapshot.rows);render();status.textContent='Saved data from '+new Date(snapshot.retrievedAt).toLocaleDateString('en-US')+' · Checking for updates…';}catch{}await refresh();})();
}
