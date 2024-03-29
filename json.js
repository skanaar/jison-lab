export function jsonParse(input) {
  try {
    return JSON.parse(input)
  } catch (e) {
    return undefined
  }
}

// options: { compact: boolean, indent: string? }
export function stringify(obj, options) {
  // Note: This regex matches even invalid JSON strings, but since we’re
  // working on the output of `JSON.stringify` we know that only valid strings
  // are present (unless the user supplied a weird `options.indent` but in
  // that case we don’t care since the output would be invalid anyway).
  var stringOrChar = /("(?:[^"]|\\.)*")|[:,]/g
  function prettify(string) {
    return string.replace(stringOrChar, function (match, string) {
      return string ? match : match + ' '
    })
  }

  function get(options, name, defaultValue) {
    return name in options ? options[name] : defaultValue
  }
  options = options || {}
  var indent = JSON.stringify([1], null, get(options, 'indent', 2)).slice(2, -3)
  var maxLength = indent === '' ? Infinity : get(options, 'maxLength', 80)

  var output = (function _stringify(obj, currentIndent, reserved) {
    if (obj && typeof obj.toJSON === 'function') {
      obj = obj.toJSON()
    }

    var string = JSON.stringify(obj)

    if (string === undefined) {
      return string
    }

    var length = maxLength - currentIndent.length - reserved

    if (string.length <= length) {
      if (options.compact) {
        return string
      }
      var prettified = prettify(string)
      if (prettified.length <= length) {
        return prettified
      }
    }

    if (typeof obj === 'object' && obj !== null) {
      var nextIndent = currentIndent + indent
      var items = []
      var delimiters
      var comma = function (array, index) {
        return index === array.length - 1 ? 0 : 1
      }

      if (Array.isArray(obj)) {
        for (var index = 0; index < obj.length; index++) {
          items.push(
            _stringify(obj[index], nextIndent, comma(obj, index)) || 'null'
          )
        }
        delimiters = '[]'
      } else {
        Object.keys(obj).forEach(function (key, index, array) {
          var keyPart = JSON.stringify(key) + ': '
          var value = _stringify(
            obj[key],
            nextIndent,
            keyPart.length + comma(array, index)
          )
          if (value !== undefined) {
            items.push(keyPart + value)
          }
        })
        delimiters = '{}'
      }

      if (items.length > 0) {
        return [
          delimiters[0],
          indent + items.join(',\n' + nextIndent),
          delimiters[1],
        ].join('\n' + currentIndent)
      }
    }
    return string
  })(obj, '', 0)

  if (get(options, 'omitKeyQuotes', true))
    return output.replace(/"([a-zA-Z_0-9]+)": ?/g, '$1:')

  return output
}
