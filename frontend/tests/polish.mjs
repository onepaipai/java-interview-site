import {testTarget} from './target.mjs';
const testEnvironment=await testTarget();
import { chromium, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=testEnvironment.base;
const password=testEnvironment.password;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu']});
await mkdir('test-results/polish',{recursive:true});
try {
  for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844],['small-phone',320,740]]) {
    const context=await browser.newContext({viewport:{width,height}});
    try {
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(base);
      await page.getByLabel('账号',{exact:true}).fill('admin');
      await page.getByLabel('密码',{exact:true}).fill(password);
      await page.getByRole('button',{name:'登录',exact:true}).click();
      await page.getByRole('heading',{name:'知识目录',exact:true}).waitFor();

      await page.keyboard.press('Control+k');
      const search=page.getByLabel('全局搜索关键词',{exact:true});
      await search.fill('JVM');
      await expect(page.locator('.global-search-results')).toHaveAttribute('aria-busy','false');
      const results=page.locator('.search-result');
      assert.ok(await results.count()>2);
      await search.focus();await page.keyboard.press('ArrowUp');
      await expect(results.last()).toBeFocused();
      await search.focus();await page.keyboard.press('ArrowDown');
      await expect(results.first()).toBeFocused();
      await page.keyboard.press('Escape');

      const categories=await (await context.request.get(base+'/api/categories')).json();
      const category=categories.find(c=>c.question_count>15);
      const first=await (await context.request.get(base+'/api/questions?size=15&category='+category.id)).json();
      const question=first.items[14];
      await page.goto(base+'/#/question/'+question.id);
      await page.locator('.reader').waitFor();
      let release,started;
      const gate=new Promise(resolve=>release=resolve),began=new Promise(resolve=>started=resolve);
      const nextPageRoute=async route=>{
        if(new URL(route.request().url()).searchParams.get('page')==='2') { started();await gate; }
        await route.continue();
      };
      await page.route('**/api/questions?*',nextPageRoute);
      await page.getByRole('button',{name:/^下一题(?: →)?$/}).click();await began;
      // 导航会中止在途的分页请求（requestfailed 而非 requestfinished）：先注册事件监听再导航，
      // 断言语义是"请求无论中止或完成都必须落定"，不能悬挂。
      const settled=Promise.race([
        page.waitForEvent('requestfinished',{predicate:request=>new URL(request.url()).searchParams.get('page')==='2'}),
        page.waitForEvent('requestfailed',{predicate:request=>new URL(request.url()).searchParams.get('page')==='2'})
      ]);
      // 手机端阅读态隐藏头部导航（learning.css 的 .reader-open nav{display:none}），
      // 改用两端都有的面包屑"知识目录"离开，语义不变：中途导航触发在途请求中止。
      await page.getByRole('button',{name:'知识目录',exact:true}).click();
      await page.getByRole('heading',{name:'知识目录',exact:true}).waitFor();
      release();await settled;
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await expect(page).toHaveURL(/#\/catalog$/);
      await page.unroute('**/api/questions?*',nextPageRoute);

      await page.goto(base+'/#/question/'+question.id+'/edit');
      const title=page.getByLabel('题目 Markdown',{exact:true});
      await title.click();await page.keyboard.press('Control+a');await page.keyboard.insertText('x'.repeat(1000));
      const titleEditor=page.locator('.markdown-editor').filter({has:title});
      const linkButton=titleEditor.getByRole('button',{name:'插入链接',exact:true});
      if(!await linkButton.isVisible())await titleEditor.getByRole('button',{name:'更多格式',exact:true}).click();
      await linkButton.click();
      await titleEditor.getByLabel('链接文字',{exact:true}).fill('边界链接');
      await titleEditor.getByLabel('链接地址',{exact:true}).fill('https://example.com');
      await titleEditor.getByRole('button',{name:'插入',exact:true}).click();
      await expect(titleEditor.getByRole('alert')).toContainText('本次输入未插入');
      await expect(titleEditor.locator('.editor-link-form')).toBeVisible();
      assert.equal((await title.innerText()).trim(),'x'.repeat(1000));
      await titleEditor.getByRole('button',{name:'取消插入链接',exact:true}).click();

      let saveStarted,releaseSave,saveAttempts=0;
      const saveGate=new Promise(resolve=>releaseSave=resolve),saving=new Promise(resolve=>saveStarted=resolve);
      await page.route('**/api/admin/questions/'+question.id,async route=>{
        assert.equal(route.request().method(),'PUT');saveStarted();await saveGate;
        await route.fulfill(++saveAttempts===1?{status:409,json:{message:'测试保存冲突，请重试'}}:{json:{id:question.id}});
      });
      await page.getByRole('button',{name:'保存',exact:true}).click();await saving;
      await expect(title).toHaveAttribute('contenteditable','false');
      await expect(page.getByLabel('回答 Markdown',{exact:true})).toHaveAttribute('contenteditable','false');
      await expect(page.getByRole('combobox',{name:'知识模块',exact:true})).toBeDisabled();
      await expect(titleEditor.getByRole('button',{name:'加粗',exact:true})).toBeDisabled();
      await page.screenshot({path:'test-results/polish/'+name+'-saving.png',fullPage:true});
      releaseSave();
      await expect(page.locator('.editor-error')).toContainText('测试保存冲突，请重试');
      await expect(title).toHaveAttribute('contenteditable','true');
      await expect(page.getByRole('combobox',{name:'知识模块',exact:true})).toBeEnabled();
      await expect(titleEditor.getByRole('button',{name:'加粗',exact:true})).toBeEnabled();
      await page.getByRole('button',{name:'保存',exact:true}).click();
      await page.locator('.reader').waitFor();assert.equal(saveAttempts,2);
      await page.unroute('**/api/admin/questions/'+question.id);

      // Leave during a pending image upload. A late response must not touch the destroyed editor.
      await page.getByRole('button',{name:/^(编辑题解|添加回答)$/}).click();
      let uploadStarted,releaseUpload;
      const uploadGate=new Promise(resolve=>releaseUpload=resolve),uploading=new Promise(resolve=>uploadStarted=resolve);
      await page.route('**/api/admin/uploads',async route=>{
        uploadStarted();await uploadGate;
        await route.fulfill({json:{url:'/uploads/test-image.png'}}).catch(()=>{});
      });
      await page.locator('.markdown-editor').last().locator('input[type=file]').setInputFiles({name:'image.png',mimeType:'image/png',buffer:Buffer.from('fake provider response')});
      await uploading;
      await page.getByRole('button',{name:'返回',exact:true}).click();
      await page.locator('.confirm-dialog').getByRole('button',{name:'放弃修改',exact:true}).click();
      await page.locator('.reader').waitFor();releaseUpload();
      await page.unrouteAll({behavior:'wait'});
      await expect(page.getByText('图片上传中…',{exact:true})).toHaveCount(0);
      if(name==='desktop') {
        await page.route('**/api/ai/status',route=>route.fulfill({json:{enabled:true,model:'test',chunks:0,vectors:0,documents:0,embeddingConfigured:false}}));
        await page.route('**/api/questions/*/ai',route=>route.fulfill({json:{answer:'x'.repeat(200001),sources:[]}}));
        await page.reload();await page.locator('.reader').waitFor();
        await page.locator('.ai-panel-toggle').click();
        await page.getByRole('button',{name:'生成参考回答',exact:true}).click();
        await page.getByRole('button',{name:'编辑并保存为回答',exact:true}).click();
        await expect(page.getByRole('alert').filter({hasText:'AI 回答超过 200,000'})).toBeVisible();
        await expect(page.locator('.editor')).toHaveCount(0);
        await page.unrouteAll();await page.reload();await page.locator('.reader').waitFor();
      }
      const overflow=await page.evaluate(()=>{
        const vw=innerWidth;
        if(document.documentElement.scrollWidth<=vw) return null;
        const bad=[...document.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>vw+1).slice(0,8).map(el=>el.tagName+'.'+String(el.className).slice(0,60)+' right='+Math.round(el.getBoundingClientRect().right)+' w='+Math.round(el.getBoundingClientRect().width));
        return {vw,dw:document.documentElement.scrollWidth,bad};
      });
      assert.equal(overflow,null,'横向溢出: '+JSON.stringify(overflow));
      assert.deepEqual(errors,[]);
      await page.screenshot({path:'test-results/polish/'+name+'.png'});
      console.log(name+': keyboard search, late page response, rejected link, save freeze and upload cancellation PASS');
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
