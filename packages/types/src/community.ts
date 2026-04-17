/** 게시판 */
export interface Board {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
  popularThreshold: number;
  createdAt: string;
  updatedAt: string;
}

/** 게시판 목록 항목 (게시글 수 포함) */
export interface BoardListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  _count: { posts: number };
}

/** 게시글 작성자 */
export interface PostAuthor {
  id: string;
  nickname: string;
  profileImageUrl: string | null;
  /** 익명 번호 (게시글 단위, 1부터 순차) — 익명일 때만 존재 */
  anonymousNumber?: number;
  /** 익명 글쓴이 여부 — 익명 댓글이 게시글 작성자일 때 true */
  isPostAuthor?: boolean;
}

/** 게시글 목록 항목 */
export interface PostListItem {
  id: string;
  title: string;
  content: string;
  isAnonymous: boolean;
  boardSlug: string;
  boardName: string;
  author: PostAuthor;
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { comments: number; likes: number; bookmarks: number };
}

/** 페이지네이션된 게시글 목록 */
export interface PaginatedPosts {
  items: PostListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 댓글 */
export interface PostComment {
  id: string;
  content: string;
  isAnonymous?: boolean;
  author: PostAuthor;
  isLiked?: boolean;
  _count?: { likes: number };
  createdAt: string;
}

/** 게시글 태그 식당 */
export interface PostRestaurant {
  id: string;
  name: string;
  address: string;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  kakaoPlaceId: string | null;
}

/** 게시글 상세 */
export interface PostDetail {
  id: string;
  title: string;
  content: string;
  isAnonymous: boolean;
  boardId: string;
  isAuthor?: boolean;
  isLiked?: boolean;
  author: PostAuthor;
  comments: PostComment[];
  restaurants?: PostRestaurant[];
  _count?: { likes?: number; bookmarks?: number };
  createdAt: string;
  updatedAt: string;
}
