import { Test, TestingModule } from '@nestjs/testing';
import { NuggetsController } from './nuggets.controller';

describe('NuggetsController', () => {
  let controller: NuggetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NuggetsController],
    }).compile();

    controller = module.get<NuggetsController>(NuggetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
