export type Next<T = unknown> = () => Promise<T>;
export type Middleware<TRequest, TResponse, NR = any, R = unknown> = (req: TRequest, res: TResponse, next: Next<NR>) => R | Promise<R>;
export type ComposedNext<TRequest, TResponse, R = unknown> = (req: TRequest, res: TResponse) => R | Promise<R>;
export type ComposedMiddleware<TRequest, TResponse, R = unknown> = (req: TRequest, res: TResponse, next?: ComposedNext<TRequest, TResponse>) => Promise<R>;
export declare function compose<TRequest, TResponse, R = unknown>(middleware: Middleware<TRequest, TResponse>[]): ComposedMiddleware<TRequest, TResponse, R>;
