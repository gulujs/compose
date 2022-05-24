export function compose(middleware) {
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!');
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!');
  }

  return function (req, res, next) {
    let index = -1;
    return dispatch(0);
    function dispatch(i, err) {
      if (err) return next(err);
      if (i <= index) return next(new Error('next() called multiple times'));
      index = i;
      let fn = middleware[i];
      if (i === middleware.length) fn = next.bind(null, null);
      if (!fn) return;
      let result;
      try {
        result = fn(req, res, dispatch.bind(null, i + 1));
      } catch (e) {
        return next(e);
      }
      if (result && typeof result.then === 'function') {
        result.then(() => dispatch(i + 1), next);
      }
    }
  };
}
