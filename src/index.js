const pify = require('pify')
const ThroughStream = require('readable-stream').PassThrough
const debounce = require('lodash.debounce')
const endOfStream = pify(require('end-of-stream'))
const noop = () => {}

module.exports = {
  substreamOnActive,
  createSubstreamer,
  onStreamActive,
  onStreamIdle,
}


// continuously create new child streams, calling handler on active
function substreamOnActive(parentStream, opts, handler) {
  const delay = opts.delay
  const next = createSubstreamer(parentStream, opts)
  setupListeners()

  function setupListeners () {
    let childStream = next()
    onStreamActive(parentStream, () => handler(childStream))
    onStreamIdle(parentStream, delay, () => setupListeners())
  }
}

// call handler once after stream has become active
function onStreamActive(stream, handler) {
  stream.once('data', handler)
}

// call handler once after stream has become active, then gone idle
function onStreamIdle(stream, delay, handler) {
  const nextDataHandler = debounce(onIdle, delay)
  stream.on('data', nextDataHandler)
  function onIdle(chunk) {
    stream.removeListener('data', nextDataHandler)
    handler()
  }
}

// returns a function that ends the old childstream and sets up the next childstream
function createSubstreamer(parentStream, opts) {
  let currentSubstream

  function next() {
    // stop flow
    parentStream.pause()

    // end current substream
    if (currentSubstream) {
      parentStream.unpipe(currentSubstream)
      currentSubstream.end()
    }

    // get next substream and start flow
    currentSubstream = new ThroughStream(opts)
    parentStream.pipe(currentSubstream)

    // re-enable flow on next tick so childStream consumer can
    // setup handlers before anything is flowing
    setTimeout(() => parentStream.resume())

    return currentSubstream
  }

  return next
}
