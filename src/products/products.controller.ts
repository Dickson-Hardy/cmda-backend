import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product' })
  @ApiBody({ type: CreateProductDto })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('featuredImage'))
  create(@Body() createProductDto: CreateProductDto, @UploadedFile() file: Express.Multer.File) {
    return this.productsService.create(createProductDto, file);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all products' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Returns total count for each product category' })
  getStats() {
    return this.productsService.getStats();
  }

  @Get(':slug')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a product by slug' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOne(slug);
  }

  @Patch(':slug')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product by its slug' })
  @ApiBody({ type: UpdateProductDto })
  @UseInterceptors(FileInterceptor('featuredImage'))
  update(
    @Param('slug') slug: string,
    @Body() updateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.update(slug, updateProductDto, file);
  }

  @Delete(':slug')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product by its slug' })
  remove(@Param('slug') slug: string) {
    return this.productsService.remove(slug);
  }
}
