import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { ReceiptHtmlService } from './receipt-html.service';

@Injectable()
export class ReceiptImageService implements OnModuleInit, OnModuleDestroy {
  private browser: puppeteer.Browser;

  constructor(private receiptHtmlService: ReceiptHtmlService) {}

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

  async generateReceiptImage(subscriptionId: string): Promise<Buffer> {
    // Generate HTML receipt
    const html = await this.receiptHtmlService.generateReceiptHtml(subscriptionId);

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
