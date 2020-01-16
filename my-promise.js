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
  const that = this;
  let newPromise;
  onFulfilled =
    typeof onFulfilled === "function" ? onFulfilled : value => value;
  onRejected =
    typeof onRejected === "function"
      ? onRejected
      : reason => {
          throw reason;
        };

  if (that.status === FULFILLED) {
    return (newPromise = new PromiseZ((resolve, reject) => {
      queueMicrotask(() => {
        try {
          let x = onFulfilled(that.value);
          resolvePromise(newPromise, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
    }));
  }

  if (that.status === REJECTED) {
    return (newPromise = new PromiseZ((resolve, reject) => {
      queueMicrotask(() => {
        try {
          let x = onRejected(that.value);
          resolvePromise(newPromise, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
    }));
  }

  if (that.status === PENDING) {
    return (newPromise = new PromiseZ((resolve, reject) => {
      that.onFulfilledCallbacks.push(value => {
        try {
          let x = onFulfilled(value);
          resolvePromise(newPromise, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
      that.onRejectedCallbacks.push(value => {
        try {
          let x = onRejected(value);
          resolvePromise(newPromise, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
    }));
  }
};

PromiseZ.all = function(promises) {
  return new Promise((resolve, reject) => {
    let done = gen(promises.length, resolve);
    promises.forEach((promise, index) => {
      promise.then(value => {
        done(index, value);
      }, reject);
    });
  });
};

function gen(length, resolve) {
  let count = 0;
  let values = [];
  return function(i, value) {
    values[i] = value;
    if (++count === length) {
      console.log(values);
      resolve(values);
    }
  };
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
