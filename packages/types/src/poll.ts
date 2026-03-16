export interface PollOption {
  id: string;
  label: string;
  restaurantId: string | null;
  restaurant: { id: string; name: string } | null;
  votes: { id: string; userId: string; user: { id: string; nickname: string } }[];
}

export interface Poll {
  id: string;
  title: string;
  roomId: string;
  status: 'active' | 'closed';
  endsAt: string | null;
  createdAt: string;
  createdBy: { id: string; nickname: string };
  options: PollOption[];
}
