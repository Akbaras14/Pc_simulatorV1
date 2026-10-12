let display='0',stored=null,operation=null,waiting=false,lastOperation=null,lastOperand=null,memory=null,expression='';
const symbols={'+':'+','-':'\u2212','*':'\u00d7','/':'\u00f7'};
function formatNumber(value){if(!Number.isFinite(value))throw new Error('Hasil di luar batas');return String(Number(value.toPrecision(12)));}
function compute(a,b,op){if(op==='/'&&b===0)throw new Error('Tidak dapat membagi dengan nol');return op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:a/b;}
function resetCalculator(){display='0';stored=null;operation=null;waiting=false;lastOperation=null;lastOperand=null;expression='';}
function renderCalculator(){
  document.querySelector('#result').textContent=display.replace('.',',');document.querySelector('#expression').textContent=expression;
  document.querySelector('#memoryStatus').textContent=memory===null?'':'M';
  for(const button of document.querySelectorAll('[data-action="MC"],[data-action="MR"]'))button.disabled=memory===null;
  if(parent!==window)parent.postMessage({type:'calculator-result',text:display},location.origin);
}
function calculatorAction(action,value){
  try{
    if(action==='clear')resetCalculator();
    else if(action==='MC')memory=null;
    else if(action==='ce'){display='0';waiting=false;}
    else if(action==='digit'||action==='decimal'){
      if(waiting||!Number.isFinite(Number(display))){if(!operation){stored=null;lastOperation=null;expression='';}display='0';waiting=false;}
      if(action==='decimal'){if(!display.includes('.'))display+='.';}
      else if(display.replace(/[-.]/g,'').length<16)display=display==='0'?value:display+value;
    }else if(action==='backspace'){if(!waiting){display=display.slice(0,-1);if(!display||display==='-')display='0';}}
    else if(action==='operator'){
      const number=Number(display);if(!Number.isFinite(number))return;
      if(operation&&!waiting){display=formatNumber(compute(stored,number,operation));stored=Number(display);}
      else if(stored===null||!waiting)stored=number;
      operation=value;waiting=true;lastOperation=null;expression=formatNumber(stored)+' '+symbols[value];
    }else if(action==='equals'){
      if(operation){const operand=Number(display);display=formatNumber(compute(stored,operand,operation));expression=formatNumber(stored)+' '+symbols[operation]+' '+formatNumber(operand)+' =';lastOperation=operation;lastOperand=operand;operation=null;stored=null;waiting=true;}
      else if(lastOperation){const number=Number(display);display=formatNumber(compute(number,lastOperand,lastOperation));expression=formatNumber(number)+' '+symbols[lastOperation]+' '+formatNumber(lastOperand)+' =';waiting=true;}
    }else if(['sign','sqrt','square','inverse','percent'].includes(action)){
      const number=Number(display);if(!Number.isFinite(number))return;
      if(action==='sqrt'&&number<0)throw new Error('Angka negatif tidak memiliki akar real');
      const result=action==='sign'?-number:action==='sqrt'?Math.sqrt(number):action==='square'?number*number:action==='inverse'?compute(1,number,'/'):operation==='+'||operation==='-'?stored*number/100:number/100;
      display=formatNumber(result);waiting=false;
    }else if(action.startsWith('M')){
      const number=Number(display);if(!Number.isFinite(number))return;
      if(action==='MC')memory=null;else if(action==='MR'&&memory!==null){display=formatNumber(memory);waiting=true;}else if(action==='MS')memory=number;else if(action==='M+')memory=Number(formatNumber((memory||0)+number));else if(action==='M-')memory=Number(formatNumber((memory||0)-number));
    }
  }catch(error){display=error.message;stored=null;operation=null;lastOperation=null;waiting=true;expression='';}
  renderCalculator();
}
for(const button of document.querySelectorAll('[data-action]'))button.onclick=()=>calculatorAction(button.dataset.action,button.dataset.value);
addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey)return;
  const key=event.key;
  if(/^\d$/.test(key))calculatorAction('digit',key);
  else if(['+','-','*','/'].includes(key))calculatorAction('operator',key);
  else if(key==='.'||key===',')calculatorAction('decimal');
  else if(key==='Enter'||key==='=')calculatorAction('equals');
  else if(key==='Escape')calculatorAction('clear');
  else if(key==='Delete')calculatorAction('ce');
  else if(key==='Backspace')calculatorAction('backspace');
  else if(key==='%')calculatorAction('percent');
  else return;event.preventDefault();
});
if(parent!==window){document.querySelector('#closeCalculator').hidden=false;document.querySelector('#closeCalculator').onclick=()=>parent.postMessage({type:'calculator-close'},location.origin);}
renderCalculator();
