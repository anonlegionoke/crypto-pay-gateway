interface ErrorWithMessage {
  message: string;
  stack?: string;
  code?: string;
  name?: string;
}

// Convert unknown error to an error with message
export function toErrorWithMessage(error: unknown): ErrorWithMessage {
  if (error instanceof Error) return error;
  
  return new Error(String(error));
}

// Log error with structured format
export function logError(error: unknown, context?: Record<string, unknown>) {
  const errorWithMessage = toErrorWithMessage(error);
  
  console.error({
    message: errorWithMessage.message,
    stack: errorWithMessage.stack,
    code: errorWithMessage.code,
    name: errorWithMessage.name,
    context,
    timestamp: new Date().toISOString(),
  });
  
  // Sending error to Sentry DSN - Not added now
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  }
}

// Handle API errors with consistent response format
export function handleApiError(error: unknown): { 
  status: number; 
  body: { success: false; error: string; code?: string } 
} {
  const errorWithMessage = toErrorWithMessage(error);
  logError(error);
  
  let status = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  
  // Map common error types to appropriate status codes
  if (errorWithMessage.message.includes('not found')) {
    status = 404;
    code = 'NOT_FOUND';
  } else if (errorWithMessage.message.includes('unauthorized') || 
             errorWithMessage.message.includes('invalid token')) {
    status = 401;
    code = 'UNAUTHORIZED';
  } else if (errorWithMessage.message.includes('forbidden')) {
    status = 403;
    code = 'FORBIDDEN';
  } else if (errorWithMessage.message.includes('validation')) {
    status = 400;
    code = 'VALIDATION_ERROR';
  }
  
  return {
    status,
    body: {
      success: false,
      error: errorWithMessage.message,
      code,
    }
  };
} 
