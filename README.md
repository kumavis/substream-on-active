### substream-on-active

Takes a long-lived mostly idle `ReadableStream` and creates short-lived childStreams for every period of activity. Each `childStream` will end when the `parentStream` goes idle again.

```js
const substreamOnActive = require('substream-on-active')

substreamOnActive(readableStream, { delay: 1000 }, (childStream) => {
  console.log('new stream activity!')
  // childStream.pipe(somewhere)
})
```
