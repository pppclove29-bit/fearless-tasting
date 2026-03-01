export interface Restaurant {
  id: string;
  name: string;
  address: string;
  province: string;
  city: string;
  neighborhood: string;
  category: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantListItem {
  restaurantId: string;
  visitedAt?: string;
  memo?: string;
}
