const test = require('tape')
const pify = require('pify')
const ThroughStream = require('readable-stream').PassThrough
const endOfStream = pify(require('end-of-stream'))
const concat = require('concat-stream')
const substreamOnActive = require('../src/index')

const timeout = (duration) => new Promise(resolve => setTimeout(resolve, duration))

asyncTest('basic test', async (t) => {
  const substreams = []

  const through = new ThroughStream()
  substreamOnActive(through, { delay: 200 }, async (childStream) => {
    substreams.push(childStream)
  })

  // 1st child
  through.write('a')
  through.write('b')
  await timeout(300)
  // 2nd child
  through.write('c')
  await timeout(300)
  // 3rd child
  through.write('d')
  through.write('e')
  through.write('f')
  await timeout(300)
  through.end()

  t.equal(substreams.length, 3, 'expected number of substreams')

  const results = []
  for (let index = 0; index < substreams.length; index++) {
    const childStream = substreams[index]
    const rawResult = await readToEnd(childStream)
    results.push(rawResult.toString())
  }

  t.equal(results[0], 'ab', 'stream content as expected')
  t.equal(results[1], 'c', 'stream content as expected')
  t.equal(results[2], 'def', 'stream content as expected')

  t.end()
})

function asyncTest(label, asyncFn) {
  test(label, async (t) => {
    try {
      await asyncFn(t)
    } catch (err) {
      t.ifError(err)
    }
  })
}

function readToEnd(stream) {
  return new Promise((resolve) => {
    stream.pipe(concat(resolve))
  })
}
