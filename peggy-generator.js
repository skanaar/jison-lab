export const peggyGenerator = {
  generateAndApply({ grammar, source, printOut, setStatus }) {
    try {
      const parser = peggy.generate(grammar)
      try {
        printOut(parser.parse(source))
        setStatus('success', 'Success')
      } catch (e) {
        printOut(
          `L${e.location.start.line}:${e.location.start.column} ${e.message}`
        )
        setStatus('warning', 'Failed to parse test source')
      }
    } catch (e) {
      printOut(e.message)
      setStatus('warning', 'Failed to parse grammar')
    }
  },
  defaultGrammer: '',
  defaultSource: '',
}
