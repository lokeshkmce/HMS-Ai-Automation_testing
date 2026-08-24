import { Page, Locator } from '@playwright/test';

/**
 * TableComponent — reusable MUI DataGrid / table component for Omnivva HMS.
 *
 * Works with standard HTML <table> elements and MUI DataGrid patterns.
 * Pass a custom rootSelector in the constructor to scope to a specific table.
 */
export class TableComponent {
  readonly root: Locator;
  readonly rows: Locator;
  readonly headers: Locator;

  constructor(
    private readonly page: Page,
    // Supports both plain HTML tables and MUI DataGrid
    rootSelector = 'table, .MuiDataGrid-root',
  ) {
    this.root = page.locator(rootSelector).first();
    this.rows = this.root.locator('tbody tr, .MuiDataGrid-row');
    this.headers = this.root.locator('thead th, .MuiDataGrid-columnHeader');
  }

  async getRowCount(): Promise<number> {
    return this.rows.count();
  }

  async getCellText(rowIndex: number, colIndex: number): Promise<string> {
    const row = this.rows.nth(rowIndex);
    const cell = row.locator('td, .MuiDataGrid-cell').nth(colIndex);
    return ((await cell.textContent()) ?? '').trim();
  }

  async getHeaderTexts(): Promise<string[]> {
    const count = await this.headers.count();
    const texts: string[] = [];
    for (let i = 0; i < count; i++) {
      texts.push(((await this.headers.nth(i).textContent()) ?? '').trim());
    }
    return texts;
  }

  async getRowTexts(rowIndex: number): Promise<string[]> {
    const row = this.rows.nth(rowIndex);
    const cells = row.locator('td, .MuiDataGrid-cell');
    const count = await cells.count();
    const texts: string[] = [];
    for (let i = 0; i < count; i++) {
      texts.push(((await cells.nth(i).textContent()) ?? '').trim());
    }
    return texts;
  }
}
