import { IsString, IsEnum, IsOptional, IsNumber, IsDateString, IsArray } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  memberId: string;

  @IsEnum(['pending', 'in-progress', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @IsEnum(['subscription', 'payment', 'support', 'follow-up', 'documentation', 'other'])
  @IsOptional()
  category?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsNumber()
  @IsOptional()
  estimatedHours?: number;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['pending', 'in-progress', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @IsEnum(['subscription', 'payment', 'support', 'follow-up', 'documentation', 'other'])
  @IsOptional()
  category?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  completionNotes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @IsNumber()
  @IsOptional()
  actualHours?: number;
}
