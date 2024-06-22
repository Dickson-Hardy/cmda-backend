import { IsEnum, IsNotEmpty, IsUrl } from 'class-validator';
import { AllResouceCategories, ResourceCategory } from '../resources.constant';
import { ApiProperty } from '@nestjs/swagger';

export class CreateResourceFromUrlDto {
  @ApiProperty({ example: 'https://cmdanigeria.org/prescription-38/' })
  @IsNotEmpty()
  @IsUrl()
  sourceUrl: string;

  @ApiProperty({ example: AllResouceCategories.join(' | '), enum: ResourceCategory })
  @IsNotEmpty()
  @IsEnum(ResourceCategory, {
    message: 'Category must be one of ' + AllResouceCategories.join(', '),
  })
  category: ResourceCategory;
}
