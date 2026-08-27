import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType
} from 'docx';

const docsDir = 'C:\\Users\\esakk\\.gemini\\antigravity-ide\\scratch\\aescion_billing_app\\docs\\project-documentation';
const zipPath = path.join(docsDir, 'AESCION_PROJECT_DOCUMENTATION.zip');

function parseMarkdown(mdContent) {
  const lines = mdContent.split('\n');
  const elements = [];
  let inCode = false;
  let codeLines = [];
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    if (line.startsWith('```')) {
      if (inCode) {
        elements.push({ type: 'code', text: codeLines.join('\n') });
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      if (line.includes('---')) continue;
      const cols = line.split('|').slice(1, -1).map(c => c.trim());
      tableRows.push(cols);
      inTable = true;
      continue;
    } else if (inTable) {
      elements.push({ type: 'table', rows: tableRows });
      tableRows = [];
      inTable = false;
    }

    if (line.startsWith('# ')) {
      elements.push({ type: 'h1', text: line.replace('# ', '') });
    } else if (line.startsWith('## ')) {
      elements.push({ type: 'h2', text: line.replace('## ', '') });
    } else if (line.startsWith('### ')) {
      elements.push({ type: 'h3', text: line.replace('### ', '') });
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      elements.push({ type: 'bullet', text: line.replace(/^[\*\-]\s+/, '') });
    } else if (line.trim().length > 0 && !line.startsWith('---')) {
      elements.push({ type: 'p', text: line });
    }
  }

  if (inTable && tableRows.length > 0) {
    elements.push({ type: 'table', rows: tableRows });
  }

  return elements;
}

async function convertMarkdownToDocx(mdPath, docxPath, title, subtitle) {
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  const items = parseMarkdown(mdContent);

  const docChildren = [];

  // Title Page
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1400, after: 300 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 44,
          font: 'Calibri',
          color: '1E3A8A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 1200 },
      children: [
        new TextRun({
          text: subtitle,
          italics: true,
          size: 24,
          font: 'Calibri',
          color: '4B5563'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
      children: [
        new TextRun({
          text: 'Official Architecture, Setup & Verification Documentation',
          size: 20,
          font: 'Calibri',
          color: '6B7280'
        })
      ]
    }),
    new Paragraph({
      pageBreakBefore: true,
      children: []
    })
  );

  for (const item of items) {
    if (item.type === 'h1') {
      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 150 },
          children: [
            new TextRun({
              text: item.text,
              bold: true,
              size: 32,
              font: 'Calibri',
              color: '1E3A8A'
            })
          ]
        })
      );
    } else if (item.type === 'h2') {
      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 120 },
          children: [
            new TextRun({
              text: item.text,
              bold: true,
              size: 26,
              font: 'Calibri',
              color: '1E40AF'
            })
          ]
        })
      );
    } else if (item.type === 'h3') {
      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 100 },
          children: [
            new TextRun({
              text: item.text,
              bold: true,
              size: 22,
              font: 'Calibri',
              color: '2563EB'
            })
          ]
        })
      );
    } else if (item.type === 'p') {
      docChildren.push(
        new Paragraph({
          spacing: { after: 120, line: 276 },
          children: [
            new TextRun({
              text: item.text.replace(/\*\*/g, ''),
              size: 21,
              font: 'Calibri',
              color: '1F2937'
            })
          ]
        })
      );
    } else if (item.type === 'bullet') {
      docChildren.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: item.text.replace(/\*\*/g, ''),
              size: 21,
              font: 'Calibri',
              color: '1F2937'
            })
          ]
        })
      );
    } else if (item.type === 'code') {
      docChildren.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
          border: {
            left: { style: BorderStyle.SINGLE, size: 12, color: '3B82F6' },
            top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' }
          },
          children: [
            new TextRun({
              text: item.text,
              font: 'Consolas',
              size: 19,
              color: '0F172A'
            })
          ]
        })
      );
    } else if (item.type === 'table') {
      const rows = item.rows.map((r, rIdx) => {
        const isHeader = rIdx === 0;
        return new TableRow({
          tableHeader: isHeader,
          children: r.map(c => new TableCell({
            shading: {
              type: ShadingType.CLEAR,
              fill: isHeader ? 'E0E7FF' : (rIdx % 2 === 1 ? 'FFFFFF' : 'F8FAFC')
            },
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: c.replace(/\*\*/g, ''),
                    bold: isHeader,
                    size: 19,
                    font: 'Calibri',
                    color: isHeader ? '1E3A8A' : '334155'
                  })
                ]
              })
            ]
          }))
        });
      });

      docChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: rows
        }),
        new Paragraph({ spacing: { after: 200 }, children: [] })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: docChildren
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(docxPath, buffer);
  console.log(`✅ Generated DOCX: ${docxPath}`);
}

async function createZipArchive() {
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  const psZipCmd = `powershell -Command "Compress-Archive -Path '${docsDir}\\*.md', '${docsDir}\\*.docx' -DestinationPath '${zipPath}' -Force"`;
  execSync(psZipCmd);
  console.log(`✅ Generated ZIP Archive: ${zipPath}`);
}

async function main() {
  const guide1Md = path.join(docsDir, 'PROJECT_SETUP_AND_RUN_GUIDE.md');
  const guide1Docx = path.join(docsDir, 'PROJECT_SETUP_AND_RUN_GUIDE.docx');
  const guide2Md = path.join(docsDir, 'WEBSITE_WORKFLOW_AND_TESTING_GUIDE.md');
  const guide2Docx = path.join(docsDir, 'WEBSITE_WORKFLOW_AND_TESTING_GUIDE.docx');

  await convertMarkdownToDocx(guide1Md, guide1Docx, 'AESCION Commerce — Project Setup & Run Guide', 'Enterprise Multi-Tenant POS & Business Operating Platform v2.0');
  await convertMarkdownToDocx(guide2Md, guide2Docx, 'AESCION Commerce — Website Workflow & Testing Guide', 'Operational Architecture, RBAC & End-to-End Test Matrix');
  await createZipArchive();
}

main().catch(err => {
  console.error('Fatal error in doc generation:', err);
  process.exit(1);
});
