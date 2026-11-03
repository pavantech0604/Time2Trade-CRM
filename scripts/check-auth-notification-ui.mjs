// Browser QA against real components and CSS using isolated account fixtures.
// Pass a folder containing Playwright; uses a fresh headless Chrome profile.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { build } = require('esbuild');
const browserRequire = createRequire(resolve(process.argv[2] || '.', 'package.json'));
const { chromium } = browserRequire('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const output = join(tmpdir(), 'time2trade-ui-qa');
await mkdir(output, { recursive: true });
const cssFile = (await readdir(join(root, 'dist/assets'))).find(file => file.endsWith('.css'));
const css = await readFile(join(root, 'dist/assets', cssFile));
const entry = `
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LoginPage} from './src/components/auth/LoginPage';
import {SignupPage} from './src/components/auth/SignupPage';
import {PendingApprovalPage} from './src/components/auth/PendingApprovalPage';
import {NotificationCenter} from './src/components/notifications/NotificationCenter';
window.__AuthContext=React.createContext(null); window.__events=[];
function Fixture(){
 const params=new URLSearchParams(location.search); const role=params.get('role')||'employee';
 const [view,setView]=useState(params.get('view')||'login'); const [open,setOpen]=useState(false);
 const user={id:role,name:role==='employee'?'Alex Employee':role==='manager'?'Karthik Manager':'Pavan Admin',role};
 const [notices,setNotices]=useState([
  {id:'payment',user_id:role,title:'Payment submitted',message:'Own client awaiting verification',category:'sales',is_read:false,amount:1000,created_at:'2026-11-03T01:00:00Z',action_tab:role==='employee'?'employee-dashboard':role==='admin'?'payment-verification':'employee-sales',action_label:'Review payment'},
  {id:'account',user_id:role,title:'Profile updated',message:'Your profile details were saved.',category:'system',is_read:false,created_at:'2026-11-03T01:00:00Z',action_tab:'my-profile'},
  {id:'restricted',user_id:role,title:'Old restricted link',message:'This link must respect your current role.',category:'system',is_read:true,created_at:'2026-11-03T01:00:00Z',action_tab:'expenses'},
  {id:'private',user_id:'another-user',title:'Private other employee',message:'Must never be displayed',category:'sales',is_read:false,created_at:'2026-11-03T01:00:00Z'}
 ]);
 const auth={currentUser:view==='notifications'?user:null,loading:false,notifications:notices,
 login:async()=>({success:false,status:'error',message:'Fixture login rejected'}), signup:async()=>({success:false,message:'Fixture signup rejected'}),
 markNotificationRead:(id,is_read=true)=>setNotices(n=>n.map(item=>item.id===id?{...item,is_read}:item)),
 markAllNotificationsRead:()=>setNotices(n=>n.map(item=>item.user_id===role?{...item,is_read:true}:item)),
 deleteNotification:id=>setNotices(n=>n.filter(item=>item.id!==id)),clearAllNotifications:()=>setNotices(n=>n.filter(item=>item.user_id!==role))};
 return <window.__AuthContext.Provider value={auth}>{view==='pending'?<PendingApprovalPage onBackToLogin={()=>setView('login')}/>:view==='signup'?<SignupPage onNavigateToLogin={()=>setView('login')} onSignupSuccess={()=>{}}/>:view==='login'?<LoginPage onNavigateToSignup={()=>setView('signup')}/>:<><button id="open-alerts" onClick={()=>setOpen(true)}>Open notifications</button><NotificationCenter isOpen={open} onClose={()=>setOpen(false)} onNavigate={tab=>{window.__events.push(tab);setOpen(false)}}/></>}</window.__AuthContext.Provider>;
} createRoot(document.getElementById('root')).render(<Fixture/>);`;
const result = await build({ stdin: { contents: entry, resolveDir: root, loader: 'tsx' }, bundle: true, write: false,
  format: 'iife', platform: 'browser', define: { 'import.meta.env': '{}' },
  plugins: [{ name: 'mock-auth', setup(plugin) {
    plugin.onResolve({ filter: /context\/AuthContext$/ }, () => ({ path: 'mock-auth', namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `import React from 'react'; export const useAuth=()=>React.useContext(window.__AuthContext);`, loader: 'js', resolveDir: root }));
  } }] });
const javascript = result.outputFiles[0].contents;
const server = createServer((req,res) => {
  if (req.url === '/fixture.js') { res.setHeader('Content-Type','application/javascript'); res.end(javascript); }
  else if (req.url === '/style.css') { res.setHeader('Content-Type','text/css'); res.end(css); }
  else if (req.url === '/logo-tight.png') { readFile(join(root,'public/logo-tight.png')).then(data=>{res.setHeader('Content-Type','image/png');res.end(data)}); }
  else { res.setHeader('Content-Type','text/html'); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>'); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
 const sizes = [[320,568],[375,667],[390,844],[768,1024],[1366,768],[1440,900],[844,390]];
 for (const [width,height] of sizes) {
  const page = await browser.newPage({viewport:{width,height}});
  for (const view of ['login','signup','pending']) {
   await page.goto(origin+'/?view='+view);
   await page.locator('.auth-card').waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), `${view}: horizontal overflow at ${width}`);
   assert.ok(await page.locator('.auth-scroll').evaluate(node=>{const r=node.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1}), `${view}: scroll area must fit viewport`);
   const button=view==='pending'?page.getByRole('button',{name:'Return to Staff Sign In'}):page.locator('button[type="submit"]'); await button.scrollIntoViewIfNeeded();
   const bounds=await button.boundingBox(); assert.ok(bounds.y>=0&&bounds.y+bounds.height<=height, `${view}: submit unreachable at ${width}x${height}`);
   if ((width===390&&view==='login')||(width===1366&&view==='signup')) await page.screenshot({path:join(output,`${view}-${width}.png`)});
   if(view==='login') {
    await page.locator('#login-email').fill('fixture@example.test');
    await page.locator('#login-password').fill('Fixture-only!982');
    await button.click(); await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('alert').evaluate(node=>node===document.activeElement),true,'Login error must receive focus');
   } else if(view==='signup') {
    await page.locator('#signup-name').fill('Fixture Employee');
    await page.locator('#signup-email').fill('fixture@example.test');
    await page.locator('#signup-password').fill('Fixture-only!982');
    await page.locator('#signup-confirm').fill('Different-only!823');
    await button.click(); await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('alert').evaluate(node=>node===document.activeElement),true,'Signup error must receive focus');
   }
  }
  await page.goto(origin+'/?view=notifications'); await page.locator('#open-alerts').click();
  const dialog=page.getByRole('dialog'); await dialog.waitFor(); if(width===390) await page.screenshot({path:join(output,'notifications-390.png')}); const box=await dialog.boundingBox();
  assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height, `Notification panel clipped at ${width}x${height}`);
  await page.keyboard.press('Escape'); assert.equal(await dialog.count(),0); assert.equal(await page.locator('#open-alerts').evaluate(node=>node===document.activeElement),true);
  await page.close();
 }
 for (const role of ['employee','manager','admin']) {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(origin+'/?view=notifications&role='+role); await page.locator('#open-alerts').click();
  assert.equal(await page.getByText('Private other employee').count(),0);
  await page.getByRole('button',{name:'Unread',exact:true}).click(); assert.equal(await page.locator('article').count(),2);
  await page.getByRole('button',{name:'Mark all read',exact:true}).click(); assert.equal(await page.locator('article').count(),0);
  await page.getByRole('button',{name:'All',exact:true}).click();
  await page.getByRole('button',{name:'Mark unread',exact:true}).first().click(); assert.equal(await page.getByText('1 unread',{exact:true}).count(),1);
  await page.getByRole('button',{name:'Dismiss Profile updated',exact:true}).click(); assert.equal(await page.getByRole('heading',{name:'Profile updated',exact:true}).count(),0);
  if(role!=='admin') { assert.equal(await page.getByRole('heading',{name:'Old restricted link'}).count(),0); assert.deepEqual(await page.evaluate(()=>window.__events),[]); }
  await page.getByRole('button').filter({has:page.getByRole('heading',{name:'Payment submitted'})}).click();
  assert.deepEqual(await page.evaluate(()=>window.__events),[role==='employee'?'employee-dashboard':role==='admin'?'payment-verification':'employee-sales']);
  await page.close();
 }
 console.log('Browser QA passed: 7 viewport sizes, auth reachability, notification boundaries, account privacy, filters, read/unread, dismiss, role navigation and Escape/focus.');
 console.log('Screenshots: '+output);
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
