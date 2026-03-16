export interface DiscoverRestaurant {
  name: string;
  address: string;
  category: string;
}

export interface DiscoverResponse {
  topRated: (DiscoverRestaurant & { avgRating: number; reviewCount: number })[];
  mostRevisited: (DiscoverRestaurant & { visitCount: number })[];
  mostWishlisted: (DiscoverRestaurant & { wishlistCount: number })[];
}
