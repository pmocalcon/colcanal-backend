"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'Internal Server Error';
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object') {
                message =
                    exceptionResponse.message ||
                        exceptionResponse.error ||
                        message;
                error = exceptionResponse.error || error;
            }
        }
        else if (exception instanceof typeorm_1.QueryFailedError) {
            status = common_1.HttpStatus.BAD_REQUEST;
            error = 'Database Error';
            const driverError = exception.driverError;
            const code = driverError?.code;
            switch (code) {
                case '23505':
                    message = 'A record with this information already exists';
                    break;
                case '23503':
                    message = 'Referenced record does not exist';
                    break;
                case '23502':
                    message = 'Required field is missing';
                    break;
                case '42P01':
                    message = 'Database configuration error. Please contact support.';
                    status = common_1.HttpStatus.SERVICE_UNAVAILABLE;
                    break;
                default:
                    message = 'An error occurred while processing your request';
            }
            this.logger.error(`Database error: ${exception.message}`, exception.stack);
        }
        else {
            this.logger.error(`Unhandled exception: ${exception}`, exception?.stack);
            status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            error = 'Internal Server Error';
            message = 'An unexpected error occurred. Please try again later.';
        }
        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            error,
            message: Array.isArray(message) ? message : [message],
        };
        this.logger.error(`${request.method} ${request.url} - Status: ${status} - Error: ${JSON.stringify(errorResponse)}`);
        response.status(status).json(errorResponse);
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map