import { stringify, jsonParse } from './json.js'
import { throttle } from './throttle.js'

export function App(generator, editor, elements) {
  const { defaultSource, defaultGrammar, generateAndApply } = generator
  var isPaused = true

  elements.parse_btn.addEventListener('click', run)
  editor.on('change', throttle(1000, run))
  elements.source.addEventListener('input', throttle(1000, run))

  var currentFile = 'Home'
  elements.delete_file.disabled = true

  init()

  function save(res, src) {
    return (localStorage['jison.file/' + currentFile + '/' + res] = src)
  }

  function load(res) {
    var src = localStorage['jison.file/' + currentFile + '/' + res]
    if (currentFile == 'Home' && !src) {
      return res == 'grammar' ? defaultGrammar : defaultSource
    }
    return src
  }

  function init() {
    function renderOption(label) {
      var opt = document.createElement('option')
      opt.append(label)
      opt.value = label
      elements.file_chooser.appendChild(opt)
    }
    var files = jsonParse(localStorage['jison.files']) || []
    elements.file_chooser.innerHTML = ''
    renderOption('Home')
    for (var file of files) {
      renderOption(file)
    }
    isPaused = true
    elements.file_chooser.value = currentFile
    editor.setValue(load('grammar'))
    source.value = load('source')
    isPaused = false
    run()
  }

  elements.file_chooser.addEventListener('change', (e) => {
    currentFile = e.target.value
    elements.delete_file.disabled = currentFile == 'Home'
    init()
  })
  elements.delete_file.addEventListener('click', () => {
    var question =
      'This will remove the file "' + currentFile + '".\n\nAre you sure?'
    if (currentFile != 'Home' && confirm(question)) {
      var files = new Set(jsonParse(localStorage['jison.files']) || [])
      files.delete(currentFile)
      localStorage['jison.files'] = JSON.stringify(Array.from(files))
      currentFile = 'Home'
      init()
    }
  })
  elements.save_as.addEventListener('click', () => {
    var name = prompt('Save this grammar as:')
    if (!name) return
    var files = jsonParse(localStorage['jison.files']) || []
    files.push(name)
    localStorage['jison.files'] = JSON.stringify(Array.from(new Set(files)))
    currentFile = name
    save('grammar', editor.getValue())
    save('source', source.value)
    init()
  })
  editor.on('change', () => save('grammar', editor.getValue()))
  source.addEventListener('input', () => save('source', source.value))

  function printOut(msg) {
    const str =
      'string' === typeof msg ? msg : stringify(msg, { maxLength: 100 })
    elements.output.innerText += str
  }

  function setStatus(level, message) {
    elements.message.classList.remove('warning')
    elements.message.classList.remove('success')
    elements.message.classList.add(level)
    elements.message.innerText = message
  }

  function run() {
    elements.output.classList.remove('good')
    elements.output.classList.remove('bad')
    elements.output.innerText = ''
    if (!isPaused) {
      generateAndApply({
        grammar: editor.getValue(),
        source: elements.source.value,
        printOut,
        setStatus,
      })
    }
  }
}
