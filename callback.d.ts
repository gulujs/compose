export type Next = (err?: Error | null) => void;
export type Middleware<TRequest, TResponse> = ((req: TRequest, res: TResponse, next: Next) => void) | ((req: TRequest, res: TResponse) => Promise<void>);
export type ComposedNext<TRequest, TResponse> = (err: Error | null | undefined, req: TRequest, res: TResponse) => unknown;
export type ComposedMiddleware<TRequest, TResponse> = (req: TRequest, res: TResponse, next: ComposedNext<TRequest, TResponse>) => void;
export declare function compose<TRequest, TResponse>(middleware: Middleware<TRequest, TResponse>[]): ComposedMiddleware<TRequest, TResponse>;
