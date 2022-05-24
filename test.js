import { expect } from 'chai';
import { compose } from './index.js';
import { compose as callbackCompose } from './callback.js';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms || 1));
}

function isPromise(x) {
  return x && typeof x.then === 'function';
}

describe('Test case from Koa Compose', () => {
  it('should work', async () => {
    const arr = [];
    const stack = [];

    stack.push(async (req, res, next) => {
      arr.push(1);
      await wait(1);
      await next();
      await wait(1);
      arr.push(6);
    });

    stack.push(async (req, res, next) => {
      arr.push(2);
      await wait(1);
      await next();
      await wait(1);
      arr.push(5);
    });

    stack.push(async (req, res, next) => {
      arr.push(3);
      await wait(1);
      await next();
      await wait(1);
      arr.push(4);
    });

    await compose(stack)({}, {});
    expect(arr).to.deep.equal([1, 2, 3, 4, 5, 6]);
  });

  it('should be able to be called twice', async () => {
    const stack = [];

    stack.push(async (req, res, next) => {
      req.arr.push(1);
      await wait(1);
      await next();
      await wait(1);
      req.arr.push(6);
    });

    stack.push(async (req, res, next) => {
      req.arr.push(2);
      await wait(1);
      await next();
      await wait(1);
      req.arr.push(5);
    });

    stack.push(async (req, res, next) => {
      req.arr.push(3);
      await wait(1);
      await next();
      await wait(1);
      req.arr.push(4);
    });

    const fn = compose(stack);
    const req1 = { arr: [] };
    const req2 = { arr: [] };
    const out = [1, 2, 3, 4, 5, 6];

    await fn(req1, {});
    expect(req1.arr).to.deep.equal(out);

    await fn(req2, {});
    expect(req2.arr).to.deep.equal(out);
  });

  it('should only accept an array', () => {
    expect(() => compose()).to.throw(TypeError);
  });

  it('should create next functions that return a Promise', () => {
    const stack = [];
    const arr = [];
    for (let i = 0; i < 5; i++) {
      stack.push((req, res, next) => {
        arr.push(next());
      });
    }

    compose(stack)({}, {});

    for (const next of arr) {
      expect(isPromise(next), 'one of the functions next is not a Promise').to.be.true;
    }
  });

  it('should work with 0 middleware', async () => {
    await compose([])({}, {});
  });

  it('should only accept middleware as functions', () => {
    expect(() => compose([{}])).to.throw(TypeError);
  });

  it('should work when yielding at the end of the stack', async () => {
    const stack = [];
    let called = false;

    stack.push(async (req, res, next) => {
      await next();
      called = true;
    });

    await compose(stack)({}, {});
    expect(called).to.be.true;
  });

  it('should reject on errors in middleware', async () => {
    const stack = [];

    stack.push(() => {
      throw new Error();
    });

    let err;
    try {
      await compose(stack)({}, {});
    } catch (e) {
      err = e;
    }
    expect(err).to.be.an.instanceof(Error);
  });

  it('should keep the context', async () => {
    const req = {};
    const res = {};

    const stack = [];

    stack.push(async (req2, res2, next) => {
      await next();
      expect(req2).to.equal(req);
      expect(res2).to.equal(res);
    });

    stack.push(async (req2, res2, next) => {
      await next();
      expect(req2).to.equal(req);
      expect(res2).to.equal(res);
    });

    stack.push(async (req2, res2, next) => {
      await next();
      expect(req2).to.equal(req);
      expect(res2).to.equal(res);
    });

    await compose(stack)(req, res);
  });

  it('should catch downstream errors', async () => {
    const arr = [];
    const stack = [];

    stack.push(async (req, res, next) => {
      arr.push(1);
      try {
        arr.push(6);
        await next();
        arr.push(7);
      } catch (err) {
        arr.push(2);
      }
      arr.push(3);
    });

    stack.push(async (_req, _res, _next) => {
      arr.push(4);
      throw new Error();
    });

    await compose(stack)({}, {});
    expect(arr).to.deep.equal([1, 6, 4, 2, 3]);
  });

  it('should compose w/ next', async () => {
    let called = false;

    await compose([])({}, {}, async () => {
      called = true;
    });
    expect(called).to.be.true;
  });

  it('should handle errors in wrapped non-async functions', async () => {
    const stack = [];

    stack.push(() => {
      throw new Error();
    });

    let err;
    try {
      await compose(stack)({}, {});
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(Error);
  });

  // https://github.com/koajs/compose/pull/27#issuecomment-143109739
  it('should compose w/ other compositions', async () => {
    const called = [];

    try {
      await compose([
        compose([
          (req, res, next) => {
            called.push(1);
            return next();
          },
          (req, res, next) => {
            called.push(2);
            return next();
          }
        ]),
        (req, res, next) => {
          called.push(3);
          return next();
        }
      ])({}, {});
    } catch (e) {
      console.log(e);
      throw e;
    }

    expect(called).to.deep.equal([1, 2, 3]);
  });

  it('should throw if next() is called multiple times', async () => {
    let err;
    try {
      await compose([
        async (req, res, next) => {
          await next();
          await next();
        }
      ])({}, {});
    } catch (e) {
      err = e;
    }

    expect(err).to.be.an.instanceof(Error);
    expect(err.message).to.match(/multiple times/);
  });

  it('should return a valid middleware', async () => {
    let val = 0;
    await compose([
      compose([
        (req, res, next) => {
          val++;
          return next();
        },
        (req, res, next) => {
          val++;
          return next();
        }
      ]),
      (req, res, next) => {
        val++;
        return next();
      }
    ])({}, {});

    expect(val).to.equal(3);
  });

  it('should return last return value', async () => {
    const stack = [];

    stack.push(async (req, res, next) => {
      const val = await next();
      expect(val).to.equal(2);
      return 1;
    });

    stack.push(async (req, res, next) => {
      const val = await next();
      expect(val).to.equal(0);
      return 2;
    });

    const next = () => 0;
    const val = await compose(stack)({}, {}, next);

    expect(val).to.equal(1);
  });

  it('should not affect the original middleware array', () => {
    const middleware = [];
    const fn1 = (ctx, next) => {
      return next();
    };
    middleware.push(fn1);

    for (const fn of middleware) {
      expect(fn).to.equal(fn1);
    }

    compose(middleware);

    for (const fn of middleware) {
      expect(fn).to.equal(fn1);
    }
  });

  it('should not get stuck on the passed in next', async () => {
    const middleware = [
      (req, res, next) => {
        req.middleware++;
        return next();
      }
    ];
    const req = {
      middleware: 0,
      next: 0
    };

    await compose(middleware)(req, {}, () => {
      req.next++;
    });
    expect(req).to.deep.equal({ middleware: 1, next: 1 });
  });
});

describe('Callback style Compose', () => {
  it('should only accept an array', () => {
    expect(() => callbackCompose()).to.throw(TypeError);
  });

  it('should work with 0 middleware', async () => {
    // eslint-disable-next-line no-empty-function
    callbackCompose([])({}, {}, () => {});
  });

  it('should be able to be called twice', async () => {
    const stack = [];

    stack.push(async (req, res, next) => {
      req.arr.push(1);
      next();
    });

    stack.push((req, res, next) => {
      req.arr.push(2);
      next();
    });

    stack.push((req, res, next) => {
      req.arr.push(3);
      next();
    });

    const fn = callbackCompose(stack);
    const req1 = { arr: [] };
    const req2 = { arr: [] };
    const out = [1, 2, 3];

    await new Promise((resolve, reject) => {
      fn(req1, {}, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    expect(req1.arr).to.deep.equal(out);

    await new Promise((resolve, reject) => {
      fn(req2, {}, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    expect(req2.arr).to.deep.equal(out);
  });

  it('shoud skip rest of middleware when catch error', async () => {
    const called = [];
    const fn = callbackCompose([
      callbackCompose([
        (req, res, next) => {
          called.push(1);
          next();
        },
        (req, res, next) => {
          called.push(2);
          next(new Error('i am error'));
        }
      ]),
      (req, res, next) => {
        called.push(3);
        next();
      }
    ]);

    let err;
    await new Promise((resolve) => {
      fn({}, {}, (e) => {
        err = e;
        resolve();
      });
    });
    expect(called).to.deep.equal([1, 2]);
    expect(err).to.be.an.instanceof(Error);
    expect(err.message).to.equal('i am error');
  });

  it('should compose w/ other compositions', async () => {
    const called = [];

    const fn = callbackCompose([
      callbackCompose([
        (req, res, next) => {
          called.push(1);
          next();
        },
        (req, res, next) => {
          called.push(2);
          next();
        }
      ]),
      (req, res, next) => {
        called.push(3);
        next();
      }
    ]);

    await new Promise((resolve, reject) => {
      fn({}, {}, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    expect(called).to.deep.equal([1, 2, 3]);
  });

  it('should throw if next() is called multiple times', async () => {
    let err;
    await new Promise((resolve) => {
      callbackCompose([
        (req, res, next) => {
          next();
          next();
        }
      ])({}, {}, (e) => {
        err = e;
        resolve();
      });
    });
    expect(err).to.be.an.instanceof(Error);
    expect(err.message).to.match(/multiple times/);
  });

  it('should support middleware return a promise', async () => {
    const fn = callbackCompose([
      callbackCompose([
        (req, res, next) => {
          req.i += 1;
          next();
        },
        (req) => {
          req.i += 2;
          return wait(1);
        }
      ]),
      (req) => {
        req.i += 3;
        return wait(1);
      }
    ]);

    const req = { i: 0 };
    await new Promise((resolve, reject) => {
      fn(req, {}, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    expect(req.i).to.equal(6);
  });
});
