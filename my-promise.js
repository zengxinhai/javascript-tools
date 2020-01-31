(function() {

// Get environment global instance
const Global = (function() {
  try { return self.self } catch(err) {}
  try { return global.global } catch(err) {}
  throw new Error('Unsupported environment')
})()

// Prevent re-define Promise
if (typeof Global.PromiseZ === 'function') return

// Find a suitable way to arrange async task
const asyncTask = (function() {
  // If is node env, use nextTick for arrange async task
  if (typeof process !== 'undefined' && typeof process.version === 'string') {
    return typeof setImmediate === 'function' ?
      function(cb) { setImmediate(cb) } :
      function(cb) { process.nextTick(cb) }
  }

  // If MutationObserver is avaible, use it
  if (typeof MutationObserver === 'function') {
    const div = document.createElement('div')
    let task = void 0
    const observer = new Global.MutationObserver(function() {
      task()
    })
    observer.observe(div, { attributes: true })
    return function(cb) {
      task = cb
      div.classList.toggle('x')
    }
  }

  // Fallback to setTimeout
  return function(cb) {
    setTimeout(cb, 0)
  }
})()


// Three status of Promise
const PENDING = 'pending', FULFILLED = 'fulFilled', REJECTED = 'rejected'

// Constructor of Promise
function PromiseZ(executor) {
  // Initial state
  const promise = this
  promise.status = PENDING
  promise.value = undefined
  promise.fulfilledCbs = []
  promise.rejectedCbs = []

  // finalize the state of Promise
  function finalizeState(value, status) {
    asyncTask(() => {
      if (promise.status !== PENDING) return
      // Make sure state can only be set one time
      promise.status = status
      promise.value = value
      // Run callbacks that are queued before promise resolved
      const cbsToRun =
        status === FULFILLED ? promise.fulfilledCbs : promise.rejectedCbs
      cbsToRun.forEach(cb => cb())
      // clear pending callbacks
      promise.fulfilledCbs = undefined
      promise.rejectedCbs = undefined
    })
  }

  // resolver
  function resolve(value) {
    finalizeState(value, FULFILLED)
  }

  // rejector
  function reject(value) {
    finalizeState(value, REJECTED)
  }

  // run executor
  try { executor(resolve, reject) } catch(e) { reject(e) }
}


function resolveValue(val, promise, resolve, reject) {
  if (val === promise) {
    return reject(new TypeError('Promise cannot self-resolve'))
  }
  if (val != null && (typeof val === 'object' || typeof val === 'function')) {
    let called = false
    try {
      const then = val.then
      if (typeof then === 'function') {
        then.call(val, value => {
          if (called) return
          called = true
          resolveValue(value, promise, resolve, reject)
        }, value => {
          if (called) return
          called = true
          reject(value)
        })
      } else {
        resolve(val)
      }
    } catch(e) {
      if (called) return
      called = true
      reject(e)
    }
  } else {
    resolve(val)
  }
}

PromiseZ.prototype.then = function(onFulFilled, onRejected) {
  // set default value for fulFilled, rejected callbacks
  onFulFilled =
    typeof onFulFilled === 'function' ? onFulFilled : value => value
  onRejected =
    typeof onRejected === 'function' ? onRejected : value => { throw value }

  const promise = this
  // return a new Promise
  const returnedPromise = new PromiseZ((resolve, reject) => {
    const futureHandler = handler => {
      return () => {
        try {
          const val = handler(promise.value)
          resolveValue(val, returnedPromise, resolve, reject)
        } catch(e) {
          reject(e)
        }
      }
    }

    // When promise is still pending
    // queue the callbacks
    if (promise.status === PENDING) {
      promise.fulfilledCbs.push(futureHandler(onFulFilled))
      promise.rejectedCbs.push(futureHandler(onRejected))
    } else {
      // When promise is fuilFilled or rejected
      const handlerToRun = futureHandler(
        promise.status === FULFILLED ? onFulFilled : onRejected
      )
      asyncTask(futureHandler(handlerToRun))
    }
  })
  return returnedPromise
}

PromiseZ.resolve = function(value) {
  return new PromiseZ(resolve => {
    resolve(value);
  })
}

PromiseZ.reject = function(value) {
  return new PromiseZ((resolve, reject) => {
    reject(value)
  })
}

PromiseZ.all = function(promises) {
  return new Promise((resolve, reject) => {
    const promiseNum = promises.length
    const resolvedResult = []
    let resolvedNum = 0
    function resolveItem(idx) {
      return (value) => {
        resolvedResult[idx] = value
        resolvedNum++
        if (resolvedNum === promiseNum) {
          resolve(resolvedResult)
        }
      }
    }

    promises.forEach((promise, idx) => {
      promise.then(resolveItem(idx), reject)
    })
  })
}

PromiseZ.race = function(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach((promise, index) => {
      promise.then(resolve, reject)
    })
  })
}

PromiseZ.prototype.catch = function(onRejected) {
  return this.then(null, onRejected);
};

PromiseZ.deferred = function() {
  let defer = {};
  defer.promise = new PromiseZ((resolve, reject) => {
    defer.resolve = resolve;
    defer.reject = reject;
  });
  return defer;
};

try {
  module.exports = PromiseZ;
} catch (e) {}


})() 
