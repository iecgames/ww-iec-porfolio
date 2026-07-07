import type { Instrumentation } from 'next'

/**
 * onRequestError — logs full server error details (message, stack, request
 * context) to the server logs.
 *
 * Next.js production builds strip error messages from responses to avoid leaking
 * sensitive info; this hook restores full stack traces in the server/Docker logs
 * for debugging.
 */
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const error = err as Error & { digest?: string }

  console.error('[Server Error]', {
    message: error.message,
    digest: error.digest,
    stack: error.stack,
    request: {
      method: request.method,
      path: request.path,
    },
    context: {
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    },
  })
}
