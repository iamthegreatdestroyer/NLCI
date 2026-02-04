/**
 * Clone Report Panel
 *
 * Webview panel for displaying clone analysis reports
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type { CloneResult } from '@nlci/core';

/**
 * Show clone report in a webview panel
 */
export function showCloneReport(context: vscode.ExtensionContext, clones: CloneResult[]): void {
  const panel = vscode.window.createWebviewPanel(
    'nlciReport',
    'NLCI Clone Report',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getReportHtml(clones);

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === 'navigate') {
        await vscode.commands.executeCommand(
          'nlci.navigateToClone',
          message.filePath,
          message.line
        );
      }
    },
    undefined,
    context.subscriptions
  );
}

/**
 * Generate HTML for the report
 */
function getReportHtml(clones: CloneResult[]): string {
  // Group clones by type
  const byType: Record<string, CloneResult[]> = {};
  for (const clone of clones) {
    const type = clone.cloneType;
    if (!byType[type]) {
      byType[type] = [];
    }
    byType[type].push(clone);
  }

  // Calculate summary statistics
  const totalClones = clones.length;
  const uniqueFiles = new Set(clones.map((c) => c.source.filePath)).size;
  const avgSimilarity = clones.reduce((sum, c) => sum + c.similarity, 0) / totalClones || 0;

  // Generate clone rows
  const cloneRows = clones
    .sort((a, b) => b.similarity - a.similarity)
    .map(
      (clone, i) => `
      <tr class="clone-row" data-source-file="${escapeHtml(clone.source.filePath)}" data-source-line="${clone.source.startLine}" data-target-file="${escapeHtml(clone.target.filePath)}" data-target-line="${clone.target.startLine}">
        <td>${i + 1}</td>
        <td><span class="clone-type ${clone.cloneType}">${getCloneTypeName(clone.cloneType)}</span></td>
        <td>${(clone.similarity * 100).toFixed(1)}%</td>
        <td class="file-link" onclick="navigateTo('${escapeHtml(clone.source.filePath)}', ${clone.source.startLine})">${escapeHtml(path.basename(clone.source.filePath))}:${clone.source.startLine}</td>
        <td class="file-link" onclick="navigateTo('${escapeHtml(clone.target.filePath)}', ${clone.target.startLine})">${escapeHtml(path.basename(clone.target.filePath))}:${clone.target.startLine}</td>
      </tr>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NLCI Clone Report</title>
  <style>
    :root {
      --bg-color: var(--vscode-editor-background);
      --fg-color: var(--vscode-editor-foreground);
      --border-color: var(--vscode-widget-border);
      --link-color: var(--vscode-textLink-foreground);
      --type1-color: #ff6b6b;
      --type2-color: #ffa94d;
      --type3-color: #ffd43b;
      --type4-color: #69db7c;
    }
    
    body {
      font-family: var(--vscode-font-family);
      color: var(--fg-color);
      background: var(--bg-color);
      padding: 20px;
      margin: 0;
    }
    
    h1 {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 10px;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    
    .stat-card {
      background: var(--vscode-input-background);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    
    .stat-card h3 {
      margin: 0 0 5px 0;
      font-size: 14px;
      opacity: 0.8;
    }
    
    .stat-card .value {
      font-size: 28px;
      font-weight: bold;
    }
    
    .type-breakdown {
      display: flex;
      gap: 10px;
      margin: 20px 0;
    }
    
    .type-badge {
      padding: 5px 15px;
      border-radius: 15px;
      font-size: 12px;
    }
    
    .type-1 { background: var(--type1-color); color: black; }
    .type-2 { background: var(--type2-color); color: black; }
    .type-3 { background: var(--type3-color); color: black; }
    .type-4 { background: var(--type4-color); color: black; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }
    
    th {
      background: var(--vscode-input-background);
      font-weight: 600;
    }
    
    .clone-row:hover {
      background: var(--vscode-list-hoverBackground);
    }
    
    .file-link {
      color: var(--link-color);
      cursor: pointer;
      text-decoration: underline;
    }
    
    .file-link:hover {
      text-decoration: none;
    }
    
    .clone-type {
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
    }
    
    .filter-bar {
      margin: 20px 0;
      display: flex;
      gap: 10px;
      align-items: center;
    }
    
    .filter-bar input {
      flex: 1;
      padding: 8px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--vscode-input-background);
      color: var(--fg-color);
    }
    
    .filter-bar select {
      padding: 8px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--vscode-input-background);
      color: var(--fg-color);
    }
  </style>
</head>
<body>
  <h1>🔍 NLCI Clone Analysis Report</h1>
  
  <div class="summary">
    <div class="stat-card">
      <h3>Total Clones</h3>
      <div class="value">${totalClones}</div>
    </div>
    <div class="stat-card">
      <h3>Files Affected</h3>
      <div class="value">${uniqueFiles}</div>
    </div>
    <div class="stat-card">
      <h3>Avg Similarity</h3>
      <div class="value">${(avgSimilarity * 100).toFixed(1)}%</div>
    </div>
    <div class="stat-card">
      <h3>Clone Types</h3>
      <div class="value">${Object.keys(byType).length}</div>
    </div>
  </div>
  
  <div class="type-breakdown">
    ${Object.entries(byType)
      .map(
        ([type, typeClones]) =>
          `<span class="type-badge ${type}">${getCloneTypeName(type)}: ${typeClones.length}</span>`
      )
      .join('')}
  </div>
  
  <div class="filter-bar">
    <input type="text" id="search" placeholder="Search files..." onkeyup="filterTable()">
    <select id="typeFilter" onchange="filterTable()">
      <option value="">All Types</option>
      <option value="type-1">Type 1 (Exact)</option>
      <option value="type-2">Type 2 (Parameterized)</option>
      <option value="type-3">Type 3 (Near-miss)</option>
      <option value="type-4">Type 4 (Semantic)</option>
    </select>
  </div>
  
  <table id="clonesTable">
    <thead>
      <tr>
        <th>#</th>
        <th>Type</th>
        <th>Similarity</th>
        <th>Source</th>
        <th>Target</th>
      </tr>
    </thead>
    <tbody>
      ${cloneRows}
    </tbody>
  </table>
  
  <script>
    const vscode = acquireVsCodeApi();
    
    function navigateTo(filePath, line) {
      vscode.postMessage({
        command: 'navigate',
        filePath: filePath,
        line: line
      });
    }
    
    function filterTable() {
      const search = document.getElementById('search').value.toLowerCase();
      const typeFilter = document.getElementById('typeFilter').value;
      const rows = document.querySelectorAll('.clone-row');
      
      rows.forEach(row => {
        const sourceFile = row.dataset.sourceFile.toLowerCase();
        const targetFile = row.dataset.targetFile.toLowerCase();
        const cloneType = row.querySelector('.clone-type').classList[1];
        
        const matchesSearch = sourceFile.includes(search) || targetFile.includes(search);
        const matchesType = !typeFilter || cloneType === typeFilter;
        
        row.style.display = matchesSearch && matchesType ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Get human-readable clone type name
 */
function getCloneTypeName(cloneType: string): string {
  switch (cloneType) {
    case 'type-1':
      return 'Exact';
    case 'type-2':
      return 'Parameterized';
    case 'type-3':
      return 'Near-miss';
    case 'type-4':
      return 'Semantic';
    default:
      return cloneType;
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
