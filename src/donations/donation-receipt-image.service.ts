import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { DonationReceiptHtmlService } from './donation-receipt-html.service';

@Injectable()
export class DonationReceiptImageService implements OnModuleInit, OnModuleDestroy {
  private browser: puppeteer.Browser;

  constructor(private receiptHtmlService: DonationReceiptHtmlService) {}

  async onModuleInit() {
    // Launch browser once when the module initializes
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async onModuleDestroy() {
    // Close browser when module is destroyed
    if (this.browser) {
      await this.browser.close();
    }
  }

  async generateReceiptImage(donationId: string): Promise<Buffer> {
    // Generate HTML receipt
    const html = await this.receiptHtmlService.generateReceiptHtml(donationId);

    // Create a new page
    const page = await this.browser.newPage();

    try {
      // Set viewport size for consistent rendering
      await page.setViewport({
        width: 850,
        height: 1200,
        deviceScaleFactor: 2, // Higher quality
      });

      // Load HTML content
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: true,
      });

      return Buffer.from(screenshot);
    } finally {
      // Always close the page
      await page.close();
    }
  }
}
