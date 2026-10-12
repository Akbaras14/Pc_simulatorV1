const editor=document.querySelector('#documentPage');
const storageKey='bengkelcoding-word-document';
let savedRange=null;
function cleanDocument(html){
  const parsed=new DOMParser().parseFromString(html,'text/html');
  parsed.querySelectorAll('script,style,iframe,object,embed,svg,math').forEach(node=>node.remove());
  const allowed=new Set(['P','DIV','SPAN','BR','B','STRONG','I','EM','U','FONT','UL','OL','LI','TABLE','TBODY','THEAD','TR','TD','TH','H1','H2','H3']);
  for(const node of [...parsed.body.querySelectorAll('*')]){
    if(!allowed.has(node.tagName)){node.replaceWith(...node.childNodes);continue}
    for(const attribute of [...node.attributes]){
      if(!['style','face','size','color','colspan','rowspan'].includes(attribute.name))node.removeAttribute(attribute.name);
    }
    for(const property of [...node.style])if(!['font-family','font-size','font-weight','font-style','text-decoration','text-align','color','background-color'].includes(property))node.style.removeProperty(property);
  }
  return parsed.body.innerHTML;
}
function updateStatus(){
  const text=editor.innerText.trim();document.querySelector('#wordCount').textContent=(text?text.split(/\s+/u).length:0)+' kata';
  for(const button of document.querySelectorAll('[aria-pressed]'))button.setAttribute('aria-pressed',String(document.queryCommandState(button.dataset.command)));
}
function saveDocument(){
  try{
    localStorage.setItem(storageKey,JSON.stringify({html:cleanDocument(editor.innerHTML),orientation:document.querySelector('#orientation').value,margins:document.querySelector('#margins').value}));
    document.querySelector('#saveStatus').textContent='Tersimpan di browser';
  }catch{document.querySelector('#saveStatus').textContent='Belum tersimpan - gunakan Unduh';}
  updateStatus();
  if(parent!==window)parent.postMessage({type:'word-document',text:editor.innerText},location.origin);
}
function applyCommand(command,value=null){
  editor.focus();
  const selection=getSelection();
  if(savedRange&&editor.contains(savedRange.commonAncestorContainer)){selection.removeAllRanges();selection.addRange(savedRange);}
  // Native editing commands preserve selection and the browser undo history.
  document.execCommand(command,false,value);saveDocument();
}
function applyLayout(){
  editor.classList.toggle('landscape',document.querySelector('#orientation').value==='landscape');
  editor.classList.toggle('narrow',document.querySelector('#margins').value==='narrow');saveDocument();
}
try{
  const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
  if(saved&&typeof saved.html==='string'){
    editor.innerHTML=cleanDocument(saved.html);
    document.querySelector('#orientation').value=saved.orientation==='landscape'?'landscape':'portrait';
    document.querySelector('#margins').value=saved.margins==='narrow'?'narrow':'normal';
    editor.classList.toggle('landscape',saved.orientation==='landscape');editor.classList.toggle('narrow',saved.margins==='narrow');
  }
}catch{document.querySelector('#saveStatus').textContent='Dokumen tersimpan tidak dapat dibaca';}
document.addEventListener('selectionchange',()=>{
  const selection=getSelection();if(selection.rangeCount&&editor.contains(selection.getRangeAt(0).commonAncestorContainer)){savedRange=selection.getRangeAt(0).cloneRange();updateStatus();}
});
editor.addEventListener('input',saveDocument);
editor.addEventListener('paste',event=>{event.preventDefault();applyCommand('insertText',event.clipboardData.getData('text/plain'));});
editor.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveDocument();}
});
for(const button of document.querySelectorAll('[data-command]')){
  button.addEventListener('mousedown',event=>event.preventDefault());button.onclick=()=>applyCommand(button.dataset.command);
}
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>{
  for(const tab of document.querySelectorAll('[data-tab]'))tab.setAttribute('aria-selected',String(tab===button));
  for(const panel of document.querySelectorAll('[data-panel]'))panel.hidden=panel.dataset.panel!==button.dataset.tab;
};
document.querySelector('#fontFamily').onchange=event=>applyCommand('fontName',event.target.value);
document.querySelector('#fontSize').onchange=event=>applyCommand('fontSize',event.target.value);
document.querySelector('#fontColor').onchange=event=>applyCommand('foreColor',event.target.value);
document.querySelector('#orientation').onchange=applyLayout;document.querySelector('#margins').onchange=applyLayout;
document.querySelector('#insertTable').onclick=()=>applyCommand('insertHTML','<table><tbody><tr><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td><td><br></td></tr></tbody></table><p><br></p>');
document.querySelector('#insertDate').onclick=()=>applyCommand('insertText',new Date().toLocaleDateString('id-ID'));
document.querySelector('#zoom').oninput=event=>{editor.style.zoom=Number(event.target.value)/100;document.querySelector('#zoomValue').textContent=event.target.value+'%';};
document.querySelector('#printDocument').onclick=()=>print();
document.querySelector('#saveFile').onclick=()=>{
  saveDocument();
  const html='<!doctype html><html lang="id"><meta charset="utf-8"><title>Dokumen 1</title><style>body{max-width:794px;margin:40px auto;font:16px Arial;line-height:1.5}table{border-collapse:collapse;width:100%}td,th{border:1px solid;padding:8px}</style><body>'+cleanDocument(editor.innerHTML)+'</body></html>';
  const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='Dokumen-1.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
if(parent!==window){document.querySelector('#closeWord').hidden=false;document.querySelector('#closeWord').onclick=()=>{saveDocument();parent.postMessage({type:'word-close'},location.origin);};}
updateStatus();
