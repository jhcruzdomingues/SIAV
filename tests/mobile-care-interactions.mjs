// Optional interaction regression: start the local Vite server before running.
const { chromium, devices } = await import(process.env.SIAV_PLAYWRIGHT_MODULE || 'playwright');
import { execFileSync } from 'node:child_process';
const baseURL = process.env.SIAV_TEST_URL || 'http://127.0.0.1:5173/';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseURL).hostname)) throw new Error('Use only a loopback test server.');
const browser = await chromium.launch({headless:true, ...(process.env.SIAV_CHROMIUM_PATH ? {executablePath:process.env.SIAV_CHROMIUM_PATH} : {})});
try {
const context = await browser.newContext({...devices[process.env.MOBILE_DEVICE || 'iPhone 13'],serviceWorkers:'block'});
// Only the public CDN is allowed. No successful Auth or backend writes.
// The curl option works around the managed browser CA issue without disabling TLS.
await context.route('https://**/*',async route=>{
 const url=route.request().url();
 if(new URL(url).hostname==='cdn.jsdelivr.net') {
  if (process.env.SIAV_CDN_VIA_CURL !== '1') { await route.continue(); return; }
  try {const body=execFileSync('curl',['-fsSL','--max-time','20',url]);await route.fulfill({body,contentType:'application/javascript'});}catch{await route.abort();}
 } else await route.abort();
});
const page=await context.newPage();
page.setDefaultTimeout(8000);
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});
page.on('dialog',dialog=>dialog.dismiss());
const assert=(ok,message)=>{if(!ok)throw new Error(message);console.log('PASS',message)};
await page.goto(baseURL);
await page.waitForFunction(()=>!!window.SIAV);
await page.locator('#start-pcr-card').tap();
await page.locator('#patient-adult-protocol').check();
await page.locator('#patient-name').fill('PACIENTE SINTETICO MOBILE');
await page.locator('#patient-weight').fill('70.5');
assert(!await page.locator('#patient-additional-details').getAttribute('open'),'dados adicionais recolhidos');
await page.locator('#patient-form button[type="submit"]').tap();
await page.locator('#patient-modal').waitFor({state:'hidden'});
assert(await page.evaluate(()=>window.SIAV.state.patient.algorithm)==='adult','seleção explícita do algoritmo');
assert(await page.evaluate(()=>window.SIAV.state.patient.age)==='N/I','idade ausente não inferida');
await page.locator('#compressions-btn').tap();
await page.waitForTimeout(1100);
await page.locator('#pause-compressions-btn').tap();
const deadline=await page.evaluate(()=>window.compressionCycle.deadline);
await page.locator('#compressions-btn').tap();
assert(await page.evaluate(()=>window.compressionCycle.deadline)===deadline,'retomada mantém prazo do ciclo');
await page.locator('#rhythm-conduta-btn').tap();
await page.locator('[data-rhythm="AESP"]').tap();
await page.locator('#submit-rhythm-selection-btn').tap();
await page.locator('#med-btn').tap();
await page.locator('[data-med="adrenalina"]').tap();
assert(await page.locator('#medication-dose').inputValue()==='1','dose numérica devida preenchida');
assert(!await page.locator('#medication-confirmed').isVisible(),'sem checkbox no caminho padronizado');
assert(await page.evaluate(()=>window.SIAV.state.medications.length)===0,'seleção não registra administração');
const actionBox=await page.locator('#record-med-btn').boundingBox();
console.log('ACTION_BOX',actionBox);
assert(actionBox.y>=0 && actionBox.y+actionBox.height<=page.viewportSize().height,'ação padronizada visível sem rolar até outros campos');
await page.locator('#record-med-btn').tap();
assert(await page.evaluate(()=>window.SIAV.state.medications.length)===1,'um toque deliberado registra dose');
await page.locator('#med-modal').waitFor({state:'hidden'});
await page.locator('#med-btn').tap();
await page.locator('[data-med="adrenalina"]').tap();
assert(await page.locator('#medication-dose').inputValue()==='','sem prefill fora da oportunidade');
await page.locator('#medication-dose').fill('2');
await page.locator('#medication-confirmed').check();
await page.locator('#record-med-btn').tap();
assert(await page.evaluate(()=>window.SIAV.state.medications.at(-1).requiresReview),'edição manual preservada com revisão');
assert(await page.evaluate(()=>window.SIAV.state.medications.at(-1).amount)===2,'quantidade real editada');
await page.locator('#med-modal').waitFor({state:'hidden'});
await page.locator('#patient-info-display').tap();
assert(await page.locator('#patient-form button[type="submit"]').textContent()==='SALVAR ALTERAÇÕES','edição usa ação correta');
await page.locator('#cancel-patient-btn').tap();
page.removeAllListeners('dialog'); page.on('dialog',dialog=>dialog.accept());
await page.locator('#finish-pcr-btn').tap();
await page.locator('#start-pcr-card').tap();
assert(await page.locator('#start-pcr-no-data-btn').isVisible(),'novo preparo restaura início sem dados');
assert(await page.locator('#patient-form button[type="submit"]').textContent()==='INICIAR ATENDIMENTO','novo preparo restaura ação de início');
assert(await page.locator('#patient-name').inputValue()==='','novo preparo não herda nome');
assert(!await page.locator('#patient-adult-protocol').isChecked(),'novo preparo não presume algoritmo');
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'sem corte horizontal');
assert(errors.length===0,'sem erros JavaScript');
console.log('DEVICE',process.env.MOBILE_DEVICE || 'iPhone 13');
} finally {
 await browser.close();
}
