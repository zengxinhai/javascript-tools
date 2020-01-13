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

// This function should depend on the environment
// If in the browser should call browser's microTask api
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
      try {
        value.then(resolve, reject)
      } catch(err) {
        reject(err)
      }
    } else {
      setValueAndStatus(value, FULLFILLED)
    }
  }

  function reject(value) {
    setValueAndStatus(value, REJECTED)
  }

  try {
    fn(resolve, reject)
  } catch(err) {
    reject(err)
  }
}

// TODO
// Handle the situation correctly when the status is PENDING
PromiseZ.prototype.then = function(onFullFilled, onRejected) {
  if (this._status === PENDING) {
    this._fullFillCallbacks.push(onFullFilled)
    this._rejectedCallbacks.push(onRejected)
  }
  if (this._status === FULLFILLED) {
    if (typeof onFullFilled !== 'function') return PromiseZ.resolve()
    return new PromiseZ((resolve, reject) => {
      queueMicrotask(() => {
        resolve(onFullFilled(this._value))
      })
    })
  }
  if (this._status === REJECTED) {
    if (typeof onRejected !== 'function') return PromiseZ.reject(this._value)
    return new PromiseZ((resolve, reject) => {
      queueMicrotask(() => {
        resolve(onRejected(this._value))
      })
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
