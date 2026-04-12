export interface OripaPost {
  id: string;
  storeName: string;
  productName: string;
  saleDate: string;
  price: number;
}

export const STUB_ORIPA_POSTS: OripaPost[] = [
  {
    id: 'post-001',
    storeName: 'Card Shop Akihabara',
    productName: 'Pokemon Card Oripa - 151 Edition',
    saleDate: '2026-04-15',
    price: 3000,
  },
  {
    id: 'post-002',
    storeName: 'TradingCard Online Center',
    productName: 'Terastal Oripa Premium',
    saleDate: '2026-04-16',
    price: 5000,
  },
  {
    id: 'post-003',
    storeName: 'Card Paradise Ikebukuro',
    productName: 'Rarity Collection Oripa',
    saleDate: '2026-04-18',
    price: 2000,
  },
  {
    id: 'post-004',
    storeName: 'Pocket Monster Card Shop',
    productName: 'Scarlet & Violet Oripa Special',
    saleDate: '2026-04-20',
    price: 4000,
  },
];
