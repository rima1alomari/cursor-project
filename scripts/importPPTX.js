(function (global) {
  'use strict';

  const SLIDE_WIDTH = 1280;
  const SLIDE_HEIGHT = 720;
  const DEFAULT_ANIMATION = { type: 'none', duration: 600, delay: 0 };
  const DEFAULT_FONT = 'Inter, sans-serif';
  const DEFAULT_TEXT_COLOR = '#111827';
  const DEFAULT_SHAPE_FILL = '#d9d9d9';
  const DEFAULT_BORDER_COLOR = '#111827';
  const DEFAULT_SLIDE_COLOR = '#ffffff';
  const SLIDE_LIMIT = 60;
  const TEXT_NODE = 3;
  const ELEMENT_NODE = 1;
  const parser = new DOMParser();

  const MIME_TYPES = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    webp: 'image/webp'
  };

  const CHART_TYPES = [
    { selector: 'c\\:barChart, barChart', type: 'bar' },
    { selector: 'c\\:lineChart, lineChart', type: 'line' },
    { selector: 'c\\:pieChart, pieChart', type: 'pie' }
  ];

  function uuid(prefix = 'id') {
    if (global.crypto?.randomUUID) return global.crypto.randomUUID();
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function parseXml(xml) {
    return parser.parseFromString(xml, 'application/xml');
  }

  function safeNumber(value, fallback = 0) {
    const numeric = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function clampDimension(value) {
    return Math.max(1, Math.round(value));
  }

  function query(node, selector) {
    return node?.querySelector?.(selector) || null;
  }

  function queryAll(node, selector) {
    return node ? Array.from(node.querySelectorAll(selector)) : [];
  }

  function createGeometry(cx, cy) {
    const emuPerPxX = cx / SLIDE_WIDTH || 1;
    const emuPerPxY = cy / SLIDE_HEIGHT || 1;
    return {
      toPxX(emu) {
        return Math.round(safeNumber(emu) / emuPerPxX);
      },
      toPxY(emu) {
        return Math.round(safeNumber(emu) / emuPerPxY);
      }
    };
  }

  async function readFileAsDataUrl(zip, path) {
    if (!path) return null;
    const normalized = path.replace(/^\//, '');
    const file = zip.file(normalized);
    if (!file) return null;
    const base64 = await file.async('base64');
    const ext = normalized.split('.').pop()?.toLowerCase() || 'png';
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    return `data:${mime};base64,${base64}`;
  }

  function resolveTarget(basePath, target) {
    if (!target) return null;
    try {
      const base = new URL(basePath, 'http://pptx/');
      const resolved = new URL(target, base);
      return resolved.pathname.replace(/^\//, '');
    } catch (error) {
      if (target.startsWith('../')) {
        const segments = basePath.split('/');
        segments.pop();
        return `${segments.join('/')}/${target}`.replace(/\/\.\//g, '/').replace(/\/{2,}/g, '/').replace(/^\//, '');
      }
      return target.replace(/^\//, '');
    }
  }

  async function loadRelationships(zip, basePath) {
    const idx = basePath.lastIndexOf('/');
    const directory = idx >= 0 ? basePath.slice(0, idx + 1) : '';
    const filename = idx >= 0 ? basePath.slice(idx + 1) : basePath;
    const relPath = `${directory}_rels/${filename}.rels`.replace(/\/{2,}/g, '/');
    const relFile = zip.file(relPath);
    if (!relFile) return {};
    const xml = await relFile.async('text');
    const doc = parseXml(xml);
    const map = {};
    queryAll(doc, 'Relationship').forEach((rel) => {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (!id || !target) return;
      map[id] = resolveTarget(basePath, target);
    });
    return map;
  }

  async function getPresentationManifest(zip) {
    const presentationFile = zip.file('ppt/presentation.xml');
    if (!presentationFile) {
      const fallback = zip
        .file(/^ppt\/slides\/slide\d+\.xml$/i)
        .map((file) => file.name)
        .sort(compareSlideNames);
      return {
        slidePaths: fallback,
        geom: createGeometry(9144000, 6858000)
      };
    }

    const xml = await presentationFile.async('text');
    const doc = parseXml(xml);
    const sizeNode = query(doc, 'p\\:sldSz, sldSz');
    const cx = safeNumber(sizeNode?.getAttribute('cx'), 9144000);
    const cy = safeNumber(sizeNode?.getAttribute('cy'), 6858000);
    const relationships = await loadRelationships(zip, 'ppt/presentation.xml');
    const slideIds = queryAll(doc, 'p\\:sldId, sldId');
    const slidePaths = slideIds
      .map((sld) => {
        const rId = sld.getAttribute('r:id');
        if (!rId || !relationships[rId]) return null;
        const path = relationships[rId];
        return path.startsWith('ppt/') ? path : `ppt/${path}`;
      })
      .filter(Boolean);

    const ordered = slidePaths.length
      ? slidePaths
      : zip
          .file(/^ppt\/slides\/slide\d+\.xml$/i)
          .map((file) => file.name)
          .sort(compareSlideNames);

    return {
      slidePaths: ordered,
      geom: createGeometry(cx, cy)
    };
  }

  function compareSlideNames(a, b) {
    const na = parseInt(a.match(/slide(\d+)/i)?.[1] || '0', 10);
    const nb = parseInt(b.match(/slide(\d+)/i)?.[1] || '0', 10);
    return na - nb;
  }

  function findTransformNode(node) {
    return query(node, 'a\\:xfrm, p\\:xfrm, xfrm');
  }

  function readFrame(node, geometry) {
    const xfrm = findTransformNode(node);
    if (!xfrm) return null;
    const off = query(xfrm, 'a\\:off, off');
    const ext = query(xfrm, 'a\\:ext, ext');
    const left = geometry.toPxX(parseInt(off?.getAttribute('x') || '0', 10));
    const top = geometry.toPxY(parseInt(off?.getAttribute('y') || '0', 10));
    const width = geometry.toPxX(parseInt(ext?.getAttribute('cx') || '0', 10));
    const height = geometry.toPxY(parseInt(ext?.getAttribute('cy') || '0', 10));
    return {
      left: clampDimension(left),
      top: clampDimension(top),
      width: clampDimension(width || 160),
      height: clampDimension(height || 60)
    };
  }

  function parseColor(node, fallback = null) {
    if (!node) return fallback;
    const srgb = query(node, 'a\\:srgbClr, srgbClr');
    if (srgb?.getAttribute('val')) {
      return `#${srgb.getAttribute('val').padStart(6, '0')}`.toLowerCase();
    }
    const scheme = query(node, 'a\\:schemeClr, schemeClr');
    if (scheme?.getAttribute('val')) {
      const map = {
        tx1: '#000000',
        tx2: '#ffffff',
        bg1: '#ffffff',
        bg2: '#000000',
        accent1: '#5b9bd5',
        accent2: '#ed7d31',
        accent3: '#a5a5a5',
        accent4: '#ffc000',
        accent5: '#4472c4',
        accent6: '#70ad47'
      };
      return map[scheme.getAttribute('val')] || fallback;
    }
    return fallback;
  }

  function extractParagraphText(paragraph) {
    const pieces = [];
    paragraph.childNodes.forEach((node) => {
      if (node.nodeType === TEXT_NODE) {
        pieces.push((node.textContent || '').replace(/\s+/g, ' '));
      } else if (node.nodeType === ELEMENT_NODE) {
        const name = node.localName?.toLowerCase();
        if (name === 'br') {
          pieces.push('\n');
        } else if (name === 't') {
          pieces.push((node.textContent || '').replace(/\s+/g, ' '));
        } else {
          pieces.push(extractParagraphText(node));
        }
      }
    });
    return pieces.join('');
  }

  function extractText(txBody) {
    const paragraphs = queryAll(txBody, 'a\\:p, p');
    const lines = paragraphs
      .map((p) => extractParagraphText(p).replace(/\u00a0/g, ' ').trim())
      .filter(Boolean);
    return lines.join('\n').trim();
  }

  function shapeHasText(sp) {
    const txBody = query(sp, 'p\\:txBody, txBody');
    if (!txBody) return false;
    const textContent = txBody.textContent?.replace(/\s+/g, '');
    if (textContent && textContent.length > 0) {
      return true;
    }
    return Boolean(query(txBody, 'a\\:r, r') || query(txBody, 'a\\:t, t'));
  }

  function extractFontProps(txBody) {
    const run = query(txBody, 'a\\:r, r');
    const rPr = query(run, 'a\\:rPr, rPr');
    const szHalfPoints = safeNumber(rPr?.getAttribute('sz'), 2400);
    const fontSizePx = Math.round(((szHalfPoints / 2) * 4) / 3); // half-pt -> px
    const fontFamily = rPr?.getAttribute('typeface') || query(rPr, 'a\\:latin, latin')?.getAttribute('typeface') || DEFAULT_FONT;
    const color = parseColor(query(rPr, 'a\\:solidFill, solidFill'), DEFAULT_TEXT_COLOR) || DEFAULT_TEXT_COLOR;
    const bold = rPr?.getAttribute('b') === '1' || rPr?.getAttribute('b') === 'true';
    const italic = rPr?.getAttribute('i') === '1' || rPr?.getAttribute('i') === 'true';
    const underlineAttr = rPr?.getAttribute('u');
    const underline = underlineAttr && underlineAttr !== 'none';
    return { fontSizePx: Math.max(10, fontSizePx), fontFamily, color, bold, italic, underline };
  }

  function extractAlignment(txBody) {
    const pPr = query(txBody, 'a\\:pPr, pPr');
    const align = pPr?.getAttribute('algn');
    switch (align) {
      case 'ctr':
        return 'center';
      case 'r':
        return 'right';
      case 'just':
      case 'dist':
        return 'justify';
      default:
        return 'left';
    }
  }

  function isSimpleShape(spPr) {
    if (!spPr) return false;
    if (query(spPr, 'a\\:gradFill, gradFill') || query(spPr, 'a\\:pattFill, pattFill') || query(spPr, 'a\\:blipFill, blipFill')) {
      return false;
    }
    const geom = query(spPr, 'a\\:prstGeom, prstGeom');
    const prst = geom?.getAttribute('prst');
    return Boolean(prst);
  }

  function parseTextBox(sp, geometry) {
    const txBody = query(sp, 'p\\:txBody, txBody');
    if (!txBody) return null;
    const text = extractText(txBody);
    if (!text) return null;
    const frame = readFrame(sp, geometry);
    if (!frame) return null;
    const font = extractFontProps(txBody);
    const align = extractAlignment(txBody);
    const fill = parseColor(query(sp, 'p\\:spPr a\\:solidFill, spPr solidFill'), 'transparent');
    return {
      id: uuid('text'),
      type: 'text',
      text,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
      fontSize: font.fontSizePx,
      fontFamily: font.fontFamily,
      color: font.color,
      bold: font.bold,
      italic: font.italic,
      underline: font.underline,
      align,
      lineHeight: 1.3,
      letterSpacing: 0,
      textTransform: 'none',
      backgroundColor: fill
    };
  }

  function parseShape(sp, geometry) {
    const spPr = query(sp, 'p\\:spPr, spPr');
    if (!isSimpleShape(spPr)) return null;
    const frame = readFrame(sp, geometry);
    if (!frame) return null;
    const fill = parseColor(query(spPr, 'a\\:solidFill, solidFill'), DEFAULT_SHAPE_FILL) || DEFAULT_SHAPE_FILL;
    const ln = query(spPr, 'a\\:ln, ln');
    const borderColor = parseColor(query(ln, 'a\\:solidFill, solidFill'), DEFAULT_BORDER_COLOR) || DEFAULT_BORDER_COLOR;
    const borderWidthEmu = safeNumber(ln?.getAttribute('w'), 0);
    const borderWidth = borderWidthEmu ? Math.max(1, Math.round(borderWidthEmu / 12700)) : 1;
    const geom = query(spPr, 'a\\:prstGeom, prstGeom');
    const shapeType = geom?.getAttribute('prst') || 'rect';
    return {
      id: uuid('shape'),
      type: 'shape',
      shapeType,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
      fill,
      borderColor,
      borderWidth
    };
  }

  async function parsePicture(pic, geometry, rels, zip) {
    const frame = readFrame(pic, geometry);
    if (!frame) return null;
    const blip = query(pic, 'a\\:blip, blip');
    const embed = blip?.getAttribute('r:embed');
    if (!embed || !rels[embed]) return null;
    const src = await readFileAsDataUrl(zip, rels[embed]);
    if (!src) return null;
    return {
      id: uuid('image'),
      type: 'image',
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
      src,
      fit: 'cover'
    };
  }

  function readChartSeries(chartDoc, chartNode) {
    const seriesNodes = queryAll(chartNode, 'c\\:ser, ser');
    if (!seriesNodes.length) {
      return { labels: [], datasets: [] };
    }

    let labels = [];
    const datasets = [];

    seriesNodes.forEach((ser, index) => {
      const catValues = readChartValues(query(ser, 'c\\:cat, cat'));
      if (!labels.length && catValues.length) {
        labels = catValues;
      }
      const seriesLabel = readSeriesLabel(ser) || `Series ${index + 1}`;
      const valueNodes = readChartValues(query(ser, 'c\\:val, val'));
      const numericValues = valueNodes.map((value) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
      });
      datasets.push({ label: seriesLabel, data: numericValues });
    });

    if (!labels.length) {
      labels = datasets[0]?.data?.map((_, idx) => `Item ${idx + 1}`) || [];
    }

    return { labels, datasets };
  }

  function readSeriesLabel(series) {
    const tx = query(series, 'c\\:tx, tx');
    if (!tx) return '';
    const strRef = query(tx, 'c\\:strRef, strRef');
    const strCache = query(strRef, 'c\\:strCache, strCache');
    const direct = query(tx, 'c\\:v, v')?.textContent;
    if (strCache) {
      const values = readCachePoints(strCache);
      if (values.length) return values[0];
    }
    return direct || '';
  }

  function readChartValues(parent) {
    if (!parent) return [];
    const strCache = query(parent, 'c\\:strCache, strCache');
    if (strCache) return readCachePoints(strCache);
    const numCache = query(parent, 'c\\:numCache, numCache');
    if (numCache) return readCachePoints(numCache);
    const strLit = query(parent, 'c\\:strLit, strLit');
    if (strLit) return readCachePoints(strLit);
    const numLit = query(parent, 'c\\:numLit, numLit');
    if (numLit) return readCachePoints(numLit);
    return [];
  }

  function readCachePoints(cacheNode) {
    const pts = queryAll(cacheNode, 'c\\:pt, pt');
    if (!pts.length) {
      return queryAll(cacheNode, 'c\\:v, v').map((node) => node.textContent || '');
    }
    return pts
      .map((pt) => ({
        idx: safeNumber(pt.getAttribute('idx'), 0),
        value: query(pt, 'c\\:v, v')?.textContent || ''
      }))
      .sort((a, b) => a.idx - b.idx)
      .map((entry) => entry.value);
  }

  async function parseChartElement(frameNode, geometry, rels, zip) {
    const frame = readFrame(frameNode, geometry);
    if (!frame) return null;
    const chartRef = query(frameNode, 'c\\:chart, chart');
    const rId = chartRef?.getAttribute('r:id');
    if (!rId || !rels[rId]) return null;
    const chartXmlFile = zip.file(rels[rId]);
    if (!chartXmlFile) return null;
    const xml = await chartXmlFile.async('text');
    const chartDoc = parseXml(xml);
    let chartType = 'other';
    let chartNode = null;
    for (const entry of CHART_TYPES) {
      chartNode = chartDoc.querySelector(entry.selector);
      if (chartNode) {
        chartType = entry.type;
        break;
      }
    }
    if (!chartNode) {
      chartNode = chartDoc.querySelector('c\\:chart, chart');
      if (!chartNode) return null;
    }
    const data = readChartSeries(chartDoc, chartNode);
    return {
      id: uuid('chart'),
      type: 'chart',
      chartType,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
      data,
      options: { responsive: true }
    };
  }

  async function parseBackground(doc, rels, zip) {
    const bg = query(doc, 'p\\:bg, bg');
    if (!bg) {
      return { backgroundColor: null, backgroundImage: null };
    }
    const solid = query(bg, 'a\\:solidFill, solidFill');
    const color = parseColor(solid, DEFAULT_SLIDE_COLOR);
    const blip = query(bg, 'a\\:blipFill a\\:blip, blipFill blip');
    if (blip?.getAttribute('r:embed')) {
      const src = await readFileAsDataUrl(zip, rels[blip.getAttribute('r:embed')]);
      return { backgroundColor: color, backgroundImage: src };
    }
    return { backgroundColor: color, backgroundImage: null };
  }

  function deriveSlideTitle(elements, slideIndex) {
    const candidates = elements.filter(
      (el) => el.type === 'text' && el.fontSize >= 28 && el.top < SLIDE_HEIGHT / 3
    );
    if (!candidates.length) {
      return `Slide ${slideIndex + 1}`;
    }
    const sorted = [...candidates].sort((a, b) => b.fontSize - a.fontSize || a.top - b.top);
    const firstLine = sorted[0].text.split('\n').find(Boolean);
    return firstLine || `Slide ${slideIndex + 1}`;
  }

  async function parseSlide(zip, slidePath, geometry, index) {
    const file = zip.file(slidePath);
    if (!file) return null;
    const xml = await file.async('text');
    const doc = parseXml(xml);
    const rels = await loadRelationships(zip, slidePath);
    const background = await parseBackground(doc, rels, zip);
    const elements = [];
    const shapeNodes = queryAll(doc, 'p\\:sp, sp, p\\:cxnSp, cxnSp');
    shapeNodes.forEach((sp) => {
      if (shapeHasText(sp)) {
        const textElement = parseTextBox(sp, geometry);
        if (textElement) {
          elements.push(textElement);
        }
        return;
      }
      const shapeElement = parseShape(sp, geometry);
      if (shapeElement) {
        elements.push(shapeElement);
      }
    });

    const pictures = queryAll(doc, 'p\\:pic, pic');
    for (const pic of pictures) {
      const img = await parsePicture(pic, geometry, rels, zip);
      if (img) elements.push(img);
    }

    const graphicFrames = queryAll(doc, 'p\\:graphicFrame, graphicFrame');
    for (const frame of graphicFrames) {
      const chartElement = await parseChartElement(frame, geometry, rels, zip);
      if (chartElement) elements.push(chartElement);
    }

    const title = deriveSlideTitle(elements, index);
    return {
      id: uuid('slide'),
      title,
      backgroundColor: background.backgroundColor,
      backgroundImage: background.backgroundImage,
      elements,
      animation: DEFAULT_ANIMATION
    };
  }

  async function importFromPPTX(file) {
    try {
      if (!global.JSZip) throw new Error('JSZip is required for PPTX import.');
      const zip = await global.JSZip.loadAsync(file);
      const manifest = await getPresentationManifest(zip);
      const slides = [];
      const limited = manifest.slidePaths.slice(0, SLIDE_LIMIT);
      for (let i = 0; i < limited.length; i += 1) {
        const slide = await parseSlide(zip, limited[i], manifest.geom, i);
        if (slide) slides.push(slide);
      }
      return { slides };
    } catch (error) {
      console.warn('[LumenSlides] PPTX import failed:', error);
      return { slides: [] };
    }
  }

  async function importPdf(file) {
    const pdfjs = global.pdfjsLib;
    if (!pdfjs) {
      throw new Error('pdfjsLib is required to import PDF files.');
    }
    const workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    }

    const data = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    const slides = [];
    const totalPages = Math.min(pdf.numPages, 100);

    for (let i = 1; i <= totalPages; i += 1) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(SLIDE_WIDTH / viewport.width, SLIDE_HEIGHT / viewport.height);
      const scaledViewport = page.getViewport({ scale });

      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = Math.round(scaledViewport.width);
      renderCanvas.height = Math.round(scaledViewport.height);
      const renderCtx = renderCanvas.getContext('2d');
      await page.render({ canvasContext: renderCtx, viewport: scaledViewport }).promise;

      const canvas = document.createElement('canvas');
      canvas.width = SLIDE_WIDTH;
      canvas.height = SLIDE_HEIGHT;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT);
      const offsetX = (SLIDE_WIDTH - renderCanvas.width) / 2;
      const offsetY = (SLIDE_HEIGHT - renderCanvas.height) / 2;
      ctx.drawImage(renderCanvas, offsetX, offsetY, renderCanvas.width, renderCanvas.height);

      const dataUrl = canvas.toDataURL('image/png');
      slides.push({
        id: uuid('slide'),
        title: `Page ${i}`,
        backgroundColor: '#ffffff',
        backgroundImage: null,
        elements: [
          {
            id: uuid('image'),
            type: 'image',
            left: 0,
            top: 0,
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            fit: 'cover',
            src: dataUrl
          }
        ],
        animation: DEFAULT_ANIMATION
      });
    }

    return { slides };
  }

  global.PresentationImporter = global.PresentationImporter || {};
  global.PresentationImporter.importPptx = importFromPPTX;
  global.PresentationImporter.importPdf = global.PresentationImporter.importPdf || importPdf;

  // Testing checklist:
  // - Import sample PPTX with text boxes, shapes, and images to verify positioning.
  // - Verify agenda slide titles stay aligned after import.
  // - Confirm image-heavy slides keep their pictures as separate image elements.
  // - Confirm chart slides become editable chart elements with dataset values.
})(window);

