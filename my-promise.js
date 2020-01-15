/**
 * This is my own version of promise
 */

const PENDING = 'pending'
const FULLFILLED = 'fullFilled'
const REJECTED = 'rejected'

function isObject(value) {
  return (typeof value === 'object') 
    && value !== null
}

function isFunction(value) {
  return typeof value === 'function'
}

function isThenable(value) {
  return (isObject(value) || isFunction(value))
    && (typeof value.then === 'function')
}

// This function should depend on the environment
// If in the browser should call browser's microTask api
function queueMicrotask(cb) {
  setTimeout(cb, 0)
}

// In order to avoid conflict with native Promise, add Z as suffix
function PromiseZ(executor) {
  let promise = this
  promise._status = PENDING
  promise._fullFillCallbacks = []
  promise._rejectedCallbacks = []

  function setStateAndRunPendingCallbacks(value, status) {
    queueMicrotask(() => {
      if (promise._status !== PENDING) return
      promise._status = status
      promise._value = value
      const callBacksQueueToRun =
        status === FULLFILLED ?
        promise._fullFillCallbacks :
        promise._rejectedCallbacks
      callBacksQueueToRun.forEach(cb => {
        queueMicrotask(() => {
          cb(promise._value)
        })
      })
      promise._rejectedCallbacks = undefined
      promise._fullFillCallbacks = undefined
    })
  }

  function resolve(value) {
    if (isThenable(value)) {
      value.then(resolve, reject)
    } else {
      setStateAndRunPendingCallbacks(value, FULLFILLED)
    }
  }

  function reject(value) {
    setStateAndRunPendingCallbacks(value, REJECTED)
  }

  try {
    executor(resolve, reject)
  } catch(err) {
    reject(err)
  }
}

function resolveValue(value, resolve, reject) {
  try {
    if (isThenable(value)) {
      value.then(resolve, reject)
    } else {
      resolve(value)
    }
  } catch(err) {
    reject(err)
  }
}

// Need to reimplement then function
PromiseZ.prototype.then = function(onFullFilled, onRejected) {
  onFullFilled = typeof onFullFilled === 'function' ? onFullFilled : value => value
  onRejected = typeof onRejected === 'function' ? onRejected : value => { throw value }
  const promise = this
  return new PromiseZ((resolve, reject) => {
    const futureHandler = (func) => {
      return () => {
        try {
          const val = func(promise._value)
          resolveValue(val, resolve, reject)
        } catch(err) {
          reject(err)
        }
      }
    }
    const futureFullFilled = futureHandler(onFullFilled)
    const futureRejected = futureHandler(onRejected)
    if (this._status === PENDING) {
      this._fullFillCallbacks.push(futureFullFilled)
      this._rejectedCallbacks.push(futureRejected)
    }
    if (this._status === FULLFILLED) {
      queueMicrotask(() => {
        futureFullFilled()
      })
    }
    if (this._status === REJECTED) {
      queueMicrotask(() => {
        futureRejected()
      })
    }
  })
}

PromiseZ.prototype.catch = function(onCatch) {
  return this.then(null, onCatch)
}

PromiseZ.prototype.finally = function(onAlways) {
  return this.then(onAlways, onAlways)
}

/**
 * ================ Quick methods =================
 */

PromiseZ.resolve = function(value) {
  return new PromiseZ(resolve => {
    resolve(value)
  })
}

PromiseZ.reject = function(value) {
  return new PromiseZ((resolve, reject) => {
    reject(value)
  })
}

PromiseZ.deferred = function() {
  const deferred = {}
  const promise = new PromiseZ((resolve, reject) => {
    deferred.resolve = resolve
    deferred.reject = reject
  })
  deferred.promise = promise
  return deferred
}

module.exports = PromiseZ
