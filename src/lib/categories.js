/** Marketplace categories tuned for the Nigerian local market. */
export const CATEGORIES = [
  { id: 'fashion', label: 'Fashion & Accessories', emoji: '👗' },
  { id: 'electronics', label: 'Electronics', emoji: '📱' },
  { id: 'food-drinks', label: 'Food & Drinks', emoji: '🍔' },
  { id: 'beauty', label: 'Beauty', emoji: '💄' },
  { id: 'home-living', label: 'Home & Living', emoji: '🏠' },
  { id: 'agriculture', label: 'Agriculture', emoji: '🌾' },
  { id: 'books-education', label: 'Books & Education', emoji: '📚' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'vehicles', label: 'Vehicles', emoji: '🚗' },
  { id: 'services', label: 'Services', emoji: '🛠️' },
  { id: 'other', label: 'Other', emoji: '📦' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

export function categoryLabel(id) {
  return CATEGORY_MAP[id]?.label ?? id
}
