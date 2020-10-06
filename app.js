
function throttle(delay, action) {
  var paused = false
  var triggered = false
  function onReleaseThrottle() {
    if (triggered) action()
    paused = false
  }
  return function (){
    if (!paused) {
      action()
      paused = true
      setTimeout(onReleaseThrottle, delay)
    } else {
      triggered = true
    }
  }
}

function App(editor, elements) {
  var isGrammarValid = false
  var parser, parser2;
  
  setTimeout(run, 0);

  elements.parse_btn.addEventListener('click', run);
  editor.on('change', throttle(1000, run));
  elements.source.addEventListener('input', throttle(1000, run));
  
  var currentFile = 'Home'
  elements.delete_file.disabled = true
  function save(res, src) {
    return localStorage['jison.file/'+currentFile+'/'+res] = src;
  }
  function load(res) {
    var src = localStorage['jison.file/'+currentFile+'/'+res]
    if (currentFile == 'Home' && !src) {
      return (res == 'grammar') ? defaultGrammar() : defaultSource()
    }
    return src
  }
  
  function jsonParse(input) {
    try { return JSON.parse(input) }
    catch (e) { return undefined }
  }
  
  function init() {
    function renderOption(label) {
      var opt = document.createElement('option');
      opt.append(label);
      opt.value = label; 
      elements.file_chooser.appendChild(opt); 
    }
    var files = jsonParse(localStorage['jison.files']) || []
    elements.file_chooser.innerHTML = ''
    renderOption('Home')
    for(var file of files) {
      renderOption(file)
    }
    elements.file_chooser.value = currentFile
    editor.setValue(load('grammar'));
    source.value = load('source');
  }
  
  init()
  elements.file_chooser.addEventListener('change', e => {
    currentFile = e.target.value;
    elements.delete_file.disabled = (currentFile == 'Home')
    init()
    run()
  })
  elements.delete_file.addEventListener('click', () => {
    var question = 'This will remove the file "'+currentFile+'".\n\nAre you sure?';
    if (currentFile != 'Home' && confirm(question)){
      var files = new Set(jsonParse(localStorage['jison.files']) || [])
      files.delete(currentFile)
      localStorage['jison.files'] = JSON.stringify(Array.from(files))
      currentFile = 'Home'
      init()
    }
  })
  elements.save_as.addEventListener('click', () => {
    var name = prompt('Save this grammar as:')
    if (!name) return;
    var files = jsonParse(localStorage['jison.files']) || []
    files.push(name)
    localStorage['jison.files'] = JSON.stringify(Array.from(new Set(files)))
    currentFile = name
    save('grammar', editor.getValue())
    save('source', source.value)
    init()
  })
  editor.on('change', () => save('grammar', editor.getValue()))
  source.addEventListener('input', () => save('source', source.value))

  function printOut(str) {
    elements.output.innerText += str;
  }

  function run() {
    elements.output.classList.remove("good");
    elements.output.classList.remove("bad");
    elements.output.innerText = '';
    processGrammar()
    if (isGrammarValid) runParser()
  }

  function processGrammar () {
    isGrammarValid = false;
    var grammar = editor.getValue();
    try {
      var cfg = bnf.parse(grammar);
    } catch (e) {
      printOut("Oops. Make sure your grammar is in the correct format.\n"+e);
      elements.message.innerText = "⚠️ Failed to parse grammar";
      elements.message.classList.add('warning');
      return;
    }

    if (cfg.moduleInclude) {
      // put the %{ ... %} preamble in the global scope
      eval.call(window, cfg.moduleInclude)
    }
    Jison.print = function () {};
    parser = Jison.Generator(cfg, {type: 'lalr'});

    if (parser.conflicts) {
      printOut('Conflicts encountered:\n');
      elements.message.innerText = "⚠️ Conflicts encountered (" + parser.conflicts + ")";
      elements.message.classList.add('warning');
    }

    parser.resolutions.forEach(function (res) {
      var r = res[2];
      if (!r.bydefault) return;
      printOut(`${r.msg}\n(${r.s}, ${r.r}) -> ${r.action}\n`);
    });

    parser2 = parser.createParser();
    isGrammarValid = parser.conflicts == 0;
  }

  function runParser () {
    if (!isGrammarValid) return;
    if (!parser) processGrammar();
    var source = elements.source.value;
    try {
      printOut(stringify(parser2.parse(source), {maxLength:100}));
      elements.message.innerText = "Success";
      elements.message.classList.remove('warning');
    } catch(e) {
      printOut(e.message || e);
      elements.message.innerText = "⚠️ Failed to parse test source";
      elements.message.classList.add('warning');
    }
  }
  
  function defaultSource() {
    return '1*(4+5)/PI'
  }
  
  function defaultGrammar() {
    return `/* description: Parses end executes mathematical expressions. */

%{
function factorial(n){
  return n==0 ? 1 : factorial(n-1) * n;
}
%}

/* lexical grammar */
%lex
%%

s+                   /* skip whitespace */
[0-9]+("."[0-9]+)?  return 'NUMBER'
"*"                   return '*'
"/"                   return '/'
"-"                   return '-'
"+"                   return '+'
"^"                   return '^'
"!"                   return '!'
"%"                   return '%'
"("                   return '('
")"                   return ')'
"PI"                  return 'PI'
"E"                   return 'E'
<<EOF>>               return 'EOF'
.                     return 'INVALID'

/lex

/* operator associations and precedence */

%left '+' '-'
%left '*' '/'
%left '^'
%right '!'
%right '%'
%left UMINUS

%start expressions

%% /* language grammar */

expressions 
  : e EOF { return $e; } ;

e
  : e '+' e            {$$ = $1+$3; }
  | e '-' e            {$$ = $1-$3; }
  | e '*' e            {$$ = $1*$3; }
  | e '/' e            {$$ = $1/$3; }
  | e '^' e            {$$ = Math.pow($1, $3); }
  | e '!'              {$$ = factorial($1); }
  | e '%'              {$$ = $1/100; }
  | '-' e %prec UMINUS {$$ = -$2; }
  | '(' e ')'          {$$ = $2; }
  | NUMBER             {$$ = Number(yytext); }
  | E                  {$$ = Math.E; }
  | PI                 {$$ = Math.PI; }
  ;`
  }
}
