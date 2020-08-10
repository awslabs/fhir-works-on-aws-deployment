import express from 'express';
import OperationsGenerator from '../operationsGenerator';
import HttpError from '../../interface/errors/HttpError';
import ResourceNotFoundError from '../../interface/errors/ResourceNotFoundError';
import NotFoundError from '../../interface/errors/NotFoundError';

export const applicationErrorMapper = (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => {
    if (err instanceof ResourceNotFoundError) {
        const errorDetail = OperationsGenerator.generateResourceNotFoundError(err.resourceType, err.id);
        next(new NotFoundError(errorDetail));
        return;
    }
    next(err);
};

export const httpErrorHandler = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof HttpError) {
        console.error('Error', err);
        res.status(err.statusCode).send(err.errorDetail);
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
