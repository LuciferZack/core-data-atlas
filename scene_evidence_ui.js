/* Add provenance to the existing read-only atlas without changing review scores. */
(()=>{'use strict';
 const original=showRows;
 showRows=function(rows){
  original(rows);
  const trs=document.getElementById('records').children;
  rows.forEach((r,i)=>{
   const tags=r.tags||{},cell=trs[i]?.children[2];if(!cell)return;
   if(!tags.scene_method){
    if(tags.scenes?.includes('Unlabeled')){
     const p=document.createElement('p');p.textContent='本轮全量文本复查仍未检出可靠线索；不等于视频没有场景。';cell.append(p);
    }
    return;
   }
   const p=document.createElement('p');p.style.color='#915e20';
   p.textContent=tags.scene_places?.length?'文本明确提及场所；未做视觉核实。':'具体场所仍未确认；下列仅为相关作业／物体线索。';cell.append(p);
   const details=document.createElement('details'),summary=document.createElement('summary');
   summary.textContent='查看场景线索依据';details.append(summary);
   for(const e of tags.scene_evidence||[]){
    const line=document.createElement('p');
    line.textContent=`${e.scene}｜${e.scope==='episode_context'?'继承自 Episode／任务上下文，不代表分段实时位置':'当前记录原文'}｜${(e.fields||[e.field]).join('、')}｜${e.text}｜命中：${e.term}`;
    details.append(line);
   }
   cell.append(details);
  });
 };
 const panel=document.createElement('aside');panel.style.cssText='padding:18px 24px;background:#edf6f1;border-bottom:1px solid #aacdbb';
 const title=document.createElement('strong');title.textContent='场景文本复查 · 2026-10-23';panel.append(title);
 const note=document.createElement('p');note.textContent='已全量扫描原有 Unlabeled 记录及其任务上下文。“××线索”表示文本支持的作业或物体关联，不等于已确认的房间／工厂位置。未检出线索仍保留 Unlabeled。点云坐标和视频 embedding 没有改动。';panel.append(note);
 const counts=document.createElement('p');counts.textContent='正在读取本轮复查统计…';panel.append(counts);
 const link=document.createElement('a');link.href='data/scene-audit.json';link.textContent='下载本轮统计、规则计数与原文样例';panel.append(link);document.body.prepend(panel);
 fetch('data/scene-audit.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(d=>{
  counts.textContent=Object.entries(d.results).map(([s,v])=>`${s}：原未知 ${d.before_unknown[s].toLocaleString()} → 补到线索 ${v.recovered_any.toLocaleString()}，仍未知 ${v.remaining_unknown.toLocaleString()}`).join('；');
 }).catch(()=>counts.textContent='统计文件暂时读取失败，请刷新。');
})();
