/**
 * Keyword Export Utilities
 * Handles exporting keywords to various formats (CSV, JSON, Google Sheets)
 */

export interface KeywordExportData {
  keyword: string;
  search_volume?: number;
  difficulty?: string;
  competition?: number;
  cpc?: number;
  trend_score?: number;
  recommended?: boolean;
  reason?: string;
  parent_topic?: string;
  primary_intent?: string;
  related_keywords?: string[];
  long_tail_keywords?: string[];
}

export class KeywordExporter {
  /**
   * Export keywords to CSV format
   */
  static exportToCSV(keywords: KeywordExportData[], filename: string = 'keywords.csv'): void {
    if (keywords.length === 0) {
      console.warn('No keywords to export');
      return;
    }

    // Get all unique keys from keywords
    const headers = [
      'Keyword',
      'Search Volume',
      'Difficulty',
      'Competition',
      'CPC',
      'Trend Score',
      'Recommended',
      'Reason',
      'Parent Topic',
      'Primary Intent',
      'Related Keywords',
      'Long Tail Keywords',
    ];

    // Create CSV rows
    const rows = keywords.map(kw => [
      kw.keyword || '',
      kw.search_volume?.toString() || '0',
      kw.difficulty || '',
      kw.competition ? (kw.competition * 100).toFixed(2) + '%' : '',
      kw.cpc ? `$${kw.cpc.toFixed(2)}` : '',
      kw.trend_score?.toFixed(2) || '0',
      kw.recommended ? 'Yes' : 'No',
      kw.reason || '',
      kw.parent_topic || '',
      kw.primary_intent || '',
      (kw.related_keywords || []).join('; '),
      (kw.long_tail_keywords || []).join('; '),
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export keywords to JSON format
   */
  static exportToJSON(keywords: KeywordExportData[], filename: string = 'keywords.json'): void {
    if (keywords.length === 0) {
      console.warn('No keywords to export');
      return;
    }

    const jsonContent = JSON.stringify(keywords, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export to Google Sheets (opens in new tab with data URL)
   */
  static exportToGoogleSheets(keywords: KeywordExportData[]): void {
    if (keywords.length === 0) {
      console.warn('No keywords to export');
      return;
    }

    // Convert to CSV first
    const headers = [
      'Keyword',
      'Search Volume',
      'Difficulty',
      'Competition',
      'CPC',
      'Trend Score',
      'Recommended',
      'Reason',
      'Parent Topic',
      'Primary Intent',
    ];

    const rows = keywords.map(kw => [
      kw.keyword || '',
      kw.search_volume?.toString() || '0',
      kw.difficulty || '',
      kw.competition ? (kw.competition * 100).toFixed(2) + '%' : '',
      kw.cpc ? kw.cpc.toFixed(2) : '',
      kw.trend_score?.toFixed(2) || '0',
      kw.recommended ? 'Yes' : 'No',
      kw.reason || '',
      kw.parent_topic || '',
      kw.primary_intent || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Encode as data URL
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    
    // Open Google Sheets import URL
    const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/create?usp=sharing&url=${encodeURIComponent(dataUri)}`;
    
    // For now, just download CSV with instructions
    // In production, you'd use Google Sheets API
    window.open(googleSheetsUrl, '_blank');
  }

  /**
   * Prepare data for API/webhook export
   */
  static prepareForAPI(keywords: KeywordExportData[]): Record<string, unknown> {
    return {
      export_date: new Date().toISOString(),
      total_keywords: keywords.length,
      keywords: keywords.map(kw => ({
        keyword: kw.keyword,
        metrics: {
          search_volume: kw.search_volume || 0,
          difficulty: kw.difficulty,
          competition: kw.competition,
          cpc: kw.cpc,
          trend_score: kw.trend_score,
        },
        metadata: {
          recommended: kw.recommended || false,
          reason: kw.reason,
          parent_topic: kw.parent_topic,
          primary_intent: kw.primary_intent,
        },
        related: {
          related_keywords: kw.related_keywords || [],
          long_tail_keywords: kw.long_tail_keywords || [],
        },
      })),
    };
  }
}

