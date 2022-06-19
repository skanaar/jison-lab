export function throttle(delay, action) {
  var paused = false
  var triggered = false
  function onReleaseThrottle() {
    if (triggered) action()
    paused = false
  }
  return function () {
    if (!paused) {
      action()
      paused = true
      setTimeout(onReleaseThrottle, delay)
    } else {
      triggered = true
    }
  }
}
