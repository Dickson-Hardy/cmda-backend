import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
// import { UpdateProductDto } from './dto/update-product.dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './products.schema';
import { Model } from 'mongoose';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ProductCategory } from './products.constant';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<Product>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    files: { featuredImage: Express.Multer.File; additionalImageFiles?: Express.Multer.File[] },
  ): Promise<ISuccessResponse> {
    try {
      // Handle featured image
      let [featuredImageUrl, featuredImageCloudId] = ['', ''];
      if (files.featuredImage) {
        const upload = await this.cloudinaryService.uploadFile(files.featuredImage, 'products');
        if (upload.url) {
          featuredImageUrl = upload.secure_url;
          featuredImageCloudId = upload.public_id;
        }
      } else {
        throw new BadRequestException('featuredImage is required');
      }

      // Handle additional images
      const additionalImages = [];
      const parsedAdditionalImages = JSON.parse(createProductDto.additionalImages);

      if (
        files.additionalImageFiles &&
        files.additionalImageFiles.length &&
        parsedAdditionalImages.length
      ) {
        for (let i = 0; i < files.additionalImageFiles.length; i++) {
          const file = files.additionalImageFiles[i];
          const imageDetails = parsedAdditionalImages[i];

          if (file) {
            const upload = await this.cloudinaryService.uploadFile(file, 'products');
            additionalImages.push({
              name: imageDetails.name || null,
              color: imageDetails.color || null,
              imageUrl: upload.secure_url,
              imageCloudId: upload.public_id,
            });
          }
        }
      }

      // Create the product
      const product = await this.productModel.create({
        ...createProductDto,
        featuredImageUrl,
        featuredImageCloudId,
        additionalImages,
        sizes: createProductDto.sizes ? createProductDto.sizes.split(',').map((x) => x.trim()) : [],
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
    const { searchBy, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = searchBy
      ? {
          $or: [
            { name: new RegExp(searchBy, 'i') },
            { price: new RegExp(searchBy, 'i') },
            { category: new RegExp(searchBy, 'i') },
            { brand: new RegExp(searchBy, 'i') },
          ],
        }
      : {};

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

  async getStats(): Promise<ISuccessResponse> {
    const totalProducts = await this.productModel.countDocuments();
    const totalJournals = await this.productModel.countDocuments({
      category: ProductCategory.JOURNALS,
    });
    const totalWears = await this.productModel.countDocuments({
      category: ProductCategory.WEARS,
    });
    const totalPublicationS = await this.productModel.countDocuments({
      category: ProductCategory.PUBLICATIONS,
    });
    const totalOthers = await this.productModel.countDocuments({
      category: ProductCategory.OTHERS,
    });

    return {
      success: true,
      message: 'Product statistics calculated successfully',
      data: { totalProducts, totalJournals, totalWears, totalPublicationS, totalOthers },
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
      const upload = await this.cloudinaryService.uploadFile(file, 'products');
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
    if (product.additionalImages.length) {
      for (let i = 0; i < product.additionalImages.length; i++) {
        const imageDetails = product.additionalImages[i];
        if (imageDetails.imageCloudId) {
          await this.cloudinaryService.deleteFile(imageDetails.imageCloudId);
        }
      }
    }

    return {
      success: true,
      message: 'Product deleted successfully',
      data: product,
    };
  }
}
