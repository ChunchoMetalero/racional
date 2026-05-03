import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto.js';
import { PortfoliosService } from './portfolios.service.js';

@ApiTags('Portfolios')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Get()
  @ApiOperation({ summary: 'List all portfolios for the authenticated user' })
  @ApiOkResponse({ description: 'Array of portfolios.' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.portfoliosService.findAllByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a portfolio by ID' })
  @ApiOkResponse({ description: 'Portfolio details.' })
  @ApiNotFoundResponse({ description: 'Portfolio not found.' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.portfoliosService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update portfolio name or description' })
  @ApiBody({ type: UpdatePortfolioDto })
  @ApiOkResponse({ description: 'Updated portfolio.' })
  @ApiNotFoundResponse({ description: 'Portfolio not found.' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioDto,
  ) {
    return this.portfoliosService.update(user.id, id, dto);
  }

  @Get(':id/value')
  @ApiOperation({ summary: 'Get portfolio book value and positions breakdown' })
  @ApiOkResponse({
    description: 'Portfolio value summary.',
    schema: {
      example: {
        portfolioId: 'uuid',
        currency: 'USD',
        cashBalance: 5000,
        bookValue: 3200.5,
        totalValue: 8200.5,
        positions: [
          { ticker: 'AAPL', quantity: 10, avgCostBasis: 175.25, bookValue: 1752.5 },
        ],
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Portfolio not found.' })
  getTotalValue(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.portfoliosService.getTotalValue(user.id, id);
  }
}
