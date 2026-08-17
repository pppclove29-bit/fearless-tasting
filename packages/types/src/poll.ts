export interface PollOption {
  id: string;
  label: string;
  restaurantId: string | null;
  restaurant: { id: string; name: string } | null;
  votes: { id: string; userId: string; user: { id: string; nickname: string } }[];
  /** 공유 링크로 참여한 비로그인 표 */
  guestVotes: { id: string; guestName: string | null }[];
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
  /** 공유 링크 토큰 (링크를 아는 사람만 비로그인 참여 가능) */
  shareToken: string | null;
  /** 공유 링크 만료 시각 */
  expiresAt: string | null;
}

/**
 * 공유 링크로 여는 투표(비로그인). 방 이름·멤버·식당 목록은 포함하지 않는다.
 */
export interface SharedPoll {
  title: string;
  status: 'active' | 'closed';
  endsAt: string | null;
  expiresAt: string | null;
  totalVotes: number;
  options: { id: string; label: string; voteCount: number }[];
}
