import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { envValidationSchema } from './config/env.validation.js';
import { OrdersModule } from './orders/orders.module.js';
import { PortfoliosModule } from './portfolios/portfolios.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    PortfoliosModule,
    TransactionsModule,
    OrdersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
