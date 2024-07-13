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
import { CreateResourceFromUrlDto } from './dto/create-resource-from-url.dto';
import { ResourceCategory, WordPressCategories, YoutubeCategories } from './resources.constant';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { ResourcePaginationQueryDto } from './dto/resource-pagination-query-dto';

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
      const wordPressSource = this.config.get('WORDPRESS_SOURCE');
      if (!sourceUrl.includes(wordPressSource)) {
        throw new BadRequestException(
          'sourceUrl for ' + category + ' must be a wordpress link from ' + wordPressSource,
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

  async findAll(query: ResourcePaginationQueryDto): Promise<ISuccessResponse> {
    const { searchBy, limit, page, category } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    // Build the search criteria
    const searchCriteria: any = {};
    if (searchBy) searchCriteria.title = { $regex: searchBy, $options: 'i' };
    if (category) searchCriteria.category = category;

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

  async getStats(): Promise<ISuccessResponse> {
    const totalResources = await this.resourceModel.countDocuments();
    const totalNewsletters = await this.resourceModel.countDocuments({
      category: ResourceCategory.NEWSLETTER,
    });
    const totalArticles = await this.resourceModel.countDocuments({
      category: ResourceCategory.ARTICLE,
    });
    const totalWebinars = await this.resourceModel.countDocuments({
      category: ResourceCategory.WEBINAR,
    });
    const totalOthers = await this.resourceModel.countDocuments({
      category: ResourceCategory.OTHERS,
    });

    return {
      success: true,
      message: 'Resource statistics calculated successfully',
      data: { totalResources, totalArticles, totalNewsletters, totalWebinars, totalOthers },
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

  async updateOne(slug: string): Promise<ISuccessResponse> {
    const resource = await this.resourceModel.findOne({ slug });
    if (!resource) throw new NotFoundException('Resource with slug does not exist');
    let updatedResourceData: any;
    if (WordPressCategories.includes(resource.category)) {
      const url = this.config.get('WORDPRESS_SOURCE') + slug;
      updatedResourceData = await this.fetchWordPressPost(url);
    } else {
      const url = this.config.get('YOUTUBE_SOURCE') + '?v=' + slug;
      updatedResourceData = await this.fetchYouTubeVideo(url);
    }

    const newResource = await this.resourceModel.findByIdAndUpdate(
      resource._id,
      updatedResourceData,
      { new: true },
    );

    return {
      success: true,
      message: 'Resource updated successfully',
      data: newResource,
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

  private async fetchWordPressPost(url: string): Promise<Partial<Resource>> {
    try {
      const wordPressSource = this.config.get('WORDPRESS_SOURCE');
      const slug = url.split(wordPressSource)[1];
      const apiUrl = `${wordPressSource}${this.config.get('WORDPRESS_API_POST_PATH')}&slug=${slug}`;
      const response = await axios.get(apiUrl);
      const post = response.data?.[0];

      if (!post) {
        throw new NotFoundException('No WordPress post on CMDA with such URL');
      }

      const resource = {
        title: post.title.rendered,
        description: post.content.rendered,
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
}
