import express from 'express';
import createError from 'http-errors';
import OperationsGenerator from '../operationsGenerator';
import ResourceNotFoundError from '../../interface/errors/ResourceNotFoundError';
import ResourceVersionNotFoundError from '../../interface/errors/ResourceVersionNotFoundError';
import InvalidResourceError from '../../interface/errors/InvalidResourceError';

export const applicationErrorMapper = (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => {
    if (err instanceof ResourceNotFoundError) {
        console.error(err);
        next(new createError.NotFound(err.message));
        return;
    }
    if (err instanceof ResourceVersionNotFoundError) {
        console.error(err);
        next(new createError.NotFound(err.message));
        return;
    }
    if (err instanceof InvalidResourceError) {
        console.error(err);
        next(new createError.BadRequest(`Failed to parse request body as JSON resource. Error was: ${err.message}`));
        return;
    }
    next(err);
};

export const httpErrorHandler = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (createError.isHttpError(err)) {
        console.error('HttpError', err);
        res.status(err.statusCode).send(OperationsGenerator.generateError(err.message));
        return;
    }
    next(err);
};

export const unknownErrorHandler = (
    err: any,
    req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: express.NextFunction,
) => {
    console.error('Unhandled Error', err);
    res.status(500).send(OperationsGenerator.generateError('Internal server error'));
};
