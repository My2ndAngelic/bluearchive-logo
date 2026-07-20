import debounce from 'lodash-es/debounce';
import settings from './settings';
import loadFont from './utils/loadFont';
const {
  canvasHeight,
  canvasWidth,
  fontSize,
  horizontalTilt,
  textBaseLine,
  graphOffset,
  paddingX,
  hollowPath,
} = settings;
const defaultSubFontSize = 32;
const defaultFontWeight = 800;
type FontProfile = 'rog2' | 'custom';
type WeightMode = 'native' | 'synthetic';
const fontProfiles: Record<FontProfile, string> = {
  rog2: 'RoGSanSrfStd-Bd',
  custom: 'RoGSanSrfStd-Bd',
};

export default class LogoCanvas {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public textL = 'Blue';
  public textR = 'Archive';
  public textSub = '';
  private pointColor = '#128AFA';
  private textColor = '#2B2B2B';
  private fontProfile: FontProfile = 'rog2';
  private customWeightMode: WeightMode = 'native';
  private customFontFamily = '';
  private customFontSize = fontSize;
  private customFontWeight = defaultFontWeight;
  private loadedGoogleFonts = new Set<string>();
  private loadedStyleUrls = new Set<string>();
  private localFontObjectUrl: string | null = null;
  private textMetricsL: TextMetrics | null = null;
  private textMetricsR: TextMetrics | null = null;
  private canvasWidthL = canvasWidth / 2;
  private canvasWidthR = canvasWidth / 2;
  private textWidthL = 0;
  private textWidthR = 0;
  private graphOffset = graphOffset;
  private transparentBg = false;
  constructor() {
    this.canvas = document.querySelector('#canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.height = canvasHeight;
    this.canvas.width = canvasWidth;
    this.bindEvent();
  }
  async draw() {
    const loading = document.querySelector('#loading')!;
    loading.classList.remove('hidden');
    const c = this.ctx;
    const fontFamily = this.getCurrentFontFamily();
    const { titleFontSize, titleFontWeight, subtitleFontSize } = this.getCurrentTypography();
    const font = `${titleFontWeight} ${titleFontSize}px ${fontFamily}`;
    const subFont = `${titleFontWeight} ${subtitleFontSize}px ${fontFamily}`;
    //predict canvas width
    await loadFont(this.textL + this.textR + this.textSub, fontFamily, titleFontSize, titleFontWeight);
    loading.classList.add('hidden');
    c.font = font;
    this.textMetricsL = c.measureText(this.textL);
    this.textMetricsR = c.measureText(this.textR);
    this.setWidth();
    //clear canvas
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    //Background
    if (!this.transparentBg) {
      c.fillStyle = '#fff';
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    //guide line
    if (import.meta.env.DEV) {
      c.strokeStyle = '#00cccc';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(this.canvasWidthL, 0);
      c.lineTo(this.canvasWidthL, this.canvas.height);
      c.stroke();
      console.log(this.textMetricsL.width, this.textMetricsR.width);
      console.log(this.textWidthL, this.textWidthR);
      c.moveTo(this.canvasWidthL - this.textWidthL, 0);
      c.lineTo(this.canvasWidthL - this.textWidthL, this.canvas.height);
      c.moveTo(this.canvasWidthL + this.textWidthR, 0);
      c.lineTo(this.canvasWidthL + this.textWidthR, this.canvas.height);
      c.stroke();
    }
    //blue text -> halo -> black text -> cross
    const halo = await this.tintImage(window.halo, this.textColor);
    const cross = await this.tintImage(window.cross, this.pointColor);
    c.font = font;
    c.fillStyle = this.pointColor;
    c.textAlign = 'end';
    c.setTransform(1, 0, horizontalTilt, 1, 0, 0);
    this.fillTextWithWeight(c, this.textL, this.canvasWidthL, this.canvas.height * textBaseLine);
    c.resetTransform(); //restore don't work
    c.drawImage(
      halo,
      this.canvasWidthL - this.canvas.height / 2 + this.graphOffset.X,
      this.graphOffset.Y,
      canvasHeight,
      canvasHeight
    );
    c.fillStyle = this.textColor;
    c.textAlign = 'start';
    if (this.transparentBg) {
      c.globalCompositeOperation = 'destination-out';
    }
    c.strokeStyle = 'white';
    c.lineWidth = 12;
    c.setTransform(1, 0, horizontalTilt, 1, 0, 0);
    c.strokeText(this.textR, this.canvasWidthL, this.canvas.height * textBaseLine);
    c.globalCompositeOperation = 'source-over';
    this.fillTextWithWeight(c, this.textR, this.canvasWidthL, this.canvas.height * textBaseLine);
    c.font = subFont;
    this.fillTextWithWeight(
      c,
      this.textSub,
      this.canvasWidthL + this.textWidthR - c.measureText(this.textSub).width + 35,
      this.canvas.height * textBaseLine + 40
    );
    c.resetTransform();
    const graph = {
      X: this.canvasWidthL - this.canvas.height / 2 + graphOffset.X,
      Y: this.graphOffset.Y,
    };
    c.beginPath();
    c.moveTo(
      graph.X + (hollowPath[0][0] / 500) * canvasHeight,
      graph.Y + (hollowPath[0][1] / 500) * canvasHeight
    );
    for (let i = 1; i < 4; i++) {
      c.lineTo(
        graph.X + (hollowPath[i][0] / 500) * canvasHeight,
        graph.Y + (hollowPath[i][1] / 500) * canvasHeight
      );
    }
    c.closePath();
    if (this.transparentBg) {
      c.globalCompositeOperation = 'destination-out';
    }
    c.fillStyle = 'white';
    c.fill();
    c.globalCompositeOperation = 'source-over';
    c.drawImage(
      cross,
      this.canvasWidthL - this.canvas.height / 2 + graphOffset.X,
      this.graphOffset.Y,
      canvasHeight,
      canvasHeight
    );
  }
  bindEvent() {
    const process = (id: 'textL' | 'textR' | 'textSub', el: HTMLInputElement) => {
      this[id] = el.value.replace(/ /g, ' ');
      this.draw();
    };
    for (const t of ['textL', 'textR', 'textSub']) {
      const id = t as 'textL' | 'textR' | 'textSub';
      const el = document.getElementById(id)! as HTMLInputElement;
      el.addEventListener('compositionstart', () => el.setAttribute('composing', ''));
      el.addEventListener('compositionend', () => {
        process(id, el);
        el.removeAttribute('composing');
      });
      el.addEventListener(
        'input',
        debounce(() => {
          if (el.hasAttribute('composing')) {
            return;
          }
          process(id, el);
        }, 300)
      );
    }
    document.querySelector('#reset')!.addEventListener('click', () => this.resetColor());
    document.querySelector('#save')!.addEventListener('click', () => this.saveImg());
    document.querySelector('#copy')!.addEventListener('click', () => this.copyImg());
    const tSwitch = document.querySelector('#transparent')! as HTMLInputElement;
    tSwitch.addEventListener('change', () => {
      this.transparentBg = tSwitch.checked;
      this.draw();
    });
    const pointColor = document.querySelector('#pointColor')! as HTMLInputElement;
    const textColor = document.querySelector('#textColor')! as HTMLInputElement;
    pointColor.addEventListener('input', () => {
      this.pointColor = pointColor.value;
      this.draw();
    });
    textColor.addEventListener('input', () => {
      this.textColor = textColor.value;
      this.draw();
    });
    const fontProfile = document.querySelector('#fontProfile') as HTMLSelectElement | null;
    const customSourceRow = document.querySelector('#customSourceRow') as HTMLDivElement | null;
    const customGoogleRow = document.querySelector('#customGoogleRow') as HTMLDivElement | null;
    const customAdobeRow = document.querySelector('#customAdobeRow') as HTMLDivElement | null;
    const customLocalRow = document.querySelector('#customLocalRow') as HTMLDivElement | null;
    const customOtherRow = document.querySelector('#customOtherRow') as HTMLDivElement | null;
    const customOtherHelpRow = document.querySelector('#customOtherHelpRow') as HTMLDivElement | null;
    const customTypographyRow = document.querySelector('#customTypographyRow') as HTMLDivElement | null;
    const customFontSource = document.querySelector('#customFontSource') as HTMLSelectElement | null;
    const updateCustomControls = () => {
      const isCustom = fontProfile?.value === 'custom';
      customSourceRow?.classList.toggle('hidden', !isCustom);
      customTypographyRow?.classList.toggle('hidden', !isCustom);
      if (!isCustom) {
        customGoogleRow?.classList.add('hidden');
        customAdobeRow?.classList.add('hidden');
        customLocalRow?.classList.add('hidden');
        customOtherRow?.classList.add('hidden');
        customOtherHelpRow?.classList.add('hidden');
        return;
      }
      const source = customFontSource?.value || 'google';
      customGoogleRow?.classList.toggle('hidden', source !== 'google');
      customAdobeRow?.classList.toggle('hidden', source !== 'adobe');
      customLocalRow?.classList.toggle('hidden', source !== 'local');
      customOtherRow?.classList.toggle('hidden', source !== 'other');
      customOtherHelpRow?.classList.toggle('hidden', source !== 'other');
    };
    if (fontProfile) {
      fontProfile.addEventListener('change', () => {
        this.fontProfile = fontProfile.value as FontProfile;
        updateCustomControls();
        this.draw();
      });
    }
    const customGoogleFontInput = document.querySelector('#customGoogleFontName') as HTMLInputElement | null;
    const customFontSizeInput = document.querySelector('#customFontSize') as HTMLInputElement | null;
    const customFontWeightInput = document.querySelector('#customFontWeight') as HTMLInputElement | null;
    const applyGoogleFontBtn = document.querySelector('#applyGoogleFont') as HTMLButtonElement | null;
    const adobeKitIdInput = document.querySelector('#adobeKitId') as HTMLInputElement | null;
    const adobeFontFamilyInput = document.querySelector('#adobeFontFamily') as HTMLInputElement | null;
    const applyAdobeFontBtn = document.querySelector('#applyAdobeFont') as HTMLButtonElement | null;
    const localFontFileInput = document.querySelector('#localFontFile') as HTMLInputElement | null;
    const localFontFamilyInput = document.querySelector('#localFontFamily') as HTMLInputElement | null;
    const applyLocalFontBtn = document.querySelector('#applyLocalFont') as HTMLButtonElement | null;
    const otherCssUrlInput = document.querySelector('#otherCssUrl') as HTMLInputElement | null;
    const otherFontFamilyInput = document.querySelector('#otherFontFamily') as HTMLInputElement | null;
    const applyOtherFontBtn = document.querySelector('#applyOtherFont') as HTMLButtonElement | null;
    if (customGoogleFontInput && applyGoogleFontBtn && fontProfile) {
      const applyGoogleFont = async () => {
        const family = customGoogleFontInput.value.trim();
        if (!family) {
          return;
        }
        await this.ensureGoogleFontLoaded(family);
        this.customFontFamily = family;
        this.customWeightMode = 'native';
        if (customFontSource) {
          customFontSource.value = 'google';
        }
        this.fontProfile = 'custom';
        fontProfile.value = 'custom';
        this.draw();
      };
      applyGoogleFontBtn.addEventListener('click', () => {
        void applyGoogleFont();
      });
      customGoogleFontInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          void applyGoogleFont();
        }
      });
    }
    if (adobeKitIdInput && adobeFontFamilyInput && applyAdobeFontBtn && fontProfile) {
      const applyAdobeFont = async () => {
        const kitId = adobeKitIdInput.value.trim();
        const family = adobeFontFamilyInput.value.trim();
        if (!kitId || !family) {
          return;
        }
        const href = `https://use.typekit.net/${kitId}.css`;
        await this.ensureStylesheetLoaded(href);
        this.customFontFamily = family;
        this.customWeightMode = 'native';
        if (customFontSource) {
          customFontSource.value = 'adobe';
        }
        this.fontProfile = 'custom';
        fontProfile.value = 'custom';
        this.draw();
      };
      applyAdobeFontBtn.addEventListener('click', () => {
        void applyAdobeFont();
      });
    }
    if (localFontFileInput && applyLocalFontBtn && fontProfile) {
      const applyLocalFont = async () => {
        const file = localFontFileInput.files?.[0];
        if (!file) {
          return;
        }
        const providedFamily = localFontFamilyInput?.value.trim() || '';
        const fallbackFamily = file.name.replace(/\.[^/.]+$/, '').trim();
        const family = (providedFamily || fallbackFamily || `local-font-${Date.now()}`).replace(/["']/g, '');
        await this.loadLocalFont(family, file);
        this.customFontFamily = family;
        this.customWeightMode = 'synthetic';
        if (customFontSource) {
          customFontSource.value = 'local';
        }
        this.fontProfile = 'custom';
        fontProfile.value = 'custom';
        this.draw();
      };
      applyLocalFontBtn.addEventListener('click', () => {
        void applyLocalFont();
      });
    }
    if (otherCssUrlInput && otherFontFamilyInput && applyOtherFontBtn && fontProfile) {
      const applyOtherFont = async () => {
        const url = otherCssUrlInput.value.trim();
        const family = otherFontFamilyInput.value.trim();
        if (!url || !family) {
          return;
        }
        if (this.isDirectFontFileUrl(url)) {
          await this.loadRemoteFont(family, url);
          this.customWeightMode = 'synthetic';
        } else {
          await this.ensureStylesheetLoaded(url);
          this.customWeightMode = 'native';
        }
        this.customFontFamily = family;
        if (customFontSource) {
          customFontSource.value = 'other';
        }
        this.fontProfile = 'custom';
        fontProfile.value = 'custom';
        this.draw();
      };
      applyOtherFontBtn.addEventListener('click', () => {
        void applyOtherFont();
      });
    }
    if (customFontSizeInput && fontProfile) {
      customFontSizeInput.addEventListener('input', () => {
        this.customFontSize = this.clampInt(customFontSizeInput.value, 24, 120, fontSize);
        if (this.fontProfile === 'custom') {
          this.draw();
        }
      });
    }
    if (customFontWeightInput && fontProfile) {
      customFontWeightInput.addEventListener('input', () => {
        this.customFontWeight = this.normalizeFontWeight(customFontWeightInput.value);
        customFontWeightInput.value = String(this.customFontWeight);
        if (this.fontProfile === 'custom') {
          this.draw();
        }
      });
    }
    customFontSource?.addEventListener('change', () => {
      updateCustomControls();
    });
    updateCustomControls();
    const gx = document.querySelector('#graphX')! as HTMLInputElement;
    const gy = document.querySelector('#graphY')! as HTMLInputElement;
    gx.addEventListener('input', () => {
      this.graphOffset.X = parseInt(gx.value);
      this.draw();
    });
    gy.addEventListener('input', () => {
      this.graphOffset.Y = parseInt(gy.value);
      this.draw();
    });
  }
  setWidth() {
    this.textWidthL =
      this.textMetricsL!.width -
      (textBaseLine * canvasHeight + this.textMetricsL!.fontBoundingBoxDescent) * horizontalTilt;
    this.textWidthR =
      this.textMetricsR!.width +
      (textBaseLine * canvasHeight - this.textMetricsR!.fontBoundingBoxAscent) * horizontalTilt;
    //extend canvas
    if (this.textWidthL + paddingX > canvasWidth / 2) {
      this.canvasWidthL = this.textWidthL + paddingX;
    } else {
      this.canvasWidthL = canvasWidth / 2;
    }
    if (this.textWidthR + paddingX > canvasWidth / 2) {
      this.canvasWidthR = this.textWidthR + paddingX;
    } else {
      this.canvasWidthR = canvasWidth / 2;
    }
    this.canvas.width = this.canvasWidthL + this.canvasWidthR;
  }
  resetColor() {
    const pointColor = document.querySelector('#pointColor') as HTMLInputElement;
    const textColor = document.querySelector('#textColor') as HTMLInputElement;
    pointColor.value = '#128AFA';
    textColor.value = '#2B2B2B';
    this.pointColor = '#128AFA';
    this.textColor = '#2B2B2B';
    this.draw();
  }
  tintImage(img: HTMLImageElement, color: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const cvs = document.createElement('canvas');
      cvs.width = img.width;
      cvs.height = img.height;
      const ctx = cvs.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context is null'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, cvs.width, cvs.height);
      const rgb = this.hexToRgb(color);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = rgb.r;
        imageData.data[i + 1] = rgb.g;
        imageData.data[i + 2] = rgb.b;
      }
      ctx.putImageData(imageData, 0, 0);
      const recolored = new Image();
      recolored.onload = () => resolve(recolored);
      recolored.onerror = reject;
      recolored.src = cvs.toDataURL();
    });
  }
  hexToRgb(hex: string) {
    const value = parseInt(hex.slice(1), 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    };
  }
  getCurrentFontFamily() {
    if (this.fontProfile === 'custom' && this.customFontFamily.trim()) {
      return this.toCanvasFontFamily(this.customFontFamily);
    }
    return fontProfiles[this.fontProfile];
  }
  toCanvasFontFamily(fontFamily: string) {
    if (/^['"].*['"]$/.test(fontFamily)) {
      return fontFamily;
    }
    if (/\s/.test(fontFamily)) {
      return `"${fontFamily}"`;
    }
    return fontFamily;
  }
  getCurrentTypography() {
    if (this.fontProfile === 'custom') {
      const titleFontSize = this.clampInt(String(this.customFontSize), 24, 120, fontSize);
      const titleFontWeight = this.normalizeFontWeight(String(this.customFontWeight));
      const subtitleFontSize = Math.max(12, Math.round(titleFontSize * 0.5));
      return { titleFontSize, titleFontWeight, subtitleFontSize };
    }
    return {
      titleFontSize: fontSize,
      titleFontWeight: defaultFontWeight,
      subtitleFontSize: defaultSubFontSize,
    };
  }
  clampInt(value: string, min: number, max: number, fallback: number) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, parsed));
  }
  normalizeFontWeight(value: string) {
    const clamped = this.clampInt(value, 100, 900, defaultFontWeight);
    return Math.round(clamped / 100) * 100;
  }
  fillTextWithWeight(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
    if (!text || this.fontProfile !== 'custom' || this.customWeightMode === 'native') {
      ctx.fillText(text, x, y);
      return;
    }
    // Single-file fonts often expose one physical face only; emulate heavier weights visually.
    const weight = this.normalizeFontWeight(String(this.customFontWeight));
    const passes = Math.max(1, Math.floor((weight - 100) / 200));
    const step = 0.3;
    for (let i = 0; i < passes; i++) {
      ctx.fillText(text, x + i * step, y);
    }
  }
  ensureGoogleFontLoaded(fontFamily: string) {
    const family = fontFamily.trim();
    if (!family) {
      return Promise.resolve();
    }
    const key = family.toLowerCase();
    if (this.loadedGoogleFonts.has(key)) {
      return Promise.resolve();
    }
    const familyParam = encodeURIComponent(family).replace(/%20/g, '+');
    const href = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
    return this.ensureStylesheetLoaded(href, key);
  }
  ensureStylesheetLoaded(href: string, key?: string) {
    if (!href) {
      return Promise.resolve();
    }
    if (this.loadedStyleUrls.has(href)) {
      if (key) {
        this.loadedGoogleFonts.add(key);
      }
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => {
        this.loadedStyleUrls.add(href);
        if (key) {
          this.loadedGoogleFonts.add(key);
        }
        resolve();
      };
      link.onerror = () => {
        console.warn(`Unable to load stylesheet: ${href}`);
        resolve();
      };
      document.head.appendChild(link);
    });
  }
  async loadLocalFont(fontFamily: string, file: File) {
    const nextUrl = URL.createObjectURL(file);
    const face = new FontFace(fontFamily, `url(${nextUrl})`);
    await face.load();
    document.fonts.add(face);
    if (this.localFontObjectUrl) {
      URL.revokeObjectURL(this.localFontObjectUrl);
    }
    this.localFontObjectUrl = nextUrl;
  }
  async loadRemoteFont(fontFamily: string, fontUrl: string) {
    const face = new FontFace(fontFamily, `url(${fontUrl})`);
    const loadedFace = await face.load();
    document.fonts.add(loadedFace);
  }
  isDirectFontFileUrl(url: string) {
    return /\.(woff2?|ttf|otf)(\?.*)?(#.*)?$/i.test(url);
  }
  generateImg() {
    let outputCanvas: HTMLCanvasElement;
    if (
      this.textWidthL + paddingX < canvasWidth / 2 ||
      this.textWidthR + paddingX < canvasWidth / 2
    ) {
      outputCanvas = document.createElement('canvas');
      outputCanvas.width = this.textWidthL + this.textWidthR + paddingX * 2;
      outputCanvas.height = this.canvas.height;
      const ctx = outputCanvas.getContext('2d')!;
      ctx.drawImage(
        this.canvas,
        canvasWidth / 2 - this.textWidthL - paddingX,
        0,
        this.textWidthL + this.textWidthR + paddingX * 2,
        this.canvas.height,
        0,
        0,
        this.textWidthL + this.textWidthR + paddingX * 2,
        this.canvas.height
      );
    } else {
      outputCanvas = this.canvas;
    }
    return new Promise<Blob>((resolve, reject) => {
      outputCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject();
        }
      });
    });
  }
  saveImg() {
    this.generateImg().then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.textL}${this.textR}${this.textSub ? '-' : ''}${this.textSub}_symbolon.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
  async copyImg() {
    const blob = await this.generateImg();
    const cp = [new ClipboardItem({ 'image/png': blob })];
    navigator.clipboard
      .write(cp)
      .then(() => {
        console.log('image copied');
        const msg = document.querySelector('#message-switch') as HTMLInputElement;
        msg.checked = true;
        setTimeout(() => (msg.checked = false), 2000);
      })
      .catch((e) => console.error("can't copy", e));
  }
}
