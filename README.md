# @gulujs/compose

## Installation

```sh
npm install @gulujs/compose
```

## Usage

```js
import { compose } from '@gulujs/compose';

const a = (req, res, next) => {
  req.i += 1;
  return next();
};
const b = (req, res, next) => {
  req.i += 2;
  return next()
};

const fn = compose([a, b]);

const req = { i: 0 };
const res = {};

(async () => {
  const r = await fn(req, res, (req, res) => req.i + 3)
  console.log(r); // -> 6
})();
```

## Acknowledgements

This repo is forked from [koajs/compose](https://github.com/koajs/compose)

## License

- [MIT](LICENSE)
- [koajs/compos - License](https://github.com/koajs/compose/blob/master/LICENSE)
