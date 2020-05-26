import express from 'express';

export default class RouteHelper {
    // https://thecodebarbarian.com/80-20-guide-to-express-error-handling
    static wrapAsync = (fn: any) => {
        // eslint-disable-next-line func-names
        return function(req: express.Request, res: express.Response, next: express.NextFunction) {
            // Make sure to `.catch()` any errors and pass them along to the `next()`
            // middleware in the chain, in this case the error handler.
            fn(req, res, next).catch(next);
        };
    };
}
