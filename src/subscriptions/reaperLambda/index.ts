import reaperHandler from './subscriptionReaper';

/**
 * Custom lambda handler that handles deleting expired subscriptions.
 */
exports.handler = reaperHandler;
