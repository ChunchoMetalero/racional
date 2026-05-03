import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TransactionType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTransaction(
    userId: string,
    portfolioId: string,
    type: TransactionType,
    dto: CreateTransactionDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const portfolio = await tx.portfolio.findFirst({
          where: { id: portfolioId, userId },
        });
        if (!portfolio) throw new NotFoundException('Portfolio not found');

        const balance = portfolio.cashBalance;
        const amount = new Prisma.Decimal(dto.amount.toString());

        if (type === TransactionType.WITHDRAWAL && balance.lessThan(amount)) {
          throw new BadRequestException('Insufficient cash balance');
        }

        const newBalance =
          type === TransactionType.DEPOSIT
            ? balance.plus(amount)
            : balance.minus(amount);

        await tx.portfolio.update({
          where: { id: portfolioId },
          data: { cashBalance: newBalance },
        });

        return tx.transaction.create({
          data: {
            userId,
            portfolioId,
            type,
            amount,
            // Append explicit UTC time so YYYY-MM-DD is never shifted by local timezone
            date: new Date(`${dto.date}T00:00:00.000Z`),
            notes: dto.notes ?? null,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async findRecent(userId: string, portfolioId: string, query: ListTransactionsQueryDto) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const where = {
      portfolioId,
      ...(query.type ? { type: query.type } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, limit: query.limit, offset: query.offset };
  }
}
