import express from 'express';
import OperationsGenerator from '../operationsGenerator';
import HttpError from '../../interface/errors/HttpError';
import ResourceNotFoundError from '../../interface/errors/ResourceNotFoundError';
import NotFoundError from '../../interface/errors/NotFoundError';
import ResourceVersionNotFoundError from '../../interface/errors/ResourceVersionNotFoundError';
import InvalidResourceError from '../../interface/errors/InvalidResourceError';
import BadRequestError from '../../interface/errors/BadRequestError';

export const applicationErrorMapper = (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => {
    if (err instanceof ResourceNotFoundError) {
        console.error(err);
        const errorDetail = OperationsGenerator.generateResourceNotFoundError(err.resourceType, err.id);
        next(new NotFoundError(errorDetail));
        return;
    }
    if (err instanceof ResourceVersionNotFoundError) {
        console.error(err);
        const errorDetail = OperationsGenerator.generateHistoricResourceNotFoundError(
            err.resourceType,
            err.id,
            err.version,
        );
        next(new NotFoundError(errorDetail));
        return;
    }
    if (err instanceof InvalidResourceError) {
        const invalidInput = OperationsGenerator.generatInputValidationError(err.message);
        next(new BadRequestError(invalidInput));
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
