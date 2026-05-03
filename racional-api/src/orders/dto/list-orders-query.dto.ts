import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { OrderSide } from '../../generated/prisma/enums.js';

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @ApiPropertyOptional({ example: 'AAPL', description: 'Filter by ticker symbol' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9.]+$/, { message: 'ticker must be uppercase letters, digits, or dots' })
  ticker?: string;

  @ApiPropertyOptional({ enum: OrderSide })
  @IsOptional()
  @IsEnum(OrderSide)
  side?: OrderSide;
}
