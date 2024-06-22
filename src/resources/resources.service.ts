import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ISuccessResponse } from '../_global/interface/success-response';
import { CreateResourceDto } from './dto/create-resource.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Resource } from './resources.schema';
import { Model } from 'mongoose';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { CreateResourceFromUrlDto } from './dto/create-resource-from-url.dto';
import { WordPressCategories, YoutubeCategories } from './resources.constant';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectModel(Resource.name)
    private resourceModel: Model<Resource>,
    private config: ConfigService,
  ) {}

  async create(createResourceDto: CreateResourceDto): Promise<ISuccessResponse> {
    try {
      const resource = await this.resourceModel.create(createResourceDto);
      return {
        success: true,
        message: 'Resource created successfully',
        data: resource,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Resource with title or slug already exists');
      }
      throw error;
    }
  }

  async createFromUrl(
    createResourceFromUrlDto: CreateResourceFromUrlDto,
  ): Promise<ISuccessResponse> {
    const { sourceUrl, category } = createResourceFromUrlDto;

    let resourceData: any;

    if (WordPressCategories.includes(category)) {
      const wordPressBase = this.config.get('WORDPRESS_BASE');
      if (!sourceUrl.includes(wordPressBase)) {
        throw new BadRequestException(
          'sourceUrl for ' + category + ' must be a wordpress link from ' + wordPressBase,
        );
      }
      resourceData = await this.fetchWordPressPost(sourceUrl);
    }
    if (YoutubeCategories.includes(category)) {
      if (!sourceUrl.includes('youtube')) {
        throw new BadRequestException('sourceUrl for ' + category + ' must be a youtube link');
      }
      resourceData = await this.fetchYouTubeVideo(sourceUrl);
    }

    const response = await this.create({ ...resourceData, category });
    return response;
  }

  private async fetchWordPressPost(url: string): Promise<Partial<Resource>> {
    try {
      const wordPressBase = this.config.get('WORDPRESS_BASE');
      const slug = url.split(wordPressBase)[1];
      const apiUrl = `${wordPressBase}${this.config.get('WORDPRESS_API_POST_PATH')}&slug=${slug}`;
      const response = await axios.get(apiUrl);
      const post = response.data?.[0];

      if (!post) {
        throw new NotFoundException('No WordPress post on CMDA with such URL');
      }

      const resource = {
        title: post.title.rendered,
        description: post.excerpt.rendered,
        slug: post.slug,
        featuredImage: post._embedded['wp:featuredmedia']?.[0]?.source_url || '',
        sourceUrl: url,
        tags: post.tags?.map((x: any) => String(x)),
        author: {
          name: post._embedded.author?.[0]?.name,
          avatarUrl: post._embedded.author?.[0]?.avatar_urls?.['96'],
        },
        publishedAt: new Date(post.date),
      };

      return resource;
    } catch (error) {
      throw error;
    }
  }

  private async fetchYouTubeVideo(url: string): Promise<Partial<Resource>> {
    const videoId = url.split('v=')[1];
    const apiKey = this.config.get('YOUTUBE_API_KEY');
    const apiUrl = this.config.get('YOUTUBE_API_BASE_URL');
    const response = await axios.get(`${apiUrl}&id=${videoId}&key=${apiKey}`);
    const video = response.data.items[0].snippet;

    if (!video) {
      throw new NotFoundException('No YouTube video on CMDA with such URL');
    }

    const resource = {
      title: video.title,
      description: video.description,
      slug: videoId,
      featuredImage: video.thumbnails.high.url,
      sourceUrl: url,
      tags: video.tags || [],
      author: {
        name: video.channelTitle,
        avatarUrl: this.config.get('YOUTUBE_CHANNEL_AVATAR_URL'),
      },
      publishedAt: new Date(video.publishedAt),
    };

    return resource;
  }

  async findAll(query: PaginationQueryDto): Promise<ISuccessResponse> {
    const { keyword, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = keyword ? { title: { $regex: keyword, $options: 'i' } } : {};

    const resources = await this.resourceModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));
    const totalItems = await this.resourceModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Resources fetched successfully',
      data: {
        items: resources,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async findOne(slug: string): Promise<ISuccessResponse> {
    const resource = await this.resourceModel.findOne({ slug });
    if (!resource) throw new NotFoundException('Resource with slug does not exist');
    return {
      success: true,
      message: 'Resource fetched successfully',
      data: resource,
    };
  }

  async updateOne(slug: string, updateResourceDto): Promise<ISuccessResponse> {
    const resource = await this.resourceModel.findOneAndUpdate({ slug }, updateResourceDto, {
      new: true,
    });
    if (!resource) throw new NotFoundException('Resource with slug does not exist');
    return {
      success: true,
      message: 'Resource updated successfully',
      data: resource,
    };
  }

  async removeOne(slug: string): Promise<ISuccessResponse> {
    const resource = await this.resourceModel.findOneAndDelete({ slug });
    if (!resource) throw new NotFoundException('Resource with slug does not exist');
    return {
      success: true,
      message: 'Resource deleted successfully',
      data: resource,
    };
  }
}
