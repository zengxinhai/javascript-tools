const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

function queueMicrotask(cb) {
  setTimeout(cb, 0);
}

function PromiseZ(executor) {
  let that = this;
  that.status = PENDING;
  that.value = undefined;
  that.onFulfilledCallbacks = [];
  that.onRejectedCallbacks = [];

  function finalize(status, value) {
    queueMicrotask(() => {
      if (that.status === PENDING) {
        that.status = status;
        that.value = value;
        const callBacksToRun =
          status === FULFILLED
            ? that.onFulfilledCallbacks
            : that.onRejectedCallbacks;
        callBacksToRun.forEach(cb => cb(that.value));
      }
    });
  }

  function resolve(value) {
    finalize(FULFILLED, value);
  }

  function reject(value) {
    finalize(REJECTED, value);
  }

  try {
    executor(resolve, reject);
  } catch (e) {
    reject(e);
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
      promise.onFulfilledCallbacks.push(futureHandler(onFulfilled))
      promise.onRejectedCallbacks.push(futureHandler(onRejected))
    } else {
      const handlerToRun = futureHandler(
        promise.status === FULFILLED ? onFulfilled : onRejected
      );
      queueMicrotask(() => {
        futureHandler(handlerToRun)()
      });
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
PromiseZ.all([ Promise.resolve(10), Promise.resolve(12), fakeThen ]).then(console.log, console.log)


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
