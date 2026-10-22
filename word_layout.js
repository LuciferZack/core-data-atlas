/* Frequency-scaled horizontal/vertical phrase cloud, with glyph-mask collisions.
   All entries share one font scale; we never enlarge a rare phrase to fill a gap. */
function phraseHash(text){let h=2166136261;for(const ch of text)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0}
function phraseSprite(text,size,rotate,cell=2){
 const c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.font=size+'px Arial, sans-serif';
 const m=ctx.measureText(text),tw=Math.ceil(m.width+8),th=Math.ceil(size*1.35+8);
 c.width=rotate?th:tw;c.height=rotate?tw:th;
 ctx.translate(c.width/2,c.height/2);if(rotate)ctx.rotate(-Math.PI/2);
 ctx.font=size+'px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,0,0);
 const data=ctx.getImageData(0,0,c.width,c.height).data,cols=Math.ceil(c.width/cell),rows=Math.ceil(c.height/cell),raw=[];
 for(let y=0;y<c.height;y+=cell)for(let x=0;x<c.width;x+=cell){let ink=false;for(let dy=0;dy<cell&&!ink;dy++)for(let dx=0;dx<cell;dx++)if(x+dx<c.width&&y+dy<c.height&&data[((y+dy)*c.width+x+dx)*4+3]>24){ink=true;break}if(ink)raw.push([x/cell,y/cell])}
 // One-cell padding around letters prevents touching without reserving blank rectangles.
 const padded=new Set();for(const [x,y] of raw)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<cols&&yy<rows)padded.add(yy*cols+xx)}
 return {cols,rows,cells:[...padded].map(i=>[i%cols,Math.floor(i/cols)]),ink:new Set(raw.map(([x,y])=>y*cols+x)),rotate,size,text,cell};
}
function fitsSprite(sprite,x,y,occupied,cols,rows){
 if(x<1||y<1||x+sprite.cols>=cols||y+sprite.rows>=rows)return false;
 return sprite.cells.every(([dx,dy])=>!occupied[(y+dy)*cols+x+dx]);
}
function packPhraseCloud(ctx,w,h,items){
 const cell=2,cols=Math.floor(w/cell),rows=Math.floor(h/cell),occupied=new Uint8Array(cols*rows),hits=[],max=items[0]?.count||1;
 const measure=document.createElement('canvas').getContext('2d');let area=0,longest=0;
 const sized=items.map(item=>{const size=11+88*Math.sqrt(item.count/max);measure.font=size+'px Arial, sans-serif';const width=measure.measureText(item.text).width;area+=width*size*1.4;longest=Math.max(longest,width);return {item,size}});
 const scale=Math.min(1,Math.sqrt(w*h*1.6/Math.max(1,area)),(w-24)/Math.max(1,longest));
 const colors=['#28649a','#28776a','#78688e','#bd803f','#65747b'];
 for(let index=0;index<sized.length;index++){
  const {item,size:baseSize}=sized[index],size=baseSize*scale;if(size<10)continue;
  const hash=phraseHash(item.text),preferred=index>0&&hash%4===0;let placed=null;
  for(const rotate of [preferred,!preferred]){
   const sprite=phraseSprite(item.text,size,rotate,cell);if(sprite.cols>=cols||sprite.rows>=rows)continue;
   for(let k=0;k<6500;k++){
    // An elliptical spiral searches the whole rectangular canvas on a common grid.
    const angle=k*.29,radius=2.2*Math.sqrt(k),x=Math.round(cols/2-sprite.cols/2+Math.cos(angle)*radius*cols/rows),y=Math.round(rows/2-sprite.rows/2+Math.sin(angle)*radius);
    if(!fitsSprite(sprite,x,y,occupied,cols,rows))continue;
    for(const [dx,dy] of sprite.cells)occupied[(y+dy)*cols+x+dx]=1;
    const cx=x*cell+sprite.cols*cell/2,cy=y*cell+sprite.rows*cell/2;
    ctx.save();ctx.translate(cx,cy);if(rotate)ctx.rotate(-Math.PI/2);ctx.font=size+'px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=colors[hash%colors.length];ctx.fillText(item.text,0,0);ctx.restore();
    placed={x:x*cell,y:y*cell,w:sprite.cols*cell,h:sprite.rows*cell,item,sprite};hits.push(placed);break;
   }
   if(placed)break;
  }
 }
 return hits;
}
