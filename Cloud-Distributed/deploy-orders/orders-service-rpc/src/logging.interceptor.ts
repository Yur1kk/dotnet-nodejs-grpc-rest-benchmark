import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('GRPC_TIMING');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = performance.now();
    const method = context.getHandler().name;

    return next.handle().pipe(
      tap(() => {
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(3);
        this.logger.log(`[gRPC Internal] ${method} processed in ${duration}ms`);
      }),
    );
  }
}
