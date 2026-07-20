import settings from '../settings';

export default async (
  content: string = 'A',
  fontFamily: string = 'RoGSanSrfStd-Bd',
  size: number = settings.fontSize,
  weight: number = 800
) => {
  // const G2B = new FontFace('G2B', 'url(../RoGSanSrfStd-Bd_other.woff2)');
  // // const GSH = new FontFace('GSH', 'url(../GlowSansSC-Normal-Heavy.otf)');
  // await Promise.all([G2B.load() /*, GSH.load()*/]).then((fonts) =>
  //   fonts.map((font) => document.fonts.add(font))
  // );
  // const loadingSwitch = document.querySelector('#loading-switch') as HTMLInputElement;
  // loadingSwitch.checked = true;
  // Keep rendering usable even when optional webfonts are missing.
  await Promise.allSettled([
    document.fonts.load(`${weight} ${size}px ${fontFamily}`, content),
  ]);
  // loadingSwitch.checked = false;
};
