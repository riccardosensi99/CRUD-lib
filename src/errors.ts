export {
  AppError,
  EmailAlreadyExistsError,
  ForbiddenError,
  InvalidCredentialsError,
  NotConfiguredError,
  TokenExpiredError,
  UserNotFoundError,
  ValidationError,
  errorHandler,
  mapKnownError,
  sendAppError,
} from './utils/errorHandler.js';
