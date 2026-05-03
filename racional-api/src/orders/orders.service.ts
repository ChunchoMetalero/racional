import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js'; 
import { OrderSide } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(
    userId: string,
    portfolioId: string,
    side: OrderSide,
    dto: CreateOrderDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const portfolio = await tx.portfolio.findFirst({
          where: { id: portfolioId, userId },
        });
        if (!portfolio) throw new NotFoundException('Portfolio not found');

        const quantity = new Prisma.Decimal(dto.quantity.toString());
        const price = new Prisma.Decimal(dto.price.toString());
        const totalValue = quantity.times(price).toDecimalPlaces(2);
        const cashBalance = portfolio.cashBalance;

        if (side === OrderSide.BUY) {
          if (cashBalance.lessThan(totalValue)) {
            throw new BadRequestException('Insufficient cash balance');
          }

          const existing = await tx.position.findUnique({
            where: { portfolioId_ticker: { portfolioId, ticker: dto.ticker } },
          });

          if (existing) {
            const oldQty = existing.quantity;
            const oldAvg = existing.avgCostBasis;
            const newQty = oldQty.plus(quantity);
            const newAvg = oldQty.times(oldAvg).plus(quantity.times(price)).dividedBy(newQty).toDecimalPlaces(8);

            await tx.position.update({
              where: { portfolioId_ticker: { portfolioId, ticker: dto.ticker } },
              data: { quantity: newQty, avgCostBasis: newAvg },
            });
          } else {
            await tx.position.create({
              data: { portfolioId, ticker: dto.ticker, quantity, avgCostBasis: price },
            });
          }

          await tx.portfolio.update({
            where: { id: portfolioId },
            data: { cashBalance: cashBalance.minus(totalValue) },
          });
        } else {
          const position = await tx.position.findUnique({
            where: { portfolioId_ticker: { portfolioId, ticker: dto.ticker } },
          });

          if (!position || position.quantity.lessThan(quantity)) {
            throw new BadRequestException('Insufficient shares');
          }

          const newQty = position.quantity.minus(quantity);

          if (newQty.isZero()) {
            await tx.position.delete({
              where: { portfolioId_ticker: { portfolioId, ticker: dto.ticker } },
            });
          } else {
            await tx.position.update({
              where: { portfolioId_ticker: { portfolioId, ticker: dto.ticker } },
              data: { quantity: newQty },
            });
          }

          await tx.portfolio.update({
            where: { id: portfolioId },
            data: { cashBalance: cashBalance.plus(totalValue) },
          });
        }

        return tx.order.create({
          data: {
            userId,
            portfolioId,
            ticker: dto.ticker,
            side,
            quantity,
            price,
            totalValue,
            date: new Date(`${dto.date}T00:00:00.000Z`),
            notes: dto.notes ?? null,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async findAll(userId: string, portfolioId: string, query: ListOrdersQueryDto) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const where = {
      portfolioId,
      ...(query.ticker ? { ticker: query.ticker } : {}),
      ...(query.side ? { side: query.side } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, limit: query.limit, offset: query.offset };
  }
}
