import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import {
  DeliverableStatus,
  DeliverableCategory,
  RepositoryType,
} from '../project-deliverables.schema';

export class CreateDeliverableDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(DeliverableCategory)
  category: DeliverableCategory;

  @IsEnum(DeliverableStatus)
  status: DeliverableStatus;

  @IsArray()
  @IsEnum(RepositoryType, { each: true })
  @IsOptional()
  repositories?: RepositoryType[];

  @IsNumber()
  @IsOptional()
  estimatedTime?: number;

  @IsNumber()
  @IsOptional()
  actualTime?: number;

  @IsNumber()
  @IsOptional()
  linesOfCode?: number;

  @IsNumber()
  @IsOptional()
  commits?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  completionDate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  businessValue?: string;

  @IsString()
  @IsOptional()
  technicalNotes?: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  priority?: number;

  @IsString()
  @IsOptional()
  clientFacing?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
