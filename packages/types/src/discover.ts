export interface DiscoverRestaurant {
  name: string;
  address: string;
  category: string;
  avgRating: number;
  reviewCount: number;
  visitCount: number;
  roomId: string;
  roomName: string;
}

export interface DiscoverTopRoom {
  id: string;
  name: string;
  restaurantCount: number;
  memberCount: number;
}

export interface DiscoverResponse {
  topRated: DiscoverRestaurant[];
  topRooms: DiscoverTopRoom[];
}
