export interface Review {
  id: string;
  restaurantId: string;
  userId: string;
  rating: number;
  content: string;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}
