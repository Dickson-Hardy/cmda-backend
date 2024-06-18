import { Test, TestingModule } from '@nestjs/testing';
import { NuggetsService } from './nuggets.service';

describe('NuggetsService', () => {
  let service: NuggetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NuggetsService],
    }).compile();

    service = module.get<NuggetsService>(NuggetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
