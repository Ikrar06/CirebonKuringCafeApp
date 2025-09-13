// Server component for main menu page

interface MenuPageProps {
  params: Promise<{
    tableId: string
  }>
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { tableId } = await params

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Menu</h1>
      <p>Table ID: {tableId}</p>
      <p>Menu functionality will be implemented in future batches.</p>
    </div>
  )
}
