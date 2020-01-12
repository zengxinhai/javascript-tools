/**
 * This is my own version of promise
 */

const PENDING = 'pending'
const FULLFILLED = 'fullFilled'
const REJECTED = 'rejected'

function isObject(value) {
  return (typeof value === 'object') && value !== null
}

function isThenable(value) {
  return isObject(value) && (typeof value.then === 'function')
}

function queueMicrotask(cb) {
  setTimeout(cb, 0)
}

// In order to avoid conflict with native Promise, add Z as suffix
function PromiseZ(fn) {
  let promise = this
  promise._status = PENDING
  promise._fullFillCallbacks = []
  promise._rejectedCallbacks = []

  function setValueAndStatus(value, status) {
    if (promise._status === PENDING) {
      promise._status = status
      promise._value = value
      const queueToRun =
        status === FULLFILLED ?
        promise._fullFillCallbacks :
        promise._rejectedCallbacks
      queueToRun.forEach(cb => {
        queueMicrotask(() => {
          cb(promise._value)
        })
      })
      promise._rejectedCallbacks = undefined
      promise._fullFillCallbacks = undefined
    }
  }
  
  function resolve(value) {
    if (isThenable(value)) {
      value.then(resolve, reject)
    } else {
      setValueAndStatus(value, FULLFILLED)
    }
  }

  function reject(value) {
    setValueAndStatus(value, REJECTED)
  }

  fn(resolve, reject)
}

PromiseZ.prototype.then = function(onFullFilled, onRejected) {
  if (this._status === PENDING) {
    this._fullFillCallbacks.push(onFullFilled)
    this._rejectedCallbacks.push(onRejected)
  }
  if (this._status === FULLFILLED) {
    queueMicrotask(() => {
      onFullFilled(this._value)
    })
  }
  if (this._status === REJECTED) {
    queueMicrotask(() => {
      onRejected(this._value)
    })
  }
}

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
