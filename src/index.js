const pify = require('pify')
const ThroughStream = require('readable-stream').PassThrough
const debounce = require('lodash.debounce')
const endOfStream = pify(require('end-of-stream'))
const noop = () => {}

module.exports = substreamOnActive
module.exports.createSubstream = createSubstream
module.exports.onStreamIdle = onStreamIdle

// continuously create new child streams, calling handler on active
function substreamOnActive(parentStream, opts, handler) {
  createNewChildStream()

  async function createNewChildStream() {
    const childStream = createSubstream(parentStream, opts, onActive, onIdle)

    // child first data
    function onActive() {
      handler(childStream)
    }
    // parent went idle again
    function onIdle() {
      createNewChildStream()
    }
  }
}

// create a new child stream, calling callback on active
function createSubstream(parentStream, opts, onActive = noop, onIdle = noop) {
  // stop flow
  parentStream.pause()

  // flow into child stream
  const childStream = new ThroughStream()
  parentStream.pipe(childStream)
  // call handler on first data
  parentStream.once('data', () => {
    onActive(childStream)
  })
  // on idle: stop flow + end child
  const delay = opts.delay
  onStreamIdle(parentStream, delay, () => {
    parentStream.unpipe(childStream)
    childStream.end()
    onIdle()
  })

  // re-enable flow
  parentStream.resume()

  return childStream
}

function onStreamIdle(stream, delay, handler) {
  const nextDataHandler = debounce(onIdle, delay)
  stream.on('data', nextDataHandler)
  function onIdle(chunk) {
    stream.removeListener('data', nextDataHandler)
    handler()
  }
}
