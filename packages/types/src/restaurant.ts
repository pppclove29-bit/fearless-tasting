export interface Restaurant {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
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
