const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements={},context={document:{querySelector:id=>elements[id]||(elements[id]={}),querySelectorAll:()=>[]},addEventListener(){},location:{origin:'http://calculator.test'}};context.window=context;context.parent=context;
vm.createContext(context);vm.runInContext(fs.readFileSync('src/calculator.js','utf8'),context);
function action(name,value){vm.runInContext('calculatorAction('+JSON.stringify(name)+','+JSON.stringify(value)+')',context)}
function number(value){for(const digit of String(value))action(digit==='.'?'decimal':'digit',digit)}
function result(){return elements['#result'].textContent}
function clear(){action('clear')}
for(const [a,op,b,expected]of [[12,'+',3,'15'],[9,'-',2,'7'],[4,'*',5,'20'],[9,'/',2,'4,5'],[0.1,'+',0.2,'0,3']]){clear();number(a);action('operator',op);number(b);action('equals');assert.equal(result(),expected)}
clear();number(2);action('operator','+');number(3);action('operator','*');number(4);action('equals');assert.equal(result(),'20','Standard calculator evaluates chained operations in order');action('equals');assert.equal(result(),'80');
clear();number(200);action('operator','+');number(10);action('percent');action('equals');assert.equal(result(),'220');
clear();number(200);action('operator','*');number(10);action('percent');action('equals');assert.equal(result(),'20');
clear();number(9);action('sqrt');assert.equal(result(),'3');action('square');assert.equal(result(),'9');action('inverse');assert.equal(result(),'0,111111111111');
clear();number(4);action('sign');action('sqrt');assert(result().includes('negatif'));number(7);assert.equal(result(),'7','Typing recovers from an error');
clear();number(2);action('operator','/');number(0);action('equals');assert(result().includes('nol'));action('ce');assert.equal(result(),'0');
clear();number(123);action('backspace');assert.equal(result(),'12');action('decimal');number(5);assert.equal(result(),'12,5');
clear();number(10);action('operator','+');number(99);action('ce');number(2);action('equals');assert.equal(result(),'12');
clear();number(5);action('MS');clear();action('MR');assert.equal(result(),'5');action('M+');clear();action('MR');assert.equal(result(),'10');action('MC');assert.equal(elements['#memoryStatus'].textContent,'');
console.log('Calculator: arithmetic, decimal precision, chaining, repeated equals, percent, unary operations, errors and memory OK.');
