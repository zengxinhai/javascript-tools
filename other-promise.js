const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

function queueMicrotask(cb) {
  setTimeout(cb, 0)
}

function PromiseZ(executor) {
    let that = this; // 缓存当前promise实例对象
    that.status = PENDING; // 初始状态
    that.value = undefined; // fulfilled状态时 返回的信息
    that.onFulfilledCallbacks = []; // 存储fulfilled状态对应的onFulfilled函数
    that.onRejectedCallbacks = []; // 存储rejected状态对应的onRejected函数

    function finalize(status, value) {
        queueMicrotask(() => {
            // 调用resolve 回调对应onFulfilled函数
            if (that.status === PENDING) {
                // 只能由pedning状态 => fulfilled状态 (避免调用多次resolve reject)
                that.status = status;
                that.value = value;
                const callBacksToRun =
                    status === FULFILLED ?
                    that.onFulfilledCallbacks :
                    that.onRejectedCallbacks
                callBacksToRun.forEach(cb => cb(that.value));
            }
        });
    }

    function resolve(value) { // value成功态时接收的终值
        finalize(FULFILLED, value)
    }

    function reject(value) { // reason失败态时接收的拒因
        finalize(REJECTED, value)
    }

    try {
        executor(resolve, reject);
    } catch (e) {
        reject(e);
    }
}

function resolvePromise(promise2, x, resolve, reject) {
    if (promise2 === x) {
        return reject(new TypeError('Cannnot self resolve!'))
    }
    let called = false
    if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
        try {
            let then = x.then
            if (typeof then === 'function') {
                then.call(x, y => {
                    if (called) return
                    called = true
                    resolvePromise(promise2, y, resolve, reject)
                }, r => {
                    if (called) return
                    called = true
                    reject(r)
                })
            } else {
                resolve(x)
            }
        } catch (err) {
            if (called) return
            called = true
            reject(err)
        }
    } else {
        resolve(x)
    }
}

PromiseZ.prototype.then = function(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
    onRejected = typeof onRejected === 'function' ? onRejected : value => { throw value }
    const promise = this
    const returnedPromise = new PromiseZ((resolve, reject) => {
        const futureHandler = (handler) => {
            return () => {
                try {
                    const val = handler(promise.value)
                    resolvePromise(returnedPromise, val, resolve, reject)
                } catch(err) {
                    reject(err)
                }
            }
        }
        if (promise.status === PENDING) {
            promise.onFulfilledCallbacks.push(futureHandler(onFulfilled))
            promise.onRejectedCallbacks.push(futureHandler(onRejected))
        } else {
            const handlerToRun = futureHandler(promise.status === FULFILLED ? onFulfilled : onRejected)
            queueMicrotask(() => {
                futureHandler(handlerToRun)()
            })
        }
    })
    return returnedPromise
};

PromiseZ.all = function(promises) {
    return new Promise((resolve, reject) => {
        let done = gen(promises.length, resolve);
        promises.forEach((promise, index) => {
            promise.then((value) => {
                done(index, value)
            }, reject)
        })
    })
}

function gen(length, resolve) {
    let count = 0;
    let values = [];
    return function(i, value) {
        values[i] = value;
        if (++count === length) {
            console.log(values);
            resolve(values);
        }
    }
}

PromiseZ.race = function(promises) {
    return new Promise((resolve, reject) => {
        promises.forEach((promise, index) => {
           promise.then(resolve, reject);
        });
    });
}

PromiseZ.prototype.catch = function(onRejected) {
    return this.then(null, onRejected);
}

PromiseZ.resolve = function (value) {
    return new PromiseZ(resolve => {
        resolve(value);
    });
}

PromiseZ.reject = function (reason) {
    return new PromiseZ((resolve, reject) => {
        reject(reason);
    });
}

PromiseZ.deferred = function() { // 延迟对象
    let defer = {};
    defer.promise = new PromiseZ((resolve, reject) => {
        defer.resolve = resolve;
        defer.reject = reject;
    });
    return defer;
}

try {
  module.exports = PromiseZ
} catch (e) {
}

const p = new Promise(resolve => {
    const val = {
        then: (resolve) => {resolve(5)}
    }
    resolve(val)
})

p.then(x => console.log(x))
