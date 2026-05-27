import { redirect } from 'next/navigation';

export default async function ShopRedirectPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  redirect(`/oripa/shops/${storeId}`);
}
