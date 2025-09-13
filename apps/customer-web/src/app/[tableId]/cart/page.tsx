// Server component for cart page

interface CartPageProps {
  params: Promise<{
    tableId: string
  }>
}

export default async function CartPage({ params }: CartPageProps) {
  const { tableId } = await params

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Cart</h1>
      <p>Table ID: {tableId}</p>
      <p>Cart functionality will be implemented in future batches.</p>
    </div>
  )
}
