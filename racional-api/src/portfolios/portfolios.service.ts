import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto.js';

@Injectable()
export class PortfoliosService {
  constructor(private readonly prisma: PrismaService) {}

  findAllByUser(userId: string) {
    return this.prisma.portfolio.findMany({ where: { userId } });
  }

  async findOne(userId: string, portfolioId: string) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');
    return portfolio;
  }

  async update(userId: string, portfolioId: string, dto: UpdatePortfolioDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    await this.findOne(userId, portfolioId);
    return this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: dto,
    });
  }

  async getTotalValue(userId: string, portfolioId: string) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
      include: { positions: true },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    const cashBalance = portfolio.cashBalance;

    const positions = portfolio.positions.map((p) => {
      const bookValue = p.quantity.times(p.avgCostBasis).toDecimalPlaces(2);
      return {
        ticker: p.ticker,
        quantity: p.quantity.toNumber(),
        avgCostBasis: p.avgCostBasis.toNumber(),
        bookValue: bookValue.toNumber(),
      };
    });

    const bookValue = positions.reduce(
      (sum, p) => sum.plus(new Prisma.Decimal(p.bookValue)),
      new Prisma.Decimal(0),
    );

    return {
      portfolioId,
      currency: portfolio.currency,
      cashBalance: cashBalance.toNumber(),
      bookValue: bookValue.toNumber(),
      totalValue: cashBalance.plus(bookValue).toNumber(),
      positions,
    };
  }
}
