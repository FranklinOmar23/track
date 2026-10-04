import { Router } from 'express';

// Express 4 no captura rechazos de handlers async; esto los envía a next(err).
const wrap = (handler) =>
  typeof handler === 'function' && handler.length < 4
    ? (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
    : handler;

export const asyncRouter = () => {
  const router = Router();
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const original = router[method].bind(router);
    router[method] = (path, ...handlers) => original(path, ...handlers.map(wrap));
  }
  return router;
};
