export type A8Banner = {
  linkUrl: string;
  imageUrl: string;
  width: number;
  height: number;
  trackingPixelUrl: string;
};

export type InvitationCodeEntry = {
  siteName: string;
  siteUrl?: string;
  invitationCode?: string;
  description?: string;
  trackingPixelUrl?: string;
  banner?: A8Banner;
};

export const INVITATION_CODES: InvitationCodeEntry[] = [
  {
    siteName: 'オリくじ',
    siteUrl: 'https://px.a8.net/svt/ejp?a8mat=4B1THW+4QVFEA+5I52+5YJRM',
    invitationCode: 'FJcj4I',
    trackingPixelUrl: 'https://www12.a8.net/0.gif?a8mat=4B1THW+4QVFEA+5I52+5YJRM',
    banner: {
      linkUrl: 'https://px.a8.net/svt/ejp?a8mat=4B1THW+4QVFEA+5I52+5YZ75',
      imageUrl: 'https://www29.a8.net/svt/bgt?aid=260425364287&wid=001&eno=01&mid=s00000025679001003000&mc=1',
      width: 300,
      height: 250,
      trackingPixelUrl: 'https://www16.a8.net/0.gif?a8mat=4B1THW+4QVFEA+5I52+5YZ75',
    },
  },
  {
    siteName: 'エクストレカ',
    siteUrl: 'https://px.a8.net/svt/ejp?a8mat=4B1THW+DVIPBM+5FVE+5YRHE',
    invitationCode: 'HQZPT6',
    trackingPixelUrl: 'https://www17.a8.net/0.gif?a8mat=4B1THW+DVIPBM+5FVE+5YRHE',
    banner: {
      linkUrl: 'https://px.a8.net/svt/ejp?a8mat=4B1THW+DVIPBM+5FVE+5YZ75',
      imageUrl: 'https://www26.a8.net/svt/bgt?aid=260425364839&wid=001&eno=01&mid=s00000025385001003000&mc=1',
      width: 300,
      height: 250,
      trackingPixelUrl: 'https://www18.a8.net/0.gif?a8mat=4B1THW+DVIPBM+5FVE+5YZ75',
    },
  },
  {
    siteName: 'DOPA',
    siteUrl: 'https://dopa-game.jp/',
    invitationCode: 'Lo3d6ZAi',
  },
  {
    siteName: 'オリパワン',
    siteUrl: 'https://oripaone.jp/',
    invitationCode: '',
  },
];
