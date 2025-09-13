// Server component for category-specific menu page

interface MenuCategoryPageProps {
  params: Promise<{
    tableId: string
    categorySlug: string
  }>
}

export default async function MenuCategoryPage({ params }: MenuCategoryPageProps) {
  const { tableId, categorySlug } = await params

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Menu - {categorySlug}</h1>
      <p>Table ID: {tableId}</p>
      <p>Category: {categorySlug}</p>
      <p>Category menu functionality will be implemented in future batches.</p>
    </div>
  )
}
