import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
// import { CreateProductDto } from './dto/create-product.dto';
// import { UpdateProductDto } from './dto/update-product.dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './products.schema';
import { Model } from 'mongoose';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<Product>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    file: Express.Multer.File,
  ): Promise<ISuccessResponse> {
    try {
      let [featuredImageUrl, featuredImageCloudId] = ['', ''];
      if (file) {
        const upload = await this.cloudinaryService.uploadFile(file, 'Products');
        if (upload.url) {
          featuredImageUrl = upload.secure_url;
          featuredImageCloudId = upload.public_id;
        }
      }

      const product = await this.productModel.create({
        ...createProductDto,
        featuredImageUrl,
        featuredImageCloudId,
      });

      return {
        success: true,
        message: 'Product created successfully',
        data: product,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Product name already exists');
      }
      throw error;
    }
  }

  async findAll(query: PaginationQueryDto): Promise<ISuccessResponse> {
    const { keyword, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = keyword ? { name: { $regex: keyword, $options: 'i' } } : {};

    const products = await this.productModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));
    const totalItems = await this.productModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Products fetched successfully',
      data: {
        items: products,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async findOne(slug: string): Promise<ISuccessResponse> {
    const product = await this.productModel.findOne({ slug });
    if (!product) {
      throw new NotFoundException('Product slug does not exist');
    }
    return {
      success: true,
      message: 'Product fetched successfully',
      data: product,
    };
  }

  async update(
    slug: string,
    updateProductDto,
    file: Express.Multer.File,
  ): Promise<ISuccessResponse> {
    const NON_EDITABLES = ['slug', 'featuredImageUrl', 'featuredImageCloudId'];
    NON_EDITABLES.forEach((key) => {
      delete updateProductDto[key];
    });

    const product = await this.productModel.findOne({ slug });
    if (!product) {
      throw new NotFoundException('Product slug does not exist');
    }

    let [featuredImageUrl, featuredImageCloudId] = [
      product.featuredImageUrl,
      product.featuredImageCloudId,
    ];
    if (file) {
      const upload = await this.cloudinaryService.uploadFile(file, 'Products');
      if (upload.url) {
        featuredImageUrl = upload.secure_url;
        featuredImageCloudId = upload.public_id;

        if (product.featuredImageCloudId) {
          await this.cloudinaryService.deleteFile(product.featuredImageCloudId);
        }
      }
    }

    const newProduct = await this.productModel.findOneAndUpdate(
      { slug },
      { ...updateProductDto, featuredImageCloudId, featuredImageUrl },
      { new: true },
    );

    return {
      success: true,
      message: 'Product updated successfully',
      data: newProduct,
    };
  }

  async remove(slug: string): Promise<ISuccessResponse> {
    const product = await this.productModel.findOneAndDelete({ slug });
    if (!product) {
      throw new NotFoundException('Product slug does not exist');
    }
    if (product.featuredImageCloudId) {
      await this.cloudinaryService.deleteFile(product.featuredImageCloudId);
    }

    return {
      success: true,
      message: 'Product deleted successfully',
      data: product,
    };
  }
}
