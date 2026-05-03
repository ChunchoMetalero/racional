import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    if (!dto.name && !dto.description) {
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

    const cashBalance = portfolio.cashBalance.toNumber();

    const positions = portfolio.positions.map((p) => {
      const quantity = p.quantity.toNumber();
      const avgCostBasis = p.avgCostBasis.toNumber();
      return {
        ticker: p.ticker,
        quantity,
        avgCostBasis,
        bookValue: parseFloat((quantity * avgCostBasis).toFixed(2)),
      };
    });

    const bookValue = parseFloat(
      positions.reduce((sum, p) => sum + p.bookValue, 0).toFixed(2),
    );

    return {
      portfolioId,
      currency: portfolio.currency,
      cashBalance,
      bookValue,
      totalValue: parseFloat((cashBalance + bookValue).toFixed(2)),
      positions,
    };
  }
}
