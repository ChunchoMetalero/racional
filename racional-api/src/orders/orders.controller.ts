import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { OrderSide } from '../generated/prisma/enums.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import { OrdersService } from './orders.service.js';

@ApiTags('Orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
@Controller('portfolios/:portfolioId/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('buy')
  @ApiOperation({ summary: 'Place a buy order — deducts cash and upserts position with weighted average cost' })
  @ApiBody({ type: CreateOrderDto })
  @ApiCreatedResponse({ description: 'Buy order registered. cashBalance and position updated.' })
  @ApiNotFoundResponse({ description: 'Portfolio not found.' })
  @ApiBadRequestResponse({ description: 'Insufficient cash balance.' })
  buy(
    @CurrentUser() user: JwtPayload,
    @Param('portfolioId') portfolioId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user.id, portfolioId, OrderSide.BUY, dto);
  }

  @Post('sell')
  @ApiOperation({ summary: 'Place a sell order — validates shares held and adds cash proceeds' })
  @ApiBody({ type: CreateOrderDto })
  @ApiCreatedResponse({ description: 'Sell order registered. cashBalance and position updated.' })
  @ApiNotFoundResponse({ description: 'Portfolio not found.' })
  @ApiBadRequestResponse({ description: 'Insufficient shares.' })
  sell(
    @CurrentUser() user: JwtPayload,
    @Param('portfolioId') portfolioId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user.id, portfolioId, OrderSide.SELL, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders (paginated, filterable by ticker and side)' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiQuery({ name: 'ticker', required: false, example: 'AAPL' })
  @ApiQuery({ name: 'side', required: false, enum: OrderSide })
  @ApiOkResponse({
    description: 'Paginated list of orders.',
    schema: {
      example: {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Portfolio not found.' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Param('portfolioId') portfolioId: string,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.ordersService.findAll(user.id, portfolioId, query);
  }
}
