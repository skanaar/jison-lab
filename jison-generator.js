export const jisonGenerator = {
  generateAndApply({ grammar, source, printOut, setStatus }) {
    var isGrammarValid = false
    var parser, parser2

    function processGrammar(grammar) {
      isGrammarValid = false
      try {
        var cfg = bnf.parse(grammar)
      } catch (e) {
        printOut('Oops. Make sure your grammar is in the correct format.\n' + e)
        setStatus('warning', '⚠️ Failed to parse grammar')
        return
      }

      if (cfg.moduleInclude) {
        // put the %{ ... %} preamble in the global scope
        eval.call(window, cfg.moduleInclude)
      }
      Jison.print = function () {}
      parser = Jison.Generator(cfg, { type: 'lalr' })

      if (parser.conflicts) {
        printOut('Conflicts encountered:\n')
        setStatus(
          'warning',
          '⚠️ Conflicts encountered (' + parser.conflicts + ')'
        )
      }

      parser.resolutions.forEach(function (res) {
        var r = res[2]
        if (!r.bydefault) return
        printOut(`${r.msg}\n(${r.s}, ${r.r}) -> ${r.action}\n`)
      })

      parser2 = parser.createParser()
      isGrammarValid = parser.conflicts == 0
    }

    function runParser(source) {
      if (!isGrammarValid) return
      if (!parser) processGrammar(editor.getValue())
      try {
        printOut(parser2.parse(source))
        setStatus('success', 'Success')
      } catch (e) {
        printOut(e.message || e)
        setStatus('warning', '⚠️ Failed to parse test source')
      }
    }

    processGrammar(grammar)
    runParser(source)
  },

  defaultSource: '1*(4+5)/PI',
  defaultGrammar: `/* description: Parses end executes mathematical expressions. */

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
  ;`,
}
