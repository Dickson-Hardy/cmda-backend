export enum ResourceCategory {
  ARTICLE = 'Article',
  NEWSLETTER = 'Newsletter',
  WEBINAR = 'Webinar',
  OTHERS = 'Others',
}

export const WordPressCategories = [ResourceCategory.ARTICLE, ResourceCategory.NEWSLETTER];

export const YoutubeCategories = [ResourceCategory.WEBINAR, ResourceCategory.OTHERS];

export const AllResouceCategories = WordPressCategories.concat(YoutubeCategories);
