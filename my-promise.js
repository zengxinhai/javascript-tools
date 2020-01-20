(function() {

/**
 * Part A: Implement A promise state machine
 */

// 3 states of promise
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

// Define the async mechanism
const runLater = (function() {
  // For node
  if (typeof process !== 'undefined' && typeof process.version === 'string') {
    return typeof setImmediate === 'function' ?
      function(fn) { setImmediate(fn) } :
      function(fn) { process.nextTick(fn) }
  }

  // Use MutationObserver if available for async task
  if (typeof MutationObserver !== 'undefined' && MutationObserver) {
    var div = document.createElement('div'), queuedFn = void 0
    var observer = new MutationObserver(function() {
      var fn = queuedFn
      queuedFn = void 0
      fn()
    })
    observer.observe(div, { attributes: true })
    return function(fn) {
      if (queuedFn !== void 0) {
        throw new Error('Only one function can be queued at a time')
      }
      queuedFn = fn
      div.classList.toggle('x')
    }
  }

  // Fallback to setTimeout
  return function(fn) { setTimeout(fn, 0) }
})()

const queueMicroTask = function (task) {
  runLater(task)
}

// Promise constructor
function PromiseZ(executor) {
  // Initial state of promise
  const promise = this
  promise.status = PENDING
  promise.value = undefined
  promise.fulfilledCbs = []
  promise.rejectedCbs = []

  // Once finalized, promise will keep the value and status forever
  function finalizeState(value, status) {
    // Make sure all callbacks are run in async mode
    queueMicroTask(() => {
      // Status has changed, it means already finalized, so do nothing
      if (promise.status !== PENDING) return
      // set final value and status for promise
      promise.value = value
      promise.status = status
      // run calls that are pending before promise resolved
      const cbsToRun = status === FULFILLED ? promise.fulfilledCbs : promise.rejectedCbs
      cbsToRun.forEach(cb => cb(value))
      // clear pending callbacks
      promise.fulfilledCbs = undefined
      promise.rejectedCbs = undefined
    })
  }

  function resolve(value) {
    finalizeState(value, FULFILLED)
  }

  function reject(value) {
    finalizeState(value, REJECTED)
  }

  try {
    executor(resolve, reject)
  } catch(err) {
    reject(err)
  }
}

function resolvePromise(promise2, x, resolve, reject) {
  if (promise2 === x) {
    return reject(new TypeError("Promise cannot self resolve"));
  }

  let called = false;
  if (x != null && (typeof x === "object" || typeof x === "function")) {
    try {
      let then = x.then;
      if (typeof then === "function") {
        then.call(x, y => {
            if (called) return;
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          }, r => {
            if (called) return;
            called = true;
            reject(r);
          }
        );
      } else {
        resolve(x);
      }
    } catch (e) {
      if (called) return;
      called = true;
      reject(e);
    }
  } else {
    resolve(x);
  }
}

PromiseZ.prototype.then = function(onFulfilled, onRejected) {
  onFulfilled =
    typeof onFulfilled === "function" ? onFulfilled : value => value
  onRejected =
    typeof onRejected === "function" ? onRejected : value => { throw value }
  const promise = this
  const returnedPromise = new PromiseZ((resolve, reject) => {
    const futureHandler = handler => {
      return () => {
        try {
          const val = handler(promise.value)
          resolvePromise(returnedPromise, val, resolve, reject)
        } catch (err) {
          reject(err)
        }
      };
    };
    if (promise.status === PENDING) {
      promise.fulfilledCbs.push(futureHandler(onFulfilled))
      promise.rejectedCbs.push(futureHandler(onRejected))
    } else {
      const handlerToRun = futureHandler(
        promise.status === FULFILLED ? onFulfilled : onRejected
      );
      queueMicroTask(futureHandler(handlerToRun))
    }
  });
  return returnedPromise
};

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

const fakeThen = {
  then(resolve, reject) {
    resolve(5)
    reject(10)
  }
}

PromiseZ.race = function(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach((promise, index) => {
      promise.then(resolve, reject);
    });
  });
};

PromiseZ.prototype.catch = function(onRejected) {
  return this.then(null, onRejected);
};

PromiseZ.resolve = function(value) {
  return new PromiseZ(resolve => {
    resolve(value);
  });
};

PromiseZ.reject = function(value) {
  return new PromiseZ((resolve, reject) => {
    reject(value);
  });
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
