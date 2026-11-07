import assert from 'node:assert/strict';
import {deepMarker,validateDeepMarkdown} from './explanation-deep.mjs';
const headings=['参考回答','参考分析','案例','总结点'];

/** Structural publication guard; semantic accuracy still requires review of each question. */
export function validateExplanationMarkdown(source,name='answer') {
  if(source.includes(deepMarker)) return validateDeepMarkdown(source,name);
  assert.ok(typeof source==='string'&&source.length>0&&source.length<=100_000,name+': invalid answer size');
  assert.ok(!/待补充|待完善|\bTODO\b|xxxx/.test(source),name+': unfinished content');
  const blocks=[];const found=[];const images=[];
  let fence;
  for(const line of source.split(/\r?\n/)){
    const marker=line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if(marker){
      if(!fence){assert.equal(found.at(-1),'案例',name+': code must be inside the case');fence={char:marker[1][0],size:marker[1].length};}
      else if(marker[1][0]===fence.char&&marker[1].length>=fence.size&&!marker[2].trim())fence=undefined;
      continue;
    }
    if(fence)continue;
    if(/^#{1,6}\s/.test(line)){
      assert.ok(line.startsWith('## '),name+': only designated section headings are allowed');
      found.push(line.slice(3).trim());blocks.push([]);continue;
    }
    if(blocks.length&&line.trim())blocks.at(-1).push(line);
  }
  assert.ok(!fence,name+': unclosed code block');
  const expected=found.includes('参考分析')?headings:headings.filter(heading=>heading!=='参考分析');
  assert.deepEqual(found,expected,name+': expected answer, optional analysis, case and final summary');
  for(let block=0;block<found.length;block++){
    const section=headings.indexOf(found[block]);
    let count=0,outcome=false;
    for(const line of blocks[block]){
      const img=line.match(/^!\[[^\]]*\]\((\/explanations\/[a-z0-9-]+\.svg)\)$/);
      if(section===2&&img){images.push(img[1]);continue;}
      const point=line.match(/^(\d+)\.\s+(.+)$/);
      assert.ok(point&&Number(point[1])===++count,name+': sequential numbered points required; nothing may follow summary');
      const text=point[2].replace(/[*`]/g,'');
      assert.ok([...text].length<=(section===3?22:section===2?145:section===1?110:80),name+': point too long');
      outcome ||= /验证|预期|结果/.test(text);
    }
    assert.ok(count>=(section<2?1:2)&&count<=(section===3?4:section===2?8:6),name+': invalid point count');
    if(section===2)assert.ok(outcome,name+': case needs an observable outcome');
  }
  assert.ok(images.length<=1,name+': at most one focused diagram');
  return images;
}
